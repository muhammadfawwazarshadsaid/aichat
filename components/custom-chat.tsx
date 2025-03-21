"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { ChatContainer, ChatForm, ChatMessages } from "@/components/ui/chat";
import { MessageInput } from "@/components/ui/message-input";
import { MessageList } from "@/components/ui/message-list";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { FilePreview } from "@/components/ui/file-preview";
import { InterruptPrompt } from "@/components/ui/interrupt-prompt";
import { TypingIndicator } from "./ui/typing-indicator";

const dummySuggestions = [
    { id: 1, content: "What is the capital of France?" },
    { id: 2, content: "How is the weather today?" },
    { id: 3, content: "Tell me a joke." },
];

const dummyReplies: { [id: string]: { content: string } } = {
    1: { content: "Paris" },
    2: { content: "It's sunny and warm." },
    3: { content: "Why don't scientists trust atoms? Because they make up everything!" },
};

const callFunction = (message: { role: "user"; content: string }) => {
    const userMessage: { role: "user"; content: string } = { role: "user", content: message.content };
    const assistantMessage: { role: "assistant"; content: string } = { role: "assistant", content: dummyReplies[message.content] ? dummyReplies[message.content].content : "I don't have a reply for that." };
    return { userMessage, assistantMessage };
};

function CustomChat() {
    const { messages, input, handleInputChange, append, status, stop } = useChat();
    const [isAssistantTyping, setIsAssistantTyping] = useState(false);
    const [files, setFiles] = useState<File[] | null>(null);

    useCopyToClipboard({
        text: input,
    });

    const isEmpty = messages.length === 0;
    const lastMessage = messages[messages.length - 1];
    const isTyping = isAssistantTyping || (status === "streaming" && !isAssistantTyping);

    const handleSuggestionClick = (suggestion: string) => {
        sendMessage({ role: "user", content: suggestion });
    };

    const sendMessage = (message: { role: "user"; content: string }) => {
        const { userMessage, assistantMessage } = callFunction(message);
        append(userMessage);
        setIsAssistantTyping(true);
        setTimeout(() => {
            append(assistantMessage);
            setIsAssistantTyping(false);
        }, 1000);
    };

    const handleSubmit = (event?: { preventDefault?: () => void }, options?: { experimental_attachments?: FileList }) => {
        event?.preventDefault?.();
        if (input.trim() !== "") {
            sendMessage({ role: "user", content: input });
            setFiles([]); // Clear file list after submission
            console.log("Files after submit:", files);
        }
    };

    console.log("Current files:", files);

    return (
        <ChatContainer className=" h-full flex flex-col justify-between mx-auto w-full max-w-3xl rounded-xl">
            {isEmpty ? (
            <PromptSuggestions
                label="Suggestions"
                append={(message) => handleSuggestionClick(message.content)}
                suggestions={dummySuggestions.map(suggestion => suggestion.content)}
            />
            ) : null}

            {!isEmpty ? (
                <div className="p-8">
                <ChatMessages messages={messages}>
                    <MessageList messages={messages} />
                    </ChatMessages>
                </div>
            ) : null}

            {isTyping && <TypingIndicator />}
            <ChatForm
                className="sticky bottom-0 left-0 w-full max-w-3xl rounded-xl bg-white pb-4"
                isPending={status === "streaming" || isTyping}
                handleSubmit={(event, options) => {
                    handleSubmit(event, options);
                    handleInputChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>); // Clear the input after submit
                }}
            >
                {({ files: formFiles, setFiles: setFormFiles }) => (
                    <>
                        <MessageInput
                            value={input}
                            onChange={handleInputChange}
                            allowAttachments
                            files={formFiles}
                            setFiles={setFormFiles}
                            stop={stop}
                            isGenerating={status === "submitted"}
                        />
                        {/* {formFiles && formFiles.map((file, index) => (
                            <FilePreview key={index} file={file} />
                        ))} */}
                        <InterruptPrompt isOpen={false} close={() => { }} />
                    </>
                )}
            </ChatForm>
        </ChatContainer>
    );
}

export default CustomChat;
