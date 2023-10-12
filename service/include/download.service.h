#pragma once

#include "types.h"
#include "orm.h"
#include "curl.h"

class DownloadService {
	std::atomic<bool> keepRunning = true;

	wingman::ItemActionsFactory &factory;
	const std::string SERVER_NAME = "DownloadService";
	const int QUEUE_CHECK_INTERVAL = 1000; // Assuming 1000ms as in TypeScript

	void startDownload(const wingman::DownloadItem &downloadItem, bool overwrite) const;

	void updateServerStatus(const wingman::DownloadServerAppItemStatus &status, std::optional<wingman::DownloadItem> downloadItem = std::nullopt, std
							::optional<std::string> error = std::nullopt) const;
	void runOrphanedDownloadCleanup() const;

	void initialize() const;

	std::function<void(wingman::curl::Response *)> onDownloadProgress = nullptr;

public:
	explicit DownloadService(wingman::ItemActionsFactory &actions_factory, const std::function<void(wingman::curl::Response *)> &onDownloadProgress = nullptr);

	void run();

	void stop();

};
