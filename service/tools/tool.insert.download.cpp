#include <iostream>
#include <argparse/argparse.hpp>

#include "curl.h"
#include "orm.h"

namespace wingman::tools {
	void start(const std::string &modelRepo, const std::string &quantization)
	{
		spdlog::info("Insert download tool start.");

		// verify that the model exists on the download server
		const auto url = DownloadItemActions::urlForModel(modelRepo, quantization);
		if (curl::remoteFileExists(url)) {
			ItemActionsFactory actions;
			std::cout << modelRepo << " found. Scheduling for download..." << std::endl;

			DownloadItem item;
			const auto filePath = DownloadItemActions::getQuantFileNameForModelRepo(modelRepo, quantization);
			item.modelRepo = modelRepo;
			item.filePath = filePath;
			item.status = DownloadItemStatus::queued;
			spdlog::info("Queue {}/{}", modelRepo, filePath);
			actions.download()->set(item);

			std::cout << modelRepo << " queued for download." << std::endl;
			spdlog::info("Inserted into db {}:{}", modelRepo, filePath);
		} else {
			std::cout << modelRepo << " not found at " << url << std::endl;
		}
	}
}

int main(int argc, char *argv[])
{
	// CLI::App app{ "Download Llama model from Huggingface Wingman models folder." };

	argparse::ArgumentParser program("tool.insert.download");

	program.add_description("Schedule to download Llama model from Huggingface to Wingman models folder.");
	program.add_argument("--modelRepo")
		.required()
		.help("Huggingface model repository name in form '[RepoUser]/[ModelId]'");
	program.add_argument("--quantization")
		.help("Quantization to download. Defaults to `Q4_0`");

	try {
		program.parse_args(argc, argv);    // Example: ./main --color orange
	} catch (const std::runtime_error &err) {
		std::cerr << err.what() << std::endl;
		std::cerr << program;
		std::exit(1);
	}

	const auto modelRepo = program.present<std::string>("--modelRepo");
	const auto quantization = program.present<std::string>("--quantization");

	try {
		//const auto modelRepo = "TheBloke/Amethyst-13B-Mistral";
		//const auto quantization = "Q4_0";
		wingman::tools::start(modelRepo.value(), quantization.value_or("Q4_0"));
	} catch (const std::exception &e) {
		std::cerr << "Exception: " << std::string(e.what());
		return 1;
	}
	return 0;
}
