
#pragma once
#include <ctime>
#include <map>
#include <optional>
#include <string>
#include <filesystem>
#include "json.hpp"

namespace wingman {
	namespace fs = std::filesystem;

	struct AppItem {
		const std::string isa = "AppItem";
		std::string name;
		std::string key;
		std::string value;
		int enabled;
		long long created;
		long long updated;

		AppItem() :
			key("default")
			, value("{}")
			, enabled(1)
			, created(std::time(nullptr))
			, updated(std::time(nullptr))
		{}

		static AppItem make(const std::string &name)
		{
			AppItem item;
			item.name = name;
			return item;
		}
	};

	NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(AppItem, name, key, value, enabled, created, updated);

	enum class DownloadItemStatus {
		idle,
		queued,
		downloading,
		complete,
		error,
		cancelled,
		unknown
	};

	struct DownloadItemName {
		std::string modelRepo;
		std::string filePath;
	};

	struct DownloadItem {
		const std::string isa = "DownloadItem";
		std::string modelRepo;
		std::string filePath;
		// possible values for status are:
		// - idle - download is available to be queued
		// - queued - download is queued, and next in line to be downloaded
		// - downloading - download is in progress
		// - complete - download is complete
		// - error - download failed, and will not be considered until it is reset to idle
		// - cancelled - download was cancelled, and will be deleted
		// - unknown - download is in an unknown state and will be deleted at next startup
		DownloadItemStatus status;
		long long totalBytes;
		long long downloadedBytes;
		std::string downloadSpeed;
		double progress;
		std::string error;
		long long created;
		long long updated;

		DownloadItem() :
			status(DownloadItemStatus::idle)
			, totalBytes(0)
			, downloadedBytes(0)
			, progress(0)
			, created(std::time(nullptr))
			, updated(std::time(nullptr))
		{}

		static DownloadItem make(const std::string &modelRepo, const std::string &filePath)
		{
			DownloadItem item;
			item.modelRepo = modelRepo;
			item.filePath = filePath;
			return item;
		}

		// write a function to return a string representation of the enum
		static std::string toString(DownloadItemStatus status)
		{
			switch (status) {
				case DownloadItemStatus::idle:
					return "idle";
				case DownloadItemStatus::queued:
					return "queued";
				case DownloadItemStatus::downloading:
					return "downloading";
				case DownloadItemStatus::complete:
					return "complete";
				case DownloadItemStatus::error:
					return "error";
				case DownloadItemStatus::cancelled:
					return "cancelled";
				case DownloadItemStatus::unknown:
					return "unknown";
				default:
					throw std::runtime_error("Unknown DownloadItemStatus: " + std::to_string(static_cast<int>(status)));
			}
		}

		static DownloadItemStatus toStatus(const std::string &status)
		{
			if (status == "idle") {
				return DownloadItemStatus::idle;
			} else if (status == "queued") {
				return DownloadItemStatus::queued;
			} else if (status == "downloading") {
				return DownloadItemStatus::downloading;
			} else if (status == "complete") {
				return DownloadItemStatus::complete;
			} else if (status == "error") {
				return DownloadItemStatus::error;
			} else if (status == "cancelled") {
				return DownloadItemStatus::cancelled;
			} else if (status == "unknown") {
				return DownloadItemStatus::unknown;
			} else {
				return DownloadItemStatus::idle;
			}
		}

		static DownloadItemStatus toStatus(const unsigned char *input)
		{
			const std::string status(reinterpret_cast<const char *>(input));
			return toStatus(status);
		}
	};

	NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(DownloadItem, modelRepo, filePath, status, totalBytes, downloadedBytes, downloadSpeed, progress, error, created, updated);

	enum class WingmanItemStatus {
		idle,
		queued,
		inferring,
		complete,
		error,
		cancelling,
		cancelled
	};

	struct WingmanItem {
		const std::string isa = "WingmanItem";
		std::string alias;
		// possible values for status are:
		// idle - model instance is available to be queued
		// queued - model instance is queued, and next in line to be loaded into memory and run
		// inferring - model instance is inferring
		// complete - inference is complete and will be removed from memory
		// error - inference failed, and will not be considered until it is reset to idle
		// cancelling - inference is being cancelled
		// cancelled - inference was cancelled, and will be deleted
		WingmanItemStatus status;
		std::string modelRepo;
		std::string filePath;
		int force;
		std::string error;
		long long created;
		long long updated;

		WingmanItem() :
			status(WingmanItemStatus::idle)
			, force(0)
			, created(std::time(nullptr))
			, updated(std::time(nullptr))
		{}

		static WingmanItem make(const std::string &alias, const std::string &modelRepo, const std::string &filePath, int force)
		{
			WingmanItem item;
			item.alias = alias;
			item.status = WingmanItemStatus::idle;
			item.modelRepo = modelRepo;
			item.filePath = filePath;
			item.force = force;
			item.error = "";
			// set created and updated to the current time in unix milliseconds
			item.created = std::time(nullptr);
			item.updated = std::time(nullptr);
			return item;
		}

		// write a function to return a string representation of the enum
		static std::string toString(WingmanItemStatus status)
		{
			switch (status) {
				case WingmanItemStatus::idle:
					return "idle";
				case WingmanItemStatus::queued:
					return "queued";
				case WingmanItemStatus::inferring:
					return "inferring";
				case WingmanItemStatus::complete:
					return "complete";
				case WingmanItemStatus::error:
					return "error";
				case WingmanItemStatus::cancelling:
					return "cancelling";
				case WingmanItemStatus::cancelled:
					return "cancelled";
				default:
					throw std::runtime_error("Unknown DownloadItemStatus: " + std::to_string(static_cast<int>(status)));

			}
		}

		static WingmanItemStatus toStatus(const std::string &status)
		{
			if (status == "idle") {
				return WingmanItemStatus::idle;
			} else if (status == "queued") {
				return WingmanItemStatus::queued;
			} else if (status == "inferring") {
				return WingmanItemStatus::inferring;
			} else if (status == "complete") {
				return WingmanItemStatus::complete;
			} else if (status == "error") {
				return WingmanItemStatus::error;
			} else if (status == "cancelling") {
				return WingmanItemStatus::cancelling;
			} else if (status == "cancelled") {
				return WingmanItemStatus::cancelled;
			} else {
				return WingmanItemStatus::idle;
			}
		}

		static WingmanItemStatus toStatus(const unsigned char *input)
		{
			const std::string status(reinterpret_cast<const char *>(input));
			return toStatus(status);
		}
	};

	NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(WingmanItem, alias, status, modelRepo, filePath, force, error, created, updated);

	struct DownloadedFileInfo {
		std::string modelRepo;
		std::string filePath;
		std::string status;
		long long totalBytes;
		long long downloadedBytes;
		std::string fileNameOnDisk;
		uintmax_t fileSizeOnDisk;
		std::string filePathOnDisk;
		long long created;
		long long updated;

		static DownloadedFileInfo make(const std::string &modelRepo, const std::string &filePath)
		{
			DownloadedFileInfo item;
			item.modelRepo = modelRepo;
			item.filePath = filePath;
			item.status = "unknown";
			item.totalBytes = 0;
			item.downloadedBytes = 0;
			item.fileNameOnDisk = "";
			item.fileSizeOnDisk = 0;
			item.filePathOnDisk = "";
			// set created and updated to the current time in unix milliseconds
			item.created = std::time(nullptr);
			item.updated = std::time(nullptr);
			return item;
		}
	};

	enum class DownloadServerAppItemStatus {
		ready,
		starting,
		preparing,
		downloading,
		stopping,
		stopped,
		error,
		unknown
	};

	struct DownloadServerAppItem {
		const std::string isa = "DownloadServerAppItem";
		DownloadServerAppItemStatus status;
		std::optional<DownloadItem> currentDownload;
		std::optional<std::string> error;
		long long created;
		long long updated;

		DownloadServerAppItem() :
			status(DownloadServerAppItemStatus::unknown)
			, created(std::time(nullptr))
			, updated(std::time(nullptr))
		{}

		static DownloadServerAppItem make()
		{
			DownloadServerAppItem item;
			return item;
		}

		static std::string toString(DownloadServerAppItemStatus status)
		{
			switch (status) {
				case DownloadServerAppItemStatus::ready:
					return "ready";
				case DownloadServerAppItemStatus::starting:
					return "starting";
				case DownloadServerAppItemStatus::preparing:
					return "preparing";
				case DownloadServerAppItemStatus::downloading:
					return "downloading";
				case DownloadServerAppItemStatus::stopping:
					return "stopping";
				case DownloadServerAppItemStatus::stopped:
					return "stopped";
				case DownloadServerAppItemStatus::error:
					return "error";
				case DownloadServerAppItemStatus::unknown:
					return "unknown";
				default:
					throw std::runtime_error("Unknown DownloadServerAppItemStatus: " + std::to_string(static_cast<int>(status)));
			}
		}

		static DownloadServerAppItemStatus toStatus(const std::string &status)
		{
			if (status == "ready") {
				return DownloadServerAppItemStatus::ready;
			} else if (status == "starting") {
				return DownloadServerAppItemStatus::starting;
			} else if (status == "preparing") {
				return DownloadServerAppItemStatus::preparing;
			} else if (status == "downloading") {
				return DownloadServerAppItemStatus::downloading;
			} else if (status == "stopping") {
				return DownloadServerAppItemStatus::stopping;
			} else if (status == "stopped") {
				return DownloadServerAppItemStatus::stopped;
			} else if (status == "error") {
				return DownloadServerAppItemStatus::error;
			} else if (status == "unknown") {
				return DownloadServerAppItemStatus::unknown;
			} else {
				return DownloadServerAppItemStatus::unknown;
			}
		}

		static DownloadServerAppItemStatus toStatus(const unsigned char *input)
		{
			const std::string status(reinterpret_cast<const char *>(input));
			return toStatus(status);
		}

		// Convert DownloadServerAppItem to JSON
		static nlohmann::json toJson(const DownloadServerAppItem &downloadServerAppItem);

		// Convert JSON to DownloadServerAppItem
		static DownloadServerAppItem fromJson(const nlohmann::json &j);
	};

	// implement the nlohmann::json to_json and from_json functions manually to take the DownloadItem struct and DownloadItemStatus enum into account
	inline void to_json(nlohmann::json &j, const DownloadServerAppItem &downloadServerAppItem)
	{
		nlohmann::json currentDownload = nullptr;
		if (downloadServerAppItem.currentDownload) {
			to_json(currentDownload, downloadServerAppItem.currentDownload.value());
		}
		j = nlohmann::json{
			{"isa", downloadServerAppItem.isa},
			{"status", DownloadServerAppItem::toString(downloadServerAppItem.status)},
			{"currentDownload", currentDownload},
			{"error", downloadServerAppItem.error.value_or("")},
			{"created", downloadServerAppItem.created},
			{"updated", downloadServerAppItem.updated}
		};
	}

	inline void from_json(const nlohmann::json &j, DownloadServerAppItem &downloadServerAppItem)
	{
		// ensure currentDownload is not null
		if (!j.at("currentDownload").is_null()) {
			auto currentDownload = j.at("currentDownload").get<DownloadItem>();
			downloadServerAppItem.currentDownload.emplace(currentDownload);
		}
		downloadServerAppItem.status = DownloadServerAppItem::toStatus(j.at("status").get<std::string>());
		downloadServerAppItem.error = j.at("error").get<std::string>();
		downloadServerAppItem.created = j.at("created").get<long long>();
		downloadServerAppItem.updated = j.at("updated").get<long long>();
	}

	//NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(DownloadServerAppItem, status, currentDownload, error, created, updated)

	struct TableColumnInfo {
		int cid; // column ID
		std::string name; // column name
		std::string type; // column data type
		int notnull; // NOT NULL constraint flag (0 or 1)
		std::string dflt_value; // default value
		int pk; // primary key flag (0 or 1)
	};

	struct TableInfo {
		std::string name; // table name
		std::map<std::string, TableColumnInfo> columns; // map column name to its info
	};

	std::string get_home_env_var()
	{
		std::string key;
#ifdef _WIN32
		key = "USERPROFILE";
#else
		key = "HOME";
#endif

		return std::string(getenv(key.c_str()));
	}

	fs::path get_wingman_home()
	{
		const auto home = fs::path(get_home_env_var());
		return home / ".wingman";
	}
} // namespace wingman
