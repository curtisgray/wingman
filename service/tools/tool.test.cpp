#include <string>
#include <argparse/argparse.hpp>

#include "curl.h"
#include "orm.h"

int main(int argc, char *argv[])
{
	spdlog::set_level(spdlog::level::trace);

	argparse::ArgumentParser program("tool.insert.download");
	program.add_argument("-m", "--modelRepo").required().help("Huggingface model repository name in form '[RepoUser]/[ModelId]'");
	program.add_argument("-q", "--quantization").required().help("Quantization to download").default_value("Q4_0");

	try {
		program.parse_args(argc, argv);
	} catch (const std::runtime_error &err) {
		std::cerr << err.what() << std::endl;
		std::cerr << program;
		std::exit(1);
	}

	const auto modelRepo = program.get<std::string>("--modelRepo");
	const auto quantization = program.get<std::string>("--quantization");

	try {
		// check if model exists on the download server
		const auto url = wingman::DownloadItemActions::urlForModelQuant(modelRepo, quantization);
		auto request = wingman::curl::Request{ url};
		request.file.checkExistsThenExit = true;
		const auto response = wingman::curl::fetch(request);
		if (response.file.fileExists) {
			std::cout << "Model found on server: " << modelRepo << std::endl;
		} else {
			std::cout << "Model not found on server: " << modelRepo << std::endl;
		}
	} catch (const std::exception &e) {
		std::cerr << "Exception: " << std::string(e.what());
		return 1;
	}


	return 0;
}
