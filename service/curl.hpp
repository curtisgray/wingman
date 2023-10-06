#pragma once
#include <string>
#include <cpr/cpr.h>

namespace wingman::curl {
	const std::string HF_THEBLOKE_MODELS_URL = "https://huggingface.co/api/models?author=TheBloke&search=GGML&sort=lastModified&direction=-1&full=full";
	const std::string HF_THEBLOKE_MODEL_URL = "https://huggingface.co/TheBloke";

	inline std::vector<std::string> splitString(const std::string &input, const char delimiter = '/')
	{
		std::vector<std::string> result;
		std::istringstream iss(input);
		std::string s;
		while (std::getline(iss, s, delimiter)) {
			result.push_back(s);
		}
		return result;
	}

	inline bool stringCompare(const std::string &first, const std::string &second, const bool caseSensitive = true)
	{
		return std::ranges::equal(first, second, [caseSensitive](const char a, const char b) {
			if (caseSensitive)
				return a == b;
			return tolower(a) == tolower(b);
		});
	}

	inline cpr::Response get(const std::string &url)
	{
		cpr::Response r = cpr::Get(cpr::Url{ url });
		if (r.status_code != 200) {
			throw std::runtime_error("HTTP status code: " + std::to_string(r.status_code));
		}
		//r.header["content-type"];       // application/json; charset=utf-8
		//r.text;                         // JSON text string
		return r;
	}

	inline nlohmann::json getRawModels()
	{
		auto r = wingman::curl::get(HF_THEBLOKE_MODELS_URL);
		spdlog::trace("HTTP status code: {}", r.status_code);
		spdlog::trace("HTTP content-type: {}", r.header["content-type"]);

		// parse json and print number of models
		auto j = nlohmann::json::parse(r.text);
		spdlog::trace("Total number of models: {}", j.size());

		// filter models by id ends with `-GGML`
		auto jGGML = nlohmann::json::array();
		for (auto &model : j) {
			auto id = model["id"].get<std::string>();
			if (id.ends_with("-GGML")) {
				jGGML.push_back(model);
			}
		}
		spdlog::trace("Total number of GGML models: {}", jGGML.size());

		// group models by lastModified (date only)
		std::map<std::string, std::vector<nlohmann::json>> ggmlModels;
		for (auto &model : jGGML) {
			auto lastModified = model["lastModified"].get<std::string>().substr(0, 10);
			ggmlModels[lastModified].push_back(model);
		}

		// now that we have a map of models, we can sort each vector by likes
		for (auto &val : ggmlModels | std::views::values) {
			std::ranges::sort(val, [](const auto &a, const auto &b) {
				auto likesA = a["likes"].template get<int>();
				auto likesB = b["likes"].template get<int>();
				return likesA > likesB;
			});
		}

		std::vector<nlohmann::json> ggmlModelsFlattened;
		for (auto &models : ggmlModels | std::views::values) {
			for (auto &model : models) {
				ggmlModelsFlattened.push_back(model);
			}
		}
		// sort the flattened vector by lastModified descending
		std::ranges::sort(ggmlModelsFlattened, [](const auto &a, const auto &b) {
			auto lastModifiedA = a["lastModified"].template get<std::string>();
			auto lastModifiedB = b["lastModified"].template get<std::string>();
			return lastModifiedA > lastModifiedB;
		});
		// put the flattened vector back into nlohmann::json
		jGGML = ggmlModelsFlattened;

		return jGGML;
	}

	inline nlohmann::json parseRawModels(const nlohmann::json &rawModels)
	{
		spdlog::trace("Total number of rawModels: {}", rawModels.size());

		auto json = nlohmann::json::array();

		for (auto model : rawModels) {
			nlohmann::json j;
			const auto id = model["id"].get<std::string>();
			j["id"] = id;
			j["lastModified"] = model["lastModified"].get<std::string>();
			j["likes"] = model["likes"].get<int>();
			j["downloads"] = model["downloads"].get<int>();
			// id is composed of two parts in the format `modelRepo/modelId`
			const auto parts = splitString(id, '/');
			j["repoUser"] = parts[0];
			j["modelId"] = parts[1];
			for (auto &file : model["siblings"]) {
				const auto name = file["rfilename"].get<std::string>();
				if (name.ends_with(".bin")) {
					// quantization is the next to last part of the filename
					const auto p = splitString(name, '.');
					const auto &quantization = p[p.size() - 2];
					j["files"].push_back({ {"filename", name}, {"quantization", quantization} });
				}
			}
			json.push_back(j);
		}
		return json;
	}

	inline nlohmann::json getModels()
	{
		return parseRawModels(getRawModels());
	}

	inline nlohmann::json filterModels(nlohmann::json::const_reference models, const std::string &modelRepo, const std::optional<std::string> &filename = {}, const std::optional<std::string> &quantization = {})
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
				for (auto &file : model["files"]) {
					const auto f = file["filename"].get<std::string>();
					const auto q = file["quantization"].get<std::string>();
					// do case insensitive filename and quantization comparison
					if (byFilePath && stringCompare(f, filename.value(), false)) {
						filteredModels.push_back(model);
					}
					if (byQuantization && stringCompare(q, quantization.value(), false)) {
						filteredModels.push_back(model);
					}
				}
			}
		}
		return filteredModels;
	}

	inline nlohmann::json getModelByFilename(const std::string &modelRepo, std::string filename)
	{
		if (modelRepo.empty()) {
			throw std::runtime_error("modelRepo is required, but is empty");
		}
		if (filename.empty()) {
			throw std::runtime_error("filename is required, but is empty");
		}

		auto filteredModels = filterModels(getModels(), modelRepo, filename);
		return filteredModels;
	}

	inline nlohmann::json getModelByQuantization(const std::string &modelRepo, std::string quantization)
	{
		if (modelRepo.empty()) {
			throw std::runtime_error("modelRepo is required, but is empty");
		}
		if (quantization.empty()) {
			throw std::runtime_error("quantization is required, but is empty");
		}

		auto filteredModels = filterModels(getModels(), modelRepo, {}, quantization);
		return filteredModels;
	}

	// filter a list of models that have quantization
	inline nlohmann::json filterModelsByQuantization(nlohmann::json::const_reference models, const std::string &quantization)
	{
		if (quantization.empty()) {
			throw std::runtime_error("quantization is required, but is empty");
		}

		auto filteredModels = nlohmann::json::array();

		for (auto &model : models) {
			for (auto &file : model["files"]) {
				const auto q = file["quantization"].get<std::string>();
				// do case insensitive filename and quantization comparison
				if (stringCompare(q, quantization, false)) {
					filteredModels.push_back(model);
				}
			}
		}
		return filteredModels;
	}

	inline nlohmann::json getModelsByQuantization(const std::string &quantization)
	{
		if (quantization.empty()) {
			throw std::runtime_error("quantization is required, but is empty");
		}

		auto filteredModels = filterModelsByQuantization(getModels(), quantization);
		return filteredModels;
	}

}
