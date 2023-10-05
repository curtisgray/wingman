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
		actionsFactory.app()->clear();
		if (actionsFactory.app()->count() != 0) {
			throw std::runtime_error("App count should be 0");
		}

		AppItem item;
		item.name = "Wingman";
		item.key  = "default";
		actionsFactory.app()->set(item);
		if (actionsFactory.app()->count() != 1) {
			throw std::runtime_error("App count should be 1");
		}

		const auto pi = actionsFactory.app()->get(item.name, item.key);
		if (!pi || pi.value().name != item.name || pi.value().key != item.key) {
			//if (!pi || pi->name != item.name || pi->key != item.key) {
			throw std::runtime_error("New App item should be the same as the previous one");
		}

		actionsFactory.app()->remove(item.name, item.key);
		if (actionsFactory.app()->count() != 0) {
			throw std::runtime_error("App count should be 0");
		}

		DownloadServerAppItem dsaItem = DownloadServerAppItem::make();
		nlohmann::json j = dsaItem;
		item.value = j.dump();
		actionsFactory.app()->set(item);

		const auto pi2 = actionsFactory.app()->get(item.name, item.key);
		if (!pi2 || pi2.value().name != item.name || pi2.value().key != item.key || pi2.value().value != j.dump()) {
			//if (!pi2 || pi2->name != item.name || pi2->key != item.key || pi2->value != j.dump()) {
			throw std::runtime_error("New App item should be the same as the previous one");
		}

		actionsFactory.app()->clear();
		if (actionsFactory.app()->count() != 0) {
			throw std::runtime_error("App count should be 0");
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
	spdlog::info("All Tests Done.");
	return 0;
}
