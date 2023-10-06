#pragma once
#include <string>
#include <map>
#include <vector>
#include <memory>
#include <optional>
#include <filesystem>
#include <regex>
#include <spdlog/spdlog.h>
#include <SQLiteCpp/SQLiteCpp.h>
#include "./json.hpp"
#include "./types.h"

namespace wingman {
	namespace fs = std::filesystem;

#pragma region SQLite constants
	enum class ResultCode {
		SQLITE_OK = 0,
		SQLITE_ERROR = 1,
		SQLITE_INTERNAL = 2,
		SQLITE_PERM = 3,
		SQLITE_ABORT = 4,
		SQLITE_BUSY = 5,
		SQLITE_LOCKED = 6,
		SQLITE_NOMEM = 7,
		SQLITE_READONLY = 8,
		SQLITE_INTERRUPT = 9,
		SQLITE_IOERR = 10,
		SQLITE_CORRUPT = 11,
		SQLITE_NOTFOUND = 12,
		SQLITE_FULL = 13,
		SQLITE_CANTOPEN = 14,
		SQLITE_PROTOCOL = 15,
		SQLITE_EMPTY = 16,
		SQLITE_SCHEMA = 17,
		SQLITE_TOOBIG = 18,
		SQLITE_CONSTRAINT = 19,
		SQLITE_MISMATCH = 20,
		SQLITE_MISUSE = 21,
		SQLITE_NOLFS = 22,
		SQLITE_AUTH = 23,
		SQLITE_FORMAT = 24,
		SQLITE_RANGE = 25,
		SQLITE_NOTADB = 26,
		SQLITE_NOTICE = 27,
		SQLITE_WARNING = 28,
		SQLITE_ROW = 100,
		SQLITE_DONE = 101
	};

#define SQLITE_OPEN_READONLY         0x00000001  /* Ok for sqlite3_open_v2() */
#define SQLITE_OPEN_READWRITE        0x00000002  /* Ok for sqlite3_open_v2() */
#define SQLITE_OPEN_CREATE           0x00000004  /* Ok for sqlite3_open_v2() */
#define SQLITE_OPEN_DELETEONCLOSE    0x00000008  /* VFS only */
#define SQLITE_OPEN_EXCLUSIVE        0x00000010  /* VFS only */
#define SQLITE_OPEN_AUTOPROXY        0x00000020  /* VFS only */
#define SQLITE_OPEN_URI              0x00000040  /* Ok for sqlite3_open_v2() */
#define SQLITE_OPEN_MEMORY           0x00000080  /* Ok for sqlite3_open_v2() */
#define SQLITE_OPEN_MAIN_DB          0x00000100  /* VFS only */
#define SQLITE_OPEN_TEMP_DB          0x00000200  /* VFS only */
#define SQLITE_OPEN_TRANSIENT_DB     0x00000400  /* VFS only */
#define SQLITE_OPEN_MAIN_JOURNAL     0x00000800  /* VFS only */
#define SQLITE_OPEN_TEMP_JOURNAL     0x00001000  /* VFS only */
#define SQLITE_OPEN_SUBJOURNAL       0x00002000  /* VFS only */
#define SQLITE_OPEN_SUPER_JOURNAL    0x00004000  /* VFS only */
#define SQLITE_OPEN_NOMUTEX          0x00008000  /* Ok for sqlite3_open_v2() */
#define SQLITE_OPEN_FULLMUTEX        0x00010000  /* Ok for sqlite3_open_v2() */
#define SQLITE_OPEN_SHAREDCACHE      0x00020000  /* Ok for sqlite3_open_v2() */
#define SQLITE_OPEN_PRIVATECACHE     0x00040000  /* Ok for sqlite3_open_v2() */
#define SQLITE_OPEN_WAL              0x00080000  /* VFS only */
#define SQLITE_OPEN_NOFOLLOW         0x01000000  /* Ok for sqlite3_open_v2() */
#define SQLITE_OPEN_EXRESCODE        0x02000000  /* Extended result codes */
#pragma endregion SQLITE constants

	struct Column {
		std::string name;
		std::string type;
		bool notNull;
		bool isPrimaryKey;
		int primaryKeyIndex;	// tells the order of this primary key column
	};
	/**
	 * \brief fills the columns map and columnNames vector from the SQLite table_xinfo pragma
	 */
	static void initializeColumns(const SQLite::Database &database, const std::string &tableName, std::map<std::string, Column> &columns, std::vector<std::string> &columnNames)
	{
		if (columns.empty()) {
			SQLite::Statement query(database, "SELECT * FROM pragma_table_info('" + tableName + "')");
			while (!query.isDone()) {
				const auto result = query.tryExecuteStep();
				if (query.hasRow()) {
					Column column;
					column.name = query.getColumn("name").getText();
					column.type = query.getColumn("type").getText();
					column.notNull = query.getColumn("notnull").getInt() == 1;
					column.isPrimaryKey = query.getColumn("pk").getInt() != 0;
					column.primaryKeyIndex = query.getColumn("pk").getInt();
					columns[column.name] = column;
				} else if (query.isDone()) {
					// no rows returned
					break;
				} else if (result == static_cast<int>(ResultCode::SQLITE_BUSY)) {
					// wait for 10ms
					std::this_thread::sleep_for(std::chrono::milliseconds(10));
				} else {
					throw std::runtime_error("(getColumnNames) Failed to get record: " + std::string(database.getErrorMsg()));
				}
			}
		}
		for (const auto &key : columns | std::views::keys) {
			columnNames.push_back(key);
		}
	}

	class DatabaseActions {
		SQLite::Database &dbInstance;

	public:
		explicit DatabaseActions(SQLite::Database &dbInstance)
			: dbInstance(dbInstance)
		{}

		[[nodiscard]] static const char *getCreateDownloads()
		{
			return "CREATE TABLE IF NOT EXISTS downloads ("
				"modelRepo TEXT NOT NULL, "
				"filePath TEXT NOT NULL, "
				"status TEXT DEFAULT 'idle' NOT NULL, "
				"totalBytes INTEGER DEFAULT 0 NOT NULL, "
				"downloadedBytes INTEGER DEFAULT 0 NOT NULL, "
				"downloadSpeed TEXT, "
				"progress REAL DEFAULT 0.0 NOT NULL, "
				"error TEXT, "
				"created INTEGER DEFAULT (unixepoch('now')) NOT NULL, "
				"updated INTEGER DEFAULT (unixepoch('now')) NOT NULL, "
				"PRIMARY KEY (modelRepo, filePath)"
				")";
		}

		void createDownloadsTable() const
		{
			const std::string sql = getCreateDownloads();
			if (dbInstance.tableExists("downloads") == false) {
				dbInstance.exec(sql);
				spdlog::debug("(createDownloadsTable) Downloads table created.");
			}
		}

		[[nodiscard]] static const char *getCreateWingman()
		{
			return "CREATE TABLE IF NOT EXISTS wingman ("
				"alias TEXT NOT NULL, "
				"status TEXT DEFAULT 'idle' NOT NULL, "
				"modelRepo TEXT NOT NULL, "
				"filePath TEXT NOT NULL, "
				"force INTEGER DEFAULT 0 NOT NULL, "
				"error TEXT, "
				"created INTEGER DEFAULT (unixepoch('now')) NOT NULL, "
				"updated INTEGER DEFAULT (unixepoch('now')) NOT NULL, "
				"PRIMARY KEY (alias)"
				")";
		}

		void createWingmanTable() const
		{
			const std::string sql = getCreateWingman();
			if (dbInstance.tableExists("wingman") == false) {
				dbInstance.exec(sql);
				spdlog::debug("(createWingmanTable) Wingman table created.");
			}
		}

		[[nodiscard]] static const char *getCreateApp()
		{
			return "CREATE TABLE IF NOT EXISTS app ("
				"name TEXT NOT NULL, "
				"key TEXT NOT NULL, "
				"value TEXT, "
				"enabled INTEGER DEFAULT 1 NOT NULL, "
				"created INTEGER DEFAULT (unixepoch('now')) NOT NULL, "
				"updated INTEGER DEFAULT (unixepoch('now')) NOT NULL, "
				"PRIMARY KEY (name, key)"
				")";
		}

		void createAppTable() const
		{
			const std::string sql = getCreateApp();

			if (dbInstance.tableExists("app") == false) {
				dbInstance.exec(sql);
				spdlog::debug("(createAppTable) App table created.");
			}
		};
	};

	class AppItemActions {
		const std::string TABLE_NAME = "app";
		const SQLite::Database &dbInstance;
		SQLite::Statement queryGet;
		SQLite::Statement queryGetByPK;
		SQLite::Statement queryDelete;
		SQLite::Statement queryClear;
		SQLite::Statement queryCount;

		/**
		 * \brief columns variable is a map of column names to a Column
		 */
		std::map<std::string, Column> columns;
		std::vector<std::string> columnNames;

		std::optional<AppItem> getSome(SQLite::Statement &query) const
		{
			std::vector<AppItem> items;
			while (!query.isDone()) {
				const auto result = query.tryExecuteStep();
				if (query.hasRow()) {
					AppItem item;
					item.name = queryGetByPK.getColumn("name").getText();
					item.key = queryGetByPK.getColumn("key").getText();
					item.value = queryGetByPK.getColumn("value").getText();
					item.enabled = queryGetByPK.getColumn("enabled").getInt();
					item.created = queryGetByPK.getColumn("created").getInt64();
					item.updated = queryGetByPK.getColumn("updated").getInt64();
					items.push_back(item);
				} else if (query.isDone()) {
					// no rows returned
					break;
				} else if (result == static_cast<int>(ResultCode::SQLITE_BUSY)) {
					// wait for 10ms
					std::this_thread::sleep_for(std::chrono::milliseconds(10));
				} else {
					throw std::runtime_error("(getSome) Failed to get record: " + std::string(dbInstance.getErrorMsg()));
				}
			}
			if (!items.empty())
				return items[0];
			return std::nullopt;
		}

	public:
		AppItemActions(SQLite::Database &dbInstance)
			: dbInstance(dbInstance)
			, queryGet(dbInstance, std::format("SELECT * FROM {}", TABLE_NAME))
			, queryGetByPK(dbInstance, std::format("SELECT * FROM {} WHERE name = $name AND key = $key", TABLE_NAME))
			, queryDelete(dbInstance, std::format("DELETE FROM {} WHERE name = $name AND key = $key", TABLE_NAME))
			, queryClear(dbInstance, std::format("DELETE FROM {}", TABLE_NAME))
			, queryCount(dbInstance, std::format("SELECT COUNT(*) FROM {}", TABLE_NAME))
		{
			initializeColumns(dbInstance, TABLE_NAME, columns, columnNames);
		}

		std::optional<AppItem> get(const std::string &name, const std::optional<std::string> &key = std::nullopt)
		{
			queryGetByPK.reset();
			queryGetByPK.bind("$name", name);
			queryGetByPK.bind("$key", key.value_or(""));
			auto item = getSome(queryGetByPK);
			//return std::make_unique<AppItem>(item.value());
			return item;
		}

		void set(const AppItem &item)
		{
			// check if item exists, if not insert, else update
			const auto existingItem = get(item.name, item.key);
			std::string sql;
			bool insert = false;
			if (existingItem) {
				sql = std::format("UPDATE {} SET", TABLE_NAME);
				std::string fields;
				for (const auto &name : columnNames) {
					if (name == "created") {
						continue;
					}
					fields.append(std::format(" {} = ${}, ", name, name));
				}
				fields.pop_back();
				fields.pop_back();
				sql.append(fields);
				sql.append(" WHERE name = $name AND key = $key");
			} else {
				insert = true;
				sql = std::format("INSERT INTO {} (", TABLE_NAME);
				std::string fields;
				for (const auto &name : columnNames) {
					fields.append(std::format("{}, ", name));
				}
				fields.pop_back();
				fields.pop_back();
				sql.append(fields);
				sql.append(") VALUES (");
				std::string values;
				for (const auto &name : columnNames) {
					values.append(std::format("${}, ", name));
				}
				values.pop_back();
				values.pop_back();
				sql.append(values);
				sql.append(")");
			}
			auto query = SQLite::Statement(dbInstance, sql);
			query.bind("$value", item.value);
			query.bind("$enabled", item.enabled);
			query.bind("$updated", item.updated);
			if (insert) {
				query.bind("$created", item.created);
			}
			query.bind("$name", item.name);
			query.bind("$key", item.key);
			query.exec();
			if (query.getErrorCode() != static_cast<int>(ResultCode::SQLITE_DONE)) {
				throw std::runtime_error("(set) Failed to update record: " + std::string(dbInstance.getErrorMsg()));
			}
		}

		void remove(const std::string &name, const std::string &key)
		{
			queryDelete.reset();
			queryDelete.bind("$name", name);
			queryDelete.bind("$key", key);
			queryDelete.exec();
			if (queryDelete.getErrorCode() != static_cast<int>(ResultCode::SQLITE_DONE)) {
				throw std::runtime_error("(remove) Failed to delete record: " + std::string(dbInstance.getErrorMsg()));
			}
		}

		void clear()
		{
			queryClear.reset();
			queryClear.exec();
			if (queryClear.getErrorCode() != static_cast<int>(ResultCode::SQLITE_DONE)) {
				throw std::runtime_error("(clear) Failed to clear records: " + std::string(dbInstance.getErrorMsg()));
			}
		}

		int count()
		{
			queryCount.reset();
			queryCount.executeStep();
			if (queryCount.hasRow()) {
				return queryCount.getColumn(0).getInt();
			}
			if (queryCount.getErrorCode() != static_cast<int>(ResultCode::SQLITE_DONE)) {
				throw std::runtime_error("(count) Failed to count records: " + std::string(dbInstance.getErrorMsg()));
			}
			return -1;
		}

		static nlohmann::json toJson(const AppItem &item)
		{
			nlohmann::json j;
			j["name"] = item.name;
			j["key"] = item.key;
			j["value"] = item.value;
			j["enabled"] = item.enabled;
			j["created"] = item.created;
			j["updated"] = item.updated;

			return j;
		}

		static AppItem fromJson(const nlohmann::json &j)
		{
			AppItem item;
			item.name = j["name"];
			item.key = j["key"];
			item.value = j["value"];
			item.enabled = j["enabled"];
			item.created = j["created"];
			item.updated = j["updated"];

			return item;
		}
	};

	class DownloadItemActions {
	#pragma region DownloadItem private members
			const std::string TABLE_NAME = "downloads";
			const SQLite::Database &dbInstance;
			inline static fs::path downloadsDirectory;

			SQLite::Statement queryGet;
			SQLite::Statement queryGetByPK;
			SQLite::Statement queryGetByStatus;
			SQLite::Statement queryGetNextQueued;
			SQLite::Statement queryDelete;
			SQLite::Statement queryClear;
			SQLite::Statement queryCount;
			SQLite::Statement queryResetUpdate;
			SQLite::Statement queryResetDelete;
			/**
			 * \brief columns variable is a map of column names to a Column
			 */
			std::map<std::string, Column> columns;
			std::vector<std::string> columnNames;

			std::vector<DownloadItemStatus> activeDownloadStatuses = { DownloadItemStatus::queued, DownloadItemStatus::downloading };
			std::vector<DownloadItem> getSome(SQLite::Statement &query) const
			{
				std::vector<DownloadItem> items;
				while (!query.isDone()) {
					const auto result = query.tryExecuteStep();
					if (query.hasRow()) {
						DownloadItem item;
						item.modelRepo = query.getColumn("modelRepo").getText();
						item.filePath = query.getColumn("filePath").getText();
						item.status = DownloadItem::toStatus(query.getColumn("status").getText());
						item.totalBytes = query.getColumn("totalBytes").getInt64();
						item.downloadedBytes = query.getColumn("downloadedBytes").getInt64();
						item.downloadSpeed = query.getColumn("downloadSpeed").getText();
						item.progress = query.getColumn("progress").getDouble();
						item.error = query.getColumn("error").getText();
						item.created = query.getColumn("created").getInt64();
						item.updated = query.getColumn("updated").getInt64();
						items.push_back(item);
					} else if (query.isDone()) {
						// no rows returned
						break;
					} else if (result == static_cast<int>(ResultCode::SQLITE_BUSY)) {
						// wait for 10ms
						std::this_thread::sleep_for(std::chrono::milliseconds(10));
					} else {
						throw std::runtime_error("(getSome) Failed to get record: " + std::string(dbInstance.getErrorMsg()));
					}
				}

				return items;
			}
	#pragma endregion
	public:
		DownloadItemActions(SQLite::Database &dbInstance, const fs::path &downloadsDirectory)
			: dbInstance(dbInstance)
			, queryGet(SQLite::Statement(dbInstance, std::format("SELECT * FROM {}", TABLE_NAME)))
			, queryGetByPK(SQLite::Statement(dbInstance, std::format("SELECT * FROM {} WHERE modelRepo = $modelRepo AND filePath = $filePath", TABLE_NAME)))
			, queryGetByStatus(SQLite::Statement(dbInstance, std::format("SELECT * FROM {} WHERE status = $status", TABLE_NAME)))
			, queryGetNextQueued(SQLite::Statement(dbInstance, std::format("SELECT * FROM {} WHERE status = 'queued' ORDER BY created ASC LIMIT 1", TABLE_NAME)))
			, queryDelete(SQLite::Statement(dbInstance, std::format("DELETE FROM {} WHERE modelRepo = $modelRepo AND filePath = $filePath", TABLE_NAME)))
			, queryClear(SQLite::Statement(dbInstance, std::format("DELETE FROM {}", TABLE_NAME)))
			, queryCount(SQLite::Statement(dbInstance, std::format("SELECT COUNT(*) FROM {}", TABLE_NAME)))
			, queryResetUpdate(SQLite::Statement(dbInstance, std::format("UPDATE {} SET status = 'queued', progress = 0, downloadedBytes = 0, totalBytes = 0, downloadSpeed = '' WHERE status = 'downloading' OR status = 'error' or status = 'idle'", TABLE_NAME)))
			, queryResetDelete(SQLite::Statement(dbInstance, std::format("DELETE FROM {} WHERE status = 'complete' OR status = 'cancelled' OR status = 'unknown'", TABLE_NAME)))
		{
			DownloadItemActions::downloadsDirectory = downloadsDirectory;
			fs::create_directories(downloadsDirectory);
			// initialize columns cache
			initializeColumns(dbInstance, TABLE_NAME, columns, columnNames);
		}

		std::optional<DownloadItem> get(const std::string &modelRepo, const std::string &filePath)
		{
			queryGetByPK.reset();
			queryGetByPK.bind("$modelRepo", modelRepo);
			queryGetByPK.bind("$filePath", filePath);
			auto items = getSome(queryGetByPK);
			queryGetByPK.reset();
			if (!items.empty())
				 return items[0];
			return std::nullopt;
		}

		const std::optional<DownloadItem> getValue(const std::string &modelRepo, const std::string &filePath)
		{
			queryGetByPK.reset();
			queryGetByPK.bind("$modelRepo", modelRepo);
			queryGetByPK.bind("$filePath", filePath);
			auto items = getSome(queryGetByPK);
			queryGetByPK.reset();
			if (!items.empty())
				 return items[0];
			return std::nullopt;
		}

		std::vector<DownloadItem> getAll()
		{
			queryGet.reset();
			return getSome(queryGet);
		}

		std::vector<DownloadItem> getAllByStatus(const DownloadItemStatus status)
		{
			queryGetByStatus.reset();
			queryGetByStatus.bind("$status", DownloadItem::toString(status));
			return getSome(queryGetByStatus);
		}

		// a function that returns the next queued item by oldest created date
		std::optional<DownloadItem> getNextQueued()
		{
			queryGetNextQueued.reset();
			auto items = getSome(queryGetNextQueued);
			if (!items.empty())
				return items[0];
			return std::nullopt;
		}

		void set(const DownloadItem &item)
		{
			// check if item exists, if not insert, else update
			const auto existingItem = get(item.modelRepo, item.filePath);
			std::string sql;
			bool insert = false;
			std::string updateType;
			if (existingItem) {
				updateType = "update";
				sql = std::format("UPDATE {} SET", TABLE_NAME);
				std::string fields;
				for (const auto &name : columnNames) {
					if (name == "created") {
						continue;
					}
					fields.append(std::format(" {} = ${}, ", name, name));
				}
				fields.pop_back();
				fields.pop_back();
				sql.append(fields);
				sql.append(" WHERE modelRepo = $modelRepo AND filePath = $filePath");
			} else {
				insert = true;
				sql = std::format("INSERT INTO {} (", TABLE_NAME);
				std::string fields;
				for (const auto &name : columnNames) {
					fields.append(std::format("{}, ", name));
				}
				fields.pop_back();
				fields.pop_back();
				sql.append(fields);
				sql.append(") VALUES (");
				std::string values;
				for (const auto &name : columnNames) {
					values.append(std::format("${}, ", name));
				}
				values.pop_back();
				values.pop_back();
				sql.append(values);
				sql.append(")");
			}

			auto query = SQLite::Statement(dbInstance, sql);
			query.bind("$status", DownloadItem::toString(item.status));
			query.bind("$totalBytes", item.totalBytes);
			query.bind("$downloadedBytes", item.downloadedBytes);
			query.bind("$downloadSpeed", item.downloadSpeed);
			query.bind("$progress", item.progress);
			query.bind("$error", item.error);
			if (insert) {
				query.bind("$created", item.created);
			}
			query.bind("$updated", item.updated);
			query.bind("$modelRepo", item.modelRepo);
			query.bind("$filePath", item.filePath);
			query.exec();
			if (query.getErrorCode() != static_cast<int>(ResultCode::SQLITE_DONE)) {
				throw std::runtime_error("(" + updateType + ") Failed to update record: " + std::string(dbInstance.getErrorMsg()));
			}
		}

		void remove(const std::string &modelRepo, const std::string &filePath)
		{
			queryDelete.reset();
			queryDelete.bind("$modelRepo", modelRepo);
			queryDelete.bind("$filePath", filePath);
			queryDelete.exec();
			if (queryDelete.getErrorCode() != static_cast<int>(ResultCode::SQLITE_DONE)) {
				throw std::runtime_error("(remove) Failed to delete record: " + std::string(dbInstance.getErrorMsg()));
			}
		}

		void clear()
		{
			queryClear.reset();
			queryClear.exec();
			if (queryClear.getErrorCode() != static_cast<int>(ResultCode::SQLITE_DONE)) {
				throw std::runtime_error("(clear) Failed to clear records: " + std::string(dbInstance.getErrorMsg()));
			}
		}

		int count()
		{
			queryCount.reset();
			queryCount.executeStep();
			if (queryCount.hasRow()) {
				return queryCount.getColumn(0).getInt();
			}
			if (queryCount.getErrorCode() != static_cast<int>(ResultCode::SQLITE_DONE)) {
				throw std::runtime_error("(count) Failed to count records: " + std::string(dbInstance.getErrorMsg()));
			}
			return -1;
		}

		void reset()
		{
			queryResetUpdate.reset();
			queryResetUpdate.exec();
			if (queryResetUpdate.getErrorCode() != static_cast<int>(ResultCode::SQLITE_DONE)) {
				throw std::runtime_error("(reset) Failed to reset update record: " + std::string(dbInstance.getErrorMsg()));
			}
			queryResetDelete.reset();
			queryResetDelete.exec();
			if (queryResetDelete.getErrorCode() != static_cast<int>(ResultCode::SQLITE_DONE)) {
				throw std::runtime_error("(reset) Failed to reset delete record: " + std::string(dbInstance.getErrorMsg()));
			}
		}

		static nlohmann::json toJson(const DownloadItem &item)
		{
			nlohmann::json j;
			j["modelRepo"] = item.modelRepo;
			j["filePath"] = item.filePath;
			j["status"] = DownloadItem::toString(item.status);
			j["totalBytes"] = item.totalBytes;
			j["downloadedBytes"] = item.downloadedBytes;
			j["downloadSpeed"] = item.downloadSpeed;
			j["progress"] = item.progress;
			j["error"] = item.error;
			j["created"] = item.created;
			j["updated"] = item.updated;

			return j;
		}

		static DownloadItem fromJson(const nlohmann::json &j)
		{
			DownloadItem item;
			item.modelRepo = j["modelRepo"];
			item.filePath = j["filePath"];
			item.status = DownloadItem::toStatus(j["status"]);
			item.totalBytes = j["totalBytes"];
			item.downloadedBytes = j["downloadedBytes"];
			item.downloadSpeed = j["downloadSpeed"];
			item.progress = j["progress"];
			item.error = j["error"];
			item.created = j["created"];
			item.updated = j["updated"];

			return item;
		}

		static std::string getDownloadItemFileName(const std::string &modelRepo, const std::string &filePath)
		{
			return safeDownloadItemName(modelRepo, filePath);
		}

		static bool isDownloaded(const std::string &modelRepo, const std::string &filePath);

		static DownloadedFileInfo getDownloadedFileInfo(const std::string &modelRepo, const std::string &filePath);

		static std::vector<std::string> getModelFiles()
		{
			std::vector<std::string> files;

			for (const auto &entry : fs::directory_iterator(downloadsDirectory)) {
				if (entry.is_regular_file()) {
					files.push_back(entry.path().filename().string());
				}
			}

			return files;
		}

		static std::vector<DownloadedFileInfo> getDownloadedFileInfos()
		{
			std::vector<DownloadedFileInfo> fileInfos;
			const auto modelFiles = getModelFiles();

			for (const auto &file : modelFiles) {
				const auto name = safeDownloadItemNameToModelRepo(file);
				if (!name) {
					spdlog::debug("Skipping file: " + file + " because it's not a downloaded model file.");
					continue;
				}
				fileInfos.push_back(getDownloadedFileInfo(name->modelRepo, name->filePath));
			}

			return fileInfos;
		}

		static std::string safeDownloadItemName(const std::string &modelRepo, const std::string &filePath)
		{
			const std::regex slashRegex("\\/");
			const std::string result = std::regex_replace(modelRepo, slashRegex, "[-]");
			return result + "[=]" + filePath;
		}

		static std::optional<DownloadItemName> safeDownloadItemNameToModelRepo(const std::string &name)
		{
			if (name.find("[-]") == std::string::npos || name.find("[=]") == std::string::npos) {
				return {};
			}

			const size_t pos               = name.find("[=]");
			std::string modelRepoPart      = name.substr(0, pos);
			const std::string filePathPart = name.substr(pos + 3);

			const std::regex dashRegex("\\[-\\]");
			modelRepoPart = std::regex_replace(modelRepoPart, dashRegex, "/");

			return { DownloadItemName { modelRepoPart, filePathPart } }; // Return the struct and true flag indicating success.
		}

		static std::string getDownloadItemFilePath(const std::string &modelRepo, const std::string &filePath)
		{
			fs::path path = downloadsDirectory / safeDownloadItemName(modelRepo, filePath);
			return path.string();
		}
	};

	class WingmanItemActions {
		const std::string TABLE_NAME = "wingman";
		const SQLite::Database &dbInstance;
		fs::path modelsDir;

		SQLite::Statement queryGet;
		SQLite::Statement queryGetByPK;
		SQLite::Statement queryDelete;
		SQLite::Statement queryClear;
		SQLite::Statement queryCount;

		/**
		 * \brief columns variable is a map of column names to a Column
		 */
		std::map<std::string, Column> columns;
		std::vector<std::string> columnNames;

		std::vector<WingmanItem> getSome(SQLite::Statement &query) const
		{
			std::vector<WingmanItem> items;
			while (!query.isDone()) {
				const auto result = query.tryExecuteStep();
				if (query.hasRow()) {
					WingmanItem item;
					item.alias = query.getColumn("alias").getText();
					item.status = WingmanItem::toStatus(query.getColumn("status").getText());
					item.modelRepo = query.getColumn("modelRepo").getText();
					item.filePath = query.getColumn("filePath").getText();
					item.force = query.getColumn("force").getInt();
					item.error = query.getColumn("error").getText();
					item.created = query.getColumn("created").getInt64();
					item.updated = query.getColumn("updated").getInt64();
					items.push_back(item);
				} else if (query.isDone()) {
					// no rows returned
					break;
				} else if (result == static_cast<int>(ResultCode::SQLITE_BUSY)) {
					// wait for 10ms
					std::this_thread::sleep_for(std::chrono::milliseconds(10));
				} else {
					throw std::runtime_error("(getSome) Failed to get record: " + std::string(dbInstance.getErrorMsg()));
				}
			}

			return items;
		}

	public:
		WingmanItemActions(SQLite::Database &dbInstance, const fs::path &modelsDir)
			: dbInstance(dbInstance)
			, modelsDir(modelsDir)
			, queryGet(SQLite::Statement(dbInstance, std::format("SELECT * FROM {}", TABLE_NAME)))
			, queryGetByPK(SQLite::Statement(dbInstance, std::format("SELECT * FROM {} WHERE alias = $alias", TABLE_NAME)))
			, queryDelete(SQLite::Statement(dbInstance, std::format("DELETE FROM {} WHERE alias = $alias", TABLE_NAME)))
			, queryClear(SQLite::Statement(dbInstance, std::format("DELETE FROM {}", TABLE_NAME)))
			, queryCount(SQLite::Statement(dbInstance, std::format("SELECT COUNT(*) FROM {}", TABLE_NAME)))
		{
			initializeColumns(dbInstance, TABLE_NAME, columns, columnNames);
		}

		std::optional<WingmanItem> get(const std::string &alias)
		{
			queryGetByPK.reset();
			queryGetByPK.bind("$alias", alias);
			auto items = getSome(queryGetByPK);
			if (!items.empty())
				return items[0];
			return std::nullopt;
		}

		void set(const WingmanItem &item)
		{
			auto existingItem = get(item.alias);
			std::string sql;
			bool insert = false;
			if (existingItem) {
				sql = std::format("UPDATE {} SET", TABLE_NAME);
				std::string fields;
				for (const auto &name : columnNames) {
					if (name == "created") {
						continue;
					}
					fields.append(std::format(" {} = ${}, ", name, name));
				}
				fields.pop_back();
				fields.pop_back();
				sql.append(fields);
				sql.append(" WHERE alias = $alias");
			} else {
				insert = true;
				sql = std::format("INSERT INTO {} (", TABLE_NAME);
				std::string fields;
				for (const auto &name : columnNames) {
					fields.append(std::format("{}, ", name));
				}
				fields.pop_back();
				fields.pop_back();
				sql.append(fields);
				sql.append(") VALUES (");
				std::string values;
				for (const auto &name : columnNames) {
					values.append(std::format("${}, ", name));
				}
				values.pop_back();
				values.pop_back();
				sql.append(values);
				sql.append(")");
			}
			auto query = SQLite::Statement(dbInstance, sql);
			query.bind("$status", WingmanItem::toString(item.status));
			query.bind("$modelRepo", item.modelRepo);
			query.bind("$filePath", item.filePath);
			query.bind("$force", item.force);
			query.bind("$error", item.error);
			if (insert) {
				query.bind("$created", item.created);
			}
			query.bind("$updated", item.updated);
			query.bind("$alias", item.alias);
			query.exec();
			if (query.getErrorCode() != static_cast<int>(ResultCode::SQLITE_DONE)) {
				throw std::runtime_error("(set) Failed to update record: " + std::string(dbInstance.getErrorMsg()));
			}
		}

		void remove(const std::string &alias)
		{
			queryDelete.reset();
			queryDelete.bind("$alias", alias);
			queryDelete.exec();
			if (queryDelete.getErrorCode() != static_cast<int>(ResultCode::SQLITE_DONE)) {
				throw std::runtime_error("(remove) Failed to delete record: " + std::string(dbInstance.getErrorMsg()));
			}
		}

		void clear()
		{
			queryClear.reset();
			queryClear.exec();
			if (queryClear.getErrorCode() != static_cast<int>(ResultCode::SQLITE_DONE)) {
				throw std::runtime_error("(clear) Failed to clear records: " + std::string(dbInstance.getErrorMsg()));
			}
		}

		int count()
		{
			queryCount.reset();
			queryCount.executeStep();
			if (queryCount.hasRow()) {
				return queryCount.getColumn(0).getInt();
			}
			if (queryCount.getErrorCode() != static_cast<int>(ResultCode::SQLITE_DONE)) {
				throw std::runtime_error("(count) Failed to count records: " + std::string(dbInstance.getErrorMsg()));
			}
			return -1;
		}

		static nlohmann::json toJson(const WingmanItem &item)
		{
			nlohmann::json j;
			j["alias"] = item.alias;
			j["status"] = WingmanItem::toString(item.status);
			j["modelRepo"] = item.modelRepo;
			j["filePath"] = item.filePath;
			j["force"] = item.force;
			j["error"] = item.error;
			j["created"] = item.created;
			j["updated"] = item.updated;

			return j;
		}

		static WingmanItem fromJson(const nlohmann::json &j)
		{
			WingmanItem item;
			item.alias = j["alias"];
			item.status = WingmanItem::toStatus(j["status"]);
			item.modelRepo = j["modelRepo"];
			item.filePath = j["filePath"];
			item.force = j["force"];
			item.error = j["error"];
			item.created = j["created"];
			item.updated = j["updated"];

			return item;
		}
	};

	class ItemActionsFactory {
		std::shared_ptr<SQLite::Database> db;
		fs::path wingmanHome;
		fs::path dataDir;
		fs::path modelsDir;
		fs::path dbPath;

		const std::string SERVER_NAME = "orm.Sqlite";
		bool initialized;

		void openDatabase()
		{
			spdlog::debug("(openDatabase) Opening database {}...", dbPath.string());
			if (db != nullptr) {
				throw std::runtime_error("(openDatabase) Database is already opened.");
			}
			db = std::make_shared<SQLite::Database>(dbPath.string(), SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE);
			if (db->getErrorCode() != static_cast<int>(ResultCode::SQLITE_OK)) {
				throw std::runtime_error("(openDatabase) Failed to open database: " + std::string(db->getErrorMsg()));
			}
			spdlog::debug("(openDatabase) Database opened.");
		}

		void initializeDatabase()
		{
			spdlog::debug("(initializeDatabase) Initializing database...");

			if (initialized) {
				throw std::runtime_error("(initializeDatabase) ORM already initialized");
			}

			spdlog::debug("(initializeDatabase) DATA_DIR: {}", dataDir.string());

			// Ensure the directory exists
			spdlog::debug("(initializeDatabase) Ensuring DATA_DIR '{}' exists...", dataDir.string());
			fs::create_directories(dataDir);
			spdlog::trace("(initializeDatabase) DATA_DIR exists...");
			spdlog::debug("(initializeDatabase) Ensuring MODELS_DIR '{}' exists...", modelsDir.string());
			fs::create_directories(modelsDir);
			spdlog::trace("(initializeDatabase) MODELS_DIR exists...");

			openDatabase();

			initialized = true;
		}

	public:
		std::shared_ptr<AppItemActions> pAppItemActions;
		std::shared_ptr<DownloadItemActions> pDownloadItemItemActions;
		std::shared_ptr<WingmanItemActions> pWingmanItemItemActions;

		/**
		* @brief Construct a new Item Actions Factory object
		*
		* @param baseDirectory - The base directory for the application. If not provided, `$HOME/.wingman` is used.
		*
		*/
		ItemActionsFactory(const std::optional<const fs::path> &baseDirectory = std::nullopt)
			: db(nullptr)
			, initialized(false)
		{
			//const auto baseDir = fs::path(baseDirectory.value_or(get_wingman_home()));
			wingmanHome = fs::path(baseDirectory.value_or(get_wingman_home()));
			dataDir = wingmanHome / "data";
			modelsDir = wingmanHome / "models";
			dbPath = wingmanHome / dataDir / "wingman.db";

			// spdlog levels:
			// trace = SPDLOG_LEVEL_TRACE,
			// debug = SPDLOG_LEVEL_DEBUG,
			// info = SPDLOG_LEVEL_INFO,
			// warn = SPDLOG_LEVEL_WARN,
			// err = SPDLOG_LEVEL_ERROR,
			// critical = SPDLOG_LEVEL_CRITICAL,
			// off = SPDLOG_LEVEL_OFF,
			// For convenience, spdlog creates a default global logger (to stdout, colored and multithreaded).
			//  It can be used easily by calling spdlog::info(..), spdlog::debug(..), etc directly.
			//  It's instance can be replaced to any other logger (shared_ptr):
			//   spdlog::set_default_logger(some_other_logger);
			spdlog::info("Starting ItemActions...");
			initializeDatabase();

			const auto dbActions = DatabaseActions(*db);

			dbActions.createDownloadsTable();
			dbActions.createWingmanTable();
			dbActions.createAppTable();

			pAppItemActions = std::make_shared<AppItemActions>(*db);
			pDownloadItemItemActions = std::make_shared<DownloadItemActions>(*db, modelsDir);
			pWingmanItemItemActions = std::make_shared<WingmanItemActions>(*db, modelsDir);
		}

		std::shared_ptr <AppItemActions> app()
		{
			return pAppItemActions;
		}

		std::shared_ptr <DownloadItemActions> download()
		{
			return pDownloadItemItemActions;
		}

		std::shared_ptr <WingmanItemActions> wingman()
		{
			return pWingmanItemItemActions;
		}
	};

	inline bool DownloadItemActions::isDownloaded(const std::string &modelRepo, const std::string &filePath)
	{
		ItemActionsFactory ormFactory;
		const auto item = ormFactory.download()->get(modelRepo, filePath);

		// If it's in the database and marked as complete, then it's downloaded.
		if (item && item->status == DownloadItemStatus::complete) {
			return true;
		}

		// If it's not in the database, we check the file system.
		return fs::exists(downloadsDirectory / filePath);
	}

	inline DownloadedFileInfo DownloadItemActions::getDownloadedFileInfo(const std::string &modelRepo, const std::string &filePath)
	{
		ItemActionsFactory itemActionsFactory;
		const auto item = itemActionsFactory.download()->get(modelRepo, filePath);

		DownloadedFileInfo fileInfo;
		fileInfo.filePath = filePath;
		fileInfo.modelRepo = modelRepo;

		// If the item is in the database, fetch its information.
		if (item) {
			fileInfo.totalBytes = item->totalBytes;
			fileInfo.downloadedBytes = item->downloadedBytes;
			fileInfo.created = item->created;
			fileInfo.updated = item->updated;
		}else {
			fileInfo.totalBytes = -1;
			fileInfo.downloadedBytes = -1;
			// get this info from the disk
			// created time is not part of the POSIX standard, so we use last_write_time and copy it to created and updated
			fileInfo.created = fs::last_write_time(downloadsDirectory / fs::path(filePath)).time_since_epoch().count();
			fileInfo.updated = fileInfo.created;
		}

		auto safeFileName = safeDownloadItemName(modelRepo, filePath);
		auto path = downloadsDirectory / filePath;
		// Getting the size directly from the file system.
		fileInfo.fileSizeOnDisk = fs::file_size(downloadsDirectory / fs::path(filePath));

		return fileInfo;
	}

	inline nlohmann::json DownloadServerAppItem::toJson(const DownloadServerAppItem &downloadServerAppItem)
	{
		nlohmann::json j;
		j["isa"] = downloadServerAppItem.isa;
		j["status"] = toString(downloadServerAppItem.status);
		if (downloadServerAppItem.currentDownload) {
			j["currentDownload"] = DownloadItemActions::toJson(downloadServerAppItem.currentDownload.value());
		}
		if (downloadServerAppItem.error) {
			j["error"] = downloadServerAppItem.error.value();
		}
		j["created"] = downloadServerAppItem.created;
		j["updated"] = downloadServerAppItem.updated;
		return j;
	}

	inline DownloadServerAppItem DownloadServerAppItem::fromJson(const nlohmann::json &j)
	{
		DownloadServerAppItem downloadServerAppItem;
		downloadServerAppItem.status = DownloadServerAppItem::toStatus(j["status"].get<std::string>());
		if (j.contains("currentDownload")) {
			auto currentDownload = DownloadItemActions::fromJson(j["currentDownload"]);
			//downloadServerAppItem.currentDownload = DownloadItemActions::fromJson(j["currentDownload"]);
			//downloadServerAppItem.currentDownload = currentDownload;
			downloadServerAppItem.currentDownload.emplace(currentDownload);
		}
		if (j.contains("error")) {
			downloadServerAppItem.error = j["error"].get<std::string>();
		}
		downloadServerAppItem.created = j["created"].get<long long>();
		downloadServerAppItem.updated = j["updated"].get<long long>();
		return downloadServerAppItem;
	}

} // namespace wingman
