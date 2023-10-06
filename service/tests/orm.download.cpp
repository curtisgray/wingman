#include <gtest/gtest.h>
#include "../orm.hpp"

TEST(DownloadItemTest, Methods)
{
	namespace fs = std::filesystem;

	const std::string file{ __FILE__ };
	const fs::path directory = fs::path(file).parent_path();
	const auto baseDirectory = directory / fs::path("out");
	fs::create_directories(baseDirectory);
	wingman::ItemActionsFactory actionsFactory(baseDirectory);

	actionsFactory.download()->clear();
	EXPECT_EQ(actionsFactory.download()->count(), 0);

	wingman::DownloadItem item;
	item.modelRepo = "TheBloke/Xwin-LM-13B-V0.1-GGUF";
	item.filePath = "xwin-lm-13b-v0.1.Q2_K.gguf";
	actionsFactory.download()->set(item);
	EXPECT_EQ(actionsFactory.download()->count(), 1);

	const auto pi = actionsFactory.download()->get(item.modelRepo, item.filePath);
	EXPECT_TRUE(pi);
	EXPECT_EQ(pi.value().modelRepo, item.modelRepo);
	EXPECT_EQ(pi.value().filePath, item.filePath);

	actionsFactory.download()->remove(item.modelRepo, item.filePath);
	EXPECT_EQ(actionsFactory.download()->count(), 0);

	item.status          = wingman::DownloadItemStatus::downloading;
	item.progress        = 0.5;
	item.downloadedBytes = 1000000;
	actionsFactory.download()->set(item);

	const auto pi2 = actionsFactory.download()->get(item.modelRepo, item.filePath);
	EXPECT_TRUE(pi2);
	EXPECT_EQ(pi2.value().modelRepo, item.modelRepo);
	EXPECT_EQ(pi2.value().filePath, item.filePath);
	EXPECT_EQ(pi2.value().status, item.status);

	actionsFactory.download()->reset();
	const auto pi3 = actionsFactory.download()->get(item.modelRepo, item.filePath);
	EXPECT_TRUE(pi3);
	EXPECT_EQ(pi3.value().modelRepo, item.modelRepo);
	EXPECT_EQ(pi3.value().filePath, item.filePath);
	EXPECT_EQ(pi3.value().status, item.status);

	actionsFactory.download()->clear();
	EXPECT_EQ(actionsFactory.download()->count(), 0);
}
