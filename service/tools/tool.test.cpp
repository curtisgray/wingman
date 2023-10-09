#include <cerrno>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <curl/curl.h>
#include <fmt/core.h>
#include "json.hpp"
#include "util.hpp"
#include "orm.hpp"

namespace fs = std::filesystem;

int main()
{
	spdlog::set_level(spdlog::level::debug);

	const auto modelRepo = R"(TheBloke/samantha-mistral-7B)";
	const auto quantization = R"(Q5_K_M)";

	//try {
	fmt::print("modelRepo: {}, quantization: {}\n", modelRepo, quantization);
	const auto url = urlForModel(modelRepo, quantization);
	fmt::print("url: {}\n", url);

	//const auto request = Request{ "https://dummyjson.com/products/1" };
	//const auto request = Request{ "https://dummyjson.com/products/1", "GET", { { "Accept", "application/json" } } };

	// download model to file
	const std::string file{ __FILE__ };
	const fs::path directory = fs::path(file).parent_path();
	const auto baseDirectory = directory / fs::path("out");
	fs::create_directories(baseDirectory);
	wingman::ItemActionsFactory itemActionsFactory(baseDirectory);

	//const auto downloadFile = itemActionsFactory.getModelsDir() / wingman::DownloadItemActions::getDownloadItemQuantizedFilePath(modelRepo, quantization);
	const auto filePath = wingman::DownloadItemActions::getFileNameFromModelRepo(modelRepo, quantization);
	const auto item = itemActionsFactory.download()->enqueue(modelRepo, filePath);
	const auto request = Request{ url, {}, {}, {}, {  item, quantization, itemActionsFactory.download() } };
	const auto response = fetch(request);
	//const auto response = fetch("https://dummyjson.com/products/1");

	const auto json = response.json();
	fmt::print("json: {}\n", json.dump(4));
//} catch (const std::exception &e) {
//	fmt::print("Exception: {}\n", e.what());
//	return 1;
//}
	return 0;
}
