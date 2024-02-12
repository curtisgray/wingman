import Spinner from "../Spinner";
import { ChatInput } from "./ChatInput";
import { ChatLoader } from "./ChatLoader";
import { ErrorMessageDiv } from "./ErrorMessageDiv";
import { MemoizedChatMessage } from "./MemoizedChatMessage";
import HomeContext from "@/pages/api/home/home.context";
import WingmanContext from "@/pages/api/home/wingman.context";
import { ChatBody, Conversation, Message } from "@/types/chat";
import { Plugin } from "@/types/plugin";
import { getEndpoint } from "@/utils/app/api";
import {
    saveConversation,
    saveConversations,
    updateConversation,
} from "@/utils/app/conversation";
import { throttle } from "@/utils/data/throttle";
import { useTranslation } from "next-i18next";
import {
    MutableRefObject,
    memo,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import toast from "react-hot-toast";
import { DownloadProps } from "@/types/download";
import ChatSettings from "./ChatSettings";
import ChatStatus from "./ChatStatus";
import { SelectModel } from "./SelectModel";
import { AIModel, Vendors } from "@/types/ai";
import ModelListing from "./ModelListing";

interface Props {
    stopConversationRef: MutableRefObject<boolean>;
}

export const Chat = memo(({ stopConversationRef }: Props) => {
    const { t } = useTranslation("chat");

    const {
        state: {
            selectedConversation,
            conversations,
            models,
            apiKey,
            pluginKeys,
            serverSideApiKeyIsSet,
            modelError,
            loading,
            prompts,
            globalModel,
            isSwitchingModel,
            messageIsStreaming
        },
        handleUpdateConversation,
        dispatch: homeDispatch,
    } = useContext(HomeContext);

    const {
        state: { downloadItems },
    } = useContext(WingmanContext);

    const [currentMessage, setCurrentMessage] = useState<Message>();
    const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [showScrollDownButton, setShowScrollDownButton] = useState<boolean>(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = useCallback(
        async (
            message: Message,
            deleteCount = 0,
            plugin: Plugin | null = null
        ) => {
            if (selectedConversation && globalModel) {
                let updatedConversation: Conversation;

                // TODO: Use techniques to reduce the context length, such as summarizing the first x messages, reducing them to a single message, etc.
                //       `selectedConversation.messages` is the entire conversation history. We can gather the first x messages and summarize them
                //       into a single message using a summarization model such as ada

                if (deleteCount) {
                    const updatedMessages = [...selectedConversation.messages];
                    for (let i = 0; i < deleteCount; i++) {
                        updatedMessages.pop();
                    }
                    updatedConversation = {
                        ...selectedConversation,
                        messages: [...updatedMessages, message],
                    };
                } else {
                    updatedConversation = {
                        ...selectedConversation,
                        messages: [...selectedConversation.messages, message],
                    };
                }
                homeDispatch({
                    field: "selectedConversation",
                    value: updatedConversation,
                });
                homeDispatch({ field: "loading", value: true });
                homeDispatch({ field: "messageIsStreaming", value: true });
                const chatBody: ChatBody = {
                    model: updatedConversation.model,
                    messages: updatedConversation.messages,
                    key: apiKey,
                    systemPrompt: updatedConversation.systemPrompt,
                    temperature: updatedConversation.temperature,
                    vendor: globalModel.vendor,
                };
                const endpoint = getEndpoint(plugin);
                let body;
                if (!plugin) {
                    body = JSON.stringify(chatBody);
                } else {
                    body = JSON.stringify({
                        ...chatBody,
                        googleAPIKey: pluginKeys
                            .find((key) => key.pluginId === "google-search")
                            ?.requiredKeys.find(
                                (key) => key.key === "GOOGLE_API_KEY"
                            )?.value,
                        googleCSEId: pluginKeys
                            .find((key) => key.pluginId === "google-search")
                            ?.requiredKeys.find(
                                (key) => key.key === "GOOGLE_CSE_ID"
                            )?.value,
                    });
                }
                const controller = new AbortController();
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    signal: controller.signal,
                    body,
                });
                if (!response.ok) {
                    homeDispatch({ field: "loading", value: false });
                    homeDispatch({ field: "messageIsStreaming", value: false });
                    toast.error(response.statusText);
                    return;
                }
                const data = response.body;
                if (!data) {
                    homeDispatch({ field: "loading", value: false });
                    homeDispatch({ field: "messageIsStreaming", value: false });
                    return;
                }
                if (!plugin) {
                    if (updatedConversation.messages.length === 1) {
                        const { content } = message;
                        const customName =
                            content.length > 30
                                ? content.substring(0, 30) + "..."
                                : content;
                        updatedConversation = {
                            ...updatedConversation,
                            name: customName,
                        };
                    }
                    homeDispatch({ field: "loading", value: false });
                    const reader = data.getReader();
                    const decoder = new TextDecoder();
                    let done = false;
                    let isFirst = true;
                    let text = "";
                    while (!done) {
                        if (stopConversationRef.current === true) {
                            controller.abort();
                            done = true;
                            break;
                        }
                        const { value, done: doneReading } =
                            await reader.read();
                        done = doneReading;
                        const chunkValue = decoder.decode(value);
                        text += chunkValue;
                        if (isFirst) {
                            isFirst = false;
                            const updatedMessages: Message[] = [
                                ...updatedConversation.messages,
                                { role: "assistant", content: chunkValue },
                            ];
                            updatedConversation = {
                                ...updatedConversation,
                                messages: updatedMessages,
                            };
                            homeDispatch({
                                field: "selectedConversation",
                                value: updatedConversation,
                            });
                        } else {
                            const updatedMessages: Message[] =
                                updatedConversation.messages.map(
                                (message, index) => {
                                        if (
                                            index ===
                                            updatedConversation.messages
                                                .length -
                                                1
                                        ) {
                                        return {
                                            ...message,
                                            content: text,
                                        };
                                    }
                                    return message;
                                }
                            );
                            updatedConversation = {
                                ...updatedConversation,
                                messages: updatedMessages,
                            };
                            homeDispatch({
                                field: "selectedConversation",
                                value: updatedConversation,
                            });
                        }
                    }
                    saveConversation(updatedConversation);
                    const updatedConversations: Conversation[] =
                        conversations.map((conversation) => {
                        if (conversation.id === selectedConversation.id) {
                            return updatedConversation;
                        }
                        return conversation;
                    });
                    if (updatedConversations.length === 0) {
                        updatedConversations.push(updatedConversation);
                    }
                    homeDispatch({
                        field: "conversations",
                        value: updatedConversations,
                    });
                    saveConversations(updatedConversations);
                    homeDispatch({ field: "messageIsStreaming", value: false });
                } else {
                    const { answer } = await response.json();
                    const updatedMessages: Message[] = [
                        ...updatedConversation.messages,
                        { role: "assistant", content: answer },
                    ];
                    updatedConversation = {
                        ...updatedConversation,
                        messages: updatedMessages,
                    };
                    homeDispatch({
                        field: "selectedConversation",
                        value: updateConversation,
                    });
                    saveConversation(updatedConversation);
                    const updatedConversations: Conversation[] =
                        conversations.map((conversation) => {
                            if (conversation.id === selectedConversation.id) {
                                return updatedConversation;
                            }
                            return conversation;
                        });
                    if (updatedConversations.length === 0) {
                        updatedConversations.push(updatedConversation);
                    }
                    homeDispatch({
                        field: "conversations",
                        value: updatedConversations,
                    });
                    saveConversations(updatedConversations);
                    homeDispatch({ field: "loading", value: false });
                    homeDispatch({ field: "messageIsStreaming", value: false });
                }
            }
        },
        [apiKey, conversations, homeDispatch, pluginKeys, selectedConversation, stopConversationRef, globalModel]
    );

    const scrollToBottom = useCallback(() => {
        if (autoScrollEnabled) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            textareaRef.current?.focus();
        }
    }, [autoScrollEnabled]);

    const handleScroll = () => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } =
                chatContainerRef.current;
            const bottomTolerance = 30;

            if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
                setAutoScrollEnabled(false);
                setShowScrollDownButton(true);
            } else {
                setAutoScrollEnabled(true);
                setShowScrollDownButton(false);
            }
        }
    };

    const handleScrollTop = () => {
        chatContainerRef.current?.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleScrollBottom = () => {
        chatContainerRef.current?.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: "smooth",
        });
    };

    const handleSettings = () => {
        setShowSettings(!showSettings);
        if (!showSettings)
            handleScrollTop();
        else
            handleScrollBottom();
    };

    const handleChangeSystemPrompt = (prompt: string) => {
        if (selectedConversation) {
            handleUpdateConversation(selectedConversation, {
                key: "systemPrompt",
                value: prompt,
            });
        }
    };
    
    const handleChangeTemperature = (temperature: number) => {
        if (selectedConversation) {
            handleUpdateConversation(
                selectedConversation,
                {
                    key: "temperature",
                    value: temperature,
                }
            );
        }
    };

    const onClearAll = () => {
        if (
            confirm(
                t<string>("Are you sure you want to clear all messages?")
            ) &&
            selectedConversation
        ) {
            handleUpdateConversation(selectedConversation, {
                key: "messages",
                value: [],
            });
        }
    };

    const scrollDown = () => {
        if (autoScrollEnabled) {
            messagesEndRef.current?.scrollIntoView(true);
        }
    };
    const throttledScrollDown = throttle(scrollDown, 250);

    useEffect(() => {
        throttledScrollDown();
        selectedConversation &&
            setCurrentMessage(
                selectedConversation.messages[
                    selectedConversation.messages.length - 2
                ]
            );
    }, [selectedConversation, throttledScrollDown]);

    useEffect(() => {
        if (messageIsStreaming) {
            // if the message is streaming ensure the settings are closed
            setShowSettings(false);
        }
    }, [messageIsStreaming]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setAutoScrollEnabled(entry.isIntersecting);
                if (entry.isIntersecting) {
                    textareaRef.current?.focus();
                }
            },
            {
                root: null,
                threshold: 0.5,
            }
        );
        const messagesEndElement = messagesEndRef.current;
        if (messagesEndElement) {
            observer.observe(messagesEndElement);
        }
        return () => {
            if (messagesEndElement) {
                observer.unobserve(messagesEndElement);
            }
        };
    }, []);

    const handleValidateChangeModel = (model: DownloadProps): boolean => {
        return true;
    };

    const handleSwitchingModel = (isSwitching: boolean) => {
        // homeDispatch({ field: "isSwitchingModel", value: isSwitching });
    };

    const handleOnboardingDownloadStart = (model: DownloadProps) => {
        // handleSwitchingModel(true);
    };

    const handleOnboardingDownloadComplete = (model: DownloadProps) => {
        // handleSwitchingModel(false);
    };

    const isModelAvailableToUse = (model: AIModel | undefined) => {
        if (model === undefined) {
            return false;
        }
        const vendor = Vendors[model.vendor];
        if (vendor.isDownloadable) {
            if (model.item === undefined) {
                return false;
            }
            // search for model in the models list and check if the model has an item with the same filePath as the model.item.filePath
            //  and check if there are no errors in the model.item
            const m = models?.find(m => m.id === model.id);
            if (m === undefined) {
                return false;
            }
            const item = m.items?.find((item) => item.quantization === model.item?.quantization);
            if (item === undefined) {
                return false;
            }
            if (item.hasError) {
                return false;
            }
        }
        return true;
    };

    const hasDownloadItems = () => {
        const completedItems = downloadItems?.filter((item) => item.status === "complete");
        if (completedItems && completedItems.length > 0) {
            // // if there is only one download and the system is switching models, we can assume the
            // //   the downloaded model is the one being switched to, so we will wait for the switch
            // if (completedItems.length === 1)
            //     if (isSwitchingModel)
            //         return false;
            return true;
        }
        return false;
    };

    const hasModelBeenSelected = () => {
        const modelSelected = selectedConversation?.model !== undefined && selectedConversation?.model?.name !== "OFFLINE";
        return modelSelected && isModelAvailableToUse(selectedConversation?.model);
    };

    return (
        <div className="relative flex-1 overflow-hidden bg-white dark:bg-[#343541]">
            {!(apiKey || serverSideApiKeyIsSet || (hasDownloadItems() && hasModelBeenSelected())) ? ( // no models available so display startup ui
                // TODO: Besides api key, we should also check if the user has selected a model
                <div className="mx-auto flex h-full w-[300px] flex-col justify-center space-y-6 sm:w-[600px]">
                    <div className="text-center text-4xl font-bold text-black dark:text-white">
                        Welcome to Wingman
                    </div>
                    <div className="text-center text-lg text-black dark:text-white">
                        <div className="mb-8">{`Wingman is an open source chat UI.`}</div>
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                        {!(hasDownloadItems() && hasModelBeenSelected()) && (
                            <>
                                <div className="mb-2">
                                    {t(
                                        "There appears to be no downloaded models available. Please download a Meta compatible AI model from a list below to get started. You can choose from Recently created models, Popular models by download, or recently Trending models. Just select a model and click the download button to get started."
                                    )}
                                </div>
                                <div className="w-full text-gray-800 dark:text-gray-100 ">
                                    <ModelListing />
                                </div>
                                <div className='mb-4'>
                                    {t(
                                        "To engage any one available Llama AI models, search for and select a model from the search box below. The model will be downloaded and launched. Once the model is ready, you can begin using it."
                                    )}
                                </div>
                                <div className="w-full text-gray-800 dark:text-gray-100 ">
                                    <SelectModel autoDownload={true} miniMode
                                        onDownloadStart={handleOnboardingDownloadStart}
                                        onDownloadComplete={handleOnboardingDownloadComplete}
                                        />
                                </div>
                            </>
                        )}
                        {!(apiKey || serverSideApiKeyIsSet) && (
                            <>
                                <hr className="my-2 mb-6 mt-6" />
                                <div className="mb-2">
                                    {t(
                                        "To use OpenAI's chat models, please set your OpenAI API key in the bottom left of the sidebar."
                                    )}
                                </div>
                                <div>
                                    {t(
                                        "If you don't have an OpenAI API key, you can get one here: "
                                    )}
                                    <a
                                        href="https://platform.openai.com/account/api-keys"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-500 hover:underline"
                                    >
                                        openai.com
                                    </a>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : modelError ? (
                <ErrorMessageDiv error={modelError} />
            ) : (   // models available so display chat
                <>
                    <div className="max-h-full overflow-x-hidden" ref={chatContainerRef} onScroll={handleScroll}>
                        {/*selectedConversation?.messages.length === 0 ? ( // no messages so display startup settings
                            <>
                                <div className="mx-auto flex flex-col space-y-5 md:space-y-10 px-3 pt-5 md:pt-12 sm:max-w-[600px]">
                                    <div className="text-center text-3xl font-semibold text-gray-800 dark:text-gray-100">
                                        {models.length === 0 ? (
                                            <div>
                                                <Spinner
                                                    size="16px"
                                                    className="mx-auto"
                                                />
                                            </div>
                                        ) : (
                                            "Wingman"
                                        )}
                                    </div>

                                    {models.length > 0 && (
                                        <ChatSettings models={models} conversation={selectedConversation} prompts={prompts}
                                            onChangeSystemPrompt={handleChangeSystemPrompt} onChangeTemperature={handleChangeTemperature} />
                                    )}
                                </div>
                            </>
                        ) : */(   // messages exist so display chat
                            <>
                                <ChatStatus onSettings={handleSettings} onClearConversation={onClearAll} showStatus={!showSettings} />
                                {showSettings && (
                                    <ChatSettings models={models} conversation={selectedConversation!} prompts={prompts} onChangeSystemPrompt={handleChangeSystemPrompt} onChangeTemperature={handleChangeTemperature} />
                                )}

                                {selectedConversation?.messages.map(
                                    (message, index) => (
                                        <MemoizedChatMessage
                                            key={index}
                                            message={message}
                                            messageIndex={index}
                                            onEdit={(editedMessage) => {
                                                setCurrentMessage(
                                                    editedMessage
                                                );
                                                // discard edited message and the ones that come after then resend
                                                handleSend(
                                                    editedMessage,
                                                    selectedConversation
                                                        ?.messages.length -
                                                        index
                                                );
                                            }}
                                        />
                                    )
                                )}

                                {loading && <ChatLoader />}

                                <div
                                    className="h-[162px] bg-white dark:bg-[#343541]"
                                    ref={messagesEndRef}
                                />
                            </>
                        )}
                    </div>

                    <ChatInput
                        stopConversationRef={stopConversationRef}
                        textareaRef={textareaRef}
                        onSend={(message, plugin) => {
                            setCurrentMessage(message);
                            handleSend(message, 0, plugin);
                        }}
                        onScrollDownClick={handleScrollBottom}
                        onRegenerate={() => {
                            if (currentMessage) {
                                handleSend(currentMessage, 2, null);
                            }
                        }}
                        showScrollDownButton={showScrollDownButton}
                    />
                </>
            )}
        </div>
    );
});
Chat.displayName = "Chat";
