Check the following code for correctness and completeness, and then implement these requirements:

- one class per table named `AppItemActions`, `DownloadItemActions`, and `WingmanItemActions`
- read, update, and delete functions in each actions class
- toJson and fromJson functions in each actions class
- No use of `*` in SQL statements. Use the `PRAGMA table_info` statement to get the column names, map the names to indexes, and then use the indexes in the `sqlite3_column_*` functions

```cpp
#include <iostream>
#include <string>
#include <map>
#include <stdexcept>
#include <optional>
#include <sqlite3.h>
#include <json.hpp>


struct AppItem {
    // table: app
    // primary key: name, key
    // not required: value

    std::string name; // primary key 1
    std::string key;  // primary key 2
    std::string value; // not required
    int enabled;
    long long created; // milliseconds since epoch
    long long updated; // milliseconds since epoch
};

enum class DownloadItemStatus {
    idle,
    queued,
    downloading,
    complete,
    error,
    cancelled,
    unknown
};

// write a function to return a string representation of the enum
std::string downloadItemStatusToString(DownloadItemStatus status)
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
    }
}

DownloadItemStatus stringToDownloadItemStatus(const std::string& status)
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

DownloadItemStatus stringToDownloadItemStatus(const unsigned char* input)
{
    std::string status(reinterpret_cast<const char*>(input));
    return stringToDownloadItemStatus(status);
}

struct DownloadItemName {
    std::string modelRepo;
    std::string filePath;
};

struct DownloadItem {
    // table: downloads
    // primary key: modelRepo, filePath
    // not required: downloadSpeed, error

    std::string modelRepo; // primary key 1
    std::string filePath;  // primary key 2
    // possible values for status are:
    // - idle - download is available to be queued
    // - queued - download is queued, and next in line to be downloaded
    // - downloading - download is in progress
    // - complete - download is complete
    // - error - download failed, and will not be considered until it is reset to idle
    // - cancelled - download was cancelled, and will be deleted
    // - unknown - download is in an unknown state and will be deleted at next startup
    DownloadItemStatus status;
    int totalBytes;
    int downloadedBytes;
    std::string downloadSpeed; // not required
    double progress;
    std::string error; // not required
    long long created; // milliseconds since epoch
    long long updated; // milliseconds since epoch
};

enum class WingmanItemStatus {
    idle,
    queued,
    inferring,
    complete,
    error,
    cancelling,
    cancelled
};

// write a function to return a string representation of the enum
std::string wingmanItemStatusToString(WingmanItemStatus status)
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
    }
}

WingmanItemStatus stringToWingmanItemStatus(const std::string& status)
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

WingmanItemStatus stringToWingmanItemStatus(const unsigned char* input)
{
    std::string status(reinterpret_cast<const char*>(input));
    return stringToWingmanItemStatus(status);
}

struct WingmanItem {
    // table: wingman
    // primary key: alias
    // not required: error

    std::string alias; // primary key
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
    long long created; // milliseconds since epoch
    long long updated; // milliseconds since epoch
};


void createDownloadsTable(sqlite3* db)
{
    if (db == nullptr) {
        throw std::runtime_error("(createDownloadsTable) Database not initialized");
    }

    std::string sql = "CREATE TABLE IF NOT EXISTS downloads ("
                      "modelRepo TEXT NOT NULL, "
                      "filePath TEXT NOT NULL, "
                      "status TEXT DEFAULT 'idle' NOT NULL, "
                      "totalBytes INTEGER DEFAULT 0 NOT NULL, "
                      "downloadedBytes INTEGER DEFAULT 0 NOT NULL, "
                      "downloadSpeed TEXT, "
                      "progress REAL DEFAULT 0.0 NOT NULL, "
                      "error TEXT, "
                      "created INTEGER DEFAULT 0 NOT NULL, "
                      "updated INTEGER DEFAULT 0 NOT NULL, "
                      "PRIMARY KEY (modelRepo, filePath)"
                      ")";

    char* errorMsg = nullptr;
    int rc = sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &errorMsg);
    if (rc != SQLITE_OK) {
        std::string errorString = "(createDownloadsTable) Exception: " + std::string(errorMsg);
        sqlite3_free(errorMsg);
        throw std::runtime_error(errorString);
    }
}

void createWingmanTable(sqlite3* db)
{
    if (db == nullptr) {
        throw std::runtime_error("(createWingmanTable)Database not initialized");
    }

    std::string sql = "CREATE TABLE IF NOT EXISTS wingman ("
                      "alias TEXT NOT NULL, "
                      "status TEXT DEFAULT 'idle' NOT NULL, "
                      "modelRepo TEXT NOT NULL, "
                      "filePath TEXT NOT NULL, "
                      "force INTEGER DEFAULT 0 NOT NULL, "
                      "error TEXT, "
                      "created INTEGER DEFAULT 0 NOT NULL, "
                      "updated INTEGER DEFAULT 0 NOT NULL, "
                      "PRIMARY KEY (alias)"
                      ")";

    char* errorMsg = nullptr;
    int rc = sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &errorMsg);
    if (rc != SQLITE_OK) {
        std::string errorString = "(createWingmanTable) Exception: " + std::string(errorMsg);
        sqlite3_free(errorMsg);
        throw std::runtime_error(errorString);
    }
}

void createAppTable(sqlite3* db)
{
    if (db == nullptr) {
        throw std::runtime_error("(createAppTable) Database not initialized");
    }

    std::string sql = "CREATE TABLE IF NOT EXISTS app ("
                      "name TEXT NOT NULL, "
                      "key TEXT NOT NULL, "
                      "value TEXT, "
                      "enabled INTEGER DEFAULT 1 NOT NULL, "
                      "created INTEGER DEFAULT 0 NOT NULL, "
                      "updated INTEGER DEFAULT 0 NOT NULL, "
                      "PRIMARY KEY (name, key)"
                      ")";

    char* errorMsg = nullptr;
    int rc = sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &errorMsg);
    if (rc != SQLITE_OK) {
        std::string errorString = "(createAppTable) Exception: " + std::string(errorMsg);
        sqlite3_free(errorMsg);
        throw std::runtime_error(errorString);
    }
}
```
