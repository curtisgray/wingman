
#include <csignal>
#include <iostream>

#include "orm.h"
#include "download.service.h"

std::atomic requestedShutdown = false;

std::function<void(int)> shutdown_handler;
void signal_handler(int signal)
{
	shutdown_handler(signal);
}

void onDownloadProgress(const wingman::curl::Response * response)
{
	std::cerr << fmt::format(
		std::locale("en_US.UTF-8"),
		"{}: {} of {} ({:.1f})\t\t\t\t\r",
		response->file.item->modelRepo,
		wingman::util::prettyBytes(response->file.totalBytesWritten),
		wingman::util::prettyBytes(response->file.item->totalBytes),
		response->file.item->progress);

}
std::function<void(wingman::curl::Response *)> onDownloadProgressHandler = onDownloadProgress;

void start()
{
	spdlog::set_level(spdlog::level::debug);

	wingman::ItemActionsFactory actionsFactory;

	spdlog::info("Starting servers...");

	auto handler = [&](const wingman::curl::Response *response) {
		std::cerr << fmt::format(
			std::locale("en_US.UTF-8"),
			"{}: {} of {} ({:.1f})\t\t\t\t\r",
			response->file.item->modelRepo,
			wingman::util::prettyBytes(response->file.totalBytesWritten),
			wingman::util::prettyBytes(response->file.item->totalBytes),
			response->file.item->progress);
	};

	// NOTE: all of these signatures work for passing the handler to the DownloadService constructor
	//DownloadService server(actionsFactory, handler);
	DownloadService server(actionsFactory, onDownloadProgress);
	//DownloadService server(actionsFactory, onDownloadProgressHandler);
	std::thread serverThread(&DownloadService::run, &server);

	// wait for ctrl-c
	shutdown_handler = [&](int /* signum */) {
		spdlog::debug(" (start) SIGINT received.");
		// if we have received the signal before, abort.
		if (requestedShutdown) abort();
		// First SIGINT recieved, attempt a clean shutdown
		requestedShutdown = true;
		server.stop();
	};

	if (const auto res = std::signal(SIGINT, signal_handler); res == SIG_ERR) {
		spdlog::error(" (start) Failed to register signal handler.");
		return;
	}

	std::cout << "Press Ctrl-C to quit" << std::endl;
	serverThread.join();
	spdlog::info("Servers stopped.");
}

int main()
{
	try {
		start();
	} catch (const std::exception &e) {
		spdlog::error("Exception: " + std::string(e.what()));
		return 1;
	}
	return 0;
}
