#pragma once
#include <string>
#include <map>
#include <vector>
#include <memory>
#include <optional>
#include <filesystem>
#include <spdlog/spdlog.h>
#include <sqlite3.h>
#include <nlohmann/json.hpp>

#include "types.h"

namespace wingman {
	namespace fs = std::filesystem;

	struct Column {
		std::string name;
		std::string type;
		bool notNull;
		bool isPrimaryKey;
		int primaryKeyIndex;	// tells the order of this primary key column
	};

	namespace sqlite {
		class Database {
			sqlite3 *db;
			fs::path dbPath;
			int lastErrorCode;

		public:
			explicit Database(const fs::path &dbPath, int mode = SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE);

			~Database();

			sqlite3 *get() const;

			std::string getErrorMsg() const;

			bool tableExists(const char *name) const;

			int exec(const std::string &sql) const;

			int getErrorCode() const;
		};

		class Statement {
			sqlite3_stmt *stmt = nullptr;
			sqlite3 *db = nullptr;
			std::string sql;
			int lastErrorCode;

			bool sqliteDone;
			bool sqliteHasRow;

			struct stripToken {
				bool operator()(const std::string &a, const std::string &b) const;
			};
			std::map<std::string, int, stripToken> parameters;
			std::map<std::string, int, stripToken> columns;

		public:
			Statement(const Database &database, const std::string &sql, bool longRunning = false);

			~Statement();

#pragma region StatementColumn bind methods
			void bind(const std::string &parameterName, int value);

			void bind(const std::string &parameterName, int64_t value);

			void bind(const std::string &parameterName, double value);

			void bind(const std::string &parameterName, const std::string &value);

			void bind(const std::string &parameterName, const char *value);
#pragma endregion

#pragma region Statement column get data methods

			const char *getName(const std::string &columnName) const noexcept;

			const char *getOriginName(const std::string &columnName) const noexcept;

			int32_t getInt(const std::string &columnName) const noexcept;

			uint32_t getUInt(const std::string &columnName) const noexcept;

			int64_t getInt64(const std::string &columnName) const noexcept;

			double getDouble(const std::string &columnName) const noexcept;

			const char *getText(const std::string &columnName, const char *defaultValue = "") const noexcept;

			const void *getBlob(const std::string &columnName) const noexcept;

			std::string getString(const std::string &columnName) const;

			int getType(const std::string &columnName) const noexcept;

			int getBytes(const std::string &columnName) const noexcept;

#pragma endregion

			bool isDone() const;

			bool hasRow() const;

			int tryExecuteStep(const bool autoReset = false);

			int executeStep();

			int getErrorCode() const;

			const char *getErrorMsg() const;

			void reset();

			int exec();

		private:
		};

		template<typename T>
		std::vector<T> GetSome(Statement &query, std::function<T(Statement &)> getItem);

		void initializeColumns(const sqlite::Database &database, const std::string &tableName, std::map<std::string, Column> &columns, std::vector<std::string> &columnNames);

	}

	class DatabaseActions {
		sqlite::Database &dbInstance;

	public:
		explicit DatabaseActions(sqlite::Database &dbInstance);

		[[nodiscard]] static const char *getCreateDownloads();

		void createDownloadsTable() const;

		[[nodiscard]] static const char *getCreateWingman();

		void createWingmanTable() const;

		[[nodiscard]] static const char *getCreateApp();

		void createAppTable() const;;
	};

	class AppItemActions {
		const std::string TABLE_NAME = "app";
		const sqlite::Database &dbInstance;

		/**
		 * \brief columns variable is a map of column names to a Column
		 */
		std::map<std::string, Column> columns;
		std::vector<std::string> columnNames;

		static std::optional<AppItem> getSome(sqlite::Statement &query);

	public:
		AppItemActions(sqlite::Database &dbInstance);

		std::optional<AppItem> get(const std::string &name, const std::optional<std::string> &key = std::nullopt) const;

		void set(const AppItem &item) const;

		void remove(const std::string &name, const std::string &key) const;

		void clear() const;

		int count() const;

		static nlohmann::json toJson(const AppItem &item);

		static AppItem fromJson(const nlohmann::json &j);
	};

	class DownloadItemActions {
		const std::string TABLE_NAME = "downloads";
		const sqlite::Database &dbInstance;
		inline static fs::path downloadsDirectory;

		/**
		 * \brief columns variable is a map of column names to a Column
		 */
		std::map<std::string, Column> columns;
		std::vector<std::string> columnNames;

		std::vector<DownloadItemStatus> activeDownloadStatuses = { DownloadItemStatus::queued, DownloadItemStatus::downloading };

		static std::vector<DownloadItem> getSome(sqlite::Statement &query);
	public:
		DownloadItemActions(sqlite::Database &dbInstance, const fs::path &downloadsDir);

		std::optional<DownloadItem> get(const std::string &modelRepo, const std::string &filePath) const;

		std::optional<DownloadItem> getValue(const std::string &modelRepo, const std::string &filePath) const;

		std::vector<DownloadItem> getAll() const;

		std::vector<DownloadItem> getAllByStatus(const DownloadItemStatus status) const;

		// a function that returns the next queued item by oldest created date
		std::optional<DownloadItem> getNextQueued() const;

		void set(const DownloadItem &item) const;

		std::shared_ptr<DownloadItem> enqueue(const std::string &modelRepo, const std::string &filePath) const;

		void remove(const std::string &modelRepo, const std::string &filePath) const;

		void clear() const;

		int count() const;

		void reset() const;
		bool fileExists(const std::string &modelRepo, const std::string &filePath) const;

		bool fileExists(const DownloadItem &item) const;

		static nlohmann::json toJson(const DownloadItem &item);

		static DownloadItem fromJson(const nlohmann::json &j);

		static std::string getDownloadItemFileName(const std::string &modelRepo, const std::string &filePath);

		static bool isDownloaded(const std::string &modelRepo, const std::string &filePath);

		static DownloadedFileInfo getDownloadedFileInfo(const std::string &modelRepo, const std::string &filePath);

		static std::vector<std::string> getModelFiles();

		static std::vector<DownloadedFileInfo> getDownloadedFileInfos();

		static std::string safeDownloadItemName(const std::string &modelRepo, const std::string &filePath);

		static std::optional<DownloadItemName> parseSafeFilePathIntoDownloadItemName(const std::string &name);

		static std::string getDownloadItemOutputPath(const DownloadItem &item);

		static std::string getDownloadItemOutputPath(const std::string &modelRepo, const std::string &filePath);

		static std::string getDownloadItemOutputFilePathQuant(const std::string &modelRepo, const std::string &quantization);

		static std::string getModelIdFromModelRepo(const std::string &modelRepo);

		static std::string getQuantFileNameForModelRepo(const std::string &modelRepo, const std::string &quantization);

		static std::string urlForModelQuant(const std::string &modelRepo, const std::string &quantization);

		static std::string urlForModel(const std::string &modelRepo, const std::string &filePath);

		static std::string urlForModel(const DownloadItem &item);
	};

	class WingmanItemActions {
		const std::string TABLE_NAME = "wingman";
		const sqlite::Database &dbInstance;
		fs::path modelsDir;

		/**
		 * \brief columns variable is a map of column names to a Column
		 */
		std::map<std::string, Column> columns;
		std::vector<std::string> columnNames;

		static std::vector<WingmanItem> getSome(sqlite::Statement &query);

	public:
		WingmanItemActions(sqlite::Database &dbInstance, const fs::path &modelsDir);

		std::optional<WingmanItem> get(const std::string &alias) const;

		void set(const WingmanItem &item) const;

		void remove(const std::string &alias) const;

		void clear() const;

		int count() const;

		static nlohmann::json toJson(const WingmanItem &item);

		static WingmanItem fromJson(const nlohmann::json &j);
	};

	class ItemActionsFactory {
		std::shared_ptr<sqlite::Database> db;
		fs::path wingmanHome;
		fs::path dataDir;
		fs::path modelsDir;
		fs::path dbPath;

		const std::string SERVER_NAME = "orm.Sqlite";
		bool initialized;

		void openDatabase();

		void initializeDatabase();

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
		ItemActionsFactory(const std::optional<const fs::path> &baseDirectory = std::nullopt);

		std::shared_ptr <AppItemActions> app();

		std::shared_ptr <DownloadItemActions> download();

		std::shared_ptr <WingmanItemActions> wingman();

		// create getters for vital paths
		const fs::path &getWingmanHome() const;

		const fs::path &getDataDir() const;

		const fs::path &getModelsDir() const;

		const fs::path &getDbPath() const;
	};
} // namespace wingman
