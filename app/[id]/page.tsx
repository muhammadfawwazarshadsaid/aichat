"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Cookies from "js-cookie";
import { getChatById, getMessages, sendContinueMessage } from "@/lib/supabaseClient";
import OpenAI from "openai";
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
  const [isLoading, setIsLoading] = React.useState(true);
  const [isWaitingForResponse, setIsWaitingForResponse] = React.useState(false);

  React.useEffect(() => {
    const token = Cookies.get("auth_token");
    const userId = Cookies.get("user_id");

    if (!token || !userId) {
      window.location.href = "/login";
      return;
    }

    if (id) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const chatData = await getChatById(id as string, token);
          setChat(chatData);
          const messagesData = await getMessages(id as string, token);
          console.log("Initial messages fetched:", messagesData);
          setMessages(Array.isArray(messagesData) ? messagesData : []);
        } catch (err) {
          setError(`Failed to load data: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [id]);

  React.useEffect(() => {
    if (fullResponse && displayedResponse !== fullResponse) {
      const speed = Math.min(50, 500 / fullResponse.length); // Dynamic speed
      const timer = setTimeout(() => {
        setDisplayedResponse(fullResponse.slice(0, displayedResponse.length + 1));
      }, speed);
      return () => clearTimeout(timer);
    } else if (fullResponse && displayedResponse === fullResponse) {
      // Reset setelah streaming selesai
      setFullResponse("");
    }
  }, [fullResponse, displayedResponse]);

  const formattedMessages: Message[] = messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.message,
    timestamp: msg.timestamp,
  }));

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value);

  const handleSubmit = async (event?: { preventDefault?: () => void }) => {
    if (event?.preventDefault) event.preventDefault();
    if (!input.trim() || !id || status !== "idle") return;

    const token = Cookies.get("auth_token");
    const userId = Cookies.get("user_id");
    if (!token || !userId) {
      setError("User not authenticated");
      return;
    }

    setStatus("submitted");
    setIsWaitingForResponse(true);
    setDisplayedResponse(""); // Reset untuk mencegah pesan lama muncul
    setFullResponse(""); // Reset untuk memastikan respons baru

    try {
      console.log("Sending user message:", input);
      await sendContinueMessage(id as string, input, "user", token);

      const updatedMessagesAfterUser = await getMessages(id as string, token);
      console.log("Messages after user input:", updatedMessagesAfterUser);
      setMessages(Array.isArray(updatedMessagesAfterUser) ? updatedMessagesAfterUser : []);

      setInput("");
      setStatus("streaming");

      const aiResponse = await fetchChatCompletion(input);
      if (!aiResponse) throw new Error("No response from AI");

      console.log("AI response received:", aiResponse);
      setFullResponse(aiResponse);

      await sendContinueMessage(id as string, aiResponse, "assistant", token);
      const updatedMessages = await getMessages(id as string, token);
      console.log("Messages after AI response:", updatedMessages);
      setMessages(Array.isArray(updatedMessages) ? updatedMessages : []);
    } catch (err) {
      setError(`Failed to process message: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsWaitingForResponse(false);
      setStatus("idle");
    }
  };

  const stop = () => {
    setStatus("idle");
    setIsWaitingForResponse(false);
    setFullResponse("");
    setDisplayedResponse("");
  };

  const fetchChatCompletion = async (userMessage: string) => {
    const messageHistory: OpenAI.ChatCompletionMessageParam[] = [
      ...messages.map((msg) => ({ role: msg.role as "user" | "assistant", content: msg.message })),
      { role: "user", content: userMessage },
    ];

    try {
      const response = await fetch("/api/chat-completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messageHistory }),
      });
      const data = await response.json();
      if (!response.ok || !data.response) throw new Error(data.error || "Invalid AI response");
      return data.response;
    } catch (err) {
      console.error("AI fetch error:", err);
      throw err;
    }
  };

  if (isLoading) return <div>Loading chat...</div>;
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
                  <BreadcrumbPage className="line-clamp-1">{chat?.alias || "Obrolan Baru"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <ChatContainer className="h-full flex flex-col justify-between mx-auto w-full max-w-3xl rounded-xl">
            <div className="p-8 flex-1 overflow-auto">
              <ChatMessages messages={formattedMessages}>
                <MessageList messages={formattedMessages} /> {/* Hanya render dari messages */}
                {status === "streaming" && displayedResponse && (
                  <MessageList
                    messages={[{ id: "ai-typing", role: "assistant", content: displayedResponse }]}
                  />
                )}
                {isWaitingForResponse && status !== "idle" && !displayedResponse && (
                  <div className="text-muted-foreground flex items-center justify-start gap-2 mt-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="inline-block animate-bounce">.</span>
                    <span className="inline-block animate-bounce delay-100">.</span>
                    <span className="inline-block animate-bounce delay-200">.</span>
                  </div>
                )}
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
                    isGenerating={status === "submitted"}
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