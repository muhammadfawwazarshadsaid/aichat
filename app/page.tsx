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

  const starterChats = [
    { title: "Ask about the weather", prompt: "What's the weather like today?" },
    { title: "Get coding help", prompt: "Can you help me debug my React code?" },
    { title: "Explore AI topics", prompt: "What are the latest advancements in AI?" },
    { title: "Plan a trip", prompt: "Help me plan a weekend getaway." },
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

  // Fetch AI response from server-side API
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

  // Handle starting a new chat (starter or custom input)
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

      console.log("Starting new chat with userId:", userId, "and prompt:", prompt);

      // Create chat with user message
      const newChat = await startNewChatWithMessage(userId, prompt, "chat baru", token);
      const chatId = newChat.id;
      console.log("New chat created with chatId:", chatId);

      // Fetch AI response
      setStatus("streaming");
      const aiResponse = await fetchChatCompletion(prompt);
      console.log("Received AI response:", aiResponse);
      if (!aiResponse) throw new Error("No response from AI");

      // Send AI response to Supabase
      await sendContinueMessage(chatId, aiResponse, "assistant", token);
      console.log("AI message sent to Supabase:", { chatId, message: aiResponse, role: "assistant" });

      // Redirect to chat page
      router.prefetch(`/${chatId}`);
      setTimeout(() => {
        router.push(`/${chatId}`);
        setIsTransitioning(false);
        setInput(""); // Clear input after submission
        setStatus("idle");
      }, 300);
    } catch (err) {
      console.error("Error starting chat:", err);
      setError(`Failed to start chat: ${err instanceof Error ? err.message : String(err)}`);
      setIsTransitioning(false);
      setStatus("idle");
    } finally {
      setLoading(false);
    }
  };

  // Handle starter prompt click
  const handleStarterClick = (prompt: string) => {
    startNewChat(prompt);
  };

  // Handle custom input submission
  const handleSubmit = async (event?: { preventDefault?: () => void }) => {
    if (event?.preventDefault) event.preventDefault();
    if (!input.trim()) return;
    startNewChat(input);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 500);
  };

  // Stop function
  const stop = () => {
    setStatus("idle");
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
                  <BreadcrumbPage className="line-clamp-1">Welcome</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <ChatContainer className="h-full flex flex-col justify-between mx-auto w-full max-w-3xl rounded-xl transition-opacity duration-300 ease-in-out">
            <div>
              <h1 className="text-2xl font-bold mb-4">Start a New Chat</h1>
              <p className="text-muted-foreground mb-6">
                Not sure where to begin? Try one of these starter prompts or type your own below!
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