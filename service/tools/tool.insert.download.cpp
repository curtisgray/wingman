#include "on_exit.h"
#include "orm.hpp"

namespace wingman::tools {
	namespace fs = std::filesystem;
	void start(std::string &modelRepo, std::string &filePath)
	{
		spdlog::info("Insert download tool start.");

		const std::string file{ __FILE__ };
		const fs::path directory = fs::path(file).parent_path();
		const auto baseDirectory = directory / fs::path("out");
		fs::create_directories(baseDirectory);
		ItemActionsFactory actionsFactory;

		DownloadItem item;
		item.modelRepo = modelRepo;
		item.filePath = filePath;
		spdlog::info("Queue {}/{}", modelRepo, filePath);
		actionsFactory.download()->set(item);
		if (actionsFactory.download()->count() != 1) {
			throw std::runtime_error("Insert failed!");
		}
		//spdlog::info("Press Ctrl-C to quit");
		//stash::wait_for_termination();
		spdlog::info("Insert download success.");
	}
}

int main(int argc, char *argv[])
{
	if (argc != 3) {
		spdlog::error("Usage: {} <modelRepo> <filePath>", argv[0]);
		return 1;
	}
	//std::string modelRepo = "TheBloke/Xwin-LM-13B-V0.1-GGUF";
	//std::string filePath = "xwin-lm-13b-v0.1.Q2_K.gguf";
	std::string modelRepo = argv[1];
	std::string filePath = argv[2];
	try {
		wingman::tools::start(modelRepo, filePath);
	} catch (const std::exception &e) {
		spdlog::error("Exception: " + std::string(e.what()));
		return 1;
	}
	spdlog::info("Job's done.");
	return 0;
}
