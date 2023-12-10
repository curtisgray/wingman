import { useFetch } from "@/hooks/useFetch";
import { AIModel } from "@/types/ai";
import { WingmanItem } from "@/types/wingman";
import { useCallback } from "react";

export interface GetModelsRequestProps {
    key: string;
}

const useApiService = () => {
    const fetchService = useFetch();
    const getModels = useCallback(
        (params: GetModelsRequestProps, signal?: AbortSignal) => {
            return fetchService.post<AIModel[]>(`/api/models`, {
                body: { key: params.key },
                headers: {
                    "Content-Type": "application/json",
                },
                signal,
            });
        },
        [fetchService]
    );
    const getWingmanItems = useCallback(
        () => fetchService.get<WingmanItem[]>(`/api/inference`),
        [fetchService]
    );

    return {
        getModels,
        getWingmanItems,
    };
};

export default useApiService;
