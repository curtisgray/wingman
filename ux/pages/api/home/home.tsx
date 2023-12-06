/* eslint-disable react-hooks/exhaustive-deps */
import HomeContext from "./home.context";
import WingmanContext from "./wingman.context";
import { HomeStateProps, initialState } from "./home.state";
import { Chat } from "@/components/Chat/Chat";
import { Chatbar } from "@/components/Chatbar/Chatbar";
import { Navbar } from "@/components/Mobile/Navbar";
import Promptbar from "@/components/Promptbar";
import { useCreateReducer } from "@/hooks/useCreateReducer";
import useErrorService from "@/services/errorService";
import useApiService from "@/services/useApiService";
import { Conversation } from "@/types/chat";
import { KeyValuePair } from "@/types/data";
import { FolderInterface, FolderType } from "@/types/folder";
import { AIModelID, AIModels, fallbackModelID } from "@/types/ai";
import { Prompt } from "@/types/prompt";
import {
    cleanConversationHistory,
    cleanSelectedConversation,
} from "@/utils/app/clean";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from "@/utils/app/const";
import {
    saveConversation,
    saveConversations,
    updateConversation,
} from "@/utils/app/conversation";
import { saveFolders } from "@/utils/app/folders";
import { savePrompts } from "@/utils/app/prompts";
import { getSettings } from "@/utils/app/settings";
import { GetServerSideProps } from "next";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "react-query";
import { v4 as uuidv4 } from "uuid";
import { useWingman } from "@/hooks/useWingman";
import { WingmanItem, WingmanStateProps } from "@/types/wingman";
import { initialWingmanState } from "./wingman.state";
import { DownloadProps } from "@/types/download";

interface Props {
    serverSideApiKeyIsSet: boolean;
    serverSidePluginKeysSet: boolean;
    defaultModelId: AIModelID;
}

const Home = ({
    serverSideApiKeyIsSet,
    serverSidePluginKeysSet,
    defaultModelId,
}: Props) => {
    const inferencePort = 6567;
    const monitorPort = 6568;

    const { t } = useTranslation("chat");
    const { getModels } = useApiService();
    const { getModelsError } = useErrorService();
    const [initialRender, setInitialRender] = useState<boolean>(true);
    const [currentInferenceItem, setCurrentInferenceItem] = useState<WingmanItem | undefined>(undefined);
    const [chosenModel, setChosenModel] = useState<DownloadProps>({modelRepo: "", filePath: ""});

    const isModelChosen = () => chosenModel !== undefined;

    const contextValue = useCreateReducer<HomeStateProps>({
        initialState,
    });

    const {
        state: {
            apiKey,
            lightMode,
            folders,
            conversations,
            selectedConversation,
            prompts,
            temperature,
        },
        dispatch,
    } = contextValue;

    const wingmanContextValue = useCreateReducer<WingmanStateProps>({
        initialState: initialWingmanState,
    });

    const {
        dispatch: wingmanDispatch,
    } = wingmanContextValue;

    const {
        alias,
        modelRepo,
        filePath,
        isGenerating,
        latestItem,
        items,
        pauseMetrics,
        timeSeries,
        meta,
        system,
        tensors,
        metrics,
        lastTime,
        isOnline,
        status: connectionStatus,
        wingmanServiceStatus,
        downloadServiceStatus,
        wingmanStatus,
        isInferring,
        wingmanItem,
        lastWebSocketMessage: lastWSMessage,

        forceChosenModel,
        activate,
        deactivate,
        startGenerating,
        stopGenerating,
        toggleMetrics,
    } = useWingman(inferencePort, monitorPort);

    function onInferenceItemsEvent(value: WingmanItem)
    {
        setCurrentInferenceItem(value);
    }

    useEffect(() =>
    {
        wingmanDispatch({ field: "alias", value: alias });
        wingmanDispatch({ field: "modelRepo", value: modelRepo });
        wingmanDispatch({ field: "filePath", value: filePath });
        wingmanDispatch({ field: "isGenerating", value: isGenerating });
        wingmanDispatch({ field: "latestItem", value: latestItem });
        wingmanDispatch({ field: "items", value: items });
        wingmanDispatch({ field: "pauseMetrics", value: pauseMetrics });
        wingmanDispatch({ field: "timeSeries", value: timeSeries });
        wingmanDispatch({ field: "meta", value: meta });
        wingmanDispatch({ field: "tensors", value: tensors });
        wingmanDispatch({ field: "system", value: system });
        wingmanDispatch({ field: "metrics", value: metrics });
        wingmanDispatch({ field: "lastTime", value: lastTime });
        wingmanDispatch({ field: "isOnline", value: isOnline });
        wingmanDispatch({ field: "status", value: connectionStatus });
        wingmanDispatch({ field: "wingmanServiceStatus", value: wingmanServiceStatus });
        wingmanDispatch({ field: "downloadServiceStatus", value: downloadServiceStatus });
        wingmanDispatch({ field: "wingmanStatus", value: wingmanStatus });
        wingmanDispatch({ field: "isInferring", value: isInferring });
        wingmanDispatch({ field: "wingmanItem", value: wingmanItem });
        wingmanDispatch({ field: "lastWebSocketMessage", value: lastWSMessage });

        wingmanDispatch({ field: "forceChosenModel", value: forceChosenModel });
        wingmanDispatch({ field: "activate", value: activate });
        wingmanDispatch({ field: "deactivate", value: deactivate });
        wingmanDispatch({ field: "startGenerating", value: startGenerating });
        wingmanDispatch({ field: "stopGenerating", value: stopGenerating });
        wingmanDispatch({ field: "toggleMetrics", value: toggleMetrics });
        if (isModelChosen() && wingmanItem.alias === chosenModel?.filePath){
            onInferenceItemsEvent(wingmanItem);
        }
    }, [alias, modelRepo, filePath, isGenerating, latestItem, items, pauseMetrics, timeSeries, meta, system, tensors, metrics, lastTime, isOnline, connectionStatus, wingmanServiceStatus, downloadServiceStatus, wingmanStatus, isInferring, wingmanItem, lastWSMessage, forceChosenModel, activate, deactivate, startGenerating, stopGenerating, toggleMetrics]);

    const stopConversationRef = useRef<boolean>(false);

    const { data, error, refetch } = useQuery(
        ["GetModels", apiKey, serverSideApiKeyIsSet],
        ({ signal }) => {
            // if (!apiKey && !serverSideApiKeyIsSet) return null;

            return getModels(
                {
                    key: apiKey,
                },
                signal
            );
        },
        { enabled: true, refetchOnMount: false }
    );

    useEffect(() => {
        if (data) dispatch({ field: "models", value: data });
    }, [data, dispatch]);

    useEffect(() => {
        dispatch({ field: "modelError", value: getModelsError(error) });
    }, [dispatch, error, getModelsError]);

    // FETCH MODELS ----------------------------------------------

    const handleSelectConversation = (conversation: Conversation) => {
        dispatch({
            field: "selectedConversation",
            value: conversation,
        });

        saveConversation(conversation);
    };

    // FOLDER OPERATIONS  --------------------------------------------

    const handleCreateFolder = (name: string, type: FolderType) => {
        const newFolder: FolderInterface = {
            id: uuidv4(),
            name,
            type,
        };

        const updatedFolders = [...folders, newFolder];

        dispatch({ field: "folders", value: updatedFolders });
        saveFolders(updatedFolders);
    };

    const handleDeleteFolder = (folderId: string) => {
        const updatedFolders = folders.filter((f) => f.id !== folderId);
        dispatch({ field: "folders", value: updatedFolders });
        saveFolders(updatedFolders);

        const updatedConversations: Conversation[] = conversations.map((c) => {
            if (c.folderId === folderId) {
                return {
                    ...c,
                    folderId: null,
                };
            }

            return c;
        });

        dispatch({ field: "conversations", value: updatedConversations });
        saveConversations(updatedConversations);

        const updatedPrompts: Prompt[] = prompts.map((p) => {
            if (p.folderId === folderId) {
                return {
                    ...p,
                    folderId: null,
                };
            }

            return p;
        });

        dispatch({ field: "prompts", value: updatedPrompts });
        savePrompts(updatedPrompts);
    };

    const handleUpdateFolder = (folderId: string, name: string) => {
        const updatedFolders = folders.map((f) => {
            if (f.id === folderId) {
                return {
                    ...f,
                    name,
                };
            }

            return f;
        });

        dispatch({ field: "folders", value: updatedFolders });

        saveFolders(updatedFolders);
    };

    // CONVERSATION OPERATIONS  --------------------------------------------

    const handleNewConversation = () => {
        const lastConversation = conversations[conversations.length - 1];

        const newConversation: Conversation = {
            id: uuidv4(),
            name: `${t('New Conversation')}`,
            messages: [],
            model: lastConversation?.model || {
                id: AIModels[defaultModelId].id,
                name: AIModels[defaultModelId].name,
                maxLength: AIModels[defaultModelId].maxLength,
                tokenLimit: AIModels[defaultModelId].tokenLimit,
            },
            prompt: DEFAULT_SYSTEM_PROMPT,
            temperature: lastConversation?.temperature ?? DEFAULT_TEMPERATURE,
            folderId: null,
        };

        const updatedConversations = [...conversations, newConversation];

        dispatch({ field: "selectedConversation", value: newConversation });
        dispatch({ field: "conversations", value: updatedConversations });

        saveConversation(newConversation);
        saveConversations(updatedConversations);

        dispatch({ field: "loading", value: false });
    };

    const handleUpdateConversation = (
        conversation: Conversation,
        data: KeyValuePair
    ) => {
        const updatedConversation = {
            ...conversation,
            [data.key]: data.value,
        };

        const { single, all } = updateConversation(
            updatedConversation,
            conversations
        );

        dispatch({ field: "selectedConversation", value: single });
        dispatch({ field: "conversations", value: all });
    };

    const handleDuplicateConversation = (conversation: Conversation) => {
        const conversationCopy: Conversation = {
            id: uuidv4(),
            name: `${conversation.name} (copy)`,
            messages: conversation.messages,
            model: conversation.model,
            prompt: conversation.prompt,
            temperature: conversation.temperature,
            folderId: conversation.folderId,
        };

        const updatedConversations = [...conversations, conversationCopy];

        dispatch({ field: "selectedConversation", value: conversationCopy });
        dispatch({ field: "conversations", value: updatedConversations });

        saveConversation(conversationCopy);
        saveConversations(updatedConversations);

        dispatch({ field: "loading", value: false });
    };

    // EFFECTS  --------------------------------------------

    useEffect(() => {
        if (window.innerWidth < 640) {
            dispatch({ field: "showChatbar", value: false });
        }
    }, [selectedConversation]);

    useEffect(() => {
        defaultModelId &&
            dispatch({ field: "defaultModelId", value: defaultModelId });
        serverSideApiKeyIsSet &&
            dispatch({
                field: "serverSideApiKeyIsSet",
                value: serverSideApiKeyIsSet,
            });
        serverSidePluginKeysSet &&
            dispatch({
                field: "serverSidePluginKeysSet",
                value: serverSidePluginKeysSet,
            });
    }, [
        defaultModelId,
        dispatch,
        serverSideApiKeyIsSet,
        serverSidePluginKeysSet,
    ]);

    // ON LOAD --------------------------------------------

    useEffect(() => {
        const settings = getSettings();
        if (settings.theme) {
            dispatch({
                field: "lightMode",
                value: settings.theme,
            });
        }

        const apiKey = localStorage.getItem("apiKey");

        if (serverSideApiKeyIsSet) {
            dispatch({ field: "apiKey", value: "" });

            localStorage.removeItem("apiKey");
        } else if (apiKey) {
            dispatch({ field: "apiKey", value: apiKey });
        }

        const pluginKeys = localStorage.getItem("pluginKeys");
        if (serverSidePluginKeysSet) {
            dispatch({ field: "pluginKeys", value: [] });
            localStorage.removeItem("pluginKeys");
        } else if (pluginKeys) {
            dispatch({ field: "pluginKeys", value: pluginKeys });
        }

        if (window.innerWidth < 640) {
            dispatch({ field: "showChatbar", value: false });
            dispatch({ field: "showPromptbar", value: false });
        }

        const showChatbar = localStorage.getItem("showChatbar");
        if (showChatbar) {
            dispatch({ field: "showChatbar", value: showChatbar === "true" });
        }

        const showPromptbar = localStorage.getItem("showPromptbar");
        if (showPromptbar) {
            dispatch({
                field: "showPromptbar",
                value: showPromptbar === "true",
            });
        }

        const folders = localStorage.getItem("folders");
        if (folders) {
            dispatch({ field: "folders", value: JSON.parse(folders) });
        }

        const prompts = localStorage.getItem("prompts");
        if (prompts) {
            dispatch({ field: "prompts", value: JSON.parse(prompts) });
        }

        const conversationHistory = localStorage.getItem("conversationHistory");
        if (conversationHistory) {
            const parsedConversationHistory: Conversation[] =
                JSON.parse(conversationHistory);
            const cleanedConversationHistory = cleanConversationHistory(
                parsedConversationHistory
            );

            dispatch({
                field: "conversations",
                value: cleanedConversationHistory,
            });
        }

        const selectedConversation = localStorage.getItem("selectedConversation");
        if (selectedConversation) {
            const parsedSelectedConversation: Conversation =
                JSON.parse(selectedConversation);
            const cleanedSelectedConversation = cleanSelectedConversation(
                parsedSelectedConversation
            );

            dispatch({
                field: "selectedConversation",
                value: cleanedSelectedConversation,
            });
        } else {
            const lastConversation = conversations[conversations.length - 1];
            dispatch({
                field: "selectedConversation",
                value: {
                    id: uuidv4(),
                    name: t("New Conversation"),
                    messages: [],
                    model: AIModels[defaultModelId],
                    prompt: DEFAULT_SYSTEM_PROMPT,
                    temperature:
                        lastConversation?.temperature ?? DEFAULT_TEMPERATURE,
                    folderId: null,
                },
            });
        }
    }, [
        defaultModelId,
        dispatch,
        serverSideApiKeyIsSet,
        serverSidePluginKeysSet,
        t,
    ]);

    return (
        <WingmanContext.Provider
            value={{
                ...wingmanContextValue,
            }}
        >
            <HomeContext.Provider
                value={{
                    ...contextValue,
                    handleNewConversation,
                    handleCreateFolder,
                    handleDeleteFolder,
                    handleUpdateFolder,
                    handleSelectConversation,
                    handleUpdateConversation,
                    handleDuplicateConversation,
                }}
            >
                <Head>
                    <title>Wingman</title>
                    <meta name="description" content="The convienent chat UI." />
                    <meta
                        name="viewport"
                        content="height=device-height ,width=device-width, initial-scale=1, user-scalable=no"
                    />
                    <link rel="icon" href="/favicon.ico" />
                </Head>
                {selectedConversation && (
                    <main
                        className={`flex h-screen w-screen flex-col text-sm text-black dark:text-white ${lightMode}`}
                    >
                        <div className="fixed top-0 w-full sm:hidden">
                            <Navbar
                                selectedConversation={selectedConversation}
                                onNewConversation={handleNewConversation}
                            />
                        </div>

                        <div className="flex h-full w-full pt-[48px] sm:pt-0">
                            <Chatbar />

                            <div className="flex flex-1">
                                <Chat stopConversationRef={stopConversationRef} />
                            </div>

                            <Promptbar />
                        </div>
                    </main>
                )}
            </HomeContext.Provider>
        </WingmanContext.Provider>
    );
};
export default Home;

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
    const defaultModelId =
        (process.env.DEFAULT_MODEL &&
            Object.values(AIModelID).includes(
                process.env.DEFAULT_MODEL as AIModelID
            ) &&
            process.env.DEFAULT_MODEL) ||
        fallbackModelID;

    let serverSidePluginKeysSet = false;

    const googleApiKey = process.env.GOOGLE_API_KEY;
    const googleCSEId = process.env.GOOGLE_CSE_ID;

    if (googleApiKey && googleCSEId) {
        serverSidePluginKeysSet = true;
    }

    return {
        props: {
            serverSideApiKeyIsSet: !!process.env.OPENAI_API_KEY,
            defaultModelId,
            serverSidePluginKeysSet,
            ...(await serverSideTranslations(locale ?? "en", [
                "common",
                "chat",
                "sidebar",
                "markdown",
                "promptbar",
                "settings",
            ])),
        },
    };
};
