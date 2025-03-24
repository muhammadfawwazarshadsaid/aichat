"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Cookies from "js-cookie";
import { getChatById, getMessages, sendContinueMessage } from "@/lib/supabaseClient";

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
  const [isTyping, setIsTyping] = React.useState(false);
  // const [loading, setLoading] = React.useState(true);
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
          // Fetch chat details
          const chatData = await getChatById(id as string, token);
          console.log("Fetched chat:", chatData);
          setChat(chatData);

          // Fetch messages
          const messagesData = await getMessages(id as string, token);
          console.log("Fetched messages:", messagesData);
          setMessages(Array.isArray(messagesData) ? messagesData : []);

          // setLoading(false);
        } catch (err) {
          console.error("Fetch data error:", err);
          setError(`Failed to load data: ${err instanceof Error ? err.message : String(err)}`);
          // setLoading(false);
        }
      };

      fetchData();
    }
  }, [id]);

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

    const optimisticMessage = {
      id: Date.now().toString(),
      chat_id: id as string,
      role: "user",
      message: input,
      timestamp: new Date().toISOString(),
      sequence: messages.length + 1,
    };

    try {
      setMessages((prev) => [...prev, optimisticMessage]);
      setInput("");

      const response = await sendContinueMessage(id as string, input, "user", token);
      console.log("Message sent successfully:", response);

      const updatedMessages = await getMessages(id as string, token);
      console.log("Updated messages:", updatedMessages);
      setMessages(Array.isArray(updatedMessages) ? updatedMessages : [optimisticMessage]);
    } catch (err) {
      console.error("Submit error:", err);
      setError(`Failed to send message: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setStatus("idle");
    }
  };

  const stop = () => {
    setStatus("idle");
  };

  // if (loading) return <div>Loading...</div>;
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
                <MessageList messages={formattedMessages} />
              </ChatMessages>
            </div>

            <ChatForm
              className="sticky bottom-0 left-0 w-full max-w-3xl rounded-xl bg-white pb-4 px-4"
              isPending={status === "streaming" || isTyping}
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