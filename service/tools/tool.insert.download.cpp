#include <iostream>
#include <argparse/argparse.hpp>

#include "orm.h"

namespace wingman::tools {
	void start(const std::string &modelRepo, const std::string &filePath)
	{
		spdlog::info("Insert download tool start.");

		ItemActionsFactory actionsFactory;

		// verify that the model exists on the download server

		DownloadItem item;
		item.modelRepo = modelRepo;
		item.filePath = filePath;
		spdlog::info("Queue {}/{}", modelRepo, filePath);
		actionsFactory.download()->set(item);
		if (actionsFactory.download()->count() != 1) {
			throw std::runtime_error("Insert failed!");
		}

		spdlog::info("Inserted {}:{}", modelRepo, filePath);
	}
}

int main(int argc, char *argv[])
{
	// CLI::App app{ "Download Llama model from Huggingface Wingman models folder." };

	argparse::ArgumentParser program("tool.insert.download");
	program.add_argument("-m", "--modelRepo").required().help("Huggingface model repository name in form '[RepoUser]/[ModelId]'");
	program.add_argument("-q", "--quantization").required().help("Quantization to download").default_value("Q4_0");
	
	try {
		program.parse_args(argc, argv);    // Example: ./main --color orange
	}
		catch (const std::runtime_error& err) {
			std::cerr << err.what() << std::endl;
			std::cerr << program;
			std::exit(1);
	}

	const auto modelRepo = program.get<std::string>("--modelRepo");
	const auto quantization = program.get<std::string>("--quantization");
	
	try {
		//const auto modelRepo = "TheBloke/Amethyst-13B-Mistral";
		//const auto quantization = "Q4_0";
		wingman::tools::start(modelRepo, quantization);
	} catch (const std::exception &e) {
		std::cerr << "Exception: " << std::string(e.what());
		return 1;
	}
	return 0;
}
