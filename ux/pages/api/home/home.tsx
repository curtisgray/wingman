/* eslint-disable react-hooks/exhaustive-deps */
import HomeContext from "./home.context";
import WingmanContext from "./wingman.context";
import { HomeStateProps, initialState } from "./home.state";
import { Chat } from "@/components/Chat/Chat";
import { Chatbar } from "@/components/Chatbar/Chatbar";
import Promptbar from "@/components/Promptbar";
import { useCreateReducer } from "@/hooks/useCreateReducer";
import useErrorService from "@/services/errorService";
import useApiService, { GetModelsRequestProps } from "@/services/useApiService";
import { Conversation } from "@/types/chat";
import { KeyValuePair } from "@/types/data";
import { FolderInterface, FolderType } from "@/types/folder";
import { AIModel, AIModelID, AIModels, DownloadableItem, Vendors, fallbackModelID } from "@/types/ai";
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
import { WingmanItem, WingmanStateProps, hasActiveStatus } from "@/types/wingman";
import { initialWingmanState } from "./wingman.state";
import { useRequestInferenceAction } from "@/hooks/useRequestInferenceAction";
import toast from "react-hot-toast";

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
    const { t } = useTranslation("chat");
    const { getModels } = useApiService();
    const { getModelsError } = useErrorService();
    const [currentConversationModel, setCurrentConversationModel] = useState<AIModel | undefined>(undefined);
    const [isSwitchingModel, setIsSwitchingModel] = useState<boolean>(false);

    const homeContextValue = useCreateReducer<HomeStateProps>({
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
            globalModel,
        },
        dispatch: homeDispatch,
    } = homeContextValue;

    const wingmanContextValue = useCreateReducer<WingmanStateProps>({
        initialState: initialWingmanState,
    });

    const {
        dispatch: wingmanDispatch,
    } = wingmanContextValue;

    const {
        pauseMetrics,
        timeSeries,
        meta,
        system,
        tensors,
        metrics,
        // lastTime,
        isOnline,
        status: connectionStatus,
        wingmanServiceStatus,
        downloadServiceStatus,
        wingmanItems,
        downloadItems,
        currentWingmanInferenceItem,
    } = useWingman();
    const inferenceActions = useRequestInferenceAction();

    useEffect(() =>
    {
        wingmanDispatch({ field: "pauseMetrics", value: pauseMetrics });
        wingmanDispatch({ field: "timeSeries", value: timeSeries });
        wingmanDispatch({ field: "meta", value: meta });
        wingmanDispatch({ field: "tensors", value: tensors });
        wingmanDispatch({ field: "system", value: system });
        wingmanDispatch({ field: "metrics", value: metrics });
        // wingmanDispatch({ field: "lastTime", value: lastTime });
        wingmanDispatch({ field: "isOnline", value: isOnline });
        wingmanDispatch({ field: "status", value: connectionStatus });
        wingmanDispatch({ field: "wingmanServiceStatus", value: wingmanServiceStatus });
        wingmanDispatch({ field: "downloadServiceStatus", value: downloadServiceStatus });
        wingmanDispatch({ field: "wingmanItems", value: wingmanItems });
        wingmanDispatch({ field: "downloadItems", value: downloadItems });
        wingmanDispatch({ field: "currentWingmanInferenceItem", value: currentWingmanInferenceItem });
    }, [
        pauseMetrics, timeSeries, meta, system, tensors, metrics,
        // lastTime,
        isOnline, connectionStatus, wingmanServiceStatus,
        downloadItems, wingmanItems,
        downloadServiceStatus, currentWingmanInferenceItem]);

    const stopConversationRef = useRef<boolean>(false);

    const { data: models, error } = useQuery(
        ["GetModels", apiKey, serverSideApiKeyIsSet],
        ({ signal }) => {
            // if (!apiKey && !serverSideApiKeyIsSet) return null;

            return getModels(
                {
                    key: apiKey,
                } as GetModelsRequestProps,
                signal
            );
        },
        { enabled: true, refetchOnMount: false }
    );

    useEffect(() => {
        if (models)
            homeDispatch({ field: "models", value: models });
    }, [models, homeDispatch]);

    useEffect(() => {
        homeDispatch({ field: "modelError", value: getModelsError(error) });
    }, [homeDispatch, error, getModelsError]);

    // FETCH MODELS ----------------------------------------------

    const handleSelectConversation = (conversation: Conversation) => {
        homeDispatch({
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

        homeDispatch({ field: "folders", value: updatedFolders });
        saveFolders(updatedFolders);
    };

    const handleDeleteFolder = (folderId: string) => {
        const updatedFolders = folders.filter((f) => f.id !== folderId);
        homeDispatch({ field: "folders", value: updatedFolders });
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

        homeDispatch({ field: "conversations", value: updatedConversations });
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

        homeDispatch({ field: "prompts", value: updatedPrompts });
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

        homeDispatch({ field: "folders", value: updatedFolders });

        saveFolders(updatedFolders);
    };

    // CONVERSATION OPERATIONS  --------------------------------------------
    const changeConversationModel = (model: AIModel | undefined) => {
        if (selectedConversation) {
            handleUpdateConversation(selectedConversation, {
                key: "model",
                value: model,
            });
        }
    };

    const changeGlobalModel = (model: AIModel | undefined) => {
        setIsSwitchingModel(true);
        homeDispatch({ field: "globalModel", value: model });
    };

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
            inferringAlias: "",
            systemPrompt: DEFAULT_SYSTEM_PROMPT,
            temperature: lastConversation?.temperature ?? DEFAULT_TEMPERATURE,
            folderId: null,
        };

        const updatedConversations = [...conversations, newConversation];

        homeDispatch({ field: "selectedConversation", value: newConversation });
        homeDispatch({ field: "conversations", value: updatedConversations });

        saveConversation(newConversation);
        saveConversations(updatedConversations);

        homeDispatch({ field: "loading", value: false });
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

        homeDispatch({ field: "selectedConversation", value: single });
        homeDispatch({ field: "conversations", value: all });
    };

    const handleDuplicateConversation = (conversation: Conversation) => {
        const conversationCopy: Conversation = {
            id: uuidv4(),
            name: `${conversation.name} (copy)`,
            messages: conversation.messages,
            model: conversation.model,
            inferringAlias: conversation.inferringAlias,
            systemPrompt: conversation.systemPrompt,
            temperature: conversation.temperature,
            folderId: conversation.folderId,
        };

        const updatedConversations = [...conversations, conversationCopy];

        homeDispatch({ field: "selectedConversation", value: conversationCopy });
        homeDispatch({ field: "conversations", value: updatedConversations });

        saveConversation(conversationCopy);
        saveConversations(updatedConversations);

        homeDispatch({ field: "loading", value: false });
    };

    const handleChangeModel = (model: AIModel | undefined) => {
        // change model for the current conversation
        changeConversationModel(model);
    };

    // EFFECTS  --------------------------------------------

    useEffect(() => {
        if (window.innerWidth < 640) {
            homeDispatch({ field: "showChatbar", value: false });
        }
    }, [selectedConversation]);

    useEffect(() => {
        if (selectedConversation && selectedConversation.model !== currentConversationModel) {
            setCurrentConversationModel(selectedConversation.model);
            changeGlobalModel(selectedConversation.model);
        }
    }, [selectedConversation?.model]);

    useEffect(() => {
        if (selectedConversation && selectedConversation.model !== currentConversationModel) {
            setCurrentConversationModel(selectedConversation.model);
            changeGlobalModel(selectedConversation.model);
        }
    }, [selectedConversation?.id]);

    useEffect(() => {
        defaultModelId &&
            homeDispatch({ field: "defaultModelId", value: defaultModelId });
        serverSideApiKeyIsSet &&
            homeDispatch({
                field: "serverSideApiKeyIsSet",
                value: serverSideApiKeyIsSet,
            });
        serverSidePluginKeysSet &&
            homeDispatch({
                field: "serverSidePluginKeysSet",
                value: serverSidePluginKeysSet,
            });
    }, [
        defaultModelId,
        homeDispatch,
        serverSideApiKeyIsSet,
        serverSidePluginKeysSet,
    ]);

    // ON LOAD --------------------------------------------

    useEffect(() => {
        const settings = getSettings();
        if (settings.theme) {
            homeDispatch({
                field: "lightMode",
                value: settings.theme,
            });
        }

        const apiKey = localStorage.getItem("apiKey");

        if (serverSideApiKeyIsSet) {
            homeDispatch({ field: "apiKey", value: "" });

            localStorage.removeItem("apiKey");
        } else if (apiKey) {
            homeDispatch({ field: "apiKey", value: apiKey });
        }

        const pluginKeys = localStorage.getItem("pluginKeys");
        if (serverSidePluginKeysSet) {
            homeDispatch({ field: "pluginKeys", value: [] });
            localStorage.removeItem("pluginKeys");
        } else if (pluginKeys) {
            homeDispatch({ field: "pluginKeys", value: pluginKeys });
        }

        if (window.innerWidth < 640) {
            homeDispatch({ field: "showChatbar", value: false });
            homeDispatch({ field: "showPromptbar", value: false });
        }

        const showChatbar = localStorage.getItem("showChatbar");
        if (showChatbar) {
            homeDispatch({ field: "showChatbar", value: showChatbar === "true" });
        }

        const showPromptbar = localStorage.getItem("showPromptbar");
        if (showPromptbar) {
            homeDispatch({
                field: "showPromptbar",
                value: showPromptbar === "true",
            });
        }

        const folders = localStorage.getItem("folders");
        if (folders) {
            homeDispatch({ field: "folders", value: JSON.parse(folders) });
        }

        const prompts = localStorage.getItem("prompts");
        if (prompts) {
            homeDispatch({ field: "prompts", value: JSON.parse(prompts) });
        }

        const conversationHistory = localStorage.getItem("conversationHistory");
        if (conversationHistory) {
            const parsedConversationHistory: Conversation[] =
                JSON.parse(conversationHistory);
            const cleanedConversationHistory = cleanConversationHistory(
                parsedConversationHistory
            );

            homeDispatch({
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

            homeDispatch({
                field: "selectedConversation",
                value: cleanedSelectedConversation,
            });
        } else {
            const lastConversation = conversations[conversations.length - 1];
            homeDispatch({
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
        homeDispatch,
        serverSideApiKeyIsSet,
        serverSidePluginKeysSet,
        t,
    ]);

    useEffect(() => {
        if (globalModel !== undefined) {
            const vendor = Vendors[globalModel.vendor];
            // check if the globalModel is downloadable, e.g., running on the Wingman server
            //  if so, then start the model running on the Wingman server
            if (vendor.isDownloadable) {
                if (globalModel.item === undefined) {
                    // whenever the globalModel changes, the globalModel.item must be defined, otherwise
                    //   something has gone wrong in setting the global model
                    //   so throw an error
                    throw new Error(`'globalModel' is defined as ${globalModel.id}, but 'globalModel.item' is undefined. Something has gone wrong within the application.`);
                } else {
                    // issue a request to start the model running on the Wingman server
                    //  and wait for the currentWingmanInferenceItem to be set to the globalModel
                    const wi = inferenceActions.requestStartInference(
                        globalModel.item!.filePath, globalModel.id, globalModel.item!.filePath, -1);
                    if (wi === undefined) {
                        setIsSwitchingModel(false);
                        toast.error(`Target Acquisition Failed: ${globalModel.name}`);
                    }
                }
            } else {
                toast.success(`Target Acquired: ${globalModel.name}`);
                setIsSwitchingModel(false);
            }
        }
    }, [globalModel]);

    useEffect(() => {
        if (currentWingmanInferenceItem) {
            if (globalModel && globalModel.item && globalModel.item.filePath === currentWingmanInferenceItem.filePath) {
                // this can be called several times while the currentWingmanInferenceItem's status is changing,
                //  so, we need to wait until the status is 'inferring' before notifying the user
                if (currentWingmanInferenceItem.status === "inferring") {
                    toast.success(`Engaging Target: ${globalModel.name}`);
                    setIsSwitchingModel(false);
                } else if (currentWingmanInferenceItem.status === "error") {
                    toast.error(`Target Acquisition Failed: ${globalModel.name}`);
                    setIsSwitchingModel(false);
                }
            }
        }
    }, [currentWingmanInferenceItem, models]);

    useEffect(() => {
        if (isSwitchingModel) {
            homeDispatch({ field: "loading", value: true });
        } else {
            homeDispatch({ field: "loading", value: false });
        }
    }, [isSwitchingModel]);

    return (
        <WingmanContext.Provider
            value={{
                ...wingmanContextValue,
            }}
        >
            <HomeContext.Provider
                value={{
                    ...homeContextValue,
                    handleNewConversation,
                    handleCreateFolder,
                    handleDeleteFolder,
                    handleUpdateFolder,
                    handleSelectConversation,
                    handleUpdateConversation,
                    handleDuplicateConversation,
                    handleDeleteConversation: () => {},
                    handleChangeModel,
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
