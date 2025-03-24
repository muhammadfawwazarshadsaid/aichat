// app/api/chat-completion/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const token = process.env.GITHUB_TOKEN;

if (!token) {
  throw new Error("GITHUB_TOKEN environment variable is missing or empty");
}

const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: token,
});

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    console.log("Received messages in API:", messages);

    const response = await client.chat.completions.create({
      messages,
      model: "gpt-4o",
      temperature: 1,
      max_tokens: 4096,
      top_p: 1,
    });

    const content = response.choices[0]?.message?.content || "No response received";
    console.log("API response content:", content);
    return NextResponse.json({ response: content });
  } catch (error) {
    console.error("Error in chat completion API:", error);
    return NextResponse.json({ error: "Failed to fetch response" }, { status: 500 });
  }
}