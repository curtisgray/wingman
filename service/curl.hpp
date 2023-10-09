#pragma once
#include <string>
#include <curl/curl.h>
#include "./util.hpp"

#ifdef _MSC_VER
#define _CRT_SECURE_NO_WARNINGS
#endif

//#pragma region CURLcode to string
//inline std::ostream &operator<<(std::ostream &os, const CURLcode cc)
//{
//	switch (cc) {
//		case CURLE_OK: return os << "CURLE_OK";
//		case CURLE_UNSUPPORTED_PROTOCOL: return os << "CURLE_UNSUPPORTED_PROTOCOL";
//		case CURLE_FAILED_INIT: return os << "CURLE_FAILED_INIT";
//		case CURLE_URL_MALFORMAT: return os << "CURLE_URL_MALFORMAT";
//		case CURLE_NOT_BUILT_IN: return os << "CURLE_NOT_BUILT_IN";
//		case CURLE_COULDNT_RESOLVE_PROXY: return os << "CURLE_COULDNT_RESOLVE_PROXY";
//		case CURLE_COULDNT_RESOLVE_HOST: return os << "CURLE_COULDNT_RESOLVE_HOST";
//		case CURLE_COULDNT_CONNECT: return os << "CURLE_COULDNT_CONNECT";
//		case CURLE_WEIRD_SERVER_REPLY: return os << "CURLE_WEIRD_SERVER_REPLY";
//		case CURLE_REMOTE_ACCESS_DENIED: return os << "CURLE_REMOTE_ACCESS_DENIED";
//		case CURLE_FTP_ACCEPT_FAILED: return os << "CURLE_FTP_ACCEPT_FAILED";
//		case CURLE_FTP_WEIRD_PASS_REPLY: return os << "CURLE_FTP_WEIRD_PASS_REPLY";
//		case CURLE_FTP_ACCEPT_TIMEOUT: return os << "CURLE_FTP_ACCEPT_TIMEOUT";
//		case CURLE_FTP_WEIRD_PASV_REPLY: return os << "CURLE_FTP_WEIRD_PASV_REPLY";
//		case CURLE_FTP_WEIRD_227_FORMAT: return os << "CURLE_FTP_WEIRD_227_FORMAT";
//		case CURLE_FTP_CANT_GET_HOST: return os << "CURLE_FTP_CANT_GET_HOST";
//		case CURLE_HTTP2: return os << "CURLE_HTTP2";
//		case CURLE_FTP_COULDNT_SET_TYPE: return os << "CURLE_FTP_COULDNT_SET_TYPE";
//		case CURLE_PARTIAL_FILE: return os << "CURLE_PARTIAL_FILE";
//		case CURLE_FTP_COULDNT_RETR_FILE: return os << "CURLE_FTP_COULDNT_RETR_FILE";
//		case CURLE_OBSOLETE20: return os << "CURLE_OBSOLETE20";
//		case CURLE_QUOTE_ERROR: return os << "CURLE_QUOTE_ERROR";
//		case CURLE_HTTP_RETURNED_ERROR: return os << "CURLE_HTTP_RETURNED_ERROR";
//		case CURLE_WRITE_ERROR: return os << "CURLE_WRITE_ERROR";
//		case CURLE_OBSOLETE24: return os << "CURLE_OBSOLETE24";
//		case CURLE_UPLOAD_FAILED: return os << "CURLE_UPLOAD_FAILED";
//		case CURLE_READ_ERROR: return os << "CURLE_READ_ERROR";
//		case CURLE_OUT_OF_MEMORY: return os << "CURLE_OUT_OF_MEMORY";
//		case CURLE_OPERATION_TIMEDOUT: return os << "CURLE_OPERATION_TIMEDOUT";
//		case CURLE_OBSOLETE29: return os << "CURLE_OBSOLETE29";
//		case CURLE_FTP_PORT_FAILED: return os << "CURLE_FTP_PORT_FAILED";
//		case CURLE_FTP_COULDNT_USE_REST: return os << "CURLE_FTP_COULDNT_USE_REST";
//		case CURLE_OBSOLETE32: return os << "CURLE_OBSOLETE32";
//		case CURLE_RANGE_ERROR: return os << "CURLE_RANGE_ERROR";
//		case CURLE_HTTP_POST_ERROR: return os << "CURLE_HTTP_POST_ERROR";
//		case CURLE_SSL_CONNECT_ERROR: return os << "CURLE_SSL_CONNECT_ERROR";
//		case CURLE_BAD_DOWNLOAD_RESUME: return os << "CURLE_BAD_DOWNLOAD_RESUME";
//		case CURLE_FILE_COULDNT_READ_FILE: return os << "CURLE_FILE_COULDNT_READ_FILE";
//		case CURLE_LDAP_CANNOT_BIND: return os << "CURLE_LDAP_CANNOT_BIND";
//		case CURLE_LDAP_SEARCH_FAILED: return os << "CURLE_LDAP_SEARCH_FAILED";
//		case CURLE_OBSOLETE40: return os << "CURLE_OBSOLETE40";
//		case CURLE_FUNCTION_NOT_FOUND: return os << "CURLE_FUNCTION_NOT_FOUND";
//		case CURLE_ABORTED_BY_CALLBACK: return os << "CURLE_ABORTED_BY_CALLBACK";
//		case CURLE_BAD_FUNCTION_ARGUMENT: return os << "CURLE_BAD_FUNCTION_ARGUMENT";
//		case CURLE_OBSOLETE44: return os << "CURLE_OBSOLETE44";
//		case CURLE_INTERFACE_FAILED: return os << "CURLE_INTERFACE_FAILED";
//		case CURLE_OBSOLETE46: return os << "CURLE_OBSOLETE46";
//		case CURLE_TOO_MANY_REDIRECTS: return os << "CURLE_TOO_MANY_REDIRECTS";
//		case CURLE_UNKNOWN_OPTION: return os << "CURLE_UNKNOWN_OPTION";
//		case CURLE_SETOPT_OPTION_SYNTAX: return os << "CURLE_SETOPT_OPTION_SYNTAX";
//		case CURLE_OBSOLETE50: return os << "CURLE_OBSOLETE50";
//		case CURLE_OBSOLETE51: return os << "CURLE_OBSOLETE51";
//		case CURLE_GOT_NOTHING: return os << "CURLE_GOT_NOTHING";
//		case CURLE_SSL_ENGINE_NOTFOUND: return os << "CURLE_SSL_ENGINE_NOTFOUND";
//		case CURLE_SSL_ENGINE_SETFAILED: return os << "CURLE_SSL_ENGINE_SETFAILED";
//		case CURLE_SEND_ERROR: return os << "CURLE_SEND_ERROR";
//		case CURLE_RECV_ERROR: return os << "CURLE_RECV_ERROR";
//		case CURLE_OBSOLETE57: return os << "CURLE_OBSOLETE57";
//		case CURLE_SSL_CERTPROBLEM: return os << "CURLE_SSL_CERTPROBLEM";
//		case CURLE_SSL_CIPHER: return os << "CURLE_SSL_CIPHER";
//		case CURLE_PEER_FAILED_VERIFICATION: return os << "CURLE_PEER_FAILED_VERIFICATION";
//		case CURLE_BAD_CONTENT_ENCODING: return os << "CURLE_BAD_CONTENT_ENCODING";
//		case CURLE_OBSOLETE62: return os << "CURLE_OBSOELETE62";
//		case CURLE_FILESIZE_EXCEEDED: return os << "CURLE_FILESIZE_EXCEEDED";
//		case CURLE_USE_SSL_FAILED: return os << "CURLE_USE_SSL_FAILED";
//		case CURLE_SEND_FAIL_REWIND: return os << "CURLE_SEND_FAIL_REWIND";
//		case CURLE_SSL_ENGINE_INITFAILED: return os << "CURLE_SSL_ENGINE_INITFAILED";
//		case CURLE_LOGIN_DENIED: return os << "CURLE_LOGIN_DENIED";
//		case CURLE_TFTP_NOTFOUND: return os << "CURLE_TFTP_NOTFOUND";
//		case CURLE_TFTP_PERM: return os << "CURLE_TFTP_PERM";
//		case CURLE_REMOTE_DISK_FULL: return os << "CURLE_REMOTE_DISK_FULL";
//		case CURLE_TFTP_ILLEGAL: return os << "CURLE_TFTP_ILLEGAL";
//		case CURLE_TFTP_UNKNOWNID: return os << "CURLE_TFTP_UNKNOWNID";
//		case CURLE_REMOTE_FILE_EXISTS: return os << "CURLE_REMOTE_FILE_EXISTS";
//		case CURLE_TFTP_NOSUCHUSER: return os << "CURLE_TFTP_NOSUCHUSER";
//		case CURLE_OBSOLETE75: return os << "CURLE_OBSOLETE75";
//		case CURLE_OBSOLETE76: return os << "CURLE_OBSOLETE76";
//		case CURLE_SSL_CACERT_BADFILE: return os << "CURLE_SSL_CACERT_BADFILE";
//		case CURLE_REMOTE_FILE_NOT_FOUND: return os << "CURLE_REMOTE_FILE_NOT_FOUND";
//		case CURLE_SSH: return os << "CURLE_SSH";
//		case CURLE_SSL_SHUTDOWN_FAILED: return os << "CURLE_SSL_SHUTDOWN_FAILED";
//		case CURLE_AGAIN: return os << "CURLE_AGAIN";
//		case CURLE_SSL_CRL_BADFILE: return os << "CURLE_SSL_CRL_BADFILE";
//		case CURLE_SSL_ISSUER_ERROR: return os << "CURLE_SSL_ISSUER_ERROR";
//		case CURLE_FTP_PRET_FAILED: return os << "CURLE_FTP_PRET_FAILED";
//		case CURLE_RTSP_CSEQ_ERROR: return os << "CURLE_RTSP_CSEQ_ERROR";
//		case CURLE_RTSP_SESSION_ERROR: return os << "CURLE_RTSP_SESSION_ERROR";
//		case CURLE_FTP_BAD_FILE_LIST: return os << "CURLE_FTP_BAD_FILE_LIST";
//		case CURLE_CHUNK_FAILED: return os << "CURLE_CHUNK_FAILED";
//		case CURLE_NO_CONNECTION_AVAILABLE: return os << "CURLE_NO_CONNECTION_AVAILABLE";
//		case CURLE_SSL_PINNEDPUBKEYNOTMATCH: return os << "CURLE_SSL_PINNEDPUBKEYNOTMATCH";
//		case CURLE_SSL_INVALIDCERTSTATUS: return os << "CURLE_SSL_INVALIDCERTSTATUS";
//		case CURLE_HTTP2_STREAM: return os << "CURLE_HTTP2_STREAM";
//		case CURLE_RECURSIVE_API_CALL: return os << "CURLE_RECURSIVE_API_CALL";
//		case CURLE_AUTH_ERROR: return os << "CURLE_AUTH_ERROR";
//		case CURLE_HTTP3: return os << "CURLE_HTTP3";
//		case CURLE_QUIC_CONNECT_ERROR: return os << "CURLE_QUIC_CONNECT_ERROR";
//		case CURLE_PROXY: return os << "CURLE_PROXY";
//		case CURLE_SSL_CLIENTCERT: return os << "CURLE_SSL_CLIENTCERT";
//		case CURLE_UNRECOVERABLE_POLL: return os << "CURLE_UNRECOVERABLE_POLL";
//		case CURL_LAST: return os << "CURL_LAST";
//		default: return os << "UNKNOWN";
//	}
//}
//#pragma endregion

namespace wingman {
	class DownloadItemActions;
}

namespace wingman::curl {
	const std::string HF_MODEL_ENDS_WITH = "-GGUF";
	const std::string HF_MODEL_FILE_EXTENSION = ".gguf";
	const std::string HF_THEBLOKE_MODELS_URL = "https://huggingface.co/api/models?author=TheBloke&search=" + HF_MODEL_ENDS_WITH + "&sort=lastModified&direction=-1&full=full";
	const std::string HF_THEBLOKE_MODEL_URL = "https://huggingface.co/TheBloke";

	// add HF_MODEL_ENDS_WITH to the end of the modelRepo if it's not already there
	inline std::string unstripModelRepoName(const std::string &modelRepo)
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
	inline std::string stripModelRepoName(const std::string &modelRepo)
	{
		if (modelRepo.empty()) {
			throw std::runtime_error("modelRepo is required, but is empty");
		}
		if (modelRepo.ends_with(HF_MODEL_ENDS_WITH)) {
			return modelRepo.substr(0, modelRepo.size() - HF_MODEL_ENDS_WITH.size());
		}
		return modelRepo;
	}


	struct Response {
		std::vector<std::byte> data;
		CURLcode curlCode;
		long httpCode;
		std::map<std::string, std::string, wingman::util::ci_less> headers;

		struct ResponseFile {
			std::time_t start;
			std::streamsize totalBytesWritten     = 0;
			std::shared_ptr<std::ofstream> handle = nullptr;
			std::shared_ptr<DownloadItem> item    = nullptr;
			std::optional<std::string> quantization;
			std::shared_ptr<DownloadItemActions> actions = nullptr;
		} file;

		std::string getContentType()
			const
		{
			const auto contentType = headers.find("Content-Type");
			if (contentType == headers.end())
				throw std::runtime_error("No Content-Type header found.");
			return contentType->second;
		}

		bool hasJson() const
		{
			// check if the content type is json
			const auto contentType = headers.find("Content-Type");
			if (contentType == headers.end())
				return false;
			// check if contentType includes "application/json"
			if (util::stringContains(contentType->second, "application/json"))
				return true;
			return false;
		}

		[[nodiscard]] std::string text() const
		{
			if (data.empty())
				return "";
			return std::string(reinterpret_cast<const char *>(data.data()), data.size());
		}

		[[nodiscard]] nlohmann::json json() const
		{
			return nlohmann::json::parse(text());
		}
	};

	struct Request {
		std::string url;
		std::string method;
		std::map<std::string, std::string, wingman::util::ci_less> headers;
		std::string body;

		// setting this will cause the file to be downloaded to the specified path
		struct RequestFile {
			std::shared_ptr<DownloadItem> item = nullptr;
			std::optional<std::string> quantization;
			std::shared_ptr<DownloadItemActions> actions = nullptr;
		} file;
	};

	std::string prettyBytes(const long long bytes)
	{
		if (bytes < 1024)
			return fmt::format("{} B", bytes);

		const char *suffixes[9];
		suffixes[0] = "B";
		suffixes[1] = "KB";
		suffixes[2] = "MB";
		suffixes[3] = "GB";
		suffixes[4] = "TB";
		suffixes[5] = "PB";
		suffixes[6] = "EB";
		suffixes[7] = "ZB";
		suffixes[8] = "YB";
		unsigned long long s = 0; // which suffix to use
		auto count = static_cast<double>(bytes);
		while (count >= 1024.0 && s < std::size(suffixes) - 1) {
			s++;
			count /= 1024.0;
		}
		return fmt::format("{:.1f} {}", count, suffixes[s]);
	}

	std::string calculateDownloadSpeed(const std::time_t start, const long long totalBytes)
	{
		const auto elapsedSeconds = std::time(nullptr) - start;
		if (elapsedSeconds <= 0 || totalBytes <= 0)
			return "0 B/s";
		const auto bytesPerSecond = totalBytes / elapsedSeconds;
		return prettyBytes(bytesPerSecond) + "/s";
	}

	void updateItemProgress(Response *res)
	{
		// only update db every 5 seconds
		if (std::time(nullptr) - res->file.item->updated < 5)
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
		res->file.item->downloadSpeed = calculateDownloadSpeed(res->file.start, totalBytesWritten);
		if (res->file.item->totalBytes > 0)
			res->file.item->progress = static_cast<double>(res->file.item->downloadedBytes) / static_cast<double>(res->file.item->totalBytes) * 100.0;
		else
			res->file.item->progress = -1;

		res->file.actions->set(*res->file.item);
	}

	Response fetch(const Request &request)
	{
		Response response;

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
			const auto bytes = reinterpret_cast<std::byte *>(ptr);
			const auto numBytes = size * nmemb;
			res->data.insert(res->data.end(), bytes, bytes + numBytes);
			return numBytes;
		};
		const auto writeFileFunction = +[](char *ptr, size_t size, size_t nmemb, void *userdata) {
			const auto res = static_cast<Response *>(userdata);
			const auto bytes = reinterpret_cast<const char *>(ptr);
			const auto numBytes = static_cast<std::streamsize>(size * nmemb);
			std::streamsize bytesWritten = 0;
			if (res->file.handle != nullptr) {
				res->file.handle->write(bytes, numBytes);
				bytesWritten = numBytes;
				res->file.totalBytesWritten += bytesWritten;
				updateItemProgress(res);
			}
			return bytesWritten;
		};

		if (CURL *curl = curl_easy_init()) {
#ifndef NDEBUG // nasty double negative (means in debug mode)
		//curl_easy_setopt(curl, CURLOPT_VERBOSE, 1L);
#endif

			curl_easy_setopt(curl, CURLOPT_URL, request.url.c_str());
			if (request.file.item) {
				// verify that an item and actions are passed in along with the item
				if (!request.file.actions) {
					throw std::runtime_error("No actions passed in with the item.");
				}
				if (!request.file.quantization) {
					throw std::runtime_error("No quantization passed in with the item.");
				}
				response.file.start = std::time(nullptr);
				response.file.item = request.file.item;
				response.file.quantization = request.file.quantization;
				const auto path = request.file.actions->getDownloadItemQuantizedFilePath(
					request.file.item->modelRepo, request.file.quantization.value());
				response.file.handle = std::make_shared<std::ofstream>(path, std::ios::binary);
				if (!response.file.handle) {
					throw std::runtime_error(fmt::format("Failed to open file for writing: {}", path));
				}
				response.file.actions = request.file.actions;
				curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeFileFunction);
				curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
			} else {
				curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeFunction);
				curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
			}
			curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, headerFunction);
			curl_easy_setopt(curl, CURLOPT_HEADERDATA, &response);
			curl_easy_setopt(curl, CURLOPT_AUTOREFERER, 1L);
			curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
			if (!request.method.empty())
				curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, request.method.c_str());
			if (!request.headers.empty()) {
				curl_slist *chunk = nullptr;
				for (const auto &[key, value] : request.headers) {
					const auto header = fmt::format("{}: {}", key, value);
					chunk = curl_slist_append(chunk, header.c_str());
				}
				curl_easy_setopt(curl, CURLOPT_HTTPHEADER, chunk);
			}
			if (!request.body.empty()) {
				curl_easy_setopt(curl, CURLOPT_POSTFIELDS, request.body.c_str());
				curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, request.body.size());
			}
			response.curlCode = curl_easy_perform(curl);
			// cleanup the file handle
			if (response.file.handle) {
				response.file.handle->flush();
				const auto fileSizeOnDisk = static_cast<long long>(response.file.handle->tellp());
				// print any error from ftell
				if (fileSizeOnDisk == -1L) {
					fmt::print("ftell error: {}\n", strerror(errno));
				}
				if (fileSizeOnDisk != response.file.item->totalBytes) {
					throw std::runtime_error(
						fmt::format("File size on disk ({}) does not match total bytes ({})",
							fileSizeOnDisk, response.file.item->totalBytes));
				}
				response.file.handle->close();

				auto item =
					response.file.actions->get(response.file.item->modelRepo, response.file.item->filePath);
				if (!item) {
					throw std::runtime_error(
						fmt::format("Failed to get item for modelRepo: {}, filePath: {}",
							response.file.item->modelRepo, response.file.item->filePath));
				}
				item.value().progress = static_cast<double>(response.file.totalBytesWritten) / static_cast<double>(fileSizeOnDisk) * 100.0;
				item.value().status = wingman::DownloadItemStatus::complete;
				item.value().updated = std::time(nullptr);
				response.file.actions->set(item.value());
			}
			curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response.httpCode);
			curl_easy_cleanup(curl);
		}
		return response;
	}

	Response fetch(const std::string &url)
	{
		const auto request = Request{ url };
		return fetch(request);
	}

	//inline cpr::Response get(const std::string &url)
	//{
	//	cpr::Response r = cpr::Get(cpr::Url{ url });
	//	if (r.status_code != 200) {
	//		throw std::runtime_error("HTTP status code: " + std::to_string(r.status_code));
	//	}
	//	//r.header["content-type"];       // application/json; charset=utf-8
	//	//r.text;                         // JSON text string
	//	return r;
	//}

	inline nlohmann::json getRawModels()
	{
		//spdlog::trace("Fetching models from {}", HF_THEBLOKE_MODELS_URL);
		//auto r = wingman::curl::get(HF_THEBLOKE_MODELS_URL);
		//spdlog::trace("HTTP status code: {}", r.status_code);
		//spdlog::trace("HTTP content-type: {}", r.header["content-type"]);

		//// parse json and print number of models
		//auto j = nlohmann::json::parse(r.text);
		//spdlog::trace("Total number of models: {}", j.size());

		//// filter models by id ends with {HF_MODEL_ENDS_WITH}
		//spdlog::trace("Filtering models by id ends with {}", HF_MODEL_ENDS_WITH);
		//auto foundModels = nlohmann::json::array();
		//for (auto &model : j) {
		//	auto id = model["id"].get<std::string>();
		//	if (id.ends_with(HF_MODEL_ENDS_WITH)) {
		//		foundModels.push_back(model);
		//	}
		//}
		//spdlog::trace("Total number of models ending with {}: {}", HF_MODEL_ENDS_WITH, foundModels.size());

		//// group models by lastModified (date only)
		//spdlog::trace("Grouping models by lastModified (date only)");
		//std::map<std::string, std::vector<nlohmann::json>> sortedModels;
		//for (auto &model : foundModels) {
		//	auto lastModified = model["lastModified"].get<std::string>().substr(0, 10);
		//	sortedModels[lastModified].push_back(model);
		//}

		//// now that we have a map of models, we can sort each vector by likes
		//spdlog::trace("Sorting grouped models by likes");
		//for (auto &val : sortedModels | std::views::values) {
		//	std::ranges::sort(val, [](const auto &a, const auto &b) {
		//		auto likesA = a["likes"].template get<int>();
		//		auto likesB = b["likes"].template get<int>();
		//		return likesA > likesB;
		//	});
		//}

		//spdlog::trace("Flattening sorted models");
		//std::vector<nlohmann::json> modelsFlattened;
		//for (auto &models : sortedModels | std::views::values) {
		//	for (auto &model : models) {
		//		modelsFlattened.push_back(model);
		//	}
		//}

		//// sort the flattened vector by lastModified descending
		//spdlog::trace("Sorting flattened models by lastModified descending");
		//std::ranges::sort(modelsFlattened, [](const auto &a, const auto &b) {
		//	auto lastModifiedA = a["lastModified"].template get<std::string>();
		//	auto lastModifiedB = b["lastModified"].template get<std::string>();
		//	return lastModifiedA > lastModifiedB;
		//});

		//return modelsFlattened;
		nlohmann::json j;
		return j;
	}

	inline nlohmann::json parseRawModels(const nlohmann::json &rawModels)
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

	inline nlohmann::json getModelByFilename(const std::string &modelRepo, std::string filename)
	{
		if (modelRepo.empty()) {
			throw std::runtime_error("modelRepo is required, but is empty");
		}
		if (filename.empty()) {
			throw std::runtime_error("filename is required, but is empty");
		}

		return filterModels(getModels(), modelRepo, filename);
	}

	inline std::optional<nlohmann::json> getModelByQuantization(const std::string &modelRepo, std::string quantization)
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
	inline nlohmann::json filterModelsByQuantization(nlohmann::json::const_reference models, const std::string &quantization)
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

	inline nlohmann::json getModelsByQuantization(const std::string &quantization)
	{
		if (quantization.empty()) {
			throw std::runtime_error("quantization is required, but is empty");
		}

		return filterModelsByQuantization(getModels(), quantization);
	}

	inline nlohmann::json getModelQuantizations(const std::string &modelRepo)
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
