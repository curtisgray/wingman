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
			Database(const fs::path &dbPath, int mode = SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE);

			~Database();

			sqlite3 *get() const;

			std::string getErrorMsg() const;

			bool tableExists(const char *name) const;

			int exec(const std::string &sql) const;

			int getErrorCode() const;
		};

		class Statement {
			sqlite3_stmt *stmt;
			sqlite3 *db;
			std::string sql;
			int lastErrorCode;

			bool sqliteDone;
			bool sqliteHasRow;

		public:
			Statement(const Database &database, const std::string &sql, bool longRunning = false);

#pragma region StatementColumn struct
			struct StatementColumn {
				std::string name;
				int index;

				StatementColumn(Statement *parent, const std::string &name, int index);

				const char *getName() const noexcept;

				const char *getOriginName() const noexcept;

				// Return the integer value of the column specified by its index starting at 0
				int32_t getInt() const noexcept;

				// Return the unsigned integer value of the column specified by its index starting at 0
				uint32_t getUInt() const noexcept;

				// Return the 64bits integer value of the column specified by its index starting at 0
				int64_t getInt64() const noexcept;

				// Return the double value of the column specified by its index starting at 0
				double getDouble() const noexcept;

				// Return a pointer to the text value (NULL terminated string) of the column specified by its index starting at 0
				const char *getText(const char *defaultValue = "") const noexcept;

				// Return a pointer to the blob value (*not* NULL terminated) of the column specified by its index starting at 0
				const void *getBlob() const noexcept;

				// Return a std::string to a TEXT or BLOB column
				std::string getString() const;

				// Return the type of the value of the column
				int getType() const noexcept;

				// Return the number of bytes used by the text value of the column
				int getBytes() const noexcept;

			private:
				Statement *parent;
			};
#pragma endregion

#pragma region StatementColumn bind methods
			void bind(const std::string &parameterName, int value);

			void bind(const std::string &parameterName, int64_t value);

			void bind(const std::string &parameterName, double value);

			void bind(const std::string &parameterName, const std::string &value);

			void bind(const std::string &parameterName, const char *value);
#pragma endregion

			StatementColumn &getColumn(const std::string &columnName);

			bool isDone() const;

			bool hasRow() const;

			int tryExecuteStep(const bool autoReset = false);

			int executeStep();

			int getErrorCode() const;

			const char *getErrorMsg() const;

			void reset();

			int exec();

		private:
			struct stripToken {
				bool operator()(const std::string &a, const std::string &b) const;
			};
			std::map<std::string, std::shared_ptr<StatementColumn>, stripToken> parameters;
			std::map<std::string, std::shared_ptr<StatementColumn>, stripToken> columns;
		};

		template<typename T>
		std::vector<T> GetSome(Statement &query, std::function<T(Statement &)> getItem);

	}

	static void initializeColumns(const sqlite::Database &database, const std::string &tableName, std::map<std::string, Column> &columns, std::vector<std::string> &columnNames);

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
		sqlite::Statement queryGet;
		sqlite::Statement queryGetByPK;
		sqlite::Statement queryDelete;
		sqlite::Statement queryClear;
		sqlite::Statement queryCount;

		std::mutex mutex;

		/**
		 * \brief columns variable is a map of column names to a Column
		 */
		std::map<std::string, Column> columns;
		std::vector<std::string> columnNames;

		static std::optional<AppItem> getSome(sqlite::Statement &query);

	public:
		AppItemActions(sqlite::Database &dbInstance);

		std::optional<AppItem> get(const std::string &name, const std::optional<std::string> &key = std::nullopt);

		void set(const AppItem &item);

		void remove(const std::string &name, const std::string &key);

		void clear();

		int count();

		static nlohmann::json toJson(const AppItem &item);

		static AppItem fromJson(const nlohmann::json &j);
	};

	class DownloadItemActions {
		const std::string TABLE_NAME = "downloads";
		const sqlite::Database &dbInstance;
		inline static fs::path downloadsDirectory;

		sqlite::Statement queryGet;
		sqlite::Statement queryGetByPK;
		sqlite::Statement queryGetByStatus;
		sqlite::Statement queryGetNextQueued;
		sqlite::Statement queryDelete;
		sqlite::Statement queryClear;
		sqlite::Statement queryCount;
		sqlite::Statement queryResetUpdate;
		sqlite::Statement queryResetDelete;

		std::mutex mutex;

		/**
		 * \brief columns variable is a map of column names to a Column
		 */
		std::map<std::string, Column> columns;
		std::vector<std::string> columnNames;

		std::vector<DownloadItemStatus> activeDownloadStatuses = { DownloadItemStatus::queued, DownloadItemStatus::downloading };

		static std::vector<DownloadItem> getSome(sqlite::Statement &query);
	public:
		DownloadItemActions(sqlite::Database &dbInstance, const fs::path &downloadsDirectory);

		std::optional<DownloadItem> get(const std::string &modelRepo, const std::string &filePath);

		std::optional<DownloadItem> getValue(const std::string &modelRepo, const std::string &filePath);

		std::vector<DownloadItem> getAll();

		std::vector<DownloadItem> getAllByStatus(const DownloadItemStatus status);

		// a function that returns the next queued item by oldest created date
		std::optional<DownloadItem> getNextQueued();

		void set(const DownloadItem &item);

		std::shared_ptr<DownloadItem> enqueue(const std::string &modelRepo, const std::string &filePath);

		void remove(const std::string &modelRepo, const std::string &filePath);

		void clear();

		int count();

		void reset();

		static nlohmann::json toJson(const DownloadItem &item);

		static DownloadItem fromJson(const nlohmann::json &j);

		static std::string getDownloadItemFileName(const std::string &modelRepo, const std::string &filePath);

		static bool isDownloaded(const std::string &modelRepo, const std::string &filePath);

		static DownloadedFileInfo getDownloadedFileInfo(const std::string &modelRepo, const std::string &filePath);

		static std::vector<std::string> getModelFiles();

		static std::vector<DownloadedFileInfo> getDownloadedFileInfos();

		static std::string safeDownloadItemName(const std::string &modelRepo, const std::string &filePath);

		static std::optional<DownloadItemName> safeDownloadItemNameToModelRepo(const std::string &name);

		static std::string getDownloadItemFilePath(const std::string &modelRepo, const std::string &filePath);

		static std::string getDownloadItemOutputFilePath(const std::string &modelRepo, const std::string &quantization);

		static std::string getDownloadItemOutputFilePathQuant(const std::string &modelRepo, const std::string &quantization);

		static std::string getModelIdFromModelRepo(const std::string &modelRepo);

		static std::string getFileNameForModelRepo(const std::string &modelRepo, const std::string &quantization);

		static std::string urlForModelQuant(const std::string &modelRepo, const std::string &quantization);

		static std::string urlForModel(const std::string &modelRepo, const std::string &filePath);
	};

	class WingmanItemActions {
		const std::string TABLE_NAME = "wingman";
		const sqlite::Database &dbInstance;
		fs::path modelsDir;

		sqlite::Statement queryGet;
		sqlite::Statement queryGetByPK;
		sqlite::Statement queryDelete;
		sqlite::Statement queryClear;
		sqlite::Statement queryCount;

		std::mutex mutex;

		/**
		 * \brief columns variable is a map of column names to a Column
		 */
		std::map<std::string, Column> columns;
		std::vector<std::string> columnNames;

		static std::vector<WingmanItem> getSome(sqlite::Statement &query);

	public:
		WingmanItemActions(sqlite::Database &dbInstance, const fs::path &modelsDir);

		std::optional<WingmanItem> get(const std::string &alias);

		void set(const WingmanItem &item);

		void remove(const std::string &alias);

		void clear();

		int count();

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
