/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC, useContext, useEffect, useState } from "react";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { MemoizedReactMarkdown } from "../Markdown/MemoizedReactMarkdown";
import { CodeBlock } from "../Markdown/CodeBlock";
import { useRequestUtilsAction } from "@/hooks/useRequestUtilsAction";
import { WingmanLogLevel, WingmanLogItem } from "@/types/wingman";
import WingmanContext from "@/wingman.context";

interface Props
{
    fileName: string;
    text?: string;
}

export const MarkdownView: FC<Props> = ({ fileName, text }) =>
{
    const {
        state: { config },
    } = useContext(WingmanContext);

    const [content, setContent] = useState("");
    const { requestWriteToLog } = useRequestUtilsAction(config);

    const handleRequestWriteToLog = (level: WingmanLogLevel, message: string) =>
    {
        const logMessage: WingmanLogItem = {
            isa: "WingmanLogItem",
            level,
            message,
            timestamp: Date.now(),
        };
        requestWriteToLog(logMessage);
    };

    const handleWriteToLogDebug = (message: string) =>
    {
        handleRequestWriteToLog("debug", message);
    };

    useEffect(() =>
    {
        if (text) {
            setContent(text);
        } else {
            handleWriteToLogDebug(`(MarkdownView) Fetching file: ${fileName}`);
            fetch(fileName)
                .then((res) => res.text())
                .then((text) => setContent(text))
                .catch((err) => handleWriteToLogDebug(`(MarkdownView) Error fetching file: ${err}`));
        }
    }, []);

    return (
        <MemoizedReactMarkdown
            className="prose dark:prose-invert flex-1"
            remarkPlugins={[remarkGfm, remarkMath]}
            components={{
                code({
                    // node,
                    inline,
                    className,
                    children,
                    ...props
                }: any)
                {
                    if (children) {
                        let newChildren = children as string;
                        if (newChildren.length > 0) {
                            if (newChildren?.startsWith("▍")) {
                                return (
                                    <span className="animate-pulse cursor-default mt-1">
                                        ▍
                                    </span>
                                );
                            }
                            newChildren = newChildren.replace("`▍`", "▍");
                            children = newChildren;
                        }
                    }

                    const match = /language-(\w+)/.exec(className || "");

                    return !inline ? (
                        <CodeBlock
                            key={Math.random()}
                            language={
                                (match && match[1]) ||
                                ""
                            }
                            value={String(
                                children
                            ).replace(/\n$/, "")}
                            {...props}
                        />
                    ) : (
                        <code
                            className={className}
                            {...props}
                        >
                            {children}
                        </code>
                    );
                },
                table({ children })
                {
                    return (
                        <table className="border-collapse border border-black px-3 py-1 dark:border-white">
                            {children}
                        </table>
                    );
                },
                th({ children })
                {
                    return (
                        <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
                            {children}
                        </th>
                    );
                },
                td({ children })
                {
                    return (
                        <td className="break-words border border-black px-3 py-1 dark:border-white">
                            {children}
                        </td>
                    );
                },
            }}
>
            {content}
        </MemoizedReactMarkdown>
    );
};