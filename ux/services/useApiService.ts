import { useFetch } from "@/hooks/useFetch";
import HomeContext from "@/pages/api/home/home.context";
import { AIModel } from "@/types/ai";
import { WingmanItem } from "@/types/wingman";
import { useCallback, useContext } from "react";

export interface GetModelsRequestProps {
    key: string;
    url: string;
}

const useApiService = () => {
    const fetchService = useFetch();
    const getModels = (params: GetModelsRequestProps, signal?: AbortSignal) => fetchService.post<AIModel[]>(`/api/models`, {
        body: { key: params.key },
        headers: {
            "Content-Type": "application/json",
        },
        signal,
    });

    return {
        getModels,
    };
};

export default useApiService;
