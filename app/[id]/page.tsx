"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Cookies from "js-cookie";
import { getChatById, getMessages, sendContinueMessage } from "@/lib/supabaseClient";
import OpenAI from "openai";

// UI Components
import { ChatContainer, ChatForm, ChatMessages } from "@/components/ui/chat";
import { SidebarLeft } from "@/components/sidebar-left";
import { MessageList } from "@/components/ui/message-list";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { InterruptPrompt } from "@/components/ui/interrupt-prompt";
import { MessageInput } from "@/components/ui/message-input";

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp?: string;
}

interface Chat {
  id: string;
  alias: string;
  user_id: string;
  created_at: string;
}

interface SubmitOptions {
  experimental_attachments?: FileList;
}

export default function ChatPage() {
  const { id } = useParams();
  const [messages, setMessages] = React.useState<
    { id: string; chat_id: string; role: string; message: string; timestamp: string; sequence: number }[]
  >([]);
  const [chat, setChat] = React.useState<Chat | null>(null);
  const [input, setInput] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "submitted" | "streaming">("idle");
  const [displayedResponse, setDisplayedResponse] = React.useState("");
  const [fullResponse, setFullResponse] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const token = Cookies.get("auth_token");
    const userId = Cookies.get("user_id");

    if (!token || !userId) {
      window.location.href = "/login";
      return;
    }

    if (id) {
      const fetchData = async () => {
        try {
          const chatData = await getChatById(id as string, token);
          console.log("Fetched chat:", chatData);
          setChat(chatData);

          const messagesData = await getMessages(id as string, token);
          console.log("Fetched messages:", messagesData);
          setMessages(Array.isArray(messagesData) ? messagesData : []);
        } catch (err) {
          console.error("Fetch data error:", err);
          setError(`Failed to load data: ${err instanceof Error ? err.message : String(err)}`);
        }
      };

      fetchData();
    }
  }, [id]);

  React.useEffect(() => {
    if (fullResponse && displayedResponse !== fullResponse) {
      const timer = setTimeout(() => {
        setDisplayedResponse(fullResponse.slice(0, displayedResponse.length + 1));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [fullResponse, displayedResponse]);

  const formattedMessages: Message[] = messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.message,
    timestamp: msg.timestamp,
  }));

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (
    event?: { preventDefault?: () => void },
    options?: SubmitOptions
  ) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }
    if (!input.trim() || !id) return;

    const token = Cookies.get("auth_token");
    const userId = Cookies.get("user_id");

    if (!token || !userId) {
      setError("User not authenticated");
      return;
    }

    setStatus("submitted");

    const optimisticUserMessage = {
      id: Date.now().toString(),
      chat_id: id as string,
      role: "user",
      message: input,
      timestamp: new Date().toISOString(),
      sequence: messages.length + 1,
    };

    try {
      setMessages((prev) => [...prev, optimisticUserMessage]);
      setInput("");

      await sendContinueMessage(id as string, input, "user", token);
      console.log("User message sent to Supabase");

      setStatus("streaming");
      const aiResponse = await fetchChatCompletion(input);
      console.log("Received AI response:", aiResponse);
      if (!aiResponse) throw new Error("No response from AI");

      setFullResponse(aiResponse);
      setDisplayedResponse("");

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        chat_id: id as string,
        role: "assistant", // Adjust to "ai" if Supabase expects it
        message: aiResponse,
        timestamp: new Date().toISOString(),
        sequence: messages.length + 2,
      };
      await sendContinueMessage(id as string, aiResponse, "assistant", token);
      console.log("AI message sent to Supabase:", aiMessage);

      const updatedMessages = await getMessages(id as string, token);
      console.log("Updated messages from Supabase:", updatedMessages);
      setMessages(Array.isArray(updatedMessages) ? updatedMessages : [optimisticUserMessage, aiMessage]);
    } catch (err) {
      console.error("Submit error:", err);
      setError(`Failed to process message: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setStatus("idle");
    }
  };

  const stop = () => {
    setStatus("idle");
  };

  const fetchChatCompletion = async (userMessage: string) => {
    setStatus("streaming");
    const messageHistory: OpenAI.ChatCompletionMessageParam[] = [
      ...messages.map((msg) => ({ role: msg.role as "user" | "assistant", content: msg.message })),
      { role: "user", content: userMessage },
    ];

    try {
      const response = await fetch("/api/chat-completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: messageHistory }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch chat completion");
      }

      const data = await response.json();
      console.log("API response data:", data);
      return data.response || "No response received";
    } catch (err) {
      console.error("Error fetching chat completion:", err);
      throw err;
    }
  };

  if (error) return <div>{error}</div>;

  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex h-14 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1">
                    {chat?.alias || "Chat Name"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <ChatContainer className="h-full flex flex-col justify-between mx-auto w-full max-w-3xl rounded-xl">
            <div className="p-8 flex-1 overflow-auto">
              <ChatMessages messages={formattedMessages}>
                <MessageList
                  messages={[
                    ...formattedMessages,
                    ...(fullResponse && displayedResponse
                      ? [{ id: "ai-typing", role: "assistant", content: displayedResponse }]
                      : []),
                  ]}
                />
              </ChatMessages>
            </div>

            <ChatForm
              className="sticky bottom-0 left-0 w-full max-w-3xl rounded-xl bg-white pb-4 px-4"
              isPending={status === "streaming"}
              handleSubmit={handleSubmit}
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
                    isGenerating={status === "submitted" || status === "streaming"}
                  />
                  <InterruptPrompt isOpen={false} close={() => {}} />
                </>
              )}
            </ChatForm>
          </ChatContainer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}