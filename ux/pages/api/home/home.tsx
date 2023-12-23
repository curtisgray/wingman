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
import { useEffect, useRef } from "react";
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
                },
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
        // if the model and global model are the same, do nothing
        if (model && globalModel && model.id === globalModel.id && model.item?.filePath === globalModel.item?.filePath) {
            // BUG: whenever this method is called, globalModel and model are already the same. Suspect
            //  that the globalModel is not being set correctly in the first place. Perhaps the globalModel
            //  is being set to a reference to the model, rather than a copy of the model? Shouldn't matter
            //  since the model being passed should be different from the globalModel
            return;
        }
        if (model && model.item === undefined) {
            throw new Error(`'model' is defined as ${model.id}, but 'model.item' is undefined. Something has gone wrong within the application.`);
        }
        homeDispatch({ field: "globalModel", value: model });

        if (model) {
            if (selectedConversation) {
                handleUpdateConversation(selectedConversation, {
                    key: "model",
                    value: model,
                });
            }
            inferenceActions.requestStartInference(model.item!.filePath, model.id, model.item!.filePath, -1);
        }
    };

    const handleStartGenerating = async (prompt: string, probabilties_to_return: number) => {
    };

    const handleStopGenerating = () => {
    };

    const handleToggleMetrics = () => {
    };

    // EFFECTS  --------------------------------------------

    useEffect(() => {
        if (window.innerWidth < 640) {
            homeDispatch({ field: "showChatbar", value: false });
        }
        // if no globalModel or currentWingmanInferenceItem, then this is the first time the app has loaded
        //   so we need to start the model running
        if (globalModel === undefined && currentWingmanInferenceItem === undefined &&
            selectedConversation && selectedConversation.model && selectedConversation.model.item) {
            const vendor = Vendors[selectedConversation.model!.vendor];
            if (vendor.isDownloadable) {
                // check if inference engine is running
                // a model is selected, so start the model running on the llama server
                inferenceActions.requestStartInference(
                    selectedConversation.model.item!.filePath, selectedConversation.model.id, selectedConversation.model.item!.filePath, -1);
            }
        }

    }, [selectedConversation]);

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
            if (globalModel.item === undefined) {
                // whenever the globalModel changes, the globalModel.item must be, otherwise
                //   something has gone wrong in setting the global model
                //   so throw an error
                throw new Error(`'globalModel' is defined as ${globalModel.id}, but 'globalModel.item' is undefined. Something has gone wrong within the application.`);
            } else {
                if (currentWingmanInferenceItem && currentWingmanInferenceItem.alias === globalModel.item.filePath) {
                    // same model is already running, so do nothing
                    console.log(`globalModel.item.filePath: ${globalModel.item.filePath} is already running`);
                } else {
                    toast.success(`Engaging Target: ${globalModel.name}`);
                    inferenceActions.requestStartInference(
                        globalModel.item!.filePath, globalModel.item!.modelRepo, globalModel.item!.filePath, -1);
                }
            }
        }
    }, [globalModel]);

    useEffect(() => {
        // keep the globalModel in sync with the currentWingmanInferenceItem which is coming
        //   from the wingman websocket
        if (currentWingmanInferenceItem) {
            // if the currentWingmanInferenceItem is the same as the globalModel, then do nothing
            if (globalModel && globalModel.item && globalModel?.item?.filePath === currentWingmanInferenceItem?.filePath) {
                return;
            }
            // find the model that matches the currentWingmanInferenceItem and see if it matches the globalModel
            //   find the model by searching all model items for the one that matches the currentWingmanInferenceItem
            if (models === undefined || models.length === 0) {
                return;
            }
            let model: AIModel | undefined = undefined;
            for (const m of models) {
                if (m.items !== undefined && m.items.length > 0) {
                    const mi = m.items.find((mi: DownloadableItem) => mi.filePath === currentWingmanInferenceItem?.filePath);
                    if (mi !== undefined) {
                        // copy the readonly model into a draft model so that we can set the item
                        const draftModel = { ...m };
                        draftModel.item = mi;
                        model = draftModel;
                        break;
                    }
                }
            }

            if (model) {
                if (globalModel?.id !== model.id) {
                    toast.success(`Target Acquired: ${model.name}`);
                    // if the globalModel is not the same as the model that matches the currentWingmanInferenceItem,
                    //   then we need to change the globalModel to match the currentWingmanInferenceItem
                    // homeDispatch({ field: "globalModel", value: model });
                    handleChangeModel(model);
                }
            } else {
                // if the currentWingmanInferenceItem is defined, but the model that matches the currentWingmanInferenceItem
                //   is not found, then we need to reset the globalModel and notify the user
                // homeDispatch({ field: "globalModel", value: undefined });
                handleChangeModel(undefined);
                toast.error(`Target Lost: ${currentWingmanInferenceItem.alias}`);
            }
        }
    }, [currentWingmanInferenceItem, models]);

    return (
        <WingmanContext.Provider
            value={{
                ...wingmanContextValue,
                handleStartGenerating,
                handleStopGenerating,
                handleToggleMetrics,
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
