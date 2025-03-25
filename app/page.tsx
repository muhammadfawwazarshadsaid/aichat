"use client";

import * as React from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { sendContinueMessage, startNewChatWithMessage } from "@/lib/supabaseClient";
import { ChatContainer, ChatForm } from "@/components/ui/chat";
import { InterruptPrompt } from "@/components/ui/interrupt-prompt";
import { MessageInput } from "@/components/ui/message-input";
import OpenAI from "openai";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "submitted" | "streaming">("idle");
  const [isTyping, setIsTyping] = React.useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = React.useState(false);

  const starterChats = [
    { title: "Tanya menu buka yang enak", prompt: "Bang kasih gw rekomendasi menu bukber dong." },
    { title: "Curhat dong", prompt: "Gw lagi sedih nih bang" },
    { title: "Cara jadi kaya", prompt: "Tips kaya tanpa ngepet" },
    { title: "Ide jalan-jalan", prompt: "Enaknya jalan-jalan ke mana yak" },
  ];

  React.useEffect(() => {
    const token = Cookies.get("auth_token");
    const userId = Cookies.get("user_id");

    if (!token || !userId) {
      window.location.href = "/login";
      return;
    }

    setTimeout(() => setLoading(false), 500);
  }, []);

  const fetchChatCompletion = async (userMessage: string) => {
    try {
      const messageHistory: OpenAI.ChatCompletionMessageParam[] = [
        { role: "user", content: userMessage },
      ];

      const response = await fetch("/api/chat-completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: messageHistory }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch chat completion");
      }

      console.log("API response data:", data);
      return data.response || "No response received";
    } catch (err) {
      console.error("Error fetching chat completion:", err);
      throw err;
    }
  };

  const startNewChat = async (prompt: string) => {
    const token = Cookies.get("auth_token");
    const userId = Cookies.get("user_id");

    if (!token || !userId) {
      setError("User not authenticated");
      return;
    }

    try {
      setLoading(true);
      setIsTransitioning(true);
      setStatus("submitted");
      setIsWaitingForResponse(true);

      console.log("Starting new chat with userId:", userId, "and prompt:", prompt);

      const newChat = await startNewChatWithMessage(userId, prompt, "chat baru", token);
      const chatId = newChat.id;
      console.log("New chat created with chatId:", chatId);

      setStatus("streaming");
      const aiResponse = await fetchChatCompletion(prompt);
      console.log("Received AI response:", aiResponse);
      if (!aiResponse) throw new Error("No response from AI");

      await sendContinueMessage(chatId, aiResponse, "assistant", token);
      console.log("AI message sent to Supabase:", { chatId, message: aiResponse, role: "assistant" });

      router.prefetch(`/${chatId}`);
      setTimeout(() => {
        router.push(`/${chatId}`);
        setIsTransitioning(false);
        setInput("");
        setStatus("idle");
        setIsWaitingForResponse(false);
      }, 300);
    } catch (err) {
      console.error("Error starting chat:", err);
      setError(`Failed to start chat: ${err instanceof Error ? err.message : String(err)}`);
      setIsTransitioning(false);
      setStatus("idle");
      setIsWaitingForResponse(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStarterClick = (prompt: string) => {
    startNewChat(prompt);
  };

  const handleSubmit = async (event?: { preventDefault?: () => void }) => {
    if (event?.preventDefault) event.preventDefault();
    if (!input.trim()) return;
    startNewChat(input);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 500);
  };

  const stop = () => {
    setStatus("idle");
    setIsWaitingForResponse(false);
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
                  <BreadcrumbPage className="line-clamp-1">Selamat Datang!</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <ChatContainer className="h-full flex flex-col justify-between mx-auto w-full max-w-3xl rounded-xl transition-opacity duration-300 ease-in-out">
            <div>
              <h1 className="text-2xl font-bold mb-4">Mulai Chat Baru</h1>
              <p className="text-muted-foreground mb-6">
                Kagak tau mau ngechat apa? Coba ini dah!
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {starterChats.map((chat, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className={`text-left h-auto py-4 px-4 flex flex-col items-start transition-opacity duration-200 ${
                      isTransitioning ? "opacity-50" : "opacity-100"
                    }`}
                    onClick={() => handleStarterClick(chat.prompt)}
                    disabled={loading || isTransitioning}
                  >
                    <span className="font-semibold">{chat.title}</span>
                    <span className="text-sm text-muted-foreground">{chat.prompt}</span>
                  </Button>
                ))}
              </div>

              {/* Indikator Loading dengan gaya bubble chat assistant */}
              {isWaitingForResponse && status === "streaming" && (
                <div className="mt-4 flex justify-start">
                  <div className="rounded-lg p-3 max-w-md flex items-center gap-2 text-muted-foreground">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="inline-block animate-bounce">.</span>
                    <span className="inline-block animate-bounce delay-100">.</span>
                    <span className="inline-block animate-bounce delay-200">.</span>
                  </div>
                </div>
              )}
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