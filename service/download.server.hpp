#pragma once
#include <chrono>
#include <thread>
#include "./json.hpp"
#include "./types.h"
#include "./orm.hpp"

using namespace wingman;

class DownloadServer {
private:
	ItemActionsFactory &orm;
	//volatile std::atomic_bool __keep_running = true;
	bool __keep_running = true;
	const std::string SERVER_NAME = "DownloadServer";
	const int QUEUE_CHECK_INTERVAL = 1000; // Assuming 1000ms as in TypeScript

public:
	explicit DownloadServer(ItemActionsFactory &actions_factory)
		: orm(actions_factory)
	{}

	void startDownload(const std::string &modelRepo, const std::string &filePath, bool overwrite)
	{
		// Implement the logic for downloading the file from the model repo
		// and saving it to the local file system.
	}

	void updateServerStatus(const DownloadServerAppItemStatus &status, std::optional<DownloadItem> downloadItem = std::nullopt, std::optional<std::string> error = std::nullopt)
	{
		auto appItem = orm.app()->get(SERVER_NAME).value_or(AppItem::make(SERVER_NAME));
		//auto appItem = orm.app()->get(SERVER_NAME);

		//nlohmann::json j = nlohmann::json::parse(appItem);
		nlohmann::json j          = nlohmann::json::parse(appItem.value);
		auto downloadServerItem   = j.template get<DownloadServerAppItem>();
		downloadServerItem.status = status;
		if (error) {
			downloadServerItem.error = error;
		}
		if (downloadItem) {
			downloadServerItem.currentDownload.emplace(downloadItem.value());
		}
		nlohmann::json j2 = downloadServerItem;
		//appItem->value = j2.dump();
		//orm.app()->set(*appItem);
		appItem.value = j2.dump();
		orm.app()->set(appItem);
	}

	void initializeServerStatus() const
	{
		const nlohmann::json jsonDownloadServerAppItem = DownloadServerAppItem::make();
		AppItem item = AppItem::make(SERVER_NAME);
		item.value = jsonDownloadServerAppItem.dump();
		orm.app()->set(item);

		// Check for orphaned downloads and clean up
		for (const auto downloads = orm.download()->getAll(); const auto &download : downloads) {
			if (download.status == DownloadItemStatus::complete) {
				// Use static method to check if the download file exists in the file system
				if (!DownloadItemActions::isDownloaded(download.modelRepo, download.filePath)) {
					// Use static method to delete the download item file
					std::string filePath = DownloadItemActions::getDownloadItemFilePath(download.modelRepo, download.filePath);
					fs::remove(filePath); // Assuming you have 'namespace fs = std::filesystem;'
					orm.download()->remove(download.modelRepo, download.filePath);
				}
			}
		}
		orm.download()->reset();
	}

	void run()
	{
		try {
			if (!__keep_running) {
				return;
			}

			spdlog::debug(SERVER_NAME + ": Download server started.");

			initializeServerStatus();

			while (__keep_running) {
				updateServerStatus(DownloadServerAppItemStatus::ready);
				spdlog::trace(SERVER_NAME + ": Checking for queued downloads...");
				auto nextItem = orm.download()->getNextQueued();
				if (nextItem) {
					const auto &currentItem = nextItem.value();
					const std::string modelName = currentItem.modelRepo + "/" + currentItem.filePath;

					spdlog::info(SERVER_NAME + ": Processing download of " + modelName + "...");

					if (currentItem.status == DownloadItemStatus::queued) {
						// Update status to downloading
						DownloadItem updatedItem = currentItem;
						updatedItem.status = DownloadItemStatus::downloading;
						orm.download()->set(updatedItem);
						updateServerStatus(DownloadServerAppItemStatus::preparing, updatedItem);

						spdlog::debug(SERVER_NAME + ": (main) calling startDownload " + modelName + "...");
						try {
							startDownload(updatedItem.modelRepo, updatedItem.filePath, true);
						} catch (const std::exception &e) {
							spdlog::error(SERVER_NAME + ": (main) Exception (startDownload): " + std::string(e.what()));
							updateServerStatus(DownloadServerAppItemStatus::error, updatedItem, e.what());
						}
						spdlog::info(SERVER_NAME + ": Download of " + modelName + " complete.");
						updateServerStatus(DownloadServerAppItemStatus::ready);
					}
				}

				spdlog::trace(SERVER_NAME + ": Waiting " + std::to_string(QUEUE_CHECK_INTERVAL) + "ms...");
				std::this_thread::sleep_for(std::chrono::milliseconds(QUEUE_CHECK_INTERVAL));
			}
			updateServerStatus(DownloadServerAppItemStatus::stopping);
			spdlog::debug(SERVER_NAME + ": Download server stopped.");
		} catch (const std::exception &e) {
			spdlog::error(SERVER_NAME + ": Exception (run): " + std::string(e.what()));
		}
	}

	void stop()
	{
		__keep_running = false;
	}
};
