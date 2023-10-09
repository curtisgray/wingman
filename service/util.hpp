#pragma once
#include <regex>
#include <string>

namespace wingman::util {
	template<typename T>
	std::ostream &operator<<(std::ostream &os, std::optional<T> o)
	{
		if (o) {
			return os << o;
		} else {
			return os << "<nullopt>";
		}
	}

	struct ci_less {
		// case-independent (ci) compare_less binary function
		struct nocase_compare {
			bool operator() (const unsigned char &c1, const unsigned char &c2) const
			{
				return tolower(c1) < tolower(c2);
			}
		};
		bool operator() (const std::string &s1, const std::string &s2) const
		{
			return std::ranges::lexicographical_compare(s1, s2, nocase_compare());  // comparison
		}
	};

#pragma region Utilities
	inline std::vector<std::string> splitString(const std::string &input, const char delimiter = '/')
	{
		std::vector<std::string> result;
		std::istringstream iss(input);
		std::string s;
		while (std::getline(iss, s, delimiter)) {
			result.push_back(s);
		}
		return result;
	}

	inline bool stringCompare(const std::string &first, const std::string &second, const bool caseSensitive = true)
	{
		return std::ranges::equal(first, second, [caseSensitive](const char a, const char b) {
			if (caseSensitive)
				return a == b;
			return tolower(a) == tolower(b);
		});
	}

	inline bool regexSearch(const std::string &str, const std::string &pattern, const bool caseSensitive = true)
	{
		std::regex rx;

		if (caseSensitive) {
			rx = std::regex{ pattern };
		} else {
			rx = std::regex{ pattern, std::regex_constants::icase };
		}

		return std::regex_search(str, rx);
	}

	inline bool stringContains(const std::string &haystack, const std::string &needle, const bool caseSensitive = true)
	{
		return regexSearch(haystack, needle, caseSensitive);
	}

	inline std::string stringLower(const std::string &str)
	{
		std::string result;
		std::ranges::transform(str, std::back_inserter(result), [](unsigned char c) { return std::tolower(c); });
		return result;
	}

	inline std::string stringUpper(const std::string &str)
	{
		std::string result;
		std::ranges::transform(str, std::back_inserter(result), [](unsigned char c) { return std::toupper(c); });
		return result;
	}

	// stringTrim from left
	inline std::string &stringLeftTrim(std::string &s, const char *t = " \t\n\r\f\v")
	{
		s.erase(0, s.find_first_not_of(t));
		return s;
	}

	// stringTrim from right
	inline std::string &stringRightTrim(std::string &s, const char *t = " \t\n\r\f\v")
	{
		s.erase(s.find_last_not_of(t) + 1);
		return s;
	}

	// stringTrim from left & right
	inline std::string &stringTrim(std::string &s, const char *t = " \t\n\r\f\v")
	{
		return stringLeftTrim(stringRightTrim(s, t), t);
	}

	// copying versions

	inline std::string stringLeftTrimCopy(std::string s, const char *t = " \t\n\r\f\v")
	{
		return stringLeftTrim(s, t);
	}

	inline std::string stringRightTrimCopy(std::string s, const char *t = " \t\n\r\f\v")
	{
		return stringRightTrim(s, t);
	}

	inline std::string stringTrimCopy(std::string s, const char *t = " \t\n\r\f\v")
	{
		return stringTrim(s, t);
	}
#pragma endregion

}