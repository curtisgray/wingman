#include "on_exit.h"
#include "orm.hpp"

namespace wingman::tools {
	namespace fs = std::filesystem;
	void start(std::string& modelRepo, std::string&filePath)
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
		spdlog::info("Press Ctrl-C to quit");
		stash::wait_for_termination();
	}
}

int main()
{
	try {
		spdlog::set_level(spdlog::level::debug);
		std::string modelRepo = "TheBloke/Xwin-LM-13B-V0.1-GGUF";
		std::string filePath = "xwin-lm-13b-v0.1.Q2_K.gguf";

		wingman::tools::start(modelRepo, filePath);
	} catch (const std::exception &e) {
		spdlog::error("Exception: " + std::string(e.what()));
		return 1;
	}
	spdlog::info("Job's done.");
	return 0;
}
