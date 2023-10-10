#pragma once
#include <chrono>
#include <thread>
#include <nlohmann/json.hpp>
#include <spdlog/spdlog.h>

#include "download.service.h"

namespace fs = std::filesystem;

DownloadServer::DownloadServer(wingman::ItemActionsFactory &actions_factory)
	: factory(actions_factory)
{
}

void DownloadServer::startDownload(const std::string &modelRepo, const std::string &filePath, bool overwrite)
{
	const auto url = wingman::DownloadItemActions::urlForModel(modelRepo, filePath);
	const auto item = std::make_shared<wingman::DownloadItem>(factory.download()->get(modelRepo, filePath).value());
	auto request = wingman::curl::Request{ url, {}, {}, {}, {  item, std::nullopt, factory.download() } };

	const auto response = wingman::curl::fetch(request);
}

void DownloadServer::updateServerStatus(const wingman::DownloadServerAppItemStatus &status, std::optional<wingman::DownloadItem> downloadItem, std::optional<std::string> error)
{
	auto appItem = factory.app()->get(SERVER_NAME).value_or(wingman::AppItem::make(SERVER_NAME));
	//auto appItem = factory.app()->get(SERVER_NAME);

	//nlohmann::json j = nlohmann::json::parse(appItem);
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
	//appItem->value = j2.dump();
	//factory.app()->set(*appItem);
	appItem.value = j2.dump();
	factory.app()->set(appItem);
}

void DownloadServer::initializeServerStatus() const
{
	const nlohmann::json jsonDownloadServerAppItem = wingman::DownloadServerAppItem::make();
	wingman::AppItem item = wingman::AppItem::make(SERVER_NAME);
	item.value = jsonDownloadServerAppItem.dump();
	factory.app()->set(item);

	// Check for orphaned downloads and clean up
	for (const auto downloads = factory.download()->getAll(); const auto & download : downloads) {
		if (download.status == wingman::DownloadItemStatus::complete) {
			// Use static method to check if the download file exists in the file system
			if (!wingman::DownloadItemActions::isDownloaded(download.modelRepo, download.filePath)) {
				// Use static method to delete the download item file
				std::string filePath = wingman::DownloadItemActions::getDownloadItemFilePath(download.modelRepo, download.filePath);
				fs::remove(filePath); // Assuming you have 'namespace fs = std::filesystem;'
				factory.download()->remove(download.modelRepo, download.filePath);
			}
		}
	}
	factory.download()->reset();
}

void DownloadServer::run()
{
	try {
		if (!keepRunning) {
			return;
		}

		spdlog::debug(SERVER_NAME + ": Download server started.");

		initializeServerStatus();

		while (keepRunning) {
			updateServerStatus(wingman::DownloadServerAppItemStatus::ready);
			spdlog::trace(SERVER_NAME + ": Checking for queued downloads...");
			auto nextItem = factory.download()->getNextQueued();
			if (nextItem) {
				const auto &currentItem = nextItem.value();
				const std::string modelName = currentItem.modelRepo + "/" + currentItem.filePath;

				spdlog::info(SERVER_NAME + ": Processing download of " + modelName + "...");

				if (currentItem.status == wingman::DownloadItemStatus::queued) {
					// Update status to downloading
					wingman::DownloadItem updatedItem = currentItem;
					updatedItem.status = wingman::DownloadItemStatus::downloading;
					factory.download()->set(updatedItem);
					updateServerStatus(wingman::DownloadServerAppItemStatus::preparing, updatedItem);

					spdlog::debug(SERVER_NAME + ": (main) calling startDownload " + modelName + "...");
					try {
						startDownload(updatedItem.modelRepo, updatedItem.filePath, true);
					} catch (const std::exception &e) {
						spdlog::error(SERVER_NAME + ": (main) Exception (startDownload): " + std::string(e.what()));
						updateServerStatus(wingman::DownloadServerAppItemStatus::error, updatedItem, e.what());
					}
					spdlog::info(SERVER_NAME + ": Download of " + modelName + " complete.");
					updateServerStatus(wingman::DownloadServerAppItemStatus::ready);
				}
			}

			spdlog::trace(SERVER_NAME + ": Waiting " + std::to_string(QUEUE_CHECK_INTERVAL) + "ms...");
			std::this_thread::sleep_for(std::chrono::milliseconds(QUEUE_CHECK_INTERVAL));
		}
		updateServerStatus(wingman::DownloadServerAppItemStatus::stopping);
		spdlog::debug(SERVER_NAME + ": Download server stopped.");
	} catch (const std::exception &e) {
		spdlog::error(SERVER_NAME + ": Exception (run): " + std::string(e.what()));
	}
}

void DownloadServer::stop()
{
	keepRunning = false;
}
