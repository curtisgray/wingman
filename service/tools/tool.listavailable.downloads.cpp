#include <CLI/CLI.hpp>
#include <fmt/core.h>
#include "./orm.hpp"
#include "./curl.hpp"
#include "./json.hpp"

namespace wingman::tools {
	void start(const std::string &modelRepo, const std::string &quantization)
	{
		const auto model = curl::getModelByQuantization(modelRepo, quantization);
		if (!model) {
			fmt::print("Nothing found.\n");
			return;
		}
		// get quantization files
		const auto quantizationFiles = model.value()["quantizations"][quantization];
		// download files to models directory
		const std::string file{ __FILE__ };
		const fs::path directory = fs::path(file).parent_path();
		const auto baseDirectory = directory / fs::path("out");
		fs::create_directories(baseDirectory);
		ItemActionsFactory itemActionsFactory(baseDirectory);


	}
}

int main(int argc, char *argv[])
{
	CLI::App app{ "Download model tool" };

	std::string modelRepo;
	std::string quantization;

	const auto modelRepoOption = app.add_option("-m,--modelRepo", modelRepo, "Huggingface model repository name in form '[RepoUser]/[ModelId]'");
	const auto quantizationOption = app.add_option("-q,--quantization", quantization, "Quantization to download");

	modelRepoOption->required(true);
	quantizationOption->required(true);

	CLI11_PARSE(app, argc, argv)

	try {
		wingman::tools::start(modelRepo, quantization);
	} catch (const std::exception &e) {
		std::cerr << "Exception: " << std::string(e.what());
		return 1;
	}
	return 0;
}
