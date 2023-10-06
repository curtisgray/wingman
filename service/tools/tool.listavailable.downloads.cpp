#include <CLI/CLI.hpp>
#include "./orm.hpp"
#include "./curl.hpp"
#include "./json.hpp"

namespace wingman::tools {
	namespace fs = std::filesystem;

	void start(std::string modelRepo, std::optional<std::string> quantization)
	{
		spdlog::info("List available downloads tool start.");

		const std::string file{ __FILE__ };
		const fs::path directory = fs::path(file).parent_path();
		const auto baseDirectory = directory / fs::path("out");
		fs::create_directories(baseDirectory);
		ItemActionsFactory actionsFactory;

		const auto fullModels = curl::getRawModels();
		std::ofstream ofs(baseDirectory / fs::path("hf.thebloke.ggml.models.json"));
		ofs << fullModels.dump(4);
		ofs.close();

		const auto models = curl::parseRawModels(fullModels);
		ofs.open(baseDirectory / fs::path("models.json"));
		ofs << models.dump(4);
		ofs.close();

		//const auto filteredModels = curl::filterModels(models, modelRepo, filePath, quantization);

		spdlog::info("List available downloads success.");
	}
}

int main(int argc, char *argv[])
{
	CLI::App app{ "List available downloads tool" };

	std::string modelRepo;
	//std::string filePath;
	std::string quantization;

	const auto modelRepoOption = app.add_option("-m,--modelRepo", modelRepo, "Huggingface model repository name in form '[RepoUser]/[ModelId]'");
	const auto quantizationOption = app.add_option("-q,--quantization", quantization, "Quantization in the form 'Q_[number]'");
	//const auto filePathOption = app.add_option("-f,--filePath", filePath, "File path");

	modelRepoOption->required(true);
	//modelIdOption->excludes(filePathOption);
	//filePathOption->excludes(quantizationOption);
	//quantizationOption->excludes(filePathOption);
	// set log level to trace
	spdlog::set_level(spdlog::level::trace);
	if (argc != 1) {
		spdlog::error("Usage: {}", argv[0]);
		return 1;
	}
	try {
		wingman::tools::start(modelRepo, quantization);
	} catch (const std::exception &e) {
		spdlog::error("Exception: " + std::string(e.what()));
		return 1;
	}
	spdlog::info("Job's done.");
	return 0;
}
