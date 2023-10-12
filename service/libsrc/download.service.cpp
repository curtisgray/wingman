#include <chrono>
#include <thread>
#include <filesystem>

#include <nlohmann/json.hpp>
#include <spdlog/spdlog.h>

#include "download.service.h"

//DownloadService::DownloadService(
//	wingman::ItemActionsFactory &actions_factory)
//	: factory(actions_factory)
//{}
DownloadService::DownloadService(
	wingman::ItemActionsFactory &actions_factory, const std::function<void(wingman::curl::Response *)> &onDownloadProgress)
	: factory(actions_factory)
	, onDownloadProgress(onDownloadProgress)
{}

//DownloadService::DownloadService(
//	wingman::ItemActionsFactory &actionsFactory, void(*onDownloadProgress)(wingman::curl::Response *))
//	: factory(actionsFactory)
//	, onDownloadProgress(onDownloadProgress)
//{}


//DownloadService::DownloadService(wingman::ItemActionsFactory &actions_factory)
//	: factory(actions_factory, nullptr)
//{}

void DownloadService::startDownload(const wingman::DownloadItem &downloadItem, bool overwrite) const
{
	const auto url = wingman::DownloadItemActions::urlForModel(downloadItem);
	const auto item = std::make_shared<wingman::DownloadItem>(wingman::DownloadItem{ downloadItem });
	auto request = wingman::curl::Request{ url };
	request.file.item = item;
	request.file.actions = factory.download();
	request.file.onProgress = onDownloadProgress;

	const auto response = wingman::curl::fetch(request);
}

void DownloadService::updateServerStatus(const wingman::DownloadServerAppItemStatus &status, std::optional<wingman::DownloadItem> downloadItem, std::optional<std::string> error) const
{
	auto appItem = factory.app()->get(SERVER_NAME).value_or(wingman::AppItem::make(SERVER_NAME));

	nlohmann::json j = nlohmann::json::parse(appItem.value);
	auto downloadServerItem = j.template get<wingman::DownloadServerAppItem>();
	downloadServerItem.status = status;
	if (error) {
		downloadServerItem.error = error;
	}
	if (downloadItem) {
		downloadServerItem.currentDownload.emplace(downloadItem.value());
	}
	nlohmann::json j2 = downloadServerItem;
	appItem.value = j2.dump();
	factory.app()->set(appItem);
}

void DownloadService::runOrphanedDownloadCleanup() const
{
	// Check for orphaned downloads and clean up
	for (const auto downloads = factory.download()->getAll(); const auto & download : downloads) {
		if (download.status == wingman::DownloadItemStatus::complete) {
			// Check if the download file exists in the file system
			if (!factory.download()->fileExists(download)) {
				factory.download()->remove(download.modelRepo, download.filePath);
			}
		}
	}
	// Check for orphaned downloaded model files on disk and clean up
	for (const auto files = wingman::DownloadItemActions::getModelFiles(); const auto & file : files) {
		// get file names from disk and check if they are in the database
		if (const auto din = wingman::DownloadItemActions::parseSafeFilePathIntoDownloadItemName(file)) {
			const auto downloadItem = factory.download()->get(din.value().modelRepo, din.value().filePath);
			if (!downloadItem) {
				// get full path to file and remove it
				const auto fullPath = wingman::DownloadItemActions::getDownloadItemOutputPath(din.value().modelRepo, din.value().filePath);
				spdlog::info(SERVER_NAME + ": Removing orphaned file " + fullPath + " from disk.");
				std::filesystem::remove(fullPath);
			}
		}
	}
}

void DownloadService::initialize() const
{
	wingman::DownloadServerAppItem dsai;
	nlohmann::json j = dsai;
	wingman::AppItem item;
	item.name = SERVER_NAME;
	item.value = j.dump();
	factory.app()->set(item);

	runOrphanedDownloadCleanup();
	factory.download()->reset();
}

void DownloadService::run()
{
	try {
		if (!keepRunning) {
			return;
		}

		spdlog::debug(SERVER_NAME + ": (run) Download server started.");

		initialize();

		while (keepRunning) {
			updateServerStatus(wingman::DownloadServerAppItemStatus::ready);
			spdlog::trace(SERVER_NAME + ": (run) Checking for queued downloads...");
			if (auto nextItem = factory.download()->getNextQueued()) {
				auto &currentItem = nextItem.value();
				const std::string modelName = currentItem.modelRepo + ": " + currentItem.filePath;

				spdlog::info(SERVER_NAME + ": (run) Processing download of " + modelName + "...");

				if (currentItem.status == wingman::DownloadItemStatus::queued) {
					// Update status to downloading
					//wingman::DownloadItem updatedItem = currentItem;
					currentItem.status = wingman::DownloadItemStatus::downloading;
					factory.download()->set(currentItem);
					updateServerStatus(wingman::DownloadServerAppItemStatus::preparing, currentItem);

					spdlog::debug(SERVER_NAME + ": (run) calling startDownload " + modelName + "...");
					try {
						startDownload(currentItem, true);
					} catch (const std::exception &e) {
						spdlog::error(SERVER_NAME + ": (run) Exception (startDownload): " + std::string(e.what()));
						updateServerStatus(wingman::DownloadServerAppItemStatus::error, currentItem, e.what());
					}
					spdlog::info(SERVER_NAME + ": (run) Download of " + modelName + " complete.");
					updateServerStatus(wingman::DownloadServerAppItemStatus::ready);
				}
			}

			runOrphanedDownloadCleanup();

			spdlog::trace(SERVER_NAME + ": Waiting " + std::to_string(QUEUE_CHECK_INTERVAL) + "ms...");
			std::this_thread::sleep_for(std::chrono::milliseconds(QUEUE_CHECK_INTERVAL));
		}
		updateServerStatus(wingman::DownloadServerAppItemStatus::stopping);
		spdlog::debug(SERVER_NAME + ": Download server stopped.");
	} catch (const std::exception &e) {
		spdlog::error(SERVER_NAME + ": Exception (run): " + std::string(e.what()));
		stop();
	}
	updateServerStatus(wingman::DownloadServerAppItemStatus::stopped);
}

void DownloadService::stop()
{
	keepRunning = false;
}
