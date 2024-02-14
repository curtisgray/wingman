// import { Prompt } from "@/types/prompt";
// import { useTranslation } from "next-i18next";
// import { FC, KeyboardEvent, useContext, useEffect, useRef, useState } from "react";
// import ChatSettings from "./ChatSettings";
// import HomeContext from "@/pages/api/home/home.context";

// interface Props {
//     prompts: Prompt[];
//     onClose: () => void;
//     onUpdateConversationSettings: (prompt: Prompt) => void;
// }

// export const ChatSettingsModal: FC<Props> = ({ prompts, onClose, onUpdateConversationSettings }) => {
//     const { t } = useTranslation("promptbar");

//     const modalRef = useRef<HTMLDivElement>(null);
//     const nameInputRef = useRef<HTMLInputElement>(null);

//     const {
//         state: { models, globalModel, defaultModelId, selectedConversation },
//         handleChangeModel,
//         handleRefreshModels: globalHandleRefreshModels,
//     } = useContext(HomeContext);

//     const handleEnter = (e: KeyboardEvent<HTMLDivElement>) => {
//         if (e.key === "Enter" && !e.shiftKey) {
//             onUpdateConversationSettings({
//                 ...prompt,
//                 name,
//                 description,
//                 content: content.trim(),
//             });
//             onClose();
//         }
//     };

//     useEffect(() => {
//         const handleMouseDown = (e: MouseEvent) => {
//             if (
//                 modalRef.current &&
//                 !modalRef.current.contains(e.target as Node)
//             ) {
//                 window.addEventListener("mouseup", handleMouseUp);
//             }
//         };

//         const handleMouseUp = (e: MouseEvent) => {
//             window.removeEventListener("mouseup", handleMouseUp);
//             onClose();
//         };

//         window.addEventListener("mousedown", handleMouseDown);

//         return () => {
//             window.removeEventListener("mousedown", handleMouseDown);
//         };
//     }, [onClose]);

//     useEffect(() => {
//         nameInputRef.current?.focus();
//     }, []);

//     return (
//         <div
//             className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
//             onKeyDown={handleEnter}
//         >
//             <div className="fixed inset-0 z-10 overflow-hidden">
//                 <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
//                     <div
//                         className="hidden sm:inline-block sm:h-screen sm:align-middle"
//                         aria-hidden="true"
//                     />

//                     <div
//                         ref={modalRef}
//                         className="dark:border-netural-400 inline-block max-h-[400px] transform overflow-y-auto rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-[#202123] sm:my-8 sm:max-h-[600px] sm:w-full sm:max-w-lg sm:p-6 sm:align-middle"
//                         role="dialog"
//                     >
//                         <ChatSettings models={models} conversation={selectedConversation!} prompts={prompts} onChangeSystemPrompt={handleChangeSystemPrompt} onChangeTemperature={handleChangeTemperature} />

//                         {/* <button
//                             type="button"
//                             className="w-full px-4 py-2 mt-6 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
//                             onClick={() => {
//                                 const updatedPrompt = {
//                                     ...prompt,
//                                     name,
//                                     description,
//                                     content: content.trim(),
//                                 };

//                                 onUpdateConversationSettings(updatedPrompt);
//                                 onClose();
//                             }}
//                         >
//                             {t("Save")}
//                         </button> */}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };
export {};