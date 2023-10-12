#include <argparse/argparse.hpp>
#include <fmt/core.h>
#include <nlohmann/json.hpp>

#include "orm.h"
#include "curl.h"

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
	//CLI::App app{ "List available Huggingface.co Llama models. Use --modelRepo [search string] to search for models." };

	argparse::ArgumentParser program("tool.listavailable.downloads", "0.1");

	program
		.add_description("List available Huggingface.co Llama models. Use --modelRepo [search string] to search for models.");

	program.add_argument("-m", "--modelRepo")
		//.required()
		.help("Huggingface model repository name in form '[RepoUser]/[ModelId]'");

	try {
		program.parse_args(argc, argv);    // Example: ./main --color orange
	} catch (const std::runtime_error &err) {
		std::cerr << err.what() << std::endl;
		std::cerr << program;
		std::exit(1);
	}

	const auto modelRepo = program.present<std::string>("--modelRepo");

	try {
		wingman::tools::start(modelRepo);
	} catch (const std::exception &e) {
		std::cerr << "Exception: " << std::string(e.what());
		return 1;
	}
	return 0;
}
