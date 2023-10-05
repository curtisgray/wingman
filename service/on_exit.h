#pragma once
#include <atomic>
#include <functional>

namespace stash
{
	extern volatile std::atomic_bool __keep_running;
	void terminate();
	// void wait_for_termination(const std::function<bool()> &on_loop = [] { return true; });
	void wait_for_termination(const std::function<bool()> &on_loop);
	void wait_for_termination();
}