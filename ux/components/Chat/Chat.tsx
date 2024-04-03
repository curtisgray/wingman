import { ChatInput } from "./ChatInput";
import { ErrorMessageDiv } from "./ErrorMessageDiv";
import { MemoizedChatMessage } from "./MemoizedChatMessage";
import HomeContext from "@/pages/api/home/home.context";
import WingmanContext from "@/pages/api/home/wingman.context";
import { ChatBody, Conversation, Message } from "@/types/chat";
import { Plugin } from "@/types/plugin";
import { getEndpoint } from "@/utils/app/api";
import
{
    saveConversation,
    saveConversations,
    updateConversation,
} from "@/utils/app/conversation";
import { throttle } from "@/utils/data/throttle";
import { useTranslation } from "next-i18next";
import
{
    MutableRefObject,
    memo,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import toast from "react-hot-toast";
import ChatStatus from "./ChatStatus";
import { SelectModel } from "./SelectModel";
import { AIModel, AIModelID } from "@/types/ai";
import InitialModelListing from "./InitialModelListing";
import { Settings } from "@/types/settings";
import { getSettings, saveSettings } from "@/utils/app/settings";
import { displayLoadingMessage } from "./Util";

export const runtime = 'edge'; // 'nodejs' (default) | 'edge'

interface Props
{
    stopConversationRef: MutableRefObject<boolean>;
}

export const Chat = memo(({ stopConversationRef }: Props) =>
{
    const { t } = useTranslation("chat");

    const {
        state: {
            selectedConversation,
            conversations,
            apiKey,
            pluginKeys,
            serverSideApiKeyIsSet,
            modelError,
            globalModel,
            isMessageStreaming,
            isSwitchingModel,
        },
        handleUpdateConversation,
        dispatch: homeDispatch,
    } = useContext(HomeContext);

    const {
        state: { downloadItems, isOnline, currentWingmanInferenceItem },
    } = useContext(WingmanContext);

    const settings: Settings = getSettings();

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
        ) =>
        {
            if (globalModel?.id === AIModelID.NO_MODEL_SELECTED) {
                toast.error(t("No model selected"));
                return;
            }
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
                homeDispatch({ field: "isMessageStreaming", value: true });
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
                    homeDispatch({ field: "isMessageStreaming", value: false });
                    toast.error(response.statusText);
                    return;
                }
                const data = response.body;
                if (!data) {
                    homeDispatch({ field: "loading", value: false });
                    homeDispatch({ field: "isMessageStreaming", value: false });
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
                                    (message, index) =>
                                    {
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
                        conversations.map((conversation) =>
                        {
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
                    homeDispatch({ field: "isMessageStreaming", value: false });
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
                        conversations.map((conversation) =>
                        {
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
                    homeDispatch({ field: "isMessageStreaming", value: false });
                }
            }
        },
        [apiKey, conversations, homeDispatch, pluginKeys, selectedConversation, stopConversationRef, globalModel, t]
    );

    const scrollToBottom = useCallback(() =>
    {
        if (autoScrollEnabled) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            textareaRef.current?.focus();
        }
    }, [autoScrollEnabled]);

    const handleScroll = () =>
    {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
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

    const handleScrollTop = () =>
    {
        chatContainerRef.current?.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleScrollBottom = () =>
    {
        chatContainerRef.current?.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: "smooth",
        });
    };

    const handleSettings = () =>
    {
        setShowSettings(!showSettings);
        if (!showSettings)
            handleScrollTop();
        else
            handleScrollBottom();
    };

    const onClearAll = () =>
    {
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

    const scrollDown = () =>
    {
        if (autoScrollEnabled) {
            // messagesEndRef.current?.scrollIntoView(true);
            // scrollToBottom();
            // handleScrollBottom();
            messagesEndRef.current?.scrollIntoView({
                behavior: "smooth",
            });
            // textareaRef.current?.focus();
        }
    };
    const throttledScrollDown = throttle(scrollDown, 250);

    useEffect(() =>
    {
        throttledScrollDown();
        selectedConversation &&
            setCurrentMessage(
                selectedConversation.messages[
                selectedConversation.messages.length - 2
                ]
            );
    }, [selectedConversation, autoScrollEnabled]);

    useEffect(() =>
    {
        if (isMessageStreaming || !isOnline) {
            // if the message is streaming ensure the settings are closed
            setShowSettings(false);
        }
    }, [isMessageStreaming, isOnline]);

    useEffect(() =>
    {
        const observer = new IntersectionObserver(
            ([entry]) =>
            {
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
        return () =>
        {
            if (messagesEndElement) {
                observer.unobserve(messagesEndElement);
            }
        };
    }, []);

    const handleOnboardingDownloadStart = () =>
    {
        // handleSwitchingModel(true);
    };

    const handleOnboardingDownloadComplete = () =>
    {
        // handleSwitchingModel(false);
    };

    const isModelInferring = (model: AIModel | undefined) =>
    {
        if (!model || !globalModel || !currentWingmanInferenceItem) return false;
        if (model.id === AIModelID.NO_MODEL_SELECTED) return false;
        if (model.id === globalModel?.id) {
            if (currentWingmanInferenceItem?.status === "inferring") {
                return true;
            }
        }
        return false;
    };


    const hasModelBeenSelected = () =>
    {
        if (selectedConversation?.model) {
            if (selectedConversation.model.id === AIModelID.NO_MODEL_SELECTED) {
                return false;
            }
            return true;
        }
        return false;
    };

    const showOnboarding = () =>
    {
        if (!settings.needsOnboarding) return false;

        const userHasModels = (hasModelBeenSelected() || isModelInferring(selectedConversation?.model));
        if (!userHasModels && !apiKey && !serverSideApiKeyIsSet) return true;

        let savedSettings = getSettings();
        savedSettings.needsOnboarding = false;
        saveSettings(savedSettings);
        settings.needsOnboarding = false;
        return false;
    };

    return (
        <div className="relative flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
            {showOnboarding() ? ( // no models available so display startup ui
                // TODO: Besides api key, we should also check if the user has selected a model
                <div className="mx-auto flex h-full w-[300px] flex-col justify-center space-y-6 sm:w-[600px]">
                    <div className="text-center text-4xl font-bold">
                        Welcome to Wingman
                    </div>
                    <div className="text-center text-lg">
                        <div className="mb-8">{`The easiest way to launch AI locally.`}</div>
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                        <>
                            <div className="mb-2">
                                {t(
                                    "To get started using Wingman, we have pre-selected a small, highly-capable Meta Llama AI that can run on most PC's. Download and activate the Meta compatible AI below. To download, select the 'Download' button. Once the model download is completed, select 'Activate AI' to begin using the model."
                                )}
                            </div>
                            <div className="w-full">
                                <InitialModelListing initialModelId="TheBloke/phi-2-dpo-GGUF" />
                            </div>
                            <div className='mb-4'>
                                {t(
                                    "To activate any available AI, use the search box below."
                                )}
                            </div>
                            <div className="w-full">
                                {!isOnline && (
                                    <div className="mb-2 p-3 rounded w-full text-center text-gray-100 bg-gray-800 dark:text-gray-800 dark:bg-white">
                                        {t("Search not available while offline.")}
                                    </div>
                                )}
                                {isOnline &&
                                    <SelectModel autoDownload={true} miniMode
                                        onDownloadStart={handleOnboardingDownloadStart}
                                        onDownloadComplete={handleOnboardingDownloadComplete} />
                                }
                            </div>
                        </>
                        {!(apiKey && serverSideApiKeyIsSet) && (
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
                    <div className={`h-full overflow-x-hidden flex flex-col space-y-2 dark:bg-gray-800 dark:text-gray-200`}>
                        <ChatStatus onSettings={handleSettings} onClearConversation={onClearAll} showStatus={!showSettings} disabled={isSwitchingModel || isMessageStreaming} />

                        {isSwitchingModel && (
                            <div className={`flex space-x-2 justify-center items-center h-full`}>
                                {displayLoadingMessage()}
                            </div>
                        )}

                        {!isSwitchingModel && (
                            // Add padding here, adjust "px-6" as needed for more or less padding
                                    <div className={`flex flex-col space-y-2 px-6 h-full overflow-y-auto`} ref={chatContainerRef} onScroll={handleScroll}>
                                {selectedConversation?.messages.map(
                                    (message, index) => (
                                        <MemoizedChatMessage
                                            key={index}
                                            message={message}
                                            messageIndex={index}
                                            onEdit={(editedMessage) =>
                                            {
                                                setCurrentMessage(editedMessage);
                                                // discard edited message and the ones that come after then resend
                                                handleSend(
                                                    editedMessage,
                                                    selectedConversation!.messages.length - index
                                                );
                                            }}
                                        />))}
                            </div>
                        )}

                        {/* add a buffer at the bottom of the messages list */}
                        {/* <div ref={messagesEndRef} className="h-[153.333px]" /> */}
                        <div ref={messagesEndRef} className="h-[162px]" />
                    </div>

                    <ChatInput
                        stopConversationRef={stopConversationRef}
                        textareaRef={textareaRef}
                        onSend={(message, plugin) =>
                        {
                            setCurrentMessage(message);
                            handleSend(message, 0, plugin);
                        }}
                        onScrollDownClick={handleScrollBottom}
                        onRegenerate={() =>
                        {
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
