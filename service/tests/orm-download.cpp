#include "../orm.hpp"

namespace wingman::tests {
	namespace fs = std::filesystem;
	void start()
	{
		spdlog::info("Test Start.");

		const std::string file{ __FILE__ };
		const fs::path directory = fs::path(file).parent_path();
		const auto baseDirectory = directory / fs::path("out");
		fs::create_directories(baseDirectory);
		ItemActionsFactory actionsFactory(baseDirectory);
		actionsFactory.download()->clear();
		if (actionsFactory.download()->count() != 0) {
			throw std::runtime_error("1. Download count should be 0");
		}

		DownloadItem item;
		item.modelRepo = "TheBloke/Xwin-LM-13B-V0.1-GGUF";
		item.filePath  = "xwin-lm-13b-v0.1.Q2_K.gguf";
		actionsFactory.download()->set(item);
		if (actionsFactory.download()->count() != 1) {
			throw std::runtime_error("2. Download count should be 1");
		}

		const auto pi = actionsFactory.download()->get(item.modelRepo, item.filePath);
		if (!pi || pi.value().modelRepo != item.modelRepo || pi.value().filePath != item.filePath) {
			//if (!pi || pi->modelRepo != item.modelRepo || pi->filePath != item.filePath) {
			throw std::runtime_error("New Download item should be the same as the previous one");
		}

		actionsFactory.download()->remove(item.modelRepo, item.filePath);
		if (actionsFactory.download()->count() != 0) {
			throw std::runtime_error("3. Download count should be 0");
		}

		item.status = DownloadItemStatus::downloading;
		item.progress = 0.5;
		item.downloadedBytes = 1000000;
		actionsFactory.download()->set(item);

		const auto pi2 = actionsFactory.download()->get(item.modelRepo, item.filePath);
		if (!pi2 || pi2.value().modelRepo != item.modelRepo || pi2.value().filePath != item.filePath || pi2.value().status != DownloadItemStatus::downloading || pi2.value().progress != 0.5 || pi2.value().downloadedBytes != 1000000) {
			//if (!pi2 || pi2->modelRepo != item.modelRepo || pi2->filePath != item.filePath || pi2->status != DownloadItemStatus::downloading || pi2->progress != 0.5 || pi2->downloadedBytes != 1000000) {
			throw std::runtime_error("4. New Download item should be the same as the previous one");
		}

		actionsFactory.download()->reset();
		const auto pi3 = actionsFactory.download()->get(item.modelRepo, item.filePath);
		if (!pi3 || pi3.value().modelRepo != item.modelRepo || pi3.value().filePath != item.filePath || pi3.value().status != DownloadItemStatus::queued || pi3.value().progress != 0 || pi3.value().downloadedBytes != 0) {
			//if (!pi3 || pi3->modelRepo != item.modelRepo || pi3->filePath != item.filePath || pi3->status != DownloadItemStatus::queued || pi3->progress != 0 || pi3->downloadedBytes != 0) {
			throw std::runtime_error("5. New Download item should be the same as the previous one");
		}

		actionsFactory.download()->clear();
		if (actionsFactory.download()->count() != 0) {
			throw std::runtime_error("6. Download count should be 0");
		}

		spdlog::info("Tests Done.");
	}
}

int main()
{
	try {
		spdlog::set_level(spdlog::level::debug);
		wingman::tests::start();
	} catch (const std::exception &e) {
		spdlog::error("Exception: " + std::string(e.what()));
		return 1;
	}
	spdlog::info("All Tests Passed.");
	return 0;
}
