export interface LlamaStatsMeta
{
    arch: string;
    f_norm_eps: string;
    f_norm_rms_eps: string;
    format: string;
    freq_base: string;
    freq_scale: string;
    n_ctx: string;
    n_ctx_train: string;
    n_embd: string;
    n_ff: string;
    n_gqa: string;
    n_head: string;
    n_head_kv: string;
    n_layer: string;
    n_merges: string;
    n_rot: string;
    n_vocab: string;
}

export const newLlamaStatsMeta = (): LlamaStatsMeta =>
{
    return {
        arch: "",
        f_norm_eps: "",
        f_norm_rms_eps: "",
        format: "",
        freq_base: "",
        freq_scale: "",
        n_ctx: "",
        n_ctx_train: "",
        n_embd: "",
        n_ff: "",
        n_gqa: "",
        n_head: "",
        n_head_kv: "",
        n_layer: "",
        n_merges: "",
        n_rot: "",
        n_vocab: "",
    };
};

export interface LlamaStatsSystem {
    ctx_size: number;
    cuda_str: string;
    gpu_name: string;
    mem_required: number;
    offloaded: number;
    offloaded_total: number;
    offloading_repeating: number;
    offloading_nonrepeating: number;
    vram_per_layer_avg: number;
    vram_used: number;
    model_path: string;
    model_file_name: string;
    model_name: string;
    model_alias: string;
    quantization: string;
    has_next_token: boolean;
}

export const newLlamaStatsSystem = (): LlamaStatsSystem =>
{
    return {
        ctx_size: -1,
        cuda_str: "",
        gpu_name: "",
        mem_required: -1,
        offloaded: -1,
        offloaded_total: -1,
        offloading_repeating: -1,
        offloading_nonrepeating: -1,
        vram_per_layer_avg: -1,
        vram_used: -1,
        model_path: "",
        model_file_name: "",
        model_name: "",
        model_alias: "",
        quantization: "",
        has_next_token: false,
    };
};

export interface LlamaStatsTensors {
    [key: string]: number;
}

export const newLlamaStatsTensors = (): LlamaStatsTensors =>
{
    return {};
};

export interface LlamaStatsTimings {
    load_time: number;
    predicted_count: number;
    predicted_ms: number;
    predicted_per_second: number;
    predicted_per_token_ms: number;
    prompt_count: number;
    prompt_ms: number;
    prompt_per_second: number;
    prompt_per_token_ms: number;
    sample_count: number;
    sample_per_second: number;
    sample_per_token_ms: number;
    sample_time: number;
    time: number;
    total_time: number;
}

export const newLlamaStatsTimings = (): LlamaStatsTimings =>
{
    return {
        load_time: -1,
        predicted_count: -1,
        predicted_ms: -1,
        predicted_per_second: -1,
        predicted_per_token_ms: -1,
        prompt_count: -1,
        prompt_ms: -1,
        prompt_per_second: -1,
        prompt_per_token_ms: -1,
        sample_count: -1,
        sample_per_second: -1,
        sample_per_token_ms: -1,
        sample_time: -1,
        time: -1,
        total_time: -1,
    };
};

export interface LlamaStats
{
    meta: LlamaStatsMeta;
    system: LlamaStatsSystem;
    tensors: LlamaStatsTensors;
    timings: LlamaStatsTimings;
}

export const newLlamaStats = (): LlamaStats =>
{
    return {
        meta: newLlamaStatsMeta(),
        system: newLlamaStatsSystem(),
        tensors: newLlamaStatsTensors(),
        timings: newLlamaStatsTimings(),
    };
};
