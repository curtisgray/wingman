#pragma once

#include "types.h"
#include "orm.h"
#include "curl.h"

class DownloadServer {
private:
	wingman::ItemActionsFactory &factory;
	//volatile std::atomic_bool __keep_running = true;
	bool keepRunning = true;
	const std::string SERVER_NAME = "DownloadServer";
	const int QUEUE_CHECK_INTERVAL = 1000; // Assuming 1000ms as in TypeScript

public:
	explicit DownloadServer(wingman::ItemActionsFactory &actions_factory);

	void startDownload(const std::string &modelRepo, const std::string &filePath, bool overwrite);

	void updateServerStatus(const wingman::DownloadServerAppItemStatus &status, std::optional<wingman::DownloadItem> downloadItem = std::nullopt, std::optional<std::string> error = std::nullopt);
	void initializeServerStatus() const;

	void run();

	void stop();
};
