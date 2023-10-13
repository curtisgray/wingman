#include "common.h"
#include "llama.h"
#include "build-info.h"
#include "grammar-parser.h"
#include <nlohmann/json.hpp>

#ifndef NDEBUG
// crash wingman in debug mode, otherwise send an http 500 error
#define CPPHTTPLIB_NO_EXCEPTIONS 1
#endif

#include "httplib.h"
// if squiggly blue line appears below CMake includes, such as those brought in
// by vcpkg,
//  set "configurationProvider" to "ms-vscode.cmake-tools" in
//  .vscode/c_cpp_properties.json
#include "uwebsockets/App.h"
#include "uwebsockets/Loop.h"
#include <ctime>
#include <spdlog/spdlog.h>

#include "curl.h"
#include "download.service.h"

#ifndef WINGMAN_VERBOSE
#define WINGMAN_VERBOSE 1
#endif

using namespace httplib;
using json = nlohmann::json;

struct server_params
{
    std::string hostname = "127.0.0.1";
    int32_t port = 6567;
    int32_t websocket_port = 6568;
    int32_t read_timeout = 600;
    int32_t write_timeout = 600;
};

// completion token output with probabilities
struct completion_token_output
{
    struct token_prob
    {
        llama_token tok;
        float prob;
    };

    std::vector<token_prob> probs;
    llama_token tok;
};

static size_t common_part(const std::vector<llama_token> &a, const std::vector<llama_token> &b)
{
    size_t i;
    for (i = 0; i < a.size() && i < b.size() && a[i] == b[i]; i++)
    {
    }
    return i;
}

enum stop_type
{
    STOP_FULL,
    STOP_PARTIAL,
};

static bool ends_with(const std::string &str, const std::string &suffix)
{
    return str.size() >= suffix.size() && 0 == str.compare(str.size() - suffix.size(), suffix.size(), suffix);
}

static size_t find_partial_stop_string(const std::string &stop, const std::string &text)
{
    if (!text.empty() && !stop.empty())
    {
        const char text_last_char = text.back();
        for (int64_t char_index = stop.size() - 1; char_index >= 0; char_index--)
        {
            if (stop[char_index] == text_last_char)
            {
                const std::string current_partial = stop.substr(0, char_index + 1);
                if (ends_with(text, current_partial))
                {
                    return text.size() - char_index - 1;
                }
            }
        }
    }
    return std::string::npos;
}

template <class Iter> static std::string tokens_to_str(llama_context *ctx, Iter begin, Iter end)
{
    std::string ret;
    for (; begin != end; ++begin)
    {
        ret += llama_token_to_piece(ctx, *begin);
    }
    return ret;
}

static void server_log(const char *level, const char *function, int line, const char *message,
                       const nlohmann::ordered_json &extra)
{
    nlohmann::ordered_json log{
        {"timestamp", time(nullptr)}, {"level", level}, {"function", function}, {"line", line}, {"message", message},
    };

    if (!extra.empty())
    {
        log.merge_patch(extra);
    }

    const std::string str = log.dump(-1, ' ', false, json::error_handler_t::replace);
    printf("%.*s\n", (int)str.size(), str.data());
    fflush(stdout);
}

// format incomplete utf-8 multibyte character for output
static std::string tokens_to_output_formatted_string(const llama_context *ctx, const llama_token token)
{
    std::string out = token == -1 ? "" : llama_token_to_piece(ctx, token);
    // if the size is 1 and first bit is 1, meaning it's a partial character
    //   (size > 1 meaning it's already a known token)
    if (out.size() == 1 && (out[0] & 0x80) == 0x80)
    {
        std::stringstream ss;
        ss << std::hex << (out[0] & 0xff);
        std::string res(ss.str());
        out = "byte: \\x" + res;
    }
    return out;
}

// convert a vector of completion_token_output to json
static json probs_vector_to_json(const llama_context *ctx, const std::vector<completion_token_output> &probs)
{
    json out = json::array();
    for (const auto &prob : probs)
    {
        json probs_for_token = json::array();
        for (const auto &p : prob.probs)
        {
            std::string tok_str = tokens_to_output_formatted_string(ctx, p.tok);
            probs_for_token.push_back(json{
                {"tok_str", tok_str},
                {"prob", p.prob},
            });
        }
        std::string tok_str = tokens_to_output_formatted_string(ctx, prob.tok);
        out.push_back(json{
            {"content", tok_str},
            {"probs", probs_for_token},
        });
    }
    return out;
}

static bool server_verbose = false;

#if WINGMAN_VERBOSE != 1
#define LOG_VERBOSE(MSG, ...)
#else
#define LOG_VERBOSE(MSG, ...)                                                                                          \
    do                                                                                                                 \
    {                                                                                                                  \
        if (server_verbose)                                                                                            \
        {                                                                                                              \
            server_log("VERBOSE", __func__, __LINE__, MSG, __VA_ARGS__);                                               \
        }                                                                                                              \
    } while (0)
#endif

#define LOG_ERROR(MSG, ...) server_log("ERROR", __func__, __LINE__, MSG, __VA_ARGS__)
#define LOG_WARNING(MSG, ...) server_log("WARNING", __func__, __LINE__, MSG, __VA_ARGS__)
#define LOG_INFO(MSG, ...) server_log("INFO", __func__, __LINE__, MSG, __VA_ARGS__)

struct llama_server_context
{
    bool stream = false;
    bool has_next_token = false;
    std::string generated_text;
    std::vector<completion_token_output> generated_token_probs;

    size_t num_prompt_tokens = 0;
    size_t num_tokens_predicted = 0;
    size_t n_past = 0;
    size_t n_remain = 0;

    json prompt;
    std::vector<llama_token> embd;
    std::vector<llama_token> last_n_tokens;

    llama_model *model = nullptr;
    llama_context *ctx = nullptr;
    gpt_params params;
    llama_sampling_context ctx_sampling;
    int n_ctx;

    grammar_parser::parse_state parsed_grammar;
    llama_grammar *grammar = nullptr;

    bool truncated = false;
    bool stopped_eos = false;
    bool stopped_word = false;
    bool stopped_limit = false;
    std::string stopping_word;
    int32_t multibyte_pending = 0;

    std::mutex mutex;

    std::unique_lock<std::mutex> lock()
    {
        return std::unique_lock<std::mutex>(mutex);
    }

    ~llama_server_context()
    {
        if (ctx)
        {
            llama_free(ctx);
            ctx = nullptr;
        }
        if (model)
        {
            llama_free_model(model);
            model = nullptr;
        }
    }

    void rewind()
    {
        params.antiprompt.clear();
        params.grammar.clear();
        num_prompt_tokens = 0;
        num_tokens_predicted = 0;
        generated_text = "";
        generated_text.reserve(n_ctx);
        generated_token_probs.clear();
        truncated = false;
        stopped_eos = false;
        stopped_word = false;
        stopped_limit = false;
        stopping_word = "";
        multibyte_pending = 0;
        n_remain = 0;
        n_past = 0;

        if (grammar != nullptr)
        {
            llama_grammar_free(grammar);
            grammar = nullptr;
            ctx_sampling = llama_sampling_context_init(params, NULL);
        }
    }

    bool loadModel(const gpt_params &params_)
    {
		// check if model file (params.model) exists
		if (!std::filesystem::exists(params_.model)) {
			LOG_ERROR("model file does not exist", {{"model", params_.model}});
			return false;
		}
        params = params_;
        std::tie(model, ctx) = llama_init_from_gpt_params(params);
        if (model == nullptr)
        {
            LOG_ERROR("unable to load model", {{"model", params_.model}});
            return false;
        }
        n_ctx = llama_n_ctx(ctx);
        last_n_tokens.resize(n_ctx);
        std::fill(last_n_tokens.begin(), last_n_tokens.end(), 0);
        return true;
    }

    std::vector<llama_token> tokenize(const json &json_prompt, bool add_bos) const
    {
        // If `add_bos` is true, we only add BOS, when json_prompt is a string,
        // or the first element of the json_prompt array is a string.
        std::vector<llama_token> prompt_tokens;

        if (json_prompt.is_array())
        {
            bool first = true;
            for (const auto &p : json_prompt)
            {
                if (p.is_string())
                {
                    auto s = p.template get<std::string>();
                    std::vector<llama_token> p;
                    if (first)
                    {
                        p = ::llama_tokenize(ctx, s, add_bos);
                        first = false;
                    }
                    else
                    {
                        p = ::llama_tokenize(ctx, s, false);
                    }
                    prompt_tokens.insert(prompt_tokens.end(), p.begin(), p.end());
                }
                else
                {
                    if (first)
                    {
                        first = false;
                    }
                    prompt_tokens.push_back(p.template get<llama_token>());
                }
            }
        }
        else
        {
            auto s = json_prompt.template get<std::string>();
            prompt_tokens = ::llama_tokenize(ctx, s, add_bos);
        }

        return prompt_tokens;
    }

    bool loadGrammar()
    {
        if (!params.grammar.empty())
        {
            parsed_grammar = grammar_parser::parse(params.grammar.c_str());
            // will be empty (default) if there are parse errors
            if (parsed_grammar.rules.empty())
            {
                LOG_ERROR("grammar parse error", {{"grammar", params.grammar}});
                return false;
            }
            grammar_parser::print_grammar(stderr, parsed_grammar);

            {
                auto it = params.sampling_params.logit_bias.find(llama_token_eos(ctx));
                if (it != params.sampling_params.logit_bias.end() && it->second == -INFINITY)
                {
                    LOG_WARNING("EOS token is disabled, which will cause most grammars to fail", {});
                }
            }

            std::vector<const llama_grammar_element *> grammar_rules(parsed_grammar.c_rules());
            grammar =
                llama_grammar_init(grammar_rules.data(), grammar_rules.size(), parsed_grammar.symbol_ids.at("root"));
        }
        ctx_sampling = llama_sampling_context_init(params, grammar);
        return true;
    }

    void loadInfill()
    {
        bool suff_rm_leading_spc = true;
        if (params.input_suffix.find_first_of(" ") == 0 && params.input_suffix.size() > 1)
        {
            params.input_suffix.erase(0, 1);
            suff_rm_leading_spc = false;
        }

        auto prefix_tokens = tokenize(params.input_prefix, false);
        auto suffix_tokens = tokenize(params.input_suffix, false);
        const int space_token = 29871;
        if (suff_rm_leading_spc && suffix_tokens[0] == space_token)
        {
            suffix_tokens.erase(suffix_tokens.begin());
        }
        prefix_tokens.insert(prefix_tokens.begin(), llama_token_prefix(ctx));
        prefix_tokens.insert(prefix_tokens.begin(), llama_token_bos(ctx)); // always add BOS
        prefix_tokens.insert(prefix_tokens.end(), llama_token_suffix(ctx));
        prefix_tokens.insert(prefix_tokens.end(), suffix_tokens.begin(), suffix_tokens.end());
        prefix_tokens.push_back(llama_token_middle(ctx));
        auto prompt_tokens = prefix_tokens;

        num_prompt_tokens = prompt_tokens.size();

        if (params.n_keep < 0)
        {
            params.n_keep = (int)num_prompt_tokens;
        }
        params.n_keep = std::min(params.n_ctx - 4, params.n_keep);

        // if input prompt is too big, truncate like normal
        if (num_prompt_tokens >= (size_t)params.n_ctx)
        {
            printf("Input prompt is too big, truncating. Can only take %d tokens but got %zu\n", params.n_ctx,
                num_prompt_tokens);
            // todo we probably want to cut from both sides
            const int n_left = (params.n_ctx - params.n_keep) / 2;
            std::vector<llama_token> new_tokens(prompt_tokens.begin(), prompt_tokens.begin() + params.n_keep);
            const int erased_blocks = (num_prompt_tokens - params.n_keep - n_left - 1) / n_left;
            new_tokens.insert(new_tokens.end(), prompt_tokens.begin() + params.n_keep + erased_blocks * n_left,
                              prompt_tokens.end());
            std::copy(prompt_tokens.end() - params.n_ctx, prompt_tokens.end(), last_n_tokens.begin());

            LOG_VERBOSE("input truncated",
                        {
                            {"n_ctx", params.n_ctx},
                            {"n_keep", params.n_keep},
                            {"n_left", n_left},
                            {"new_tokens", tokens_to_str(ctx, new_tokens.cbegin(), new_tokens.cend())},
                        });

            truncated = true;
            prompt_tokens = new_tokens;
        }
        else
        {
            const size_t ps = num_prompt_tokens;
            std::fill(last_n_tokens.begin(), last_n_tokens.end() - ps, 0);
            std::copy(prompt_tokens.begin(), prompt_tokens.end(), last_n_tokens.end() - ps);
        }

        // compare the evaluated prompt with the new prompt
        n_past = common_part(embd, prompt_tokens);
        embd = prompt_tokens;

        if (n_past == num_prompt_tokens)
        {
            // we have to evaluate at least 1 token to generate logits.
            printf("we have to evaluate at least 1 token to generate logits\n");
            n_past--;
        }

        // since #3228 we now have to manually manage the KV cache
        llama_kv_cache_seq_rm(ctx, 0, n_past, -1);

        LOG_VERBOSE("prompt ingested", {
                                           {"n_past", n_past},
                                           {"cached", tokens_to_str(ctx, embd.cbegin(), embd.cbegin() + n_past)},
                                           {"to_eval", tokens_to_str(ctx, embd.cbegin() + n_past, embd.cend())},
                                       });

        has_next_token = true;
    }
    void loadPrompt()
    {
        auto prompt_tokens = tokenize(prompt, true); // always add BOS

        num_prompt_tokens = prompt_tokens.size();

        if (params.n_keep < 0)
        {
            params.n_keep = (int)num_prompt_tokens;
        }
        params.n_keep = std::min(n_ctx - 4, params.n_keep);

        // if input prompt is too big, truncate like normal
        if (num_prompt_tokens >= (size_t)n_ctx)
        {
            const int n_left = (n_ctx - params.n_keep) / 2;
            std::vector<llama_token> new_tokens(prompt_tokens.begin(), prompt_tokens.begin() + params.n_keep);
            const int erased_blocks = (num_prompt_tokens - params.n_keep - n_left - 1) / n_left;
            new_tokens.insert(new_tokens.end(), prompt_tokens.begin() + params.n_keep + erased_blocks * n_left,
                              prompt_tokens.end());
            std::copy(prompt_tokens.end() - n_ctx, prompt_tokens.end(), last_n_tokens.begin());

            LOG_VERBOSE("input truncated",
                        {
                            {"n_ctx", n_ctx},
                            {"n_keep", params.n_keep},
                            {"n_left", n_left},
                            {"new_tokens", tokens_to_str(ctx, new_tokens.cbegin(), new_tokens.cend())},
                        });

            truncated = true;
            prompt_tokens = new_tokens;
        }
        else
        {
            const size_t ps = num_prompt_tokens;
            std::fill(last_n_tokens.begin(), last_n_tokens.end() - ps, 0);
            std::copy(prompt_tokens.begin(), prompt_tokens.end(), last_n_tokens.end() - ps);
        }

        // compare the evaluated prompt with the new prompt
        n_past = common_part(embd, prompt_tokens);

        embd = prompt_tokens;
        if (n_past == num_prompt_tokens)
        {
            // we have to evaluate at least 1 token to generate logits.
            n_past--;
        }

        // since #3228 we now have to manually manage the KV cache
        llama_kv_cache_seq_rm(ctx, 0, n_past, -1);

        LOG_VERBOSE("prompt ingested", {
                                           {"n_past", n_past},
                                           {"cached", tokens_to_str(ctx, embd.cbegin(), embd.cbegin() + n_past)},
                                           {"to_eval", tokens_to_str(ctx, embd.cbegin() + n_past, embd.cend())},
                                       });

        has_next_token = true;
    }

    void beginCompletion()
    {
        // number of tokens to keep when resetting context
        n_remain = params.n_predict;
        llama_set_rng_seed(ctx, params.seed);
    }

    completion_token_output nextToken()
    {
        completion_token_output result;
        result.tok = -1;

        if (embd.size() >= (size_t)n_ctx)
        {
            // Shift context

            const int n_left = n_past - params.n_keep - 1;
            const int n_discard = n_left / 2;

            llama_kv_cache_seq_rm(ctx, 0, params.n_keep + 1, params.n_keep + n_discard + 1);
            llama_kv_cache_seq_shift(ctx, 0, params.n_keep + 1 + n_discard, n_past, -n_discard);

            for (size_t i = params.n_keep + 1 + n_discard; i < embd.size(); i++)
            {
                embd[i - n_discard] = embd[i];
            }
            embd.resize(embd.size() - n_discard);

            n_past -= n_discard;

            truncated = true;
            LOG_VERBOSE("input truncated", {
                                               {"n_ctx", n_ctx},
                                               {"n_keep", params.n_keep},
                                               {"n_left", n_left},
                                           });
        }

        bool tg = true;
        while (n_past < embd.size())
        {
            int n_eval = (int)embd.size() - n_past;
            tg = n_eval == 1;
            if (n_eval > params.n_batch)
            {
                n_eval = params.n_batch;
            }

            if (llama_decode(ctx, llama_batch_get_one(&embd[n_past], n_eval, n_past, 0)))
            {
                LOG_ERROR("failed to eval", {
                                                {"n_eval", n_eval},
                                                {"n_past", n_past},
                                                {"embd", tokens_to_str(ctx, embd.cbegin() + n_past, embd.cend())},
                                            });
                has_next_token = false;
                return result;
            }
            n_past += n_eval;
        }

        if (params.n_predict == 0)
        {
            has_next_token = false;
            result.tok = llama_token_eos(ctx);
            return result;
        }

        {
            // out of user input, sample next token
            std::vector<llama_token_data> candidates;
            candidates.reserve(llama_n_vocab(model));

            result.tok = llama_sampling_sample(ctx, NULL, ctx_sampling, last_n_tokens, candidates);

            llama_token_data_array candidates_p = {candidates.data(), candidates.size(), false};

            const int32_t n_probs = params.sampling_params.n_probs;
            if (params.sampling_params.temp <= 0 && n_probs > 0)
            {
                // For llama_sample_token_greedy we need to sort candidates
                llama_sample_softmax(ctx, &candidates_p);
            }

            for (size_t i = 0; i < std::min(candidates_p.size, (size_t)n_probs); ++i)
            {
                result.probs.push_back({candidates_p.data[i].id, candidates_p.data[i].p});
            }

            last_n_tokens.erase(last_n_tokens.begin());
            last_n_tokens.push_back(result.tok);
            if (tg)
            {
                num_tokens_predicted++;
            }
        }

        // add it to the context
        embd.push_back(result.tok);
        // decrement remaining sampling budget
        --n_remain;

        if (!embd.empty() && embd.back() == llama_token_eos(ctx))
        {
            // stopping_word = llama_token_to_piece(ctx, embd.back());
            has_next_token = false;
            stopped_eos = true;
            LOG_VERBOSE("eos token found", {});
            return result;
        }

        has_next_token = params.n_predict == -1 || n_remain != 0;
        return result;
    }

    size_t findStoppingStrings(const std::string &text, const size_t last_token_size, const stop_type type)
    {
        size_t stop_pos = std::string::npos;
        for (const std::string &word : params.antiprompt)
        {
            size_t pos;
            if (type == STOP_FULL)
            {
                const size_t tmp = word.size() + last_token_size;
                const size_t from_pos = text.size() > tmp ? text.size() - tmp : 0;
                pos = text.find(word, from_pos);
            }
            else
            {
                pos = find_partial_stop_string(word, text);
            }
            if (pos != std::string::npos && (stop_pos == std::string::npos || pos < stop_pos))
            {
                if (type == STOP_FULL)
                {
                    stopping_word = word;
                    stopped_word = true;
                    has_next_token = false;
                }
                stop_pos = pos;
            }
        }
        return stop_pos;
    }

    completion_token_output doCompletion()
    {
        auto token_with_probs = nextToken();

        const std::string token_text =
            token_with_probs.tok == -1 ? "" : llama_token_to_piece(ctx, token_with_probs.tok);
        generated_text += token_text;

        if (params.sampling_params.n_probs > 0)
        {
            generated_token_probs.push_back(token_with_probs);
        }

        if (multibyte_pending > 0)
        {
            multibyte_pending -= token_text.size();
        }
        else if (token_text.size() == 1)
        {
            const char c = token_text[0];
            // 2-byte characters: 110xxxxx 10xxxxxx
            if ((c & 0xE0) == 0xC0)
            {
                multibyte_pending = 1;
                // 3-byte characters: 1110xxxx 10xxxxxx 10xxxxxx
            }
            else if ((c & 0xF0) == 0xE0)
            {
                multibyte_pending = 2;
                // 4-byte characters: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
            }
            else if ((c & 0xF8) == 0xF0)
            {
                multibyte_pending = 3;
            }
            else
            {
                multibyte_pending = 0;
            }
        }

        if (multibyte_pending > 0 && !has_next_token)
        {
            has_next_token = true;
            n_remain++;
        }

        if (!has_next_token && n_remain == 0)
        {
            stopped_limit = true;
        }

        LOG_VERBOSE("next token", {
                                      {"token", token_with_probs.tok},
                                      {"token_text", tokens_to_output_formatted_string(ctx, token_with_probs.tok)},
                                      {"has_next_token", has_next_token},
                                      {"n_remain", n_remain},
                                      {"num_tokens_predicted", num_tokens_predicted},
                                      {"stopped_eos", stopped_eos},
                                      {"stopped_word", stopped_word},
                                      {"stopped_limit", stopped_limit},
                                      {"stopping_word", stopping_word},
                                  });

        return token_with_probs;
    }

    std::vector<float> getEmbedding()
    {
        static const int n_embd = llama_n_embd(model);
        if (!params.embedding)
        {
            LOG_WARNING("embedding disabled", {
                                                  {"params.embedding", params.embedding},
                                              });
            return std::vector<float>(n_embd, 0.0f);
        }
        const float *data = llama_get_embeddings(ctx);
        std::vector<float> embedding(data, data + n_embd);
        return embedding;
    }
};

struct PerSocketData
{
    /* Define your user data */
};

static void llama_log_callback_wingman(ggml_log_level level, const char *text, void *user_data)
{
    // let's write code to extract relevant information from `text` using
    // std::regex
    std::string str(text);
    llama_server_context *ctx = static_cast<llama_server_context *>(user_data);

    if (ctx == nullptr)
    {
        std::cout << "ctx is nullptr" << std::endl;
        return;
    }

    // llm_load_tensors: ggml ctx size =    0.09 MB
    std::regex ctx_size_regex("llm_load_tensors: ggml ctx size =\\s+(\\d+\\.\\d+) MB");
    std::smatch ctx_size_match;
    static float ctx_size = -1.0;
    if (std::regex_search(str, ctx_size_match, ctx_size_regex))
    {
        std::string ctx_size_str = ctx_size_match[1];
        ctx_size = std::stof(ctx_size_str);
        // ctx->ctx_size = ctx_size;
        std::cout << "ctx_size: " << ctx_size << std::endl;
    }

    // llm_load_tensors: using CUDA for GPU acceleration
    std::regex using_cuda_regex("llm_load_tensors: using (\\w+) for GPU acceleration");
    std::smatch using_cuda_match;
    static std::string cuda_str;
    if (std::regex_search(str, using_cuda_match, using_cuda_regex))
    {
        cuda_str = using_cuda_match[1];
        // ctx->cuda_str = cuda_str;
        std::cout << "cuda_str: " << cuda_str << std::endl;
    }

    // llm_load_tensors: mem required  =   70.44 MB (+ 2048.00 MB per state)
    std::regex mem_required_regex("llm_load_tensors: mem required  "
                                  "=\\s+(\\d+\\.\\d+)\\s+(\\w+)\\s+\\(\\+\\s+("
                                  "\\d+\\.\\d+)\\s+(\\w+)\\s+per state\\)");
    std::smatch mem_required_match;
    static float mem_required = -1.0;
    static float mem_required_per_state = -1.0;
    if (std::regex_search(str, mem_required_match, mem_required_regex))
    {
        std::string mem_required_str = mem_required_match[1];
        std::string mem_required_unit = mem_required_match[2];
        std::string mem_required_per_state_str = mem_required_match[3];
        std::string mem_required_per_state_unit = mem_required_match[4];
        mem_required = std::stof(mem_required_str);
        // ctx->mem_required = mem_required;
        mem_required_per_state = std::stof(mem_required_per_state_str);
        // ctx->mem_required_per_state = mem_required_per_state;
        std::cout << "mem_required: " << mem_required << " " << mem_required_unit << std::endl;
        std::cout << "mem_required_per_state: " << mem_required_per_state << " " << mem_required_per_state_unit
                  << std::endl;
    }

    // llm_load_tensors: offloading 32 repeating layers to GPU
    std::regex offloading_repeating_regex("llm_load_tensors: offloading (\\d+) repeating layers to GPU");
    std::smatch offloading_repeating_match;
    static int offloading_repeating = -1;
    if (std::regex_search(str, offloading_repeating_match, offloading_repeating_regex))
    {
        std::string offloading_repeating_str = offloading_repeating_match[1];
        offloading_repeating = std::stoi(offloading_repeating_str);
        // ctx->offloading_repeating = offloading_repeating;
        std::cout << "repeating layers offloaded: " << offloading_repeating << std::endl;
    }

    // llm_load_tensors: offloaded 35/35 layers to GPU
    std::regex offloaded_regex("llm_load_tensors: offloaded (\\d+)/(\\d+) layers to GPU");
    std::smatch offloaded_match;
    static int offloaded = -1;
    static int offloaded_total = -1;
    if (std::regex_search(str, offloaded_match, offloaded_regex))
    {
        std::string offloaded_str = offloaded_match[1];
        std::string offloaded_total_str = offloaded_match[2];
        offloaded = std::stoi(offloaded_str);
        // ctx->offloaded = offloaded;
        offloaded_total = std::stoi(offloaded_total_str);
        // ctx->offloaded_total = offloaded_total;
        std::cout << "offloaded: " << offloaded << "/" << offloaded_total << std::endl;
    }

    // llm_load_tensors: VRAM used: 4849 MB
    std::regex vram_used_regex("llm_load_tensors: VRAM used: (\\d+) MB");
    std::smatch vram_used_match;
    static int vram_used = -1;
    static float vram_per_layer_avg = -1.0;
    if (std::regex_search(str, vram_used_match, vram_used_regex))
    {
        std::string vram_used_str = vram_used_match[1];
        vram_used = std::stoi(vram_used_str);
        // ctx->vram_used = vram_used;
        vram_per_layer_avg = ((float)vram_used / offloaded_total);
        // ctx->vram_per_layer_avg = vram_per_layer_avg;
        std::cout << "vram_used: " << vram_used << std::endl;
        std::cout << "vram_per_layer_avg: " << vram_per_layer_avg << std::endl;
    }

    // llama_model_loader: - type  f32:   65 tensors
    // llama_model_loader: - type  f16:    1 tensors
    // llama_model_loader: - type q4_0:    1 tensors
    // llama_model_loader: - type q2_K:   64 tensors
    // llama_model_loader: - type q3_K:  160 tensors
    std::regex type_regex("llama_model_loader: - type\\s+(\\w+):\\s+(\\d+) tensors");
    std::smatch tensor_type_match;
    static std::map<std::string, int> tensor_type_map;
    if (std::regex_search(str, tensor_type_match, type_regex))
    {
        std::string tensor_type_str = tensor_type_match[1];
        std::string tensor_count_str = tensor_type_match[2];
        int tensor_count = std::stoi(tensor_count_str);
        tensor_type_map[tensor_type_str] = tensor_count;
        // ctx->tensor_type_map[tensor_type_str] = tensor_count;
        std::cout << "tensor_type: " << tensor_type_str << " " << tensor_count << std::endl;
    }

    // llm_load_print_meta: format         = GGUF V1 (support until nov 2023)
    // llm_load_print_meta: arch           = llama
    std::regex meta_regex("llm_load_print_meta: (\\w+)\\s+=\\s+(.+)");
    std::smatch meta_match;
    static std::map<std::string, std::string> meta_map;
    if (std::regex_search(str, meta_match, meta_regex))
    {
        std::string meta_key_str = meta_match[1];
        std::string meta_value_str = meta_match[2];
        meta_map[meta_key_str] = meta_value_str;
        // ctx->meta_map[meta_key_str] = meta_value_str;
        std::cout << "meta_key: " << meta_key_str << " " << meta_value_str << std::endl;
    }

    (void)level;
    (void)user_data;
}

static void server_print_usage(const char *argv0, const gpt_params &params, const server_params &sparams)
{
    printf("usage: %s [options]\n", argv0);
    printf("\n");
    printf("options:\n");
    printf("  -h, --help                show this help message and exit\n");
    printf("  -v, --verbose             verbose output (default: %s)\n", server_verbose ? "enabled" : "disabled");
    printf("  -t N,  --threads N        number of threads to use during computation (default: %d)\n", params.n_threads);
    printf("  -tb N, --threads-batch N  number of threads to use during batch and prompt processing (default: same as "
        "--threads)\n");
    printf("  -c N,  --ctx-size N       size of the prompt context (default: %d)\n", params.n_ctx);
    printf("  --rope-freq-base N        RoPE base frequency (default: loaded from model)\n");
    printf("  --rope-freq-scale N       RoPE frequency scaling factor (default: loaded from model)\n");
    printf("  -b N,  --batch-size N     batch size for prompt processing (default: %d)\n", params.n_batch);
    printf("  --memory-f32              use f32 instead of f16 for memory key+value (default: disabled)\n");
    printf("                            not recommended: doubles context memory required and no measurable increase in "
        "quality\n");
    if (llama_mlock_supported())
    {
        printf("  --mlock               force system to keep model in RAM rather than swapping or compressing\n");
    }
    if (llama_mmap_supported())
    {
        printf("  --no-mmap             do not memory-map model (slower load but may reduce pageouts if not using "
            "mlock)\n");
    }
    printf("  --numa                attempt optimizations that help on some NUMA systems\n");
#ifdef LLAMA_SUPPORTS_GPU_OFFLOAD
    printf("  -ngl N, --n-gpu-layers N\n");
    printf("                        number of layers to store in VRAM\n");
    printf("  -ts SPLIT --tensor-split SPLIT\n");
    printf("                        how to split tensors across multiple GPUs, comma-separated list of proportions, "
        "e.g. 3,1\n");
    printf("  -mg i, --main-gpu i   the GPU to use for scratch and small tensors\n");
    printf("  -nommq, --no-mul-mat-q\n");
    printf("                        use cuBLAS instead of custom mul_mat_q CUDA kernels.\n");
    printf("                        Not recommended since this is both slower and uses more VRAM.\n");
#endif
    printf("  -m FNAME, --model FNAME\n");
    printf("                        model path (default: %s)\n", params.model.c_str());
    printf("  -a ALIAS, --alias ALIAS\n");
    printf(
        "                        set an alias for the model, will be added as `model` field in completion response\n");
    printf("  --lora FNAME          apply LoRA adapter (implies --no-mmap)\n");
    printf("  --lora-base FNAME     optional model to use as a base for the layers modified by the LoRA adapter\n");
    printf("  --host                ip address to listen (default  (default: %s)\n", sparams.hostname.c_str());
    printf("  --port PORT           port to listen (default  (default: %d)\n", sparams.port);
    printf("  --websocket-port PORT websocket port to listen (default  (default: %d)\n", sparams.websocket_port);
    printf("  -to N, --timeout N    server read/write timeout in seconds (default: %d)\n", sparams.read_timeout);
    printf("  --embedding           enable embedding vector output (default: %s)\n",
           params.embedding ? "enabled" : "disabled");
    printf("\n");
}

static void server_params_parse(int argc, char **argv, server_params &sparams, gpt_params &params)
{
    gpt_params default_params;
    server_params default_sparams;
    std::string arg;
    bool invalid_param = false;

    for (int i = 1; i < argc; i++)
    {
        arg = argv[i];
        if (arg == "--port")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            sparams.port = std::stoi(argv[i]);
        }
        else if (arg == "--host")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            sparams.hostname = argv[i];
        }
        else if (arg == "--timeout" || arg == "-to")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            sparams.read_timeout = std::stoi(argv[i]);
            sparams.write_timeout = std::stoi(argv[i]);
        }
        else if (arg == "-m" || arg == "--model")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            params.model = argv[i];
        }
        else if (arg == "-a" || arg == "--alias")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            params.model_alias = argv[i];
        }
        else if (arg == "-h" || arg == "--help")
        {
            server_print_usage(argv[0], default_params, default_sparams);
            exit(0);
        }
        else if (arg == "-c" || arg == "--ctx-size" || arg == "--ctx_size")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            params.n_ctx = std::stoi(argv[i]);
        }
        else if (arg == "--rope-freq-base")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            params.rope_freq_base = std::stof(argv[i]);
        }
        else if (arg == "--rope-freq-scale")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            params.rope_freq_scale = std::stof(argv[i]);
        }
        else if (arg == "--memory-f32" || arg == "--memory_f32")
        {
            params.memory_f16 = false;
        }
        else if (arg == "--threads" || arg == "-t")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            params.n_threads = std::stoi(argv[i]);
        }
        else if (arg == "--threads-batch" || arg == "-tb")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            params.n_threads_batch = std::stoi(argv[i]);
        }
        else if (arg == "-b" || arg == "--batch-size")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            params.n_batch = std::stoi(argv[i]);
            params.n_batch = std::min(512, params.n_batch);
        }
        else if (arg == "--gpu-layers" || arg == "-ngl" || arg == "--n-gpu-layers")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
#ifdef LLAMA_SUPPORTS_GPU_OFFLOAD
            params.n_gpu_layers = std::stoi(argv[i]);
#else
            LOG_WARNING("Not compiled with GPU offload support, --n-gpu-layers option will be ignored. "
                        "See main README.md for information on enabling GPU BLAS support",
                        {{"n_gpu_layers", params.n_gpu_layers}});
#endif
        }
        else if (arg == "--tensor-split" || arg == "-ts")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
#ifdef GGML_USE_CUBLAS
            std::string arg_next = argv[i];

            // split string by , and /
            const std::regex regex{R"([,/]+)"};
            std::sregex_token_iterator it{arg_next.begin(), arg_next.end(), regex, -1};
            std::vector<std::string> split_arg{it, {}};
            GGML_ASSERT(split_arg.size() <= LLAMA_MAX_DEVICES);

            for (size_t i_device = 0; i_device < LLAMA_MAX_DEVICES; ++i_device)
            {
                if (i_device < split_arg.size())
                {
                    params.tensor_split[i_device] = std::stof(split_arg[i_device]);
                }
                else
                {
                    params.tensor_split[i_device] = 0.0f;
                }
            }
#else
            LOG_WARNING("llama.cpp was compiled without cuBLAS. It is not possible to set a tensor split.\n", {});
#endif // GGML_USE_CUBLAS
        }
        else if (arg == "--no-mul-mat-q" || arg == "-nommq")
        {
#ifdef GGML_USE_CUBLAS
            params.mul_mat_q = false;
#else
            LOG_WARNING("warning: llama.cpp was compiled without cuBLAS. Disabling mul_mat_q kernels has no effect.\n",
                        {});
#endif // GGML_USE_CUBLAS
        }
        else if (arg == "--main-gpu" || arg == "-mg")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
#ifdef GGML_USE_CUBLAS
            params.main_gpu = std::stoi(argv[i]);
#else
            LOG_WARNING("llama.cpp was compiled without cuBLAS. It is not possible to set a main GPU.", {});
#endif
        }
        else if (arg == "--lora")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            params.lora_adapter.push_back(std::make_tuple(argv[i], 1.0f));
            params.use_mmap = false;
        }
        else if (arg == "--lora-scaled")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            const char *lora_adapter = argv[i];
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            params.lora_adapter.push_back(std::make_tuple(lora_adapter, std::stof(argv[i])));
            params.use_mmap = false;
        }
        else if (arg == "--lora-base")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            params.lora_base = argv[i];
        }
        else if (arg == "-v" || arg == "--verbose")
        {
#if SERVER_VERBOSE != 1
            LOG_WARNING("server.cpp is not built with verbose logging.", {});
#else
            server_verbose = true;
#endif
        }
        else if (arg == "--mlock")
        {
            params.use_mlock = true;
        }
        else if (arg == "--no-mmap")
        {
            params.use_mmap = false;
        }
        else if (arg == "--numa")
        {
            params.numa = true;
        }
        else if (arg == "--embedding")
        {
            params.embedding = true;
        }
        else if (arg == "--websocket-port")
        {
            if (++i >= argc)
            {
                invalid_param = true;
                break;
            }
            sparams.websocket_port = std::stoi(argv[i]);
        }
        else
        {
            fprintf(stderr, "error: unknown argument: %s\n", arg.c_str());
            server_print_usage(argv[0], default_params, default_sparams);
            exit(1);
        }
    }

    if (invalid_param)
    {
        fprintf(stderr, "error: invalid parameter for argument: %s\n", arg.c_str());
        server_print_usage(argv[0], default_params, default_sparams);
        exit(1);
    }
}

static json format_generation_settings(llama_server_context &llama)
{
    const auto &sparams = llama.params.sampling_params;
    const auto eos_bias = sparams.logit_bias.find(llama_token_eos(llama.ctx));
    const bool ignore_eos =
        eos_bias != sparams.logit_bias.end() && eos_bias->second < 0.0f && std::isinf(eos_bias->second);

    return json{
        {"n_ctx", llama.n_ctx},
        {"model", llama.params.model_alias},
        {"seed", llama.params.seed},
        {"temp", sparams.temp},
        {"top_k", sparams.top_k},
        {"top_p", sparams.top_p},
        {"tfs_z", sparams.tfs_z},
        {"typical_p", sparams.typical_p},
        {"repeat_last_n", sparams.repeat_last_n},
        {"repeat_penalty", sparams.repeat_penalty},
        {"presence_penalty", sparams.presence_penalty},
        {"frequency_penalty", sparams.frequency_penalty},
        {"mirostat", sparams.mirostat},
        {"mirostat_tau", sparams.mirostat_tau},
        {"mirostat_eta", sparams.mirostat_eta},
        {"penalize_nl", sparams.penalize_nl},
        {"stop", llama.params.antiprompt},
        {"n_predict", llama.params.n_predict},
        {"n_keep", llama.params.n_keep},
        {"ignore_eos", ignore_eos},
        {"stream", llama.stream},
        {"logit_bias", sparams.logit_bias},
        {"n_probs", sparams.n_probs},
        {"grammar", llama.params.grammar},
    };
}

static json format_embedding_response(llama_server_context &llama)
{
    return json{
        {"embedding", llama.getEmbedding()},
    };
}

static json format_timings(llama_server_context &llama)
{
    const auto timings = llama_get_timings(llama.ctx);

    return json{
        {"prompt_n", timings.n_p_eval},
        {"prompt_ms", timings.t_p_eval_ms},
        {"prompt_per_token_ms", timings.t_p_eval_ms / timings.n_p_eval},
        {"prompt_per_second", 1e3 / timings.t_p_eval_ms * timings.n_p_eval},

        {"predicted_n", timings.n_eval},
        {"predicted_ms", timings.t_eval_ms},
        {"predicted_per_token_ms", timings.t_eval_ms / timings.n_eval},
        {"predicted_per_second", 1e3 / timings.t_eval_ms * timings.n_eval},
    };
}

static json format_final_response(llama_server_context &llama, const std::string &content,
                                  const std::vector<completion_token_output> &probs)
{

    json res = json{
        {"content", content},
        {"stop", true},
        {"model", llama.params.model_alias},
        {"timestamp", std::time(nullptr)},
        {"tokens_predicted", llama.num_tokens_predicted},
        {"tokens_evaluated", llama.num_prompt_tokens},
        {"generation_settings", format_generation_settings(llama)},
        {"prompt", llama.prompt},
        {"truncated", llama.truncated},
        {"stopped_eos", llama.stopped_eos},
        {"stopped_word", llama.stopped_word},
        {"stopped_limit", llama.stopped_limit},
        {"stopping_word", llama.stopping_word},
        {"tokens_cached", llama.n_past},
        {"timings", format_timings(llama)},
    };

    if (llama.params.sampling_params.n_probs > 0)
    {
        res["completion_probabilities"] = probs_vector_to_json(llama.ctx, probs);
    }

    return res;
}

static json format_partial_response(llama_server_context &llama, const std::string &content,
                                    const std::vector<completion_token_output> &probs)
{
    json res = json{
        {"content", content},
        {"model", llama.params.model_alias},
        {"timestamp", std::time(nullptr)},
        {"stop", false},
    };

    if (llama.params.sampling_params.n_probs > 0)
    {
        res["completion_probabilities"] = probs_vector_to_json(llama.ctx, probs);
    }

    return res;
}

static json format_error_response(llama_server_context &llama, const std::string &error_message)
{
    json res = json{
        {"error", error_message},
        {"model", llama.params.model_alias},
        {"timestamp", std::time(nullptr)},
        {"stop", true},
    };

    return res;
}

static json format_tokenizer_response(const std::vector<llama_token> &tokens)
{
    return json{{"tokens", tokens}};
}

static json format_detokenized_response(std::string content)
{
    return json{{"content", content}};
}

template <typename T> static T json_value(const json &body, const std::string &key, const T &default_value)
{
    // Fallback null to default value
    return body.contains(key) && !body.at(key).is_null() ? body.value(key, default_value) : default_value;
}

static void parse_options_completion(const json &body, llama_server_context &llama)
{
    gpt_params default_params;
    const auto &default_sparams = default_params.sampling_params;
    auto &sparams = llama.params.sampling_params;

    llama.stream = json_value(body, "stream", false);
    llama.params.n_predict = json_value(body, "n_predict", default_params.n_predict);
    sparams.top_k = json_value(body, "top_k", default_sparams.top_k);
    sparams.top_p = json_value(body, "top_p", default_sparams.top_p);
    sparams.tfs_z = json_value(body, "tfs_z", default_sparams.tfs_z);
    sparams.typical_p = json_value(body, "typical_p", default_sparams.typical_p);
    sparams.repeat_last_n = json_value(body, "repeat_last_n", default_sparams.repeat_last_n);
    sparams.temp = json_value(body, "temperature", default_sparams.temp);
    sparams.repeat_penalty = json_value(body, "repeat_penalty", default_sparams.repeat_penalty);
    sparams.presence_penalty = json_value(body, "presence_penalty", default_sparams.presence_penalty);
    sparams.frequency_penalty = json_value(body, "frequency_penalty", default_sparams.frequency_penalty);
    sparams.mirostat = json_value(body, "mirostat", default_sparams.mirostat);
    sparams.mirostat_tau = json_value(body, "mirostat_tau", default_sparams.mirostat_tau);
    sparams.mirostat_eta = json_value(body, "mirostat_eta", default_sparams.mirostat_eta);
    sparams.penalize_nl = json_value(body, "penalize_nl", default_sparams.penalize_nl);
    llama.params.n_keep = json_value(body, "n_keep", default_params.n_keep);
    llama.params.seed = json_value(body, "seed", default_params.seed);
    llama.params.grammar = json_value(body, "grammar", default_params.grammar);
    sparams.n_probs = json_value(body, "n_probs", default_sparams.n_probs);

    if (body.count("prompt") != 0)
    {
        llama.prompt = body["prompt"];
    }
    else
    {
        llama.prompt = "";
    }

    sparams.logit_bias.clear();
    if (json_value(body, "ignore_eos", false))
    {
        sparams.logit_bias[llama_token_eos(llama.ctx)] = -INFINITY;
    }

    const auto &logit_bias = body.find("logit_bias");
    if (logit_bias != body.end() && logit_bias->is_array())
    {
        const int n_vocab = llama_n_vocab(llama.model);
        for (const auto &el : *logit_bias)
        {
            if (el.is_array() && el.size() == 2 && el[0].is_number_integer())
            {
                llama_token tok = el[0].get<llama_token>();
                if (tok >= 0 && tok < n_vocab)
                {
                    if (el[1].is_number())
                    {
                        sparams.logit_bias[tok] = el[1].get<float>();
                    }
                    else if (el[1].is_boolean() && !el[1].get<bool>())
                    {
                        sparams.logit_bias[tok] = -INFINITY;
                    }
                }
            }
        }
    }

    llama.params.antiprompt.clear();
    const auto &stop = body.find("stop");
    if (stop != body.end() && stop->is_array())
    {
        for (const auto &word : *stop)
        {
            if (!word.empty())
            {
                llama.params.antiprompt.push_back(word);
            }
        }
    }

    llama.ctx_sampling = llama_sampling_context_init(llama.params, llama.grammar);

    LOG_VERBOSE("completion parameters parsed", format_generation_settings(llama));
}

static void parse_options_infill(const json &body, llama_server_context &llama)
{
    if (body.count("input_prefix") != 0)
    {
        llama.params.input_prefix = body["input_prefix"];
    }
    else
    {
        llama.params.input_prefix = "";
    }
    if (body.count("input_suffix") != 0)
    {
        llama.params.input_suffix = body["input_suffix"];
    }
    else
    {
        llama.params.input_suffix = "";
    }
    parse_options_completion(body, llama);
}

static void log_server_request(const Request &req, const Response &res)
{
    LOG_INFO("request", {
                            {"remote_addr", req.remote_addr},
                            {"remote_port", req.remote_port},
                            {"status", res.status},
                            {"method", req.method},
                            {"path", req.path},
                            {"params", req.params},
                        });

    LOG_VERBOSE("request", {
                               {"request", req.body},
                               {"response", res.body},
                           });
}

static bool is_at_eob(llama_server_context &server_context, const llama_token *tokens, const size_t n_tokens)
{
    return n_tokens && tokens[n_tokens - 1] == llama_token_eos(server_context.ctx);
}

// Function matching type llama_beam_search_callback_fn_t.
// Custom callback example is called each time the beams lengths increase:
//  * Show progress by printing ',' following by number of convergent beam tokens if any.
//  * When all beams converge to a common prefix, they are made available in beams_state.beams[0].
//    This is also called when the stop condition is met.
//    Collect tokens into std::vector<llama_token> response which is pointed to by callback_data.
static void beam_search_callback(void *callback_data, llama_beams_state beams_state)
{
    auto &llama = *static_cast<llama_server_context *>(callback_data);
    // Mark beams as EOS as needed.
    for (size_t i = 0; i < beams_state.n_beams; ++i)
    {
        llama_beam_view &beam_view = beams_state.beam_views[i];
        if (!beam_view.eob && is_at_eob(llama, beam_view.tokens, beam_view.n_tokens))
        {
            beam_view.eob = true;
        }
    }
    printf(","); // Show progress
    if (const size_t n = beams_state.common_prefix_length)
    {
        llama.generated_token_probs.resize(llama.generated_token_probs.size() + n);
        assert(0u < beams_state.n_beams);
        const llama_token *tokens = beams_state.beam_views[0].tokens;
        const auto map = [](llama_token tok) { return completion_token_output{{}, tok}; };
        std::transform(tokens, tokens + n, llama.generated_token_probs.end() - n, map);
        printf("%zu", n);
    }
    fflush(stdout);
#if 0 // DEBUG: print current beams for this iteration
	std::cout << "\n\nCurrent beams:\n";
    for (size_t i = 0; i < beams_state.n_beams; ++i) {
        std::cout << "beams[" << i << "]: " << ostream_beam_view{ state.ctx,beams_state.beam_views[i] } << std::endl;
    }
#endif
}

struct token_translator
{
    llama_context *ctx;
    std::string operator()(llama_token tok) const
    {
        return llama_token_to_piece(ctx, tok);
    }
    std::string operator()(const completion_token_output &cto) const
    {
        return (*this)(cto.tok);
    }
};

static void append_to_generated_text_from_generated_token_probs(llama_server_context &llama)
{
    auto &gtps = llama.generated_token_probs;
    auto translator = token_translator{llama.ctx};
    auto add_strlen = [=](size_t sum, const completion_token_output &cto) { return sum + translator(cto).size(); };
    const size_t len = std::accumulate(gtps.begin(), gtps.end(), size_t(0), add_strlen);
    if (llama.generated_text.capacity() < llama.generated_text.size() + len)
    {
        llama.generated_text.reserve(llama.generated_text.size() + len);
    }
    for (const completion_token_output &cto : gtps)
    {
        llama.generated_text += translator(cto);
    }
}

Server svr;
llama_server_context *globalLlamaContext; // ref to current context global  🤢

static json format_timing_report(llama_server_context &llama)
{
    const auto timings = llama_get_timings(llama.ctx);

    const auto time = std::time(nullptr);

    // const json tensor_type_json = llama.tensor_type_map;
    // const json meta_json = llama.meta_map;

    const json timings_json = json{
        {"timestamp", time},
        {"load_time", timings.t_load_ms},
        {"sample_time", timings.t_sample_ms},
        {"sample_count", timings.n_sample},
        {"sample_per_token_ms", timings.t_sample_ms / timings.n_sample},
        {"sample_per_second", 1e3 / timings.t_sample_ms * timings.n_sample},
        {"total_time", (timings.t_end_ms - timings.t_start_ms)},

        {"prompt_count", timings.n_p_eval},
        {"prompt_ms", timings.t_p_eval_ms},
        {"prompt_per_token_ms", timings.t_p_eval_ms / timings.n_p_eval},
        {"prompt_per_second", 1e3 / timings.t_p_eval_ms * timings.n_p_eval},

        {"predicted_count", timings.n_eval},
        {"predicted_ms", timings.t_eval_ms},
        {"predicted_per_token_ms", timings.t_eval_ms / timings.n_eval},
        {"predicted_per_second", 1e3 / timings.t_eval_ms * timings.n_eval},
    };

    // const json system_json = json{ {"ctx_size", llama.ctx_size},
    //							  {"cuda_str", llama.cuda_str},
    //							  {"mem_required", llama.mem_required},
    //							  {"mem_required_per_state", llama.mem_required_per_state},
    //							  {"offloading_repeating", llama.offloading_repeating},
    //							  {"offloaded", llama.offloaded},
    //							  {"offloaded_total", llama.offloaded_total},
    //							  {"vram_used", llama.vram_used},
    //							  {"vram_per_layer_avg", llama.vram_per_layer_avg},
    //							  {"model_path", llama.params.model},
    //							  {"model_name", std::filesystem::path(llama.params.model).stem()},
    //							  {"has_next_token", llama.has_next_token} };

    const json system_json = json{{"ctx_size", llama.n_ctx},
                                  //{"cuda_str", llama.cuda_str},
                                  //{"mem_required", llama.mem_required},
                                  //{"mem_required_per_state", llama.mem_required_per_state},
                                  //{"offloading_repeating", llama.offloading_repeating},
                                  //{"offloaded", llama.offloaded},
                                  //{"offloaded_total", llama.offloaded_total},
                                  //{"vram_used", llama.vram_used},
                                  //{"vram_per_layer_avg", llama.vram_per_layer_avg},
                                  {"model_path", llama.params.model},
                                  {"model_name", std::filesystem::path(llama.params.model).stem()},
                                  {"has_next_token", llama.has_next_token}};

    return json{
        {"timings", timings_json}, {"system", system_json},
        //{"tensors", tensor_type_json},
        //{"meta", meta_json},
    };
}

static std::map<std::string_view, uWS::WebSocket<false, true, PerSocketData> *> websocket_connections;
std::mutex websocket_connections_mutex;

static void update_websocket_connections(const std::string_view action, uWS::WebSocket<false, true, PerSocketData> *ws)
{
    std::lock_guard<std::mutex> lock(websocket_connections_mutex);
    if (action == "add")
    {
        const std::string_view remote_address = ws->getRemoteAddressAsText();
        websocket_connections[remote_address] = ws;
    }
    else if (action == "remove")
    {
        websocket_connections.erase(ws->getRemoteAddressAsText());
    }
    else if (action == "clear")
    {
        // ws may be a nullptr in this case, so we can't use it
        websocket_connections.clear();
    }
}

static size_t get_websocket_connection_count()
{
    std::lock_guard<std::mutex> lock(websocket_connections_mutex);
    return websocket_connections.size();
}

static void write_timing_metrics_to_file(const json &metrics, const std::string_view action = "append")
{
    // std::lock_guard<std::mutex> lock(websocket_connections_mutex);
    // append the metrics to the timing_metrics.json file
    std::ofstream timing_metrics_file("timing_metrics.json", std::ios_base::app);
    if (action == "start")
    {
        timing_metrics_file << "[" << std::endl;
    }
    else if (action == "stop")
    {
        timing_metrics_file << metrics.dump() << "]" << std::endl;
    }
    else if (action == "append")
    {
        timing_metrics_file << metrics.dump() << "," << std::endl;
    }
    timing_metrics_file.close();
}

// static json timing_metrics;
const int max_payload_length = 16 * 1024;
const int max_backpressure = max_payload_length * 256;
using SendStatus = uWS::WebSocket<false, true, PerSocketData>::SendStatus;
wingman::ItemActionsFactory actions;

//
// void onDownloadProgress(const wingman::curl::Response *response)
//{
//	std::cerr << fmt::format(
//		std::locale("en_US.UTF-8"),
//		"{}: {} of {} ({:.1f})\t\t\t\t\r",
//		response->file.item->modelRepo,
//		wingman::util::prettyBytes(response->file.totalBytesWritten),
//		wingman::util::prettyBytes(response->file.item->totalBytes),
//		response->file.item->progress);
//}

static void update_timing_metrics(const json &metrics)
{
    std::lock_guard<std::mutex> lock(websocket_connections_mutex);
    static SendStatus last_send_status = SendStatus::SUCCESS;
    // loop through all the websocket connections and send the timing metrics
    for (auto &[remote_address, ws] : websocket_connections)
    {
        const auto buffered_amount = ws->getBufferedAmount();
        try
        {
            // TODO: deal with backpressure. app will CRASH if too much.
            //   compare buffered_amount to maxBackpressure. if it's too high, wait
            //   for it to drain
            // last_send_status = ws->send(metrics.dump(), uWS::OpCode::TEXT, true);
            if (last_send_status == SendStatus::BACKPRESSURE)
            {
                // if we're still in backpressure, don't send any more metrics
                if (buffered_amount > max_backpressure / 2)
                {
                    continue;
                }
            }

            last_send_status = ws->send(metrics.dump(), uWS::OpCode::TEXT, true);

            // send download data
            std::vector<wingman::DownloadItem> downloadItems;
            for (const auto downloads = actions.download()->getAll(); const auto &download : downloads)
            {
                if (download.status != wingman::DownloadItemStatus::complete)
                {
                    downloadItems.push_back(download);
                }
            }
            if (!downloadItems.empty())
            {
                // last_send_status = ws->send(json{ { "downloads", downloadItems }
                // }.dump(), uWS::OpCode::TEXT, true);
                last_send_status = ws->send(json{downloadItems}.dump(), uWS::OpCode::TEXT, true);
            }
        }
        catch (const std::exception &e)
        {
            LOG_ERROR("error sending timing metrics to websocket", {
                                                                       {"remote_address", remote_address},
                                                                       {"buffered_amount", buffered_amount},
                                                                       {"exception", e.what()},
                                                                   });
        }
    }

    write_timing_metrics_to_file(metrics);
}

void launch_websocket_server(llama_server_context &llama, std::string hostname, int websocket_port)
{
    uWS::App uws_app = uWS::App()
                           .ws<PerSocketData>("/*", {.maxPayloadLength = max_payload_length,
                                                     .maxBackpressure = max_backpressure,
                                                     .open =
                                                         [&llama](auto *ws) {
                                                             /* Open event here, you may access ws->getUserData() which
                                                              * points to a PerSocketData struct. Here we simply
                                                              * validate that indeed, something == 13 as set in upgrade
                                                              * handler.
                                                              */

                                                             update_websocket_connections("add", ws);

                                                             std::cout << "New connection "
                                                                       << get_websocket_connection_count() << " from "
                                                                       << ws->getRemoteAddressAsText() << std::endl;
                                                         },
                                                     .message =
                                                         [](auto *ws, std::string_view message, uWS::OpCode opCode) {
                                                             /* Exit gracefully if we get a closedown message */
                                                             if (message == "shutdown")
                                                             {
                                                                 /* Bye bye */
                                                                 ws->send("Shutting down", opCode, true);
                                                                 update_websocket_connections("clear", ws);
                                                                 ws->close();
                                                                 svr.stop();
                                                             }
                                                         },
                                                     .close =
                                                         [](auto *ws, int /*code*/, std::string_view /*message*/) {
                                                             /* You may access ws->getUserData() here, but sending or
                                                              * doing any kind of I/O with the socket is not valid. */

                                                             update_websocket_connections("remove", ws);
                                                         }})
                           .listen(websocket_port, [&](const auto *listen_socket) {
                               if (listen_socket)
                               {
                                   printf("\nWingman websocket accepting connections on http://%s:%d\n\n",
                                          hostname.c_str(), websocket_port);
                                   LOG_INFO("Wingman websocket listening", {
                                                                               {"hostname", hostname},
                                                                               {"port", websocket_port},
                                                                           });
                               }
                               else
                               {
                                   fprintf(stderr, "Wingman websocket FAILED to listen on port %d\n", websocket_port);
                                   LOG_ERROR("Wingman websocket failed to listen", {
                                                                                       {"hostname", hostname},
                                                                                       {"port", websocket_port},
                                                                                   });
                               }
                           });

    auto *loop = reinterpret_cast<struct us_loop_t *>(uWS::Loop::get());
    us_timer_t *delayTimer = us_create_timer(loop, 0, 0);

    globalLlamaContext = &llama;
    std::filesystem::remove("timing_metrics.json");
    write_timing_metrics_to_file({}, "start");
    // us_timer_set cannot accept the llama context as a parameter, so we have to
    // use a global variable
    us_timer_set(
        delayTimer,
        [](struct us_timer_t * /*t*/) {
            static auto idle_update_interval = 5;
            static auto start_time = std::time(nullptr);
            // while there are no tokens available, only update the timing metrics
            // every `idle_update_interval` seconds
            if (globalLlamaContext->has_next_token || std::time(nullptr) - start_time > idle_update_interval)
            {
                update_timing_metrics(format_timing_report(*globalLlamaContext));
                start_time = std::time(nullptr);
            }
        },
        1000, 1000);

    uws_app.run();
    write_timing_metrics_to_file(format_timing_report(llama), "stop");
}

int main(int argc, char **argv)
{
    // own arguments required by this example
    gpt_params params;
    server_params sparams;

    // struct that contains llama context and inference
    llama_server_context llama;

    server_params_parse(argc, argv, sparams, params);

    if (params.model_alias == "unknown")
    {
        params.model_alias = params.model;
    }

    llama_log_set(llama_log_callback_wingman, &llama);

    llama_backend_init(params.numa);

    LOG_INFO("build info", {{"build", BUILD_NUMBER}, {"commit", BUILD_COMMIT}});
    LOG_INFO("system info", {
                                {"n_threads", params.n_threads},
                                {"n_threads_batch", params.n_threads_batch},
                                {"total_threads", std::thread::hardware_concurrency()},
                                {"system_info", llama_print_system_info()},
                            });

    // load the model
    if (!llama.loadModel(params))
    {
        return 1;
    }

    // Server svr;

    svr.set_default_headers({{"Server", "wingman"},
                             {"Access-Control-Allow-Origin", "*"},
                             {"Access-Control-Allow-Headers", "content-type"}});

    svr.Post("/completion", [&llama](const Request &req, Response &res) {
        auto lock = llama.lock();

        llama.rewind();

        llama_reset_timings(llama.ctx);

        json parsed_body;
        try
        {
            parsed_body = json::parse(req.body);
        }
        catch (json::parse_error &ex)
        {
            std::stringstream ss;
            ss << "parse error at byte " << ex.byte << std::endl;
            // put the error in a custom header
            res.set_header("X-LLAMA-ERROR", ss.str());
            res.status = 400;
            LOG_ERROR("parse error", {{"error", ss.str()}});
            return;
        }

        parse_options_completion(parsed_body, llama);

        if (!llama.loadGrammar())
        {
            res.status = 400;
            return;
        }

        llama.loadPrompt();
        llama.beginCompletion();

        if (!llama.stream)
        {
            if (llama.params.n_beams)
            {
                // Fill llama.generated_token_probs vector with final beam.
                llama_beam_search(llama.ctx, beam_search_callback, &llama, llama.params.n_beams, llama.n_past,
                                  llama.n_remain);
                // Translate llama.generated_token_probs to llama.generated_text.
                append_to_generated_text_from_generated_token_probs(llama);
            }
            else
            {
                size_t stop_pos = std::string::npos;

                while (llama.has_next_token)
                {
                    const completion_token_output token_with_probs = llama.doCompletion();
                    const std::string token_text =
                        token_with_probs.tok == -1 ? "" : llama_token_to_piece(llama.ctx, token_with_probs.tok);

                    stop_pos = llama.findStoppingStrings(llama.generated_text, token_text.size(), STOP_FULL);
                }

                if (stop_pos == std::string::npos)
                {
                    stop_pos = llama.findStoppingStrings(llama.generated_text, 0, STOP_PARTIAL);
                }
                if (stop_pos != std::string::npos)
                {
                    llama.generated_text.erase(llama.generated_text.begin() + stop_pos, llama.generated_text.end());
                }
            }

            auto probs = llama.generated_token_probs;
            if (llama.params.sampling_params.n_probs > 0 && llama.stopped_word)
            {
                const std::vector<llama_token> stop_word_toks = llama_tokenize(llama.ctx, llama.stopping_word, false);
                probs = std::vector<completion_token_output>(llama.generated_token_probs.begin(),
                                                             llama.generated_token_probs.end() - stop_word_toks.size());
            }

            const json data = format_final_response(llama, llama.generated_text, probs);

            llama_print_timings(llama.ctx);

            res.set_content(data.dump(-1, ' ', false, json::error_handler_t::replace), "application/json");
        }
        else
        {
            const auto chunked_content_provider = [&](size_t, DataSink &sink) {
                size_t sent_count = 0;
                size_t sent_token_probs_index = 0;

                while (llama.has_next_token)
                {
                    const completion_token_output token_with_probs = llama.doCompletion();
                    if (token_with_probs.tok == -1 || llama.multibyte_pending > 0)
                    {
                        continue;
                    }
                    const std::string token_text = llama_token_to_piece(llama.ctx, token_with_probs.tok);

                    size_t pos = std::min(sent_count, llama.generated_text.size());

                    const std::string str_test = llama.generated_text.substr(pos);
                    bool is_stop_full = false;
                    size_t stop_pos = llama.findStoppingStrings(str_test, token_text.size(), STOP_FULL);
                    if (stop_pos != std::string::npos)
                    {
                        is_stop_full = true;
                        llama.generated_text.erase(llama.generated_text.begin() + pos + stop_pos,
                                                   llama.generated_text.end());
                        pos = std::min(sent_count, llama.generated_text.size());
                    }
                    else
                    {
                        is_stop_full = false;
                        stop_pos = llama.findStoppingStrings(str_test, token_text.size(), STOP_PARTIAL);
                    }

                    if (stop_pos == std::string::npos ||
                        // Send rest of the text if we are at the end of the generation
                        (!llama.has_next_token && !is_stop_full && stop_pos > 0))
                    {
                        const std::string to_send = llama.generated_text.substr(pos, std::string::npos);

                        sent_count += to_send.size();

                        std::vector<completion_token_output> probs_output = {};

                        if (llama.params.sampling_params.n_probs > 0)
                        {
                            const std::vector<llama_token> to_send_toks = llama_tokenize(llama.ctx, to_send, false);
                            size_t probs_pos = std::min(sent_token_probs_index, llama.generated_token_probs.size());
                            size_t probs_stop_pos = std::min(sent_token_probs_index + to_send_toks.size(),
                                                             llama.generated_token_probs.size());
                            if (probs_pos < probs_stop_pos)
                            {
                                probs_output = std::vector<completion_token_output>(
                                    llama.generated_token_probs.begin() + probs_pos,
                                    llama.generated_token_probs.begin() + probs_stop_pos);
                            }
                            sent_token_probs_index = probs_stop_pos;
                        }

                        const json data = format_partial_response(llama, to_send, probs_output);

                        const std::string str =
                            "data: " + data.dump(-1, ' ', false, json::error_handler_t::replace) + "\n\n";

                        LOG_VERBOSE("data stream", {{"to_send", str}});

                        if (!sink.write(str.data(), str.size()))
                        {
                            LOG_VERBOSE("stream closed", {});
                            llama_print_timings(llama.ctx);
                            return false;
                        }
                    }

                    if (!llama.has_next_token)
                    {
                        // Generation is done, send extra information.
                        const json data =
                            format_final_response(llama, "",
                                                  std::vector<completion_token_output>(
                                                      llama.generated_token_probs.begin(),
                                                      llama.generated_token_probs.begin() + sent_token_probs_index));

                        const std::string str =
                            "data: " + data.dump(-1, ' ', false, json::error_handler_t::replace) + "\n\n";

                        LOG_VERBOSE("data stream", {{"to_send", str}});

                        if (!sink.write(str.data(), str.size()))
                        {
                            LOG_VERBOSE("stream closed", {});
                            llama_print_timings(llama.ctx);
                            return false;
                        }
                    }
                }

                llama_print_timings(llama.ctx);
                sink.done();
                return true;
            };
            const auto on_complete = [&](bool) {
                llama.rewind();
                llama_reset_timings(llama.ctx);
                llama.has_next_token = false;
                llama.mutex.unlock();
            };
            lock.release();
            res.set_chunked_content_provider("text/event-stream", chunked_content_provider, on_complete);
        }
    });

    svr.Post("/infill", [&llama](const Request &req, Response &res) {
        auto lock = llama.lock();

        llama.rewind();

        llama_reset_timings(llama.ctx);

        parse_options_infill(json::parse(req.body), llama);

        if (!llama.loadGrammar())
        {
            res.status = 400;
            return;
        }
        llama.loadInfill();
        llama.beginCompletion();
        const auto chunked_content_provider = [&](size_t, DataSink &sink) {
            size_t sent_count = 0;
            size_t sent_token_probs_index = 0;

            while (llama.has_next_token)
            {
                const completion_token_output token_with_probs = llama.doCompletion();
                if (token_with_probs.tok == -1 || llama.multibyte_pending > 0)
                {
                    continue;
                }
                const std::string token_text = llama_token_to_piece(llama.ctx, token_with_probs.tok);

                size_t pos = std::min(sent_count, llama.generated_text.size());

                const std::string str_test = llama.generated_text.substr(pos);
                bool is_stop_full = false;
                size_t stop_pos = llama.findStoppingStrings(str_test, token_text.size(), STOP_FULL);
                if (stop_pos != std::string::npos)
                {
                    is_stop_full = true;
                    llama.generated_text.erase(llama.generated_text.begin() + pos + stop_pos,
                                               llama.generated_text.end());
                    pos = std::min(sent_count, llama.generated_text.size());
                }
                else
                {
                    is_stop_full = false;
                    stop_pos = llama.findStoppingStrings(str_test, token_text.size(), STOP_PARTIAL);
                }

                if (stop_pos == std::string::npos ||
                    // Send rest of the text if we are at the end of the generation
                    (!llama.has_next_token && !is_stop_full && stop_pos > 0))
                {
                    const std::string to_send = llama.generated_text.substr(pos, std::string::npos);

                    sent_count += to_send.size();

                    std::vector<completion_token_output> probs_output = {};

                    if (llama.params.sampling_params.n_probs > 0)
                    {
                        const std::vector<llama_token> to_send_toks = llama_tokenize(llama.ctx, to_send, false);
                        size_t probs_pos = std::min(sent_token_probs_index, llama.generated_token_probs.size());
                        size_t probs_stop_pos =
                            std::min(sent_token_probs_index + to_send_toks.size(), llama.generated_token_probs.size());
                        if (probs_pos < probs_stop_pos)
                        {
                            probs_output = std::vector<completion_token_output>(
                                llama.generated_token_probs.begin() + probs_pos,
                                llama.generated_token_probs.begin() + probs_stop_pos);
                        }
                        sent_token_probs_index = probs_stop_pos;
                    }

                    const json data = format_partial_response(llama, to_send, probs_output);

                    const std::string str =
                        "data: " + data.dump(-1, ' ', false, json::error_handler_t::replace) + "\n\n";

                    LOG_VERBOSE("data stream", {{"to_send", str}});

                    if (!sink.write(str.data(), str.size()))
                    {
                        LOG_VERBOSE("stream closed", {});
                        llama_print_timings(llama.ctx);
                        return false;
                    }
                }

                if (!llama.has_next_token)
                {
                    // Generation is done, send extra information.
                    const json data =
                        format_final_response(llama, "",
                                              std::vector<completion_token_output>(llama.generated_token_probs.begin(),
                                                                                   llama.generated_token_probs.begin() +
                                                                                       sent_token_probs_index));

                    const std::string str =
                        "data: " + data.dump(-1, ' ', false, json::error_handler_t::replace) + "\n\n";

                    LOG_VERBOSE("data stream", {{"to_send", str}});

                    if (!sink.write(str.data(), str.size()))
                    {
                        LOG_VERBOSE("stream closed", {});
                        llama_print_timings(llama.ctx);
                        return false;
                    }
                }
            }

            llama_print_timings(llama.ctx);
            sink.done();
            return true;
        };
        const auto on_complete = [&](bool) { llama.mutex.unlock(); };
        lock.release();
        res.set_chunked_content_provider("text/event-stream", chunked_content_provider, on_complete);
    });

    svr.Get("/model.json", [&llama](const Request &, Response &res) {
        const json data = format_generation_settings(llama);
        return res.set_content(data.dump(), "application/json");
    });

    svr.Options(R"(/.*)", [](const Request &, Response &res) { return res.set_content("", "application/json"); });

    svr.Post("/tokenize", [&llama](const Request &req, Response &res) {
        auto lock = llama.lock();

        const json body = json::parse(req.body);
        std::vector<llama_token> tokens;
        if (body.count("content") != 0)
        {
            tokens = llama.tokenize(body["content"], false);
        }
        const json data = format_tokenizer_response(tokens);
        return res.set_content(data.dump(), "application/json");
    });

    svr.Post("/detokenize", [&llama](const Request &req, Response &res) {
        auto lock = llama.lock();

        const json body = json::parse(req.body);
        std::string content;
        if (body.count("tokens") != 0)
        {
            const std::vector<llama_token> tokens = body["tokens"];
            content = tokens_to_str(llama.ctx, tokens.cbegin(), tokens.cend());
        }

        const json data = format_detokenized_response(content);
        return res.set_content(data.dump(), "application/json");
    });

    svr.Post("/embedding", [&llama](const Request &req, Response &res) {
        auto lock = llama.lock();

        const json body = json::parse(req.body);

        llama.rewind();
        llama_reset_timings(llama.ctx);
        if (body.count("content") != 0)
        {
            llama.prompt = body["content"];
        }
        else
        {
            llama.prompt = "";
        }
        llama.params.n_predict = 0;
        llama.loadPrompt();
        llama.beginCompletion();
        llama.doCompletion();

        const json data = format_embedding_response(llama);
        return res.set_content(data.dump(), "application/json");
    });

    svr.set_logger(log_server_request);

    svr.set_exception_handler([](const Request &, Response &res, std::exception_ptr ep) {
        const char fmt[] = "500 Internal Server Error\n%s";
        char buf[BUFSIZ];
        try
        {
            std::rethrow_exception(std::move(ep));
        }
        catch (std::exception &e)
        {
            snprintf(buf, sizeof(buf), fmt, e.what());
        }
        catch (...)
        {
            snprintf(buf, sizeof(buf), fmt, "Unknown Exception");
        }
        res.set_content(buf, "text/plain");
        res.status = 500;
    });

    svr.set_error_handler([](const Request &, Response &res) {
        if (res.status == 400)
        {
            res.set_content("Invalid request", "text/plain");
        }
        else if (res.status != 500)
        {
            res.set_content("File Not Found", "text/plain");
            res.status = 404;
        }
    });

    // set timeouts and change hostname and port
    svr.set_read_timeout(sparams.read_timeout);
    svr.set_write_timeout(sparams.write_timeout);

    if (!svr.bind_to_port(sparams.hostname, sparams.port))
    {
        fprintf(stderr, "\ncouldn't bind to server socket: hostname=%s port=%d\n\n", sparams.hostname.c_str(),
                sparams.port);
        return 1;
    }

    // to make it ctrl+clickable:
    printf("\nWingman listening on http://%s:%d\n\n", sparams.hostname.c_str(), sparams.port);

    LOG_INFO("Wingman listening", {
                                      {"hostname", sparams.hostname},
                                      {"port", sparams.port},
                                  });

    std::thread webSocketServerThread(launch_websocket_server, std::ref(llama), sparams.hostname,
                                      sparams.websocket_port);
    DownloadService downloadService(actions);
    std::thread downloadServiceThread(&DownloadService::run, &downloadService);

    if (!svr.listen_after_bind())
    {
        return 1;
    }

    webSocketServerThread.join();
    downloadServiceThread.join();

    if (llama.grammar != nullptr)
    {
        llama_grammar_free(llama.grammar);
    }
    llama_backend_free();

    return 0;
}
