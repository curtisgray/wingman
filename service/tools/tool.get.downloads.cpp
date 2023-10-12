#include <argparse/argparse.hpp>
#include <fmt/core.h>
#include <nlohmann/json.hpp>

#include "orm.h"
#include "curl.h"

namespace wingman::tools {
	void start(const std::string &modelRepo, const std::string &quantization)
	{
		fmt::print("modelRepo: {}, quantization: {}\n", modelRepo, quantization);
		const auto url = wingman::DownloadItemActions::urlForModel(modelRepo, quantization);
		fmt::print("url: {}\n", url);

		wingman::ItemActionsFactory itemActionsFactory;

		const auto filePath = wingman::DownloadItemActions::getQuantFileNameForModelRepo(modelRepo, quantization);
		const auto item = itemActionsFactory.download()->enqueue(modelRepo, filePath);
		auto request = wingman::curl::Request{ url, {}, {}, {}, {  item, quantization, itemActionsFactory.download() } };

		fmt::print("Download from: {}\n", url);
		fmt::print("Download to: {}\n", DownloadItemActions::getDownloadItemOutputPath(
			modelRepo, quantization));

		request.file.onProgress = [&](const wingman::curl::Response *response) {
			std::cerr << fmt::format(
				std::locale("en_US.UTF-8"),
				"{}: {} of {} ({:.1f}%)\t\t\t\t\r",
				response->file.item->modelRepo,
				util::prettyBytes(response->file.totalBytesWritten),
				util::prettyBytes(response->file.item->totalBytes),
				response->file.item->progress);
		};

		const auto response = wingman::curl::fetch(request);

		fmt::print("\ndownloaded: {}, status code: {}\n", url, response.statusCode);
	}
}

int main(const int argc, char *argv[])
{
	argparse::ArgumentParser program("tool.insert.download");

	program.add_description("Schedule to download Llama model from Huggingface to Wingman models folder.");
	program.add_argument("--modelRepo")
		.required()
		.help("Huggingface model repository name in form '[RepoUser]/[ModelId]'");
	program.add_argument("--quantization")
		.help("Quantization to download. Defaults to `Q4_0`");

	try {
		program.parse_args(argc, argv);
	} catch (const std::runtime_error &err) {
		std::cerr << err.what() << std::endl;
		std::cerr << program;
		std::exit(1);
	}

	const auto modelRepo = program.present<std::string>("--modelRepo");
	const auto quantization = program.present<std::string>("--quantization");

	try {
		wingman::tools::start(modelRepo.value(), quantization.value_or("Q4_0"));
	} catch (const std::exception &e) {
		std::cerr << "Exception: " << std::string(e.what());
		return 1;
	}
	return 0;
}
