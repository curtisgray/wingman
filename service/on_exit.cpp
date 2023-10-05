#include <atomic>
#include <chrono>
#include <csignal>
#include <thread>
#include <functional>

using namespace std;
namespace stash {
	volatile std::atomic_bool __keep_running = true;

	void signal_sigterm_callback_handler(int signal)
	{
		terminate();
	}

	void terminate()
	{
		__keep_running = false;
	}

	// run until either terminate() is called or on_loop() returns false
	void wait_for_termination(const std::function<bool()> &on_loop = [] { return true; })
	{
		while (__keep_running && on_loop()) {
			std::this_thread::sleep_for(100ms);
		}
	}

	// run until terminate() is called
	void wait_for_termination()
	{
		while (__keep_running) {
			std::this_thread::sleep_for(100ms);
		}
	}

	bool __signal_method_activated = []() {
		std::signal(SIGTERM, signal_sigterm_callback_handler);
		return true;
	}();
}
