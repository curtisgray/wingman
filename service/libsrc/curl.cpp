#pragma once
#include <string>
#include <fstream>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

#include "curl.h"
#include "orm.h"
#include "util.hpp"

namespace wingman::curl {
	// add HF_MODEL_ENDS_WITH to the end of the modelRepo if it's not already there
	std::string unstripModelRepoName(const std::string &modelRepo)
	{
		if (modelRepo.empty()) {
			throw std::runtime_error("modelRepo is required, but is empty");
		}
		if (modelRepo.ends_with(HF_MODEL_ENDS_WITH)) {
			return modelRepo;
		}
		return modelRepo + HF_MODEL_ENDS_WITH;
	}

	// strip HF_MODEL_ENDS_WITH from the end of the modelRepo if it's there
	std::string stripModelRepoName(const std::string &modelRepo)
	{
		if (modelRepo.empty()) {
			throw std::runtime_error("modelRepo is required, but is empty");
		}
		if (modelRepo.ends_with(HF_MODEL_ENDS_WITH)) {
			return modelRepo.substr(0, modelRepo.size() - HF_MODEL_ENDS_WITH.size());
		}
		return modelRepo;
	}

	void updateItemProgress(Response *res)
	{
		// only update db every 5 seconds
		const auto seconds = std::time(nullptr) - res->file.item->updated;
		if (seconds < 1)
			return;
		if (res->file.item->totalBytes == 0) {
			// get the expected file size from the headers
			const auto contentLength = res->headers.find("Content-Length");
			if (contentLength != res->headers.end()) {
				const auto totalBytes = std::stoll(contentLength->second);
				if (totalBytes > 0)
					res->file.item->totalBytes = totalBytes;
			}
		}
		res->file.item->status = wingman::DownloadItemStatus::downloading;
		res->file.item->updated = std::time(nullptr);
		const auto totalBytesWritten = static_cast<long long>(res->file.totalBytesWritten);
		res->file.item->downloadedBytes = totalBytesWritten;
		res->file.item->downloadSpeed = util::calculateDownloadSpeed(res->file.start, totalBytesWritten);
		if (res->file.item->totalBytes > 0)
			res->file.item->progress = static_cast<double>(res->file.item->downloadedBytes) / static_cast<double>(res->file.item->totalBytes) * 100.0;
		else
			res->file.item->progress = -1;

		res->file.actions->set(*res->file.item);
		try {
			if (res->file.onProgress)
				res->file.onProgress(res);
		} catch (std::exception &e) {
			spdlog::error("onProgress failed: {}", e.what());
		}
	}

	Response fetch(const Request &request)
	{
		Response response;
		CURLcode res;

#pragma region CURL event handlers

		const auto headerFunction = +[](char *ptr, size_t size, size_t nmemb, void *userdata) {
			const auto res = static_cast<Response *>(userdata);
			const auto bytes = reinterpret_cast<std::byte *>(ptr);
			const auto numBytes = size * nmemb;
			const auto header = std::string(reinterpret_cast<char *>(bytes), numBytes);
			// trim any endline characters and split on the first colon
			const auto pos = header.find_first_of(':');
			if (pos != std::string::npos) {
				auto key = header.substr(0, pos);
				auto value = header.substr(pos + 1);
				// trim leading and trailing whitespace from key and value
				key = wingman::util::stringTrim(key);
				value = wingman::util::stringTrim(value);
				res->headers[key] = value;
			}

			return numBytes;
		};
		const auto writeFunction = +[](char *ptr, size_t size, size_t nmemb, void *userdata) {
			const auto res = static_cast<Response *>(userdata);

			res->file.fileExists = true;

			if (res->file.checkExistsThenExit) {
				// exit with CURLE_WRITE_ERROR to stop the download
				return static_cast<unsigned long long>(0);
			}

			const auto bytes = reinterpret_cast<std::byte *>(ptr);
			const auto numBytes = size * nmemb;

			spdlog::trace("Writing {} bytes to response memory", numBytes);
			res->data.insert(res->data.end(), bytes, bytes + numBytes);
			return numBytes;
		};
		const auto writeFileFunction = +[](char *ptr, size_t size, size_t nmemb, void *userdata) {
			const auto res = static_cast<Response *>(userdata);

			res->file.fileExists = true;

			if (res->file.checkExistsThenExit) {
				// exit with CURLE_WRITE_ERROR to stop the download
				return static_cast<std::streamsize>(0);
			}

			const auto bytes = reinterpret_cast<const char *>(ptr);
			const auto numBytes = static_cast<std::streamsize>(size * nmemb);
			std::streamsize bytesWritten = 0;
			if (res->file.handle != nullptr) {
				res->file.handle->write(bytes, numBytes);
				bytesWritten = numBytes;
				res->file.totalBytesWritten += bytesWritten;
				updateItemProgress(res);
			}
			spdlog::trace("Wrote {} bytes to {}", bytesWritten, res->file.handle == nullptr ? "nullptr" : "[handle]");
			return bytesWritten;
		};

#pragma endregion

		if (CURL *curl = curl_easy_init()) {

#ifndef NDEBUG // nasty double negative (means in debug mode)
		//curl_easy_setopt(curl, CURLOPT_VERBOSE, 1L);
#endif

			res = curl_easy_setopt(curl, CURLOPT_URL, request.url.c_str());
			if (request.file.item) {
				spdlog::debug("Downloading item: {}:{}", request.file.item->modelRepo, request.file.item->filePath);
				// verify that an item and actions are passed in along with the item
				if (!request.file.actions) {
					throw std::runtime_error("No actions passed in with the item.");
				}
				if (request.file.quantization) {
					//throw std::runtime_error("No quantization passed in with the item.");
					response.file.quantization = request.file.quantization;
				}
				response.file.start = std::time(nullptr);
				response.file.item = request.file.item;
				fs::path path;
				if (request.file.quantization) {
					path = request.file.actions->getDownloadItemOutputFilePathQuant(
						request.file.item->modelRepo, request.file.quantization.value());
				} else {
					path = request.file.actions->getDownloadItemOutputPath(
						request.file.item->modelRepo, request.file.item->filePath);
				}
				//path = request.file.actions->getDownloadItemOutputPath(
				//	request.file.item->modelRepo, request.file.item->filePath);
				response.file.handle = std::make_shared<std::ofstream>(path, std::ios::binary);
				if (!response.file.handle) {
					throw std::runtime_error(fmt::format("Failed to open file for writing: {}", path.string()));
				}
				response.file.actions = request.file.actions;
				response.file.onProgress = request.file.onProgress;
				spdlog::trace("Setting up CURLOPT_WRITEFUNCTION to writeFileFunction");
				res = curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeFileFunction);
				spdlog::trace("Setting CURLOPT_WRITEDATA to &response");
				res = curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
			} else {
				spdlog::debug("Requesting url: {}", request.url);
				spdlog::trace("Setting up CURLOPT_WRITEFUNCTION to writeFunction");
				res = curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeFunction);
				spdlog::trace("Setting CURLOPT_WRITEDATA to &response");
				res = curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
			}
			response.file.checkExistsThenExit = request.file.checkExistsThenExit;
			spdlog::trace("Setting up CURLOPT_HEADERFUNCTION to headerFunction");
			res = curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, headerFunction);
			res = curl_easy_setopt(curl, CURLOPT_HEADERDATA, &response);
			spdlog::trace("Enabling CURLOPT_AUTOREFERER and CURLOPT_FOLLOWLOCATION");
			res = curl_easy_setopt(curl, CURLOPT_AUTOREFERER, 1L);
			res = curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
			if (!request.method.empty()) {
				spdlog::trace("Setting CURLOPT_CUSTOMREQUEST to {}", request.method);
				res = curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, request.method.c_str());
			}
			if (!request.headers.empty()) {
				curl_slist *chunk = nullptr;
				for (const auto &[key, value] : request.headers) {
					spdlog::trace("Adding REQUEST header: {}: {}", key, value);
					const auto header = fmt::format("{}: {}", key, value);
					chunk = curl_slist_append(chunk, header.c_str());
				}
				res = curl_easy_setopt(curl, CURLOPT_HTTPHEADER, chunk);
			}
			if (!request.body.empty()) {
				spdlog::trace("Setting CURLOPT_POSTFIELDS to {}", request.body);
				res = curl_easy_setopt(curl, CURLOPT_POSTFIELDS, request.body.c_str());
				res = curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, request.body.size());
			}
			spdlog::trace("Calling curl_easy_perform");
			response.curlCode = curl_easy_perform(curl);
			// cleanup the file handle
			if (response.curlCode == CURLE_OK && response.file.handle) {
				spdlog::trace("Flusing file handle");
				response.file.handle->flush();
				spdlog::trace("Getting file size on disk");
				const auto fileSizeOnDisk = static_cast<long long>(response.file.handle->tellp());
				// print any error from ftell
				if (fileSizeOnDisk == -1L) {
					spdlog::error("ftell error: {}", strerror(errno));
					fmt::print("ftell error: {}\n", strerror(errno));
				}
				spdlog::trace("fileSizeOnDisk: {}", fileSizeOnDisk);
				if (fileSizeOnDisk != response.file.item->totalBytes) {
					throw std::runtime_error(
						fmt::format("File size on disk ({}) does not match total bytes ({})",
							fileSizeOnDisk, response.file.item->totalBytes));
				}
				spdlog::trace("Closing file handle");
				response.file.handle->close();

				auto item =
					response.file.actions->get(response.file.item->modelRepo, response.file.item->filePath);
				if (!item) {
					throw std::runtime_error(
						fmt::format("Failed to get item for modelRepo: {}, filePath: {}",
							response.file.item->modelRepo, response.file.item->filePath));
				}
				spdlog::trace("Setting DownloadItem status");
				item.value().downloadedBytes = fileSizeOnDisk;
				item.value().progress = static_cast<double>(response.file.totalBytesWritten) / static_cast<double>(fileSizeOnDisk) * 100.0;
				item.value().status = wingman::DownloadItemStatus::complete;
				item.value().updated = std::time(nullptr);
				response.file.actions->set(item.value());
			}
			spdlog::trace("Getting response code");
			res = curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response.statusCode);
			spdlog::debug("Response code: {}", response.statusCode);
			spdlog::trace("Calling curl_easy_cleanup");
			curl_easy_cleanup(curl);
		} else {
			throw std::runtime_error("Failed to initialize curl");
		}
		spdlog::trace("Returning response");
		return response;
	}

	Response fetch(const std::string &url)
	{
		const auto request = Request{ url };
		return fetch(request);
	}

	bool remoteFileExists(const std::string &url)
	{
		auto request = Request{ url };
		request.file.checkExistsThenExit = true;
		const auto response = fetch(request);
		return response.file.fileExists;
	}

	nlohmann::json getRawModels()
	{
		spdlog::trace("Fetching models from {}", HF_THEBLOKE_MODELS_URL);
		auto r = fetch(HF_THEBLOKE_MODELS_URL);
		spdlog::trace("HTTP status code: {}", r.statusCode);
		spdlog::trace("HTTP content-type: {}", r.headers["content-type"]);

		// parse json and print number of models
		auto j = nlohmann::json::parse(r.text());
		spdlog::trace("Total number of models: {}", j.size());

		// filter models by id ends with {HF_MODEL_ENDS_WITH}
		spdlog::trace("Filtering models by id ends with {}", HF_MODEL_ENDS_WITH);
		auto foundModels = nlohmann::json::array();
		for (auto &model : j) {
			auto id = model["id"].get<std::string>();
			if (id.ends_with(HF_MODEL_ENDS_WITH)) {
				foundModels.push_back(model);
			}
		}
		spdlog::trace("Total number of models ending with {}: {}", HF_MODEL_ENDS_WITH, foundModels.size());

		// group models by lastModified (date only)
		spdlog::trace("Grouping models by lastModified (date only)");
		std::map<std::string, std::vector<nlohmann::json>> sortedModels;
		for (auto &model : foundModels) {
			auto lastModified = model["lastModified"].get<std::string>().substr(0, 10);
			sortedModels[lastModified].push_back(model);
		}

		// now that we have a map of models, we can sort each vector by likes
		spdlog::trace("Sorting grouped models by likes");
		for (auto &val : sortedModels | std::views::values) {
			std::ranges::sort(val, [](const auto &a, const auto &b) {
				auto likesA = a["likes"].template get<int>();
				auto likesB = b["likes"].template get<int>();
				return likesA > likesB;
			});
		}

		spdlog::trace("Flattening sorted models");
		std::vector<nlohmann::json> modelsFlattened;
		for (auto &models : sortedModels | std::views::values) {
			for (auto &model : models) {
				modelsFlattened.push_back(model);
			}
		}

		// sort the flattened vector by lastModified descending
		spdlog::trace("Sorting flattened models by lastModified descending");
		std::ranges::sort(modelsFlattened, [](const auto &a, const auto &b) {
			auto lastModifiedA = a["lastModified"].template get<std::string>();
			auto lastModifiedB = b["lastModified"].template get<std::string>();
			return lastModifiedA > lastModifiedB;
		});

		return modelsFlattened;
	}

	nlohmann::json parseRawModels(const nlohmann::json &rawModels)
	{
		spdlog::trace("Total number of rawModels: {}", rawModels.size());

		auto json = nlohmann::json::array();

		for (auto model : rawModels) {
			nlohmann::json j;
			const auto id = model["id"].get<std::string>();
			j["id"] = id;
			j["name"] = stripModelRepoName(id);
			j["lastModified"] = model["lastModified"].get<std::string>();
			j["likes"] = model["likes"].get<int>();
			j["downloads"] = model["downloads"].get<int>();
			// id is composed of two parts in the format `modelRepo/modelId`
			const auto parts = util::splitString(id, '/');
			j["repoUser"] = parts[0];
			const auto &modelId = parts[1];
			j["modelId"] = modelId;
			j["modelName"] = stripModelRepoName(modelId);
			std::map<std::string, std::vector<nlohmann::json>> quantizations;
			for (auto &sibling : model["siblings"]) {
				const auto name = sibling["rfilename"].get<std::string>();
				const auto isSplitModel = util::stringContains(name, "gguf-split");
				const auto isFullModel = name.ends_with(HF_MODEL_FILE_EXTENSION);
				if (isFullModel || isSplitModel) {
					// quantization is the next to last part of the filename
					const auto &p = util::splitString(name, '.');
					const auto &quantization = p[p.size() - 2];
					quantizations[quantization].emplace_back(name);
				}
				j["hasSplitModel"] = isSplitModel;
			}
			j["quantizations"] = quantizations;
			json.push_back(j);
		}
		return json;
	}

	nlohmann::json getModels()
	{
		return parseRawModels(getRawModels());
	}

	nlohmann::json filterModels(nlohmann::json::const_reference models, const std::string &modelRepo, const std::optional<std::string> &filename, const std::optional<std::string> &quantization)
	{
		if (modelRepo.empty()) {
			throw std::runtime_error("modelRepo is required, but is empty");
		}
		if (!filename && !quantization) {
			throw std::runtime_error("either filename or quantization is required, but both are empty");
		}
		if (filename && quantization) {
			throw std::runtime_error("either filename or quantization is required, but both are provided");
		}

		const bool byFilePath = static_cast<bool>(filename);
		const bool byQuantization = static_cast<bool>(quantization);
		auto filteredModels = nlohmann::json::array();

		for (auto &model : models) {
			const auto id = model["id"].get<std::string>();
			if (id == modelRepo) {
				for (auto &[key, value] : model["quantizations"].items()) {
					if (byQuantization && util::stringCompare(key, quantization.value(), false)) {
						filteredModels.push_back(model);
						// quantization found so no need to continue
						break;
					}
					if (byFilePath) {
						for (auto &file : value) {
							if (util::stringCompare(file, filename.value(), false)) {
								filteredModels.push_back(model);
							}
						}
					}
				}
			}
		}
		return filteredModels;
	}

	nlohmann::json getModelByFilename(const std::string &modelRepo, std::string filename)
	{
		if (modelRepo.empty()) {
			throw std::runtime_error("modelRepo is required, but is empty");
		}
		if (filename.empty()) {
			throw std::runtime_error("filename is required, but is empty");
		}

		return filterModels(getModels(), modelRepo, filename);
	}

	std::optional<nlohmann::json> getModelByQuantization(const std::string &modelRepo, std::string quantization)
	{
		if (modelRepo.empty()) {
			throw std::runtime_error("modelRepo is required, but is empty");
		}
		if (quantization.empty()) {
			throw std::runtime_error("quantization is required, but is empty");
		}

		const auto models = filterModels(getModels(), modelRepo, {}, quantization);

		if (models.empty()) {
			return std::nullopt;
		}
		return models[0];
	}

	// filter a list of models that have a particular quantization
	nlohmann::json filterModelsByQuantization(nlohmann::json::const_reference models, const std::string &quantization)
	{
		if (quantization.empty()) {
			throw std::runtime_error("quantization is required, but is empty");
		}

		auto filteredModels = nlohmann::json::array();

		for (auto &model : models) {
			for (auto &[key, value] : model["quantizations"].items()) {
				if (util::stringCompare(key, quantization, false)) {
					filteredModels.push_back(model);
				}
			}
		}
		return filteredModels;
	}

	nlohmann::json getModelsByQuantization(const std::string &quantization)
	{
		if (quantization.empty()) {
			throw std::runtime_error("quantization is required, but is empty");
		}

		return filterModelsByQuantization(getModels(), quantization);
	}

	nlohmann::json getModelQuantizations(const std::string &modelRepo)
	{
		if (modelRepo.empty()) {
			throw std::runtime_error("modelRepo is required, but is empty");
		}

		auto filteredModels = filterModels(getModels(), modelRepo);
		auto quantizations = nlohmann::json::array();
		for (auto &model : filteredModels) {
			for (auto &item : model["quantizations"].items()) {
				quantizations.push_back(item);
			}
		}
		// remove duplicates
		quantizations.erase(std::ranges::unique(quantizations).begin(), quantizations.end());
		return quantizations;
	}

}
