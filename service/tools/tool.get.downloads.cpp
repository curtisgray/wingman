#include <CLI/CLI.hpp>
#include <fmt/core.h>
#include "./orm.hpp"
#include "./curl.hpp"
#include "./json.hpp"

namespace wingman::tools {
	void start(const std::optional<std::string> &modelRepo)
	{
		bool found = false;
		if (!modelRepo || modelRepo->empty() || modelRepo->find("/") == std::string::npos) {
			// display all models
			const auto models = curl::getModels();
			for (auto &model : models) {
				const auto &id = model["id"].get<std::string>();
				const auto &name = model["name"].get<std::string>();
				if (modelRepo && !modelRepo->empty()) {
					if (!util::stringContains(id, modelRepo.value(), false))
						continue;
				}
				found = true;
				fmt::print("Model: {} ({})\n", name, curl::HF_MODEL_ENDS_WITH);
				for (auto &[key, value] : model["quantizations"].items()) {
					if (value.size() > 1) {
						fmt::print("\t{} ({} parts)\n", key, value.size());
					} else {
						fmt::print("\t{}\n", key);
					}
				}
			}
		} else {
			// add the trailing HF_MODEL_ENDS_WITH if not present
			std::string modelRepoCopy = modelRepo.value();
			if (!modelRepoCopy.ends_with(curl::HF_MODEL_ENDS_WITH))
				modelRepoCopy.append(curl::HF_MODEL_ENDS_WITH);
			const auto models = curl::getModelQuantizations(modelRepoCopy);
			for (auto &model : models) {
				const auto &name = model["name"].get<std::string>();
				found = true;
				fmt::print("Model: {} ({})\n", name, curl::HF_MODEL_ENDS_WITH);
				for (auto &[key, value] : model["quantizations"].items()) {
					if (value.size() > 1) {
						fmt::print("\t{} ({} parts)\n", key, value.size());
					} else {
						fmt::print("\t{}\n", key);
					}
				}
			}
		}
		if (!found)
			fmt::print("Nothing found.\n");
	}
}

int main(int argc, char *argv[])
{
	CLI::App app{ "List available downloads tool" };

	std::string modelRepo;
	std::string quantization;

	const auto modelRepoOption = app.add_option("-m,--modelRepo", modelRepo, "Huggingface model repository name in form '[RepoUser]/[ModelId]'");

	CLI11_PARSE(app, argc, argv)

	try {
		wingman::tools::start(modelRepo);
	} catch (const std::exception &e) {
		std::cerr << "Exception: " << std::string(e.what());
		return 1;
	}
	return 0;
}
