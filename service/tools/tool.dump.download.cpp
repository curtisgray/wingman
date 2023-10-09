#include <CLI/CLI.hpp>
#include "./orm.hpp"
#include "./curl.hpp"
#include "./json.hpp"

namespace wingman::tools {
	namespace fs = std::filesystem;

	void start()
	{
		spdlog::info("Dump model data to files.");

		const std::string file{ __FILE__ };
		const fs::path directory = fs::path(file).parent_path();
		const auto baseDirectory = directory / fs::path("out");
		fs::create_directories(baseDirectory);

		const auto fullModels = curl::getRawModels();
		const auto rawModelsOutputPath = baseDirectory / fs::path("raw.models.json");
		std::ofstream ofs(rawModelsOutputPath);
		spdlog::info("Writing {} raw models to {}", fullModels.size(), (rawModelsOutputPath).string());
		ofs << fullModels.dump(4);
		ofs.close();

		const auto models = curl::parseRawModels(fullModels);
		const auto modelsOutputPath = baseDirectory / fs::path("models.json");
		ofs.open(modelsOutputPath);
		spdlog::info("Writing {} parsed models to {}", models.size(), (modelsOutputPath).string());
		ofs << models.dump(4);
		ofs.close();

		spdlog::info("Success.");
	}
}

int main(int argc, char *argv[])
{
	spdlog::set_level(spdlog::level::trace);
	if (argc != 1) {
		spdlog::error("Usage: {}", argv[0]);
		return 1;
	}
	try {
		wingman::tools::start();
	} catch (const std::exception &e) {
		spdlog::error("Exception: " + std::string(e.what()));
		return 1;
	}
	spdlog::info("Job's done.");
	return 0;
}
