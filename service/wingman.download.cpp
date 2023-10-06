
#include <iostream>

#include "orm.hpp"
#include "download.server.hpp"
#include "on_exit.h"

void start()
{
	spdlog::set_level(spdlog::level::debug);

	ItemActionsFactory actionsFactory;
	DownloadServer server(actionsFactory);
	std::thread serverThread(&DownloadServer::run, &server);
	// wait for ctrl-c
	std::cout << "Press Ctrl-C to quit" << std::endl;
	stash::wait_for_termination();
	std::cout << "Stopping servers..." << std::endl;
	server.stop();
	serverThread.join();
	std::cout << "Servers stopped." << std::endl;
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
