#include <gtest/gtest.h>
#include "orm.h"

namespace fs = std::filesystem;

TEST(AppItemTest, Methods)
{
	const std::string file{ __FILE__ };
	const fs::path directory = fs::path(file).parent_path();
	const auto baseDirectory = directory / fs::path("out");
	fs::create_directories(baseDirectory);
	wingman::ItemActionsFactory actionsFactory(baseDirectory);

	actionsFactory.app()->clear();
	EXPECT_EQ(actionsFactory.app()->count(), 0);

	wingman::AppItem item;
	item.name = "Wingman";
	item.key = "default";
	actionsFactory.app()->set(item);
	EXPECT_EQ(actionsFactory.app()->count(), 1);

	const auto pi = actionsFactory.app()->get(item.name, item.key);
	EXPECT_TRUE(pi);
	EXPECT_EQ(pi.value().name, item.name);
	EXPECT_EQ(pi.value().key, item.key);

	actionsFactory.app()->remove(item.name, item.key);
	EXPECT_EQ(actionsFactory.app()->count(), 0);

	wingman::DownloadServerAppItem dsaItem = wingman::DownloadServerAppItem::make();
	nlohmann::json j = dsaItem;
	item.value = j.dump();
	actionsFactory.app()->set(item);

	const auto pi2 = actionsFactory.app()->get(item.name, item.key);
	EXPECT_TRUE(pi2);
	EXPECT_EQ(pi.value().name, item.name);
	EXPECT_EQ(pi.value().key, item.key);
	EXPECT_EQ(pi.value().value, j.dump());

	actionsFactory.app()->clear();
	EXPECT_EQ(actionsFactory.app()->count(), 0);
}
