#include "orm.h"
#include "curl.h"

namespace fs = std::filesystem;

int main(int argc, char **argv)
{
	const std::string file{ __FILE__ };
	const fs::path directory = fs::path(file).parent_path();
	const auto baseDirectory = directory / fs::path("out");
	fs::create_directories(baseDirectory);
	wingman::ItemActionsFactory actionsFactory(baseDirectory);

	actionsFactory.app()->clear();
	assert(actionsFactory.app()->count() == 0);

	wingman::AppItem item;
	item.name = "Wingman";
	item.key = "default";
	actionsFactory.app()->set(item);
	assert(actionsFactory.app()->count() == 1);

	const auto pi = actionsFactory.app()->get(item.name, item.key);
	assert(pi);
	assert(pi.value().name == item.name);
	assert(pi.value().key == item.key);

	actionsFactory.app()->remove(item.name, item.key);
	assert(actionsFactory.app()->count() == 0);

	wingman::DownloadServerAppItem dsaItem = wingman::DownloadServerAppItem::make();
	nlohmann::json j = dsaItem;
	item.value = j.dump();
	actionsFactory.app()->set(item);

	const auto pi2 = actionsFactory.app()->get(item.name, item.key);
	assert(pi2);
	assert(pi2.value().name == item.name);
	assert(pi2.value().key == item.key);
	assert(pi2.value().value == j.dump());

	actionsFactory.app()->clear();
	assert(actionsFactory.app()->count() == 0);
}