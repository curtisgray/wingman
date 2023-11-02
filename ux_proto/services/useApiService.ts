import { useFetch } from "@/hooks/useFetch";
import { useCallback } from "react";

export interface GetModelsRequestProps {
    key: string;
}

const useApiService = () => {
    const fetchService = useFetch();
    const getModels = useCallback(
        (params: GetModelsRequestProps, signal?: AbortSignal) => {
            return fetchService.post<GetModelsRequestProps>(`/api/models`, {
                body: { key: params.key },
                headers: {
                    "Content-Type": "application/json",
                },
                signal,
            });
        },
        [fetchService]
    );
    const getAIModels = useCallback(
        (params: GetModelsRequestProps, signal?: AbortSignal) => {
            return fetchService.post<GetModelsRequestProps>("http://localhost:6568/api/models", {
                body: { key: params.key },
                headers: {
                    "Content-Type": "application/json",
                },
                signal,
            });
        },
        [fetchService]
    );

    return {
        getModels,
    };
};

export default useApiService;
