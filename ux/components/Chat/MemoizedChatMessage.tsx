import { ChatMessage, Props } from "./ChatMessage";
import { FC, memo } from "react";

export const MemoizedChatMessage: FC<Props> = memo(
    ChatMessage,
    (prevProps, nextProps) =>
        prevProps.message.content === nextProps.message.content
);
