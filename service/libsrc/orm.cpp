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
				throw std::runtime_error("(Database) sqlite is not threadsafe.");
			}

			// set a busy timeout and timeout handler
			sqlite3_busy_timeout(db, 10000);
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
			return result;
		}

		int Database::getErrorCode() const
		{
			return lastErrorCode;
		}

		bool Database::tableExists(const char *name) const
		{
			Statement query(*this, "SELECT count(*) FROM sqlite_master WHERE type='table' AND name=$name");
			query.bind("$name", name);
			query.executeStep();
			const auto count = query.getColumn("count(*)").getInt();
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

			if (longRunning) {
				flags = SQLITE_PREPARE_PERSISTENT;
			} else {
				flags = 0;
			}
			if ((lastErrorCode = sqlite3_prepare_v3(db, sql.c_str(), -1, flags, &stmt, nullptr)) != SQLITE_OK) {
				throw std::runtime_error("(Statement) Failed to prepare statement: " + std::string(sqlite3_errmsg(db)));
			}

			if (parameters.empty()) {
				for (int i = 1; i <= sqlite3_bind_parameter_count(stmt); ++i) {
					const char *pName = sqlite3_bind_parameter_name(stmt, i);
					const int index = sqlite3_bind_parameter_index(stmt, pName);
					parameters[pName] = std::make_shared<StatementColumn>(this, pName, index);
				}
			}

			if (columns.empty()) {
				for (int i = 0; i < sqlite3_column_count(stmt); ++i) {
					const char *pName = sqlite3_column_name(stmt, i);
					columns[pName] = std::make_shared<StatementColumn>(this, pName, i);
				}
			}
		}

		Statement::StatementColumn::StatementColumn(
			Statement *parent, const std::string &name, int index) : name(name)
			, index(index)
			, parent(parent)
		{}

		const char *Statement::StatementColumn::getName() const noexcept
		{
			return sqlite3_column_name(parent->stmt, index);
		}

		const char *Statement::StatementColumn::getOriginName() const noexcept
		{
			return sqlite3_column_origin_name(parent->stmt, index);
		}

		int32_t Statement::StatementColumn::getInt() const noexcept
		{
			return sqlite3_column_int(parent->stmt, index);
		}

		uint32_t Statement::StatementColumn::getUInt() const noexcept
		{
			return static_cast<unsigned>(getInt64());
		}

		int64_t Statement::StatementColumn::getInt64() const noexcept
		{
			return sqlite3_column_int64(parent->stmt, index);
		}

		double Statement::StatementColumn::getDouble() const noexcept
		{
			return sqlite3_column_double(parent->stmt, index);
		}

		const char *Statement::StatementColumn::getText(const char *defaultValue) const noexcept
		{
			const auto pText = reinterpret_cast<const char *>(sqlite3_column_text(parent->stmt, index));
			return (pText ? pText : defaultValue);
		}

		const void *Statement::StatementColumn::getBlob() const noexcept
		{
			return sqlite3_column_blob(parent->stmt, index);
		}

		std::string Statement::StatementColumn::getString() const
		{
			// Note: using sqlite3_column_blob and not sqlite3_column_text
			// - no need for sqlite3_column_text to add a \0 on the end, as we're getting the bytes length directly
			//   however, we need to call sqlite3_column_bytes() to ensure correct format. It's a noop on a BLOB
			//   or a TEXT value with the correct encoding (UTF-8). Otherwise it'll do a conversion to TEXT (UTF-8).
			(void)sqlite3_column_bytes(parent->stmt, index);
			auto data = static_cast<const char *>(sqlite3_column_blob(parent->stmt, index));

			// sqlite docs: "The safest policy is to invoke… sqlite3_column_blob() followed by sqlite3_column_bytes()"
			// Note: std::string is ok to pass nullptr as first arg, if length is 0
			return std::string(data, sqlite3_column_bytes(parent->stmt, index));
		}

		int Statement::StatementColumn::getType() const noexcept
		{
			return sqlite3_column_type(parent->stmt, index);
		}

		int Statement::StatementColumn::getBytes() const noexcept
		{
			return sqlite3_column_bytes(parent->stmt, index);
		}

		void Statement::bind(const std::string &parameterName, int value)
		{
			lastErrorCode = sqlite3_bind_int(stmt, parameters[parameterName]->index, value);
		}

		void Statement::bind(const std::string &parameterName, int64_t value)
		{
			lastErrorCode = sqlite3_bind_int64(stmt, parameters[parameterName]->index, value);
		}

		void Statement::bind(const std::string &parameterName, double value)
		{
			lastErrorCode = sqlite3_bind_double(stmt, parameters[parameterName]->index, value);
		}

		void Statement::bind(const std::string &parameterName, const std::string &value)
		{
			lastErrorCode = sqlite3_bind_text(stmt, parameters[parameterName]->index, value.c_str(), -1, SQLITE_TRANSIENT);
		}

		void Statement::bind(const std::string &parameterName, const char *value)
		{
			lastErrorCode = sqlite3_bind_text(stmt, parameters[parameterName]->index, value, -1, SQLITE_TRANSIENT);
		}

		Statement::StatementColumn &Statement::getColumn(const std::string &columnName)
		{
			return *columns[columnName];
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

			//const int result = retrySqliteMethod([&]() {
			//	return sqlite3_step(stmt);
			//});
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
			bool done = false;
			int changes = -1;
			//int result = retrySqliteMethod([&]() {
			//	return sqlite3_step(stmt);
			//});
			int result = sqlite3_step(stmt);
			changes = sqlite3_changes(db);
			if (changes > 0) {
				sqliteHasRow = true;
			}
			sqliteDone = true;
			//retrySqliteMethod([&]() {
			//	return sqlite3_finalize(stmt);
			//});
			sqlite3_finalize(stmt);
			return changes;
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
			//const std::string first = util::stringTrim(a1, t);
			//const std::string second = util::stringTrim(b1, t);
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
	}

	/**
	 * \brief fills the columns map and columnNames vector from the SQLite table_xinfo pragma
	 */
	static void initializeColumns(const sqlite::Database &database, const std::string &tableName, std::map<std::string, Column> &columns, std::vector<std::string> &columnNames)
	{
		if (columns.empty()) {
			sqlite::Statement query(database, "SELECT * FROM pragma_table_info('" + tableName + "')");
			const auto items = GetSome<Column>(query, [](sqlite::Statement &q) {
				Column column;
				column.name = q.getColumn("name").getText();
				column.type = q.getColumn("type").getText();
				column.notNull = q.getColumn("notnull").getInt() == 1;
				column.isPrimaryKey = q.getColumn("pk").getInt() != 0;
				column.primaryKeyIndex = q.getColumn("pk").getInt();
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

	std::optional<AppItem> AppItemActions::getSome(sqlite::Statement &query)
	{
		auto items = GetSome<AppItem>(query, [](sqlite::Statement &q) {
			AppItem item;
			item.name = q.getColumn("name").getText();
			item.key = q.getColumn("key").getText();
			item.value = q.getColumn("value").getText();
			item.enabled = q.getColumn("enabled").getInt();
			item.created = q.getColumn("created").getInt64();
			item.updated = q.getColumn("updated").getInt64();
			return item;
		});
		if (!items.empty())
			return items[0];
		return std::nullopt;
	}

	AppItemActions::AppItemActions(sqlite::Database &dbInstance) : dbInstance(dbInstance)
		, queryGet(dbInstance, std::format("SELECT * FROM {}", TABLE_NAME), true)
		, queryGetByPK(dbInstance, std::format("SELECT * FROM {} WHERE name = $name AND key = $key", TABLE_NAME), true)
		, queryDelete(dbInstance, std::format("DELETE FROM {} WHERE name = $name AND key = $key", TABLE_NAME), true)
		, queryClear(dbInstance, std::format("DELETE FROM {}", TABLE_NAME), true)
		, queryCount(dbInstance, std::format("SELECT COUNT(*) FROM {}", TABLE_NAME), true)
	{
		initializeColumns(dbInstance, TABLE_NAME, columns, columnNames);
	}

	std::optional<AppItem> AppItemActions::get(
		const std::string &name, const std::optional<std::string> &key)
	{
		queryGetByPK.reset();
		queryGetByPK.bind("$name", name);
		queryGetByPK.bind("$key", key.value_or(""));
		auto item = getSome(queryGetByPK);
		//return std::make_unique<AppItem>(item.value());
		return item;
	}

	void AppItemActions::set(const AppItem &item)
	{
		std::lock_guard<std::mutex> guard(mutex);
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
		auto query = sqlite::Statement(dbInstance, sql);
		query.bind("$value", item.value);
		query.bind("$enabled", item.enabled);
		query.bind("$updated", item.updated);
		if (insert) {
			query.bind("$created", item.created);
		}
		query.bind("$name", item.name);
		query.bind("$key", item.key);
		query.exec();
		if (query.getErrorCode() != SQLITE_DONE) {
			throw std::runtime_error("(set) Failed to update record: " + std::string(dbInstance.getErrorMsg()));
		}
	}

	void AppItemActions::remove(const std::string &name, const std::string &key)
	{
		queryDelete.reset();
		queryDelete.bind("$name", name);
		queryDelete.bind("$key", key);
		queryDelete.exec();
		if (queryDelete.getErrorCode() != SQLITE_DONE) {
			throw std::runtime_error("(remove) Failed to delete record: " + std::string(dbInstance.getErrorMsg()));
		}
	}

	void AppItemActions::clear()
	{
		queryClear.reset();
		queryClear.exec();
		if (queryClear.getErrorCode() != SQLITE_DONE) {
			throw std::runtime_error("(clear) Failed to clear records: " + std::string(dbInstance.getErrorMsg()));
		}
	}

	int AppItemActions::count()
	{
		queryCount.reset();
		queryCount.executeStep();
		if (queryCount.hasRow()) {
			return queryCount.getColumn(nullptr).getInt();
		}
		if (queryCount.getErrorCode() != SQLITE_DONE) {
			throw std::runtime_error("(count) Failed to count records: " + std::string(dbInstance.getErrorMsg()));
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

	std::vector<DownloadItem> DownloadItemActions::getSome(sqlite::Statement &query)
	{
		return sqlite::GetSome<DownloadItem>(query, [](sqlite::Statement &q) {
			DownloadItem item;
			item.modelRepo = q.getColumn("modelRepo").getText();
			item.filePath = q.getColumn("filePath").getText();
			item.status = DownloadItem::toStatus(q.getColumn("status").getText());
			item.totalBytes = q.getColumn("totalBytes").getInt64();
			item.downloadedBytes = q.getColumn("downloadedBytes").getInt64();
			item.downloadSpeed = q.getColumn("downloadSpeed").getText();
			item.progress = q.getColumn("progress").getDouble();
			item.error = q.getColumn("error").getText();
			item.created = q.getColumn("created").getInt64();
			item.updated = q.getColumn("updated").getInt64();
			return item;
		});
	}

	DownloadItemActions::DownloadItemActions(
		sqlite::Database &dbInstance, const fs::path &downloadsDirectory) : dbInstance(dbInstance)
		, queryGet(dbInstance, std::format("SELECT * FROM {}", TABLE_NAME), true)
		, queryGetByPK(dbInstance, std::format("SELECT * FROM {} WHERE modelRepo = $modelRepo AND filePath = $filePath", TABLE_NAME))
		, queryGetByStatus(dbInstance, std::format("SELECT * FROM {} WHERE status = $status", TABLE_NAME))
		, queryGetNextQueued(dbInstance, std::format("SELECT * FROM {} WHERE status = 'queued' ORDER BY created ASC LIMIT 1", TABLE_NAME))
		, queryDelete(dbInstance, std::format("DELETE FROM {} WHERE modelRepo = $modelRepo AND filePath = $filePath", TABLE_NAME))
		, queryClear(dbInstance, std::format("DELETE FROM {}", TABLE_NAME))
		, queryCount(dbInstance, std::format("SELECT COUNT(*) FROM {}", TABLE_NAME))
		, queryResetUpdate(dbInstance, std::format("UPDATE {} SET status = 'queued', progress = 0, downloadedBytes = 0, totalBytes = 0, downloadSpeed = '' WHERE status = 'downloading' OR status = 'error' or status = 'idle'", TABLE_NAME))
		, queryResetDelete(dbInstance, std::format("DELETE FROM {} WHERE status = 'complete' OR status = 'cancelled' OR status = 'unknown'", TABLE_NAME))
	{
		DownloadItemActions::downloadsDirectory = downloadsDirectory;
		fs::create_directories(downloadsDirectory);
		// initialize columns cache
		initializeColumns(dbInstance, TABLE_NAME, columns, columnNames);
	}

	std::optional<DownloadItem> DownloadItemActions::get(
		const std::string &modelRepo, const std::string &filePath)
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

	std::optional<DownloadItem> DownloadItemActions::getValue(
		const std::string &modelRepo, const std::string &filePath)
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

	std::vector<DownloadItem> DownloadItemActions::getAll()
	{
		queryGet.reset();
		return getSome(queryGet);
	}

	std::vector<DownloadItem> DownloadItemActions::getAllByStatus(const DownloadItemStatus status)
	{
		queryGetByStatus.reset();
		queryGetByStatus.bind("$status", DownloadItem::toString(status));
		return getSome(queryGetByStatus);
	}

	std::optional<DownloadItem> DownloadItemActions::getNextQueued()
	{
		queryGetNextQueued.reset();
		auto items = getSome(queryGetNextQueued);
		if (!items.empty())
			return items[0];
		return std::nullopt;
	}

	void DownloadItemActions::set(const DownloadItem &item)
	{
		std::lock_guard guard(mutex);
		static int executionCount = 0;
		executionCount++;
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
		query.bind("$modelRepo", item.modelRepo);
		query.bind("$filePath", item.filePath);
		query.exec();
		const auto errorCode = query.getErrorCode();
		if (errorCode != SQLITE_OK) {
			std::string error = std::string(dbInstance.getErrorMsg());
			throw std::runtime_error("(" + updateType + ") Failed to update record: " + error);
		}
	}

	std::shared_ptr<DownloadItem> DownloadItemActions::enqueue(const std::string &modelRepo, const std::string &filePath)
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

	void DownloadItemActions::remove(const std::string &modelRepo, const std::string &filePath)
	{
		queryDelete.reset();
		queryDelete.bind("$modelRepo", modelRepo);
		queryDelete.bind("$filePath", filePath);
		queryDelete.exec();
		if (queryDelete.getErrorCode() != SQLITE_OK) {
			throw std::runtime_error("(remove) Failed to delete record: " + std::string(dbInstance.getErrorMsg()));
		}
	}

	void DownloadItemActions::clear()
	{
		queryClear.reset();
		queryClear.exec();
		if (queryClear.getErrorCode() != SQLITE_OK) {
			throw std::runtime_error("(clear) Failed to clear records: " + std::string(dbInstance.getErrorMsg()));
		}
	}

	int DownloadItemActions::count()
	{
		queryCount.reset();
		queryCount.executeStep();
		if (queryCount.hasRow()) {
			return queryCount.getColumn(0).getInt();
		}
		if (queryCount.getErrorCode() != SQLITE_OK) {
			throw std::runtime_error("(count) Failed to count records: " + std::string(dbInstance.getErrorMsg()));
		}
		return -1;
	}

	void DownloadItemActions::reset()
	{
		queryResetUpdate.reset();
		queryResetUpdate.exec();
		if (queryResetUpdate.getErrorCode() != SQLITE_OK) {
			throw std::runtime_error("(reset) Failed to reset update record: " + std::string(dbInstance.getErrorMsg()));
		}
		queryResetDelete.reset();
		queryResetDelete.exec();
		if (queryResetDelete.getErrorCode() != SQLITE_OK) {
			throw std::runtime_error("(reset) Failed to reset delete record: " + std::string(dbInstance.getErrorMsg()));
		}
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
			const auto name = safeDownloadItemNameToModelRepo(file);
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

	std::optional<DownloadItemName> DownloadItemActions::safeDownloadItemNameToModelRepo(const std::string &name)
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

	std::string DownloadItemActions::getDownloadItemFilePath(const std::string &modelRepo, const std::string &filePath)
	{
		const fs::path path = downloadsDirectory / safeDownloadItemName(modelRepo, filePath);
		return path.string();
	}

	std::string DownloadItemActions::getDownloadItemOutputFilePath(const std::string &modelRepo, const std::string &filePath)
	{
		const fs::path path = downloadsDirectory / safeDownloadItemName(modelRepo, filePath);
		return path.string();
	}

	std::string DownloadItemActions::getDownloadItemOutputFilePathQuant(const std::string &modelRepo, const std::string &quantization)
	{
		return getDownloadItemOutputFilePath(modelRepo, getFileNameForModelRepo(modelRepo, quantization));
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

	std::string DownloadItemActions::getFileNameForModelRepo(
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
		return fs::exists(downloadsDirectory / filePath);
	}

	DownloadedFileInfo DownloadItemActions::getDownloadedFileInfo(const std::string &modelRepo, const std::string &filePath)
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
		} else {
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

	std::string DownloadItemActions::urlForModelQuant(const std::string &modelRepo, const std::string &quantization)
	{
		// URL Template: https://huggingface.co/${modelRepo}/resolve/main/${filePath}
		const auto fixedModelRepo = curl::unstripModelRepoName(modelRepo);
		const auto filePath = getFileNameForModelRepo(modelRepo, quantization);
		return fmt::format("https://huggingface.co/{}/resolve/main/{}", fixedModelRepo, filePath);
	}

	std::string DownloadItemActions::urlForModel(const std::string &modelRepo, const std::string &filePath)
	{
		// URL Template: https://huggingface.co/${modelRepo}/resolve/main/${filePath}
		const auto fixedModelRepo = curl::unstripModelRepoName(modelRepo);
		return fmt::format("https://huggingface.co/{}/resolve/main/{}", fixedModelRepo, filePath);
	}

	std::vector<WingmanItem> WingmanItemActions::getSome(sqlite::Statement &query)
	{
		return sqlite::GetSome<WingmanItem>(query, [](sqlite::Statement &q) {
			WingmanItem item;
			item.alias = q.getColumn("alias").getText();
			item.status = WingmanItem::toStatus(q.getColumn("status").getText());
			item.modelRepo = q.getColumn("modelRepo").getText();
			item.filePath = q.getColumn("filePath").getText();
			item.force = q.getColumn("force").getInt();
			item.error = q.getColumn("error").getText();
			item.created = q.getColumn("created").getInt64();
			item.updated = q.getColumn("updated").getInt64();
			return item;
		});
	}

	WingmanItemActions::WingmanItemActions(sqlite::Database &dbInstance, const fs::path &modelsDir) : dbInstance(dbInstance)
		, modelsDir(modelsDir)
		, queryGet(dbInstance, std::format("SELECT * FROM {}", TABLE_NAME), true)
		, queryGetByPK(dbInstance, std::format("SELECT * FROM {} WHERE alias = $alias", TABLE_NAME), true)
		, queryDelete(dbInstance, std::format("DELETE FROM {} WHERE alias = $alias", TABLE_NAME), true)
		, queryClear(dbInstance, std::format("DELETE FROM {}", TABLE_NAME), true)
		, queryCount(dbInstance, std::format("SELECT COUNT(*) FROM {}", TABLE_NAME), true)
	{
		initializeColumns(dbInstance, TABLE_NAME, columns, columnNames);
	}

	std::optional<WingmanItem> WingmanItemActions::get(const std::string &alias)
	{
		queryGetByPK.reset();
		queryGetByPK.bind("$alias", alias);
		auto items = getSome(queryGetByPK);
		if (!items.empty())
			return items[0];
		return std::nullopt;
	}

	void WingmanItemActions::set(const WingmanItem &item)
	{
		std::lock_guard<std::mutex> guard(mutex);
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
		query.bind("$alias", item.alias);
		query.exec();
		if (query.getErrorCode() != SQLITE_OK) {
			throw std::runtime_error("(set) Failed to update record: " + std::string(dbInstance.getErrorMsg()));
		}
	}

	void WingmanItemActions::remove(const std::string &alias)
	{
		queryDelete.reset();
		queryDelete.bind("$alias", alias);
		queryDelete.exec();
		if (queryDelete.getErrorCode() != SQLITE_OK) {
			throw std::runtime_error("(remove) Failed to delete record: " + std::string(dbInstance.getErrorMsg()));
		}
	}

	void WingmanItemActions::clear()
	{
		queryClear.reset();
		queryClear.exec();
		if (queryClear.getErrorCode() != SQLITE_OK) {
			throw std::runtime_error("(clear) Failed to clear records: " + std::string(dbInstance.getErrorMsg()));
		}
	}

	int WingmanItemActions::count()
	{
		queryCount.reset();
		queryCount.executeStep();
		if (queryCount.hasRow()) {
			return queryCount.getColumn(0).getInt();
		}
		if (queryCount.getErrorCode() != SQLITE_OK) {
			throw std::runtime_error("(count) Failed to count records: " + std::string(dbInstance.getErrorMsg()));
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

}
