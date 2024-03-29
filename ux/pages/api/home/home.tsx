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
import
{
    cleanConversationHistory,
    cleanSelectedConversation,
} from "@/utils/app/clean";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from "@/utils/app/const";
import
{
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
import { WingmanStateProps } from "@/types/wingman";
import { initialWingmanState } from "./wingman.state";
import { useRequestInferenceAction } from "@/hooks/useRequestInferenceAction";
import toast from "react-hot-toast";
import { StripFormatFromModelRepo } from "@/types/download";

interface Props
{
    serverSideApiKeyIsSet: boolean;
    serverSidePluginKeysSet: boolean;
    defaultModelId: AIModelID;
    serverSideHostAddress: string;
}

const Home = ({
    serverSideApiKeyIsSet,
    serverSidePluginKeysSet,
    defaultModelId,
    serverSideHostAddress,
}: Props) =>
{
    const { t } = useTranslation("chat");
    const { getModels } = useApiService();
    const { getModelsError } = useErrorService();
    const [currentConversationModel, setCurrentConversationModel] = useState<AIModel | undefined>(undefined);
    // const [lastConversationModel, setLastConversationModel] = useState<AIModel | undefined>(undefined); // this is a place to save the current model when a request is made to change the conversations model
    const [enableAutoModelsRefresh, setEnableAutoModelsRefresh] = useState<boolean>(true);

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
            globalModel,
            isSwitchingModel,
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
        isOnline,
        status: connectionStatus,
        wingmanServiceStatus,
        downloadServiceStatus,
        wingmanItems,
        downloadItems,
        currentWingmanInferenceItem,
        wingmanStatusMessage,
        isInferring,
        isDownloading,
        inferringAlias,
        wingmanStatusLabel,
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
        wingmanDispatch({ field: "isOnline", value: isOnline });
        wingmanDispatch({ field: "status", value: connectionStatus });
        wingmanDispatch({ field: "wingmanServiceStatus", value: wingmanServiceStatus });
        wingmanDispatch({ field: "downloadServiceStatus", value: downloadServiceStatus });
        wingmanDispatch({ field: "wingmanItems", value: wingmanItems });
        wingmanDispatch({ field: "downloadItems", value: downloadItems });
        wingmanDispatch({ field: "currentWingmanInferenceItem", value: currentWingmanInferenceItem });
        wingmanDispatch({ field: "wingmanStatusMessage", value: wingmanStatusMessage });
        wingmanDispatch({ field: "isInferring", value: isInferring });
        wingmanDispatch({ field: "isDownloading", value: isDownloading });
        wingmanDispatch({ field: "inferringAlias", value: inferringAlias });
        wingmanDispatch({ field: "wingmanStatusLabel", value: wingmanStatusLabel });
    }, [
        pauseMetrics, timeSeries, meta, system, tensors, metrics,
        isOnline, connectionStatus, wingmanServiceStatus,
        downloadItems, wingmanItems,
        downloadServiceStatus, currentWingmanInferenceItem,
        inferringAlias, isInferring, isDownloading, wingmanStatusMessage, wingmanStatusLabel]);

    // useEffect(() =>
    // {
    //     wingmanDispatch({ field: "lastTime", value: lastTime });
    // }, [lastTime]);

    const stopConversationRef = useRef<boolean>(false);

    const { data: models, error, refetch: refetchModels } = useQuery(
        ["GetModels", apiKey, serverSideApiKeyIsSet],
        ({ signal }) =>
        {
            const m = getModels(
                {
                    key: apiKey,
                } as GetModelsRequestProps,
                signal
            );
            return m;
        },
        { enabled: (enableAutoModelsRefresh && isOnline), refetchOnMount: false }
    );

    useEffect(() =>
    {
        if (models) {
            homeDispatch({ field: "models", value: models });
            // identify the model named 'default' and set it as the default model
            const defaultModel = models.find(m => m.id === "default");
            if (defaultModel) {
                homeDispatch({ field: "defaultModel", value: defaultModel });
            }
        }
    }, [models, homeDispatch]);

    useEffect(() =>
    {
        homeDispatch({ field: "modelError", value: getModelsError(error) });
    }, [homeDispatch, error, getModelsError]);

    // FETCH MODELS ----------------------------------------------

    const handleSelectConversation = (conversation: Conversation) =>
    {
        homeDispatch({
            field: "selectedConversation",
            value: conversation,
        });

        saveConversation(conversation);
    };

    // FOLDER OPERATIONS  --------------------------------------------

    const handleCreateFolder = (name: string, type: FolderType) =>
    {
        const newFolder: FolderInterface = {
            id: uuidv4(),
            name,
            type,
        };

        const updatedFolders = [...folders, newFolder];

        homeDispatch({ field: "folders", value: updatedFolders });
        saveFolders(updatedFolders);
    };

    const handleDeleteFolder = (folderId: string) =>
    {
        const updatedFolders = folders.filter((f) => f.id !== folderId);
        homeDispatch({ field: "folders", value: updatedFolders });
        saveFolders(updatedFolders);

        const updatedConversations: Conversation[] = conversations.map((c) =>
        {
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

        const updatedPrompts: Prompt[] = prompts.map((p) =>
        {
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

    const handleUpdateFolder = (folderId: string, name: string) =>
    {
        const updatedFolders = folders.map((f) =>
        {
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
    const changeConversationModel = (model: AIModel | undefined) =>
    {
        if (selectedConversation) {
            homeDispatch({ field: "isSwitchingModel", value: true });
            let m = model;
            if (m === undefined) {
                m = AIModels[fallbackModelID];
            }
            handleUpdateConversation(selectedConversation, {
                key: "model",
                value: m,
            });
        }
    };

    const changeGlobalModel = (model: AIModel | undefined) =>
    {
        homeDispatch({ field: "globalModel", value: model });
    };

    const handleNewConversation = () =>
    {
        const lastConversation = conversations[conversations.length - 1];

        const newConversation: Conversation = {
            id: uuidv4(),
            name: `${t('New Conversation')}`,
            messages: [],
            // model: lastConversation?.model || AIModels[defaultModelId],
            model: AIModels[defaultModelId],
            // inferringAlias: "",
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
    ) =>
    {
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

    const handleDuplicateConversation = (conversation: Conversation) =>
    {
        const conversationCopy: Conversation = {
            id: uuidv4(),
            name: `${conversation.name} (copy)`,
            messages: conversation.messages,
            model: conversation.model,
            // inferringAlias: conversation.inferringAlias,
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

    const handleChangeModel = (model: AIModel | undefined) =>
    {
        // change model for the current conversation
        changeConversationModel(model);
    };

    const handleRefreshModels = () =>
    {
        setEnableAutoModelsRefresh(false);
    };

    const handleResetInferenceError = (alias: string) =>
    {
        inferenceActions.requestResetInference(alias);
    };

    const handleUpdateWingmanStatusMessage = (statusMessage: string) =>
    {
        wingmanDispatch({ field: "wingmanStatusMessage", value: statusMessage });
    };

    useEffect(() =>
    {
        if (!enableAutoModelsRefresh) {
            refetchModels();
            setEnableAutoModelsRefresh(true);
        }
    }, [enableAutoModelsRefresh]);


    // EFFECTS  --------------------------------------------

    useEffect(() =>
    {
        if (window.innerWidth < 640) {
            homeDispatch({ field: "showChatbar", value: false });
        }
    }, [selectedConversation]);

    useEffect(() =>
    {
        if (!isOnline) return;

        const sccm = (model: AIModel | undefined) =>
        {
            if (model === undefined) {
                changeConversationModel(model);
            } else {
                changeGlobalModel(model);
            }
            homeDispatch({ field: "isModelSelected", value: (model?.id && model?.id !== AIModelID.NO_MODEL_SELECTED) });
        };

        // if the selectedConversation.model is the same as the already inferring model, then do nothing
        if (inferringAlias
            && selectedConversation?.model?.item?.filePath
            && selectedConversation.model.item.filePath === inferringAlias) {
            return;
        }

        if (models && models.length > 0
            && selectedConversation
            && selectedConversation.model) {
            if (selectedConversation.model.id === AIModelID.NO_MODEL_SELECTED) {
                sccm(AIModels[AIModelID.NO_MODEL_SELECTED]);
                return;
            }
            const vendor = Vendors[selectedConversation.model.vendor];
            if (vendor.isDownloadable) {
                const latestModel = models.find((m) => m.id === selectedConversation.model.id);
                if (latestModel === undefined) {
                    toast.error(`${StripFormatFromModelRepo(selectedConversation.model.name)} is not available. Please select another model.`);
                    sccm(undefined);
                    return;
                }
                const latestItem = latestModel.items?.find((item) => item.quantization === selectedConversation.model.item?.quantization);
                if (latestItem === undefined) {
                    toast.error(`Operational Error: Please use the View menu to reload.`);
                    sccm(undefined);
                    return;
                }

                const itemHasError = (item: DownloadableItem | undefined) =>
                {
                    // find item in wingmanItems and check the status
                    if (item === undefined) return false;
                    const wingmanItem = wingmanItems.find((wi) => wi.alias === item.filePath);
                    if (wingmanItem === undefined) return false;
                    return wingmanItem.status === "error";
                };

                // if (latestItem.hasError) {
                if (itemHasError(latestItem)) {
                    let error = "Unknown model loading error. Please use the View menu to reload.";
                    const wi = wingmanItems?.find((wi) => wi.alias === latestItem.filePath);
                    if (wi !== undefined) {
                        error = wi.error ? wi.error : "Internal processing error. Please restart the application.";
                    }
                    toast.error(
                        `${StripFormatFromModelRepo(latestModel.name)} cannot run. Error: ${error} Please choose another model.`,
                        { duration: 5000 }
                    );
                    sccm(undefined);
                    return;
                }

                if (!latestItem.isDownloaded) {
                    toast.error(
                        `${StripFormatFromModelRepo(latestModel.name)}:${latestItem.quantizationName} is not downloaded. Please download the quantized model to run it.`,
                        { duration: 5000 }
                    );
                    sccm(undefined);
                    return;
                }

                const draftModel = { ...latestModel };
                draftModel.item = latestItem;
                sccm(draftModel);
            } else {
                sccm(selectedConversation.model);
            }
        }
    }, [selectedConversation?.id, selectedConversation?.model, models, wingmanItems, isOnline, inferringAlias, globalModel]);

    useEffect(() =>
    {
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
        serverSideHostAddress &&
            homeDispatch({
                field: "serverSideHostAddress",
                value: serverSideHostAddress,
            });
    }, [
        defaultModelId,
        homeDispatch,
        serverSideApiKeyIsSet,
        serverSidePluginKeysSet,
        serverSideHostAddress,
    ]);

    // ON LOAD --------------------------------------------

    useEffect(() =>
    {
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

        const hostAddress = localStorage.getItem("hostAddress");
        if (serverSideHostAddress) {
            homeDispatch({ field: "hostAddress", value: "" });
            localStorage.removeItem("hostAddress");
        } else if (hostAddress) {
            homeDispatch({ field: "hostAddress", value: hostAddress });
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
        serverSideHostAddress,
    ]);

    useEffect(() =>
    {
        if (!isOnline) return;

        if (globalModel !== undefined) {
            const vendor = Vendors[globalModel.vendor];
            // check if the globalModel is downloadable, e.g., running on the Wingman server
            //  if so, then start the model running on the Wingman server
            if (vendor.isDownloadable) {
                if (globalModel.item !== undefined) {
                    // if the globalModel is not the currentWingmanInferenceItem, then issue a request to start the model
                    if (inferringAlias !== globalModel.item.filePath) {
                        // issue a request to start the model running on the Wingman server
                        //  and wait for the currentWingmanInferenceItem to be set to the globalModel
                        const wi = inferenceActions.requestStartInference(
                            globalModel.item!.filePath, globalModel.id, globalModel.item!.filePath, -1);
                        if (wi === undefined) {
                            toast.error(`Target Acquisition Failed: ${StripFormatFromModelRepo(globalModel.name)}`);
                        }
                    }
                    // toast.success(`Target Acquired: ${StripFormatFromModelRepo(globalModel.name)}`);
                }
            } else {
                if (globalModel.id !== AIModelID.NO_MODEL_SELECTED) {
                    // toast.success(`Target Acquired: ${StripFormatFromModelRepo(globalModel.name)}`);
                }
            }
        }
        homeDispatch({ field: "isSwitchingModel", value: false });
    }, [globalModel]);

    useEffect(() =>
    {
        if (isSwitchingModel) {
            homeDispatch({ field: "loading", value: true });
        } else {
            homeDispatch({ field: "loading", value: false });
        }
    }, [isSwitchingModel]);

    useEffect(() =>
    {
        const isReady = () =>
        {
            if (globalModel && isOnline) {
                if (!Vendors[globalModel.vendor].isDownloadable) {
                    return true;
                } else if (globalModel.id === currentWingmanInferenceItem?.modelRepo) {
                    if (currentWingmanInferenceItem?.status === "inferring") {
                        return true;
                    }
                }
            }
            return false;
        };
        homeDispatch({ field: "isReady", value: isReady() });
    }, [globalModel, currentWingmanInferenceItem, isOnline]);

    return (
        <WingmanContext.Provider
            value={{
                ...wingmanContextValue,
                handleUpdateWingmanStatusMessage
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
                    handleDeleteConversation: () => { },
                    handleChangeModel,
                    handleResetInferenceError,
                    handleRefreshModels,
                }}
            >
                <Head>
                    <title>Wingman</title>
                    <meta name="description" content="The easiest way to launch Llama locally." />
                    <meta
                        name="viewport"
                        content="height=device-height ,width=device-width, initial-scale=1, user-scalable=no"
                    />
                    <link rel="icon" href="/favicon.ico" />
                </Head>
                {/* {isWaiting() && (
                    <div className="fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-95 z-150 flex items-center justify-center fadeIn">
                        <div className="flex flex-col items-center justify-center">
                            <span className="animate-pulse inline-flex h-2 w-2 mx-1 rounded-full bg-orange-400"></span>
                            <p className="text-white text-lg mt-4">
                                {`${t('Working')}...`}
                            </p>
                        </div>
                    </div>
                )} */}
                {selectedConversation && (
                    <main
                        className={`flex flex-col h-screen w-screen ${lightMode}`}
                    >
                        <div className="flex h-full w-full bg-white text-black dark:text-white dark:bg-gray-900">
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

export const getServerSideProps: GetServerSideProps = async ({ locale }) =>
{
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
            serverSideHostAddress: !!process.env.WINGMAN_HOST_ADDRESS,
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
