#include <gtest/gtest.h>
#include "../orm.hpp"

namespace fs = std::filesystem;
TEST(WingmanItemTest, Methods)
{
	const std::string file{ __FILE__ };
	const fs::path directory = fs::path(file).parent_path();
	const auto baseDirectory = directory / fs::path("out");
	fs::create_directories(baseDirectory);
	wingman::ItemActionsFactory actionsFactory(baseDirectory);
	actionsFactory.wingman()->clear();
	EXPECT_EQ(actionsFactory.wingman()->count(), 0);

	wingman::WingmanItem item;
	item.alias = "xwin-lm-13b-v0.1.Q2_K";
	item.modelRepo = "TheBloke/Xwin-LM-13B-V0.1-GGUF";
	item.filePath = "xwin-lm-13b-v0.1.Q2_K.gguf";
	actionsFactory.wingman()->set(item);
	EXPECT_EQ(actionsFactory.wingman()->count(), 1);

	const auto pi = actionsFactory.wingman()->get(item.alias);
	EXPECT_TRUE(pi);
	EXPECT_EQ(pi.value().alias, item.alias);
	EXPECT_EQ(pi.value().modelRepo, item.modelRepo);
	EXPECT_EQ(pi.value().filePath, item.filePath);


	actionsFactory.wingman()->remove(item.alias);
	EXPECT_EQ(actionsFactory.wingman()->count(), 0);


	const auto pi2 = actionsFactory.wingman()->get(item.alias);
	EXPECT_TRUE(pi2);
	EXPECT_EQ(pi2.value().alias, item.alias);
	EXPECT_EQ(pi2.value().modelRepo, item.modelRepo);
	EXPECT_EQ(pi2.value().filePath, item.filePath);


	actionsFactory.wingman()->clear();
	EXPECT_EQ(actionsFactory.wingman()->count(), 0);
}
