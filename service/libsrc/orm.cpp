#include <cerrno>
#include <cstdint>
#include <filesystem>
#include <fmt/core.h>
#include <nlohmann/json.hpp>
#include <sqlite3.h>

#include "types.h"
#include "orm.h"

#include <spdlog/spdlog.h>

#include "curl.h"

namespace wingman {
	namespace sqlite {

		Database::Database(const fs::path &dbPath, int mode) : db(nullptr)
			, dbPath(dbPath)
		{
			if ((lastErrorCode = sqlite3_open(dbPath.string().c_str(), &db)) != SQLITE_OK) {
				throw std::runtime_error("(Database) Failed to open database: " + std::string(sqlite3_errmsg(db)));
			}

			// only continue if the db is open
			if (db == nullptr) {
				throw std::runtime_error("(Database) Failed to open database: " + std::string(sqlite3_errmsg(db)));
			}

			// only continue if the db is threadsafe
			if (sqlite3_threadsafe() == 0) {
				throw std::runtime_error("(Database) the sqlite engine is not compiled to be threadsafe.");
			}

			// setup a busy timeout OR timeout handler. Not both.
			//sqlite3_busy_timeout(db, 10000);
			sqlite3_busy_handler(db, [](void *data, int count) {
				spdlog::debug("(Database) ******* sqlite busy handler called with count: {} *******", count);
				constexpr int timeout = 10;
				sqlite3_sleep(timeout);
				return timeout;
			}, nullptr);
		}

		Database::~Database()
		{
			if (db != nullptr) {
				lastErrorCode = sqlite3_close(db);
			}
		}

		sqlite3 *Database::get() const
		{
			return db;
		}

		std::string Database::getErrorMsg() const
		{
			return sqlite3_errmsg(db);
		}

		int Database::exec(const std::string &sql) const
		{
			char *errMsg = nullptr;
			const auto result = sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &errMsg);
			if (result != SQLITE_OK) {
				throw std::runtime_error("(exec) Failed to execute statement: " + std::string(errMsg));
			}
			if (errMsg != nullptr)
				sqlite3_free(errMsg);
			return result;
		}

		int Database::getErrorCode() const
		{
			return lastErrorCode;
		}

		bool Database::tableExists(const char *name) const
		{
			Statement query(*this, "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=$name");
			query.bind("$name", name);
			query.executeStep();
			const auto count = query.getInt("COUNT(*)");
			return count > 0;
		}

		Statement::Statement(const Database &database, const std::string &sql, bool longRunning) : stmt(nullptr)
			, db(database.get())
			, sql(sql)
			, lastErrorCode(SQLITE_OK)
			, sqliteDone(false)
			, sqliteHasRow(false)
		{
			unsigned int flags;
			if ((lastErrorCode = sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr)) != SQLITE_OK) {
				throw std::runtime_error("(Statement) Failed to prepare statement: " + std::string(sqlite3_errmsg(db)));
			}

			if (parameters.empty()) {
				for (int i = 1; i <= sqlite3_bind_parameter_count(stmt); ++i) {
					const char *pName = sqlite3_bind_parameter_name(stmt, i);
					const int index = sqlite3_bind_parameter_index(stmt, pName);
					parameters[pName] = index;
				}
			}

			if (columns.empty()) {
				for (int i = 0; i < sqlite3_column_count(stmt); ++i) {
					const char *pName = sqlite3_column_name(stmt, i);
					columns[pName] = i;
				}
			}
		}

		Statement::~Statement()
		{
			if (stmt) {
				sqlite3_finalize(stmt);
				stmt = nullptr;
			}
		}

		void Statement::bind(const std::string &parameterName, int value)
		{
			lastErrorCode = sqlite3_bind_int(stmt, parameters[parameterName], value);
		}

		void Statement::bind(const std::string &parameterName, int64_t value)
		{
			lastErrorCode = sqlite3_bind_int64(stmt, parameters[parameterName], value);
		}

		void Statement::bind(const std::string &parameterName, double value)
		{
			lastErrorCode = sqlite3_bind_double(stmt, parameters[parameterName], value);
		}

		void Statement::bind(const std::string &parameterName, const std::string &value)
		{
			lastErrorCode = sqlite3_bind_text(stmt, parameters[parameterName], value.c_str(), -1, SQLITE_TRANSIENT);
		}

		void Statement::bind(const std::string &parameterName, const char *value)
		{
			lastErrorCode = sqlite3_bind_text(stmt, parameters[parameterName], value, -1, SQLITE_TRANSIENT);
		}

		const char *Statement::getName(const std::string &columnName) const noexcept
		{
			return sqlite3_column_name(stmt, columns.at(columnName));
		}

		const char *Statement::getOriginName(const std::string &columnName) const noexcept
		{
			return sqlite3_column_origin_name(stmt, columns.at(columnName));
		}

		int32_t Statement::getInt(const std::string &columnName) const noexcept
		{
			return sqlite3_column_int(stmt, columns.at(columnName));
		}

		uint32_t Statement::getUInt(const std::string &columnName) const noexcept
		{
			return static_cast<unsigned>(getInt64(columnName));
		}

		int64_t Statement::getInt64(const std::string &columnName) const noexcept
		{
			return sqlite3_column_int64(stmt, columns.at(columnName));
		}

		double Statement::getDouble(const std::string &columnName) const noexcept
		{
			return sqlite3_column_double(stmt, columns.at(columnName));
		}

		const char *Statement::getText(const std::string &columnName, const char *defaultValue) const noexcept
		{
			const auto pText = reinterpret_cast<const char *>(sqlite3_column_text(stmt, columns.at(columnName)));
			return (pText ? pText : defaultValue);
		}

		const void *Statement::getBlob(const std::string &columnName) const noexcept
		{
			return sqlite3_column_blob(stmt, columns.at(columnName));
		}

		std::string Statement::getString(const std::string &columnName) const
		{
			const auto index = columns.at(columnName);
			// Note: using sqlite3_column_blob and not sqlite3_column_text
			// - no need for sqlite3_column_text to add a \0 on the end, as we're getting the bytes length directly
			//   however, we need to call sqlite3_column_bytes() to ensure correct format. It's a noop on a BLOB
			//   or a TEXT value with the correct encoding (UTF-8). Otherwise it'll do a conversion to TEXT (UTF-8).
			(void)sqlite3_column_bytes(stmt, index);
			const auto data = static_cast<const char *>(sqlite3_column_blob(stmt, index));

			// sqlite docs: "The safest policy is to invoke… sqlite3_column_blob() followed by sqlite3_column_bytes()"
			// Note: std::string is ok to pass nullptr as first arg, if length is 0
			return std::string(data, sqlite3_column_bytes(stmt, index));
		}

		int Statement::getType(const std::string &columnName) const noexcept
		{
			return sqlite3_column_type(stmt, columns.at(columnName));
		}

		int Statement::getBytes(const std::string &columnName) const noexcept
		{
			return sqlite3_column_bytes(stmt, columns.at(columnName));
		}

		bool Statement::isDone() const
		{
			return sqliteDone;
		}

		bool Statement::hasRow() const
		{
			return sqliteHasRow;
		}

		int Statement::tryExecuteStep(const bool autoReset)
		{
			if (sqliteDone) {
				if (autoReset) {
					reset();
				} else {
					return SQLITE_MISUSE; // Statement needs to be reset!
				}
			}

			const int result = sqlite3_step(stmt);
			if (SQLITE_ROW == result) // one row is ready : call getColumn(N) to access it
			{
				sqliteHasRow = true;
			} else {
				sqliteHasRow = false;
				sqliteDone = SQLITE_DONE == result; // mark if the query has finished executing
			}
			return result;
		}

		int Statement::executeStep()
		{
			auto const result = tryExecuteStep(true);
			if (result != SQLITE_ROW && result != SQLITE_DONE) {
				throw std::runtime_error("(executeStep) Failed to execute statement: " + std::string(sqlite3_errmsg(db)));
			}
			return result;
		}

		int Statement::getErrorCode() const
		{
			return lastErrorCode;
		}

		const char *Statement::getErrorMsg() const
		{
			return sqlite3_errmsg(db);
		}

		void Statement::reset()
		{
			lastErrorCode = sqlite3_reset(stmt);
			sqliteDone = false;
			sqliteHasRow = false;
		}

		int Statement::exec()
		{
			const int result = sqlite3_step(stmt);
			const int changes = sqlite3_changes(db);
			if (changes > 0) {
				sqliteHasRow = true;
			}
			sqliteDone = true;
			return result;
		}

		bool Statement::stripToken::operator()(const std::string &a, const std::string &b) const
		{
			std::string first = a, second = b;
			const auto t = "?:@$";
			// check if a or b starts with a token
			if (first.find_first_of(t) == 0) {
				first = first.substr(1);
			}
			if (second.find_first_of(t) == 0) {
				second = second.substr(1);
			}
			return first < second;
		}

		template<typename T>
		std::vector<T> GetSome(Statement &query, std::function<T(Statement &)> getItem)
		{
			std::vector<T> items;
			bool triedReset = false;
			while (!query.isDone()) {
				const auto result = query.tryExecuteStep();
				if (result == SQLITE_MISUSE) {
					if (triedReset) {
						throw std::runtime_error("(getSome) Failed to get record: " + std::string(query.getErrorMsg()));
					}
					query.reset();
					triedReset = true;
					continue;
				}
				if (query.hasRow()) {
					items.push_back(getItem(query));
				} else if (query.isDone()) {
					// no rows returned
					break;
				} else if (result == SQLITE_BUSY) {
					// wait for 10ms
					std::this_thread::sleep_for(std::chrono::milliseconds(10));
				} else {
					throw std::runtime_error("(getSome) Failed to get record: " + std::string(query.getErrorMsg()));
				}
			}
			return items;
		}

		/**
		 * \brief fills a columns map and a columnNames vector from the SQLite table_info pragma
		 */
		void initializeColumns(const sqlite::Database &database, const std::string &tableName, std::map<std::string, Column> &columns, std::vector<std::string> &columnNames)
		{
			if (columns.empty()) {
				sqlite::Statement query(database, "SELECT * FROM pragma_table_info('" + tableName + "')");
				const auto items = GetSome<Column>(query, [](sqlite::Statement &q) {
					Column column;
					column.name = q.getText("name");
					column.type = q.getText("type");
					column.notNull = q.getInt("notnull") == 1;
					column.isPrimaryKey = q.getInt("pk") != 0;
					column.primaryKeyIndex = q.getInt("pk");
					return column;
				});
				for (auto &item : items) {
					columns[item.name] = item;
				}
				for (const auto &key : columns | std::views::keys) {
					columnNames.push_back(key);
				}
			}
		}
	}

	DatabaseActions::DatabaseActions(sqlite::Database &dbInstance) : dbInstance(dbInstance)
	{}

	const char *DatabaseActions::getCreateDownloads()
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

	void DatabaseActions::createDownloadsTable() const
	{
		const std::string sql = getCreateDownloads();
		if (dbInstance.tableExists("downloads") == false) {
			dbInstance.exec(sql);
			spdlog::debug("(createDownloadsTable) Downloads table created.");
		}
	}

	const char *DatabaseActions::getCreateWingman()
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

	void DatabaseActions::createWingmanTable() const
	{
		const std::string sql = getCreateWingman();
		if (dbInstance.tableExists("wingman") == false) {
			dbInstance.exec(sql);
			spdlog::debug("(createWingmanTable) Wingman table created.");
		}
	}

	const char *DatabaseActions::getCreateApp()
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

	void DatabaseActions::createAppTable() const
	{
		const std::string sql = getCreateApp();

		if (dbInstance.tableExists("app") == false) {
			const auto result = dbInstance.exec(sql);
			spdlog::debug("(createAppTable) App table created. result: {}", result);
		}
	}

	AppItemActions::AppItemActions(sqlite::Database &dbInstance) : dbInstance(dbInstance)
	{
		initializeColumns(dbInstance, TABLE_NAME, columns, columnNames);
	}

	std::optional<AppItem> AppItemActions::getSome(sqlite::Statement &query)
	{
		auto items = GetSome<AppItem>(query, [](sqlite::Statement &q) {
			AppItem item;
			item.name = q.getText("name");
			item.key = q.getText("key");
			item.value = q.getText("value");
			item.enabled = q.getInt("enabled");
			item.created = q.getInt64("created");
			item.updated = q.getInt64("updated");
			return item;
		});
		if (!items.empty())
			return items[0];
		return std::nullopt;
	}

	std::optional<AppItem> AppItemActions::get(const std::string &name, const std::optional<std::string> &key) const
	{
		sqlite::Statement query(dbInstance,
			std::format("SELECT * FROM {} WHERE name = $name AND key = $key", TABLE_NAME));
		query.bind("$name", name);
		query.bind("$key", key.value_or(""));
		auto item = getSome(query);
		return item;
	}

	void AppItemActions::set(const AppItem &item) const
	{
		// check if item exists, if not insert, else update
		const auto existingItem = get(item.name, item.key);
		std::string sql;
		std::string updateType;
		bool insert = false;
		if (existingItem) {
			updateType = "update";
			sql = std::format("UPDATE {} SET", TABLE_NAME);
			std::string fields;
			for (const auto &name : columnNames) {
				// skip key columns and the created column
				if (name == "created" || name == "key" || name == "name") {
					continue;
				}
				fields.append(std::format(" {} = ${}, ", name, name));
			}
			fields.pop_back();
			fields.pop_back();
			sql.append(fields);
			sql.append(" WHERE name = $name AND key = $key");
		} else {
			updateType = "insert";
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
		sqlite::Statement query(dbInstance, sql);
		query.bind("$value", item.value);
		query.bind("$enabled", item.enabled);
		query.bind("$updated", item.updated);
		if (insert) {
			query.bind("$created", item.created);
		}

		// key columns
		query.bind("$name", item.name);
		query.bind("$key", item.key);

		const auto errorCode = query.exec();
		if (errorCode != SQLITE_DONE) {
			auto error = dbInstance.getErrorMsg();
			throw std::runtime_error("(set) Failed to : " + updateType + " record: " + error);
		}
	}

	void AppItemActions::remove(const std::string &name, const std::string &key) const
	{
		sqlite::Statement query(dbInstance, std::format("DELETE FROM {} WHERE name = $name AND key = $key", TABLE_NAME));
		query.bind("$name", name);
		query.bind("$key", key);

		const auto errorCode = query.exec();
		if (errorCode != SQLITE_DONE) {
			throw std::runtime_error("(remove) Failed to delete record: " + std::to_string(errorCode));
		}
	}

	void AppItemActions::clear() const
	{
		sqlite::Statement query(dbInstance, std::format("DELETE FROM {}", TABLE_NAME), true);

		const auto errorCode = query.exec();

		if (errorCode != SQLITE_DONE) {
			throw std::runtime_error("(clear) Failed to clear records: " + std::to_string(errorCode));
		}
	}

	int AppItemActions::count() const
	{
		sqlite::Statement query(dbInstance, std::format("SELECT COUNT(*) FROM {}", TABLE_NAME), true);
		const auto errorCode = query.executeStep();
		if (query.hasRow()) {
			return query.getInt("COUNT(*)");
		}
		if (query.getErrorCode() != SQLITE_DONE) {
			throw std::runtime_error("(count) Failed to count records: " + std::to_string(errorCode));
		}
		return -1;
	}

	nlohmann::json AppItemActions::toJson(const AppItem &item)
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

	AppItem AppItemActions::fromJson(const nlohmann::json &j)
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

	DownloadItemActions::DownloadItemActions(sqlite::Database &dbInstance, const fs::path &downloadsDir) :
		dbInstance(dbInstance)
	{
		downloadsDirectory = downloadsDir;
		fs::create_directories(downloadsDir);
		// initialize columns cache
		initializeColumns(dbInstance, TABLE_NAME, columns, columnNames);
	}

	std::vector<DownloadItem> DownloadItemActions::getSome(sqlite::Statement &query)
	{
		return sqlite::GetSome<DownloadItem>(query, [](sqlite::Statement &q) {
			DownloadItem item;
			item.modelRepo = q.getText("modelRepo");
			item.filePath = q.getText("filePath");
			item.status = DownloadItem::toStatus(q.getText("status"));
			item.totalBytes = q.getInt64("totalBytes");
			item.downloadedBytes = q.getInt64("downloadedBytes");
			item.downloadSpeed = q.getText("downloadSpeed");
			item.progress = q.getDouble("progress");
			item.error = q.getText("error");
			item.created = q.getInt64("created");
			item.updated = q.getInt64("updated");
			return item;
		});
	}

	std::optional<DownloadItem> DownloadItemActions::get(
		const std::string &modelRepo, const std::string &filePath) const
	{
		sqlite::Statement query(dbInstance,
						std::format("SELECT * FROM {} WHERE modelRepo = $modelRepo AND filePath = $filePath", TABLE_NAME));
		query.bind("$modelRepo", modelRepo);
		query.bind("$filePath", filePath);
		auto items = getSome(query);
		if (!items.empty())
			return items[0];
		return std::nullopt;
	}

	std::optional<DownloadItem> DownloadItemActions::getValue(
		const std::string &modelRepo, const std::string &filePath) const
	{
		sqlite::Statement query(dbInstance,
									std::format("SELECT * FROM {} WHERE modelRepo = $modelRepo AND filePath = $filePath", TABLE_NAME));
		query.bind("$modelRepo", modelRepo);
		query.bind("$filePath", filePath);
		auto items = getSome(query);
		if (!items.empty())
			return items[0];
		return std::nullopt;
	}

	std::vector<DownloadItem> DownloadItemActions::getAll() const
	{
		sqlite::Statement query(dbInstance, std::format("SELECT * FROM {}", TABLE_NAME));
		return getSome(query);
	}

	std::vector<DownloadItem> DownloadItemActions::getAllByStatus(const DownloadItemStatus status) const
	{
		sqlite::Statement query(dbInstance,
						std::format("SELECT * FROM {} WHERE status = $status", TABLE_NAME));
		query.bind("$status", DownloadItem::toString(status));
		return getSome(query);
	}

	std::optional<DownloadItem> DownloadItemActions::getNextQueued() const
	{
		sqlite::Statement query(dbInstance,
									std::format("SELECT * FROM {} WHERE status = 'queued' ORDER BY created ASC LIMIT 1", TABLE_NAME));
		auto items = getSome(query);
		if (!items.empty())
			return items[0];
		return std::nullopt;
	}

	void DownloadItemActions::set(const DownloadItem &item) const
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
				// skip key columns and the created column
				if (name == "created" || name == "modelRepo" || name == "filePath") {
					continue;
				}
				fields.append(std::format(" {} = ${}, ", name, name));
			}
			fields.pop_back();
			fields.pop_back();
			sql.append(fields);
			sql.append(" WHERE modelRepo = $modelRepo AND filePath = $filePath");
		} else {
			updateType = "insert";
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

		auto query = sqlite::Statement(dbInstance, sql);
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

		// key columns
		query.bind("$modelRepo", item.modelRepo);
		query.bind("$filePath", item.filePath);

		const auto errorCode = query.exec();
		if (errorCode != SQLITE_DONE) {
			auto error = dbInstance.getErrorMsg();
			throw std::runtime_error("(set) Failed to : " + updateType + " record: " + error);
		}
	}

	std::shared_ptr<DownloadItem> DownloadItemActions::enqueue(const std::string &modelRepo, const std::string &filePath) const
	{
		auto item = std::make_shared<DownloadItem>();
		item->modelRepo = modelRepo;
		item->filePath = filePath;
		item->status = DownloadItemStatus::queued;
		item->created = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();
		item->updated = item->created;
		set(*item);
		return item;
	}

	void DownloadItemActions::remove(const std::string &modelRepo, const std::string &filePath) const
	{
		sqlite::Statement query(dbInstance,
			std::format("DELETE FROM {} WHERE modelRepo = $modelRepo AND filePath = $filePath", TABLE_NAME));
		query.bind("$modelRepo", modelRepo);
		query.bind("$filePath", filePath);
		const auto errorCode = query.exec();
		if (errorCode != SQLITE_DONE) {
			throw std::runtime_error("(remove) Failed to delete record: " + std::to_string(errorCode));
		}
	}

	void DownloadItemActions::clear() const
	{
		sqlite::Statement query(dbInstance, std::format("DELETE FROM {}", TABLE_NAME), true);
		const auto errorCode = query.exec();
		if (errorCode != SQLITE_DONE) {
			throw std::runtime_error("(clear) Failed to clear records: " + std::to_string(errorCode));
		}
	}

	int DownloadItemActions::count() const
	{
		sqlite::Statement query(dbInstance, std::format("SELECT COUNT(*) FROM {}", TABLE_NAME), true);
		query.executeStep();
		if (query.hasRow()) {
			return query.getInt("COUNT(*)");
		}

		const auto errorCode = query.getErrorCode();
		if (errorCode != SQLITE_DONE) {
			throw std::runtime_error("(count) Failed to count records: " + std::to_string(errorCode));
		}
		return -1;
	}

	void DownloadItemActions::reset() const
	{
		{	// enclose in scope to ensure query is destroyed before query
			sqlite::Statement query(dbInstance,
				std::format("UPDATE {} SET status = 'queued', progress = 0, downloadedBytes = 0, totalBytes = 0, downloadSpeed = '' WHERE status = 'downloading' OR status = 'error' or status = 'idle'", TABLE_NAME));
			const auto errorCode = query.exec();
			if (errorCode != SQLITE_DONE) {
				throw std::runtime_error("(reset) Failed to reset update record: " + std::to_string(errorCode));
			}
		}
		{
			sqlite::Statement query(dbInstance,
				//std::format("DELETE FROM {} WHERE status = 'complete' OR status = 'cancelled' OR status = 'unknown'", TABLE_NAME));
				std::format("DELETE FROM {} WHERE status = 'cancelled' OR status = 'unknown'", TABLE_NAME));
			const auto errorCode = query.exec();
			if (errorCode != SQLITE_DONE) {
				throw std::runtime_error("(reset) Failed to reset delete record: " + std::to_string(errorCode));
			}
		}
	}

	bool DownloadItemActions::fileExists(const std::string &modelRepo, const std::string &filePath) const
	{
		const auto exists = fs::exists(getDownloadItemOutputPath(modelRepo, filePath));
		if (!exists) {
			return false;
		}

		const auto freshItem = get(modelRepo, filePath);
		// If it's in the database and marked as complete, then it's downloaded.
		if (freshItem && freshItem->status == DownloadItemStatus::complete) {
			return true;
		}
		return false;
	}

	bool DownloadItemActions::fileExists(const DownloadItem &item) const
	{
		return fileExists(item.modelRepo, item.filePath);
	}

	nlohmann::json DownloadItemActions::toJson(const DownloadItem &item)
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

	DownloadItem DownloadItemActions::fromJson(const nlohmann::json &j)
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

	std::string DownloadItemActions::getDownloadItemFileName(
		const std::string &modelRepo, const std::string &filePath)
	{
		return safeDownloadItemName(modelRepo, filePath);
	}

	std::vector<std::string> DownloadItemActions::getModelFiles()
	{
		std::vector<std::string> files;

		for (const auto &entry : fs::directory_iterator(downloadsDirectory)) {
			if (entry.is_regular_file()) {
				files.push_back(entry.path().filename().string());
			}
		}

		return files;
	}

	std::vector<DownloadedFileInfo> DownloadItemActions::getDownloadedFileInfos()
	{
		std::vector<DownloadedFileInfo> fileInfos;
		const auto modelFiles = getModelFiles();

		for (const auto &file : modelFiles) {
			const auto name = parseSafeFilePathIntoDownloadItemName(file);
			if (!name) {
				spdlog::debug("Skipping file: " + file + " because it's not a downloaded model file.");
				continue;
			}
			fileInfos.push_back(getDownloadedFileInfo(name->modelRepo, name->filePath));
		}

		return fileInfos;
	}

	std::string DownloadItemActions::safeDownloadItemName(const std::string &modelRepo, const std::string &filePath)
	{
		const std::regex slashRegex("\\/");
		const std::string result = std::regex_replace(modelRepo, slashRegex, "[-]");
		return result + "[=]" + filePath;
	}

	std::optional<DownloadItemName> DownloadItemActions::parseSafeFilePathIntoDownloadItemName(const std::string &name)
	{
		if (name.find("[-]") == std::string::npos || name.find("[=]") == std::string::npos) {
			return {};
		}

		const size_t pos = name.find("[=]");
		std::string modelRepoPart = name.substr(0, pos);
		const std::string filePathPart = name.substr(pos + 3);

		const std::regex dashRegex("\\[-\\]");
		modelRepoPart = std::regex_replace(modelRepoPart, dashRegex, "/");

		return { DownloadItemName { modelRepoPart, filePathPart } }; // Return the struct and true flag indicating success.
	}

	std::string DownloadItemActions::getDownloadItemOutputPath(const std::string &modelRepo, const std::string &filePath)
	{
		const fs::path path = downloadsDirectory / safeDownloadItemName(modelRepo, filePath);
		return path.string();
	}

	std::string DownloadItemActions::getDownloadItemOutputPath(const DownloadItem &item)
	{
		return getDownloadItemOutputPath(item.modelRepo, item.filePath);
	}

	std::string DownloadItemActions::getDownloadItemOutputFilePathQuant(const std::string &modelRepo, const std::string &quantization)
	{
		return getDownloadItemOutputPath(modelRepo, getQuantFileNameForModelRepo(modelRepo, quantization));
	}

	std::string DownloadItemActions::getModelIdFromModelRepo(const std::string &modelRepo)
	{
		if (!util::stringContains(modelRepo, "/")) {
			throw std::runtime_error("Invalid model repo: " + modelRepo);
		}
		const auto strippedModelRepo = curl::stripModelRepoName(modelRepo);
		const auto parts = util::splitString(modelRepo, '/');
		return parts[parts.size() - 1];
	}

	std::string DownloadItemActions::getQuantFileNameForModelRepo(
		const std::string &modelRepo, const std::string &quantization)
	{
		const std::string modelId = util::stringLower(getModelIdFromModelRepo(modelRepo));
		return fmt::format("{}.{}{}", modelId, util::stringUpper(quantization), curl::HF_MODEL_FILE_EXTENSION);
	}

	bool DownloadItemActions::isDownloaded(const std::string &modelRepo, const std::string &filePath)
	{
		ItemActionsFactory ormFactory;
		const auto item = ormFactory.download()->get(modelRepo, filePath);

		// If it's in the database and marked as complete, then it's downloaded.
		if (item && item->status == DownloadItemStatus::complete) {
			return true;
		}

		// If it's not in the database, we check the file system.
		return fs::exists(getDownloadItemOutputPath(modelRepo, filePath));
	}

	DownloadedFileInfo DownloadItemActions::getDownloadedFileInfo(const std::string &modelRepo, const std::string &filePath)
	{
		ItemActionsFactory itemActionsFactory;
		const auto item = itemActionsFactory.download()->get(modelRepo, filePath);

		DownloadedFileInfo fileInfo;
		fileInfo.filePath = filePath;
		fileInfo.modelRepo = modelRepo;
		const auto fullPath = getDownloadItemOutputPath(modelRepo, filePath);

		// If the item is in the database, fetch its information.
		if (item) {
			fileInfo.totalBytes = item->totalBytes;
			fileInfo.downloadedBytes = item->downloadedBytes;
			fileInfo.created = item->created;
			fileInfo.updated = item->updated;
		} else {
			fileInfo.totalBytes = -1;
			fileInfo.downloadedBytes = -1;
			// get this info from the disk
			// created time is not part of the POSIX standard, so we use last_write_time and copy it to created and updated
			fileInfo.created = fs::last_write_time(fullPath).time_since_epoch().count();
			fileInfo.updated = fileInfo.created;
		}

		// Getting the size directly from the file system.
		fileInfo.fileSizeOnDisk = fs::file_size(fullPath);

		return fileInfo;
	}

	std::string DownloadItemActions::urlForModel(const std::string &modelRepo, const std::string &filePath)
	{
		// URL Template: https://huggingface.co/${modelRepo}/resolve/main/${filePath}
		const auto fixedModelRepo = curl::unstripModelRepoName(modelRepo);
		return fmt::format("https://huggingface.co/{}/resolve/main/{}", fixedModelRepo, filePath);
	}

	std::string DownloadItemActions::urlForModelQuant(const std::string &modelRepo, const std::string &quantization)
	{
		return urlForModel(modelRepo, getQuantFileNameForModelRepo(modelRepo, quantization));
	}

	std::string DownloadItemActions::urlForModel(const DownloadItem &item)
	{
		return urlForModel(item.modelRepo, item.filePath);
	}

	WingmanItemActions::WingmanItemActions(sqlite::Database &dbInstance, const fs::path &modelsDir) : dbInstance(dbInstance)
		, modelsDir(modelsDir)
	{
		initializeColumns(dbInstance, TABLE_NAME, columns, columnNames);
	}

	std::vector<WingmanItem> WingmanItemActions::getSome(sqlite::Statement &query)
	{
		return sqlite::GetSome<WingmanItem>(query, [](sqlite::Statement &q) {
			WingmanItem item;
			item.alias = q.getText("alias");
			item.status = WingmanItem::toStatus(q.getText("status"));
			item.modelRepo = q.getText("modelRepo");
			item.filePath = q.getText("filePath");
			item.force = q.getInt("force");
			item.error = q.getText("error");
			item.created = q.getInt64("created");
			item.updated = q.getInt64("updated");
			return item;
		});
	}

	std::optional<WingmanItem> WingmanItemActions::get(const std::string &alias) const
	{
		sqlite::Statement query(dbInstance,
									std::format("SELECT * FROM {} WHERE alias = $alias", TABLE_NAME));
		query.bind("$alias", alias);
		auto items = getSome(query);
		if (!items.empty())
			return items[0];
		return std::nullopt;
	}

	void WingmanItemActions::set(const WingmanItem &item) const
	{
		auto existingItem = get(item.alias);
		std::string sql;
		bool insert = false;
		std::string updateType;
		if (existingItem) {
			updateType = "update";
			sql = std::format("UPDATE {} SET", TABLE_NAME);
			std::string fields;
			for (const auto &name : columnNames) {
				// skip key columns and the created column
				if (name == "created" || name == "alias") {
					continue;
				}
				fields.append(std::format(" {} = ${}, ", name, name));
			}
			fields.pop_back();
			fields.pop_back();
			sql.append(fields);
			sql.append(" WHERE alias = $alias");
		} else {
			updateType = "insert";
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
		auto query = sqlite::Statement(dbInstance, sql);
		query.bind("$status", WingmanItem::toString(item.status));
		query.bind("$modelRepo", item.modelRepo);
		query.bind("$filePath", item.filePath);
		query.bind("$force", item.force);
		query.bind("$error", item.error);
		if (insert) {
			query.bind("$created", item.created);
		}
		query.bind("$updated", item.updated);

		// key columns
		query.bind("$alias", item.alias);

		const auto errorCode = query.exec();
		if (errorCode != SQLITE_DONE) {
			auto error = dbInstance.getErrorMsg();
			throw std::runtime_error("(set) Failed to : " + updateType + " record: " + error);
		}
	}

	void WingmanItemActions::remove(const std::string &alias) const
	{
		sqlite::Statement query(dbInstance,
												std::format("DELETE FROM {} WHERE alias = $alias", TABLE_NAME));
		query.bind("$alias", alias);
		const auto errorCode = query.exec();
		if (errorCode != SQLITE_DONE) {
			throw std::runtime_error("(remove) Failed to delete record: " + std::to_string(errorCode));
		}
	}

	void WingmanItemActions::clear() const
	{
		sqlite::Statement query(dbInstance, std::format("DELETE FROM {}", TABLE_NAME));
		const auto errorCode = query.exec();
		if (errorCode != SQLITE_DONE) {
			throw std::runtime_error("(clear) Failed to clear records: " + std::to_string(errorCode));
		}
	}

	int WingmanItemActions::count() const
	{
		sqlite::Statement query(dbInstance, std::format("SELECT COUNT(*) FROM {}", TABLE_NAME));
		query.executeStep();
		if (query.hasRow()) {
			return query.getInt("COUNT(*)");
		}

		const auto errorCode = query.getErrorCode();
		if (errorCode != SQLITE_DONE) {
			throw std::runtime_error("(count) Failed to count records: " + std::to_string(errorCode));
		}
		return -1;
	}

	nlohmann::json WingmanItemActions::toJson(const WingmanItem &item)
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

	WingmanItem WingmanItemActions::fromJson(const nlohmann::json &j)
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

	void ItemActionsFactory::openDatabase()
	{
		spdlog::debug("(openDatabase) Opening database {}...", dbPath.string());
		if (db != nullptr) {
			throw std::runtime_error("(openDatabase) Database is already opened.");
		}
		db = std::make_shared<sqlite::Database>(dbPath.string(), SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE);
		if (db->getErrorCode() != SQLITE_OK) {
			throw std::runtime_error("(openDatabase) Failed to open database: " + std::string(db->getErrorMsg()));
		}
		spdlog::debug("(openDatabase) Database opened.");
	}

	void ItemActionsFactory::initializeDatabase()
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

	ItemActionsFactory::ItemActionsFactory(const std::optional<const fs::path> &baseDirectory) : db(nullptr)
		, initialized(false)
	{
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

	std::shared_ptr<AppItemActions> ItemActionsFactory::app()
	{
		return pAppItemActions;
	}

	std::shared_ptr<DownloadItemActions> ItemActionsFactory::download()
	{
		return pDownloadItemItemActions;
	}

	std::shared_ptr<WingmanItemActions> ItemActionsFactory::wingman()
	{
		return pWingmanItemItemActions;
	}

	const fs::path &ItemActionsFactory::getWingmanHome() const
	{
		return wingmanHome;
	}

	const fs::path &ItemActionsFactory::getDataDir() const
	{
		return dataDir;
	}

	const fs::path &ItemActionsFactory::getModelsDir() const
	{
		return modelsDir;
	}

	const fs::path &ItemActionsFactory::getDbPath() const
	{
		return dbPath;
	}

	nlohmann::json DownloadServerAppItem::toJson(const DownloadServerAppItem &downloadServerAppItem)
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

	DownloadServerAppItem DownloadServerAppItem::fromJson(const nlohmann::json &j)
	{
		DownloadServerAppItem downloadServerAppItem;
		downloadServerAppItem.status = DownloadServerAppItem::toStatus(j["status"].get<std::string>());
		if (j.contains("currentDownload")) {
			auto currentDownload = DownloadItemActions::fromJson(j["currentDownload"]);
			downloadServerAppItem.currentDownload.emplace(currentDownload);
		}
		if (j.contains("error")) {
			downloadServerAppItem.error = j["error"].get<std::string>();
		}
		downloadServerAppItem.created = j["created"].get<long long>();
		downloadServerAppItem.updated = j["updated"].get<long long>();
		return downloadServerAppItem;
	}

}
