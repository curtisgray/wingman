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
		actionsFactory.wingman()->clear();
		if (actionsFactory.wingman()->count() != 0) {
			throw std::runtime_error("App count should be 0");
		}

		WingmanItem item;
		item.alias = "xwin-lm-13b-v0.1.Q2_K";
		item.modelRepo = "TheBloke/Xwin-LM-13B-V0.1-GGUF";
		item.filePath = "xwin-lm-13b-v0.1.Q2_K.gguf";
		actionsFactory.wingman()->set(item);
		if (actionsFactory.wingman()->count() != 1) {
			throw std::runtime_error("App count should be 1");
		}

		const auto pi = actionsFactory.wingman()->get(item.alias);
		if (!pi || pi.value().alias != item.alias || pi.value().modelRepo != item.modelRepo || pi.value().filePath != item.filePath) {
			//if (!pi || pi->name != item.name || pi->key != item.key) {
			throw std::runtime_error("New App item should be the same as the previous one");
		}

		actionsFactory.wingman()->remove(item.alias);
		if (actionsFactory.wingman()->count() != 0) {
			throw std::runtime_error("App count should be 0");
		}

		const auto pi2 = actionsFactory.wingman()->get(item.alias);
		if (pi2) {
			//if (!pi2 || pi2->name != item.name || pi2->key != item.key || pi2->value != j.dump()) {
			throw std::runtime_error("New App item should be the same as the previous one");
		}

		actionsFactory.wingman()->clear();
		if (actionsFactory.wingman()->count() != 0) {
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
