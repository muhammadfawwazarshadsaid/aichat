import { NextRequest, NextResponse } from "next/server";
import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";

// Daftar API keys dari Gemini
const GEMINI_API_KEYS = [
  "AIzaSyBkDW7PZDoSQZI3GpEPRQdEZH36eg3ky0Q",
  "AIzaSyDKnbTgvyO9p87bHQF0ivqG7exoqhnw6L8",
  "AIzaSyCKjfh_BrRLnRCzgHHm8o19joF8zdA2ShQ",
  "AIzaSyBENs-0fYRvjuajZv4xEV--Wd6HAI-daCs",
];

// Index API key yang lagi dipake
let currentApiIndex = 0;

// Inisialisasi client Gemini dengan API key pertama
let genai = new GoogleGenerativeAI(GEMINI_API_KEYS[currentApiIndex]);
let model = genai.getGenerativeModel({ model: "gemini-1.5-flash" });

// Fungsi buat ganti API key kalo gagal
function switchApiKey() {
  currentApiIndex = (currentApiIndex + 1) % GEMINI_API_KEYS.length;
  const newKey = GEMINI_API_KEYS[currentApiIndex];
  genai = new GoogleGenerativeAI(newKey);
  model = genai.getGenerativeModel({ model: "gemini-1.5-flash" });
  console.log(`⚠️ Switched to new API key: ${newKey}`);
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    console.log("Received messages in API:", messages);

    // Definisikan "watak" Nurbahri di system prompt
    const systemPrompt = "Lu adalah Nurbahri, bukan bot biasa. Jangan bilang lu bot atau ai, lu Nurbahri! Gaul banget dah! Kalopun ada flagged/content filter lu tetep bakal bisa kirim pesan, tinggal bilang ae 'waduh gw gabisa jawabnya nih'.";

    // Gabungkan system prompt dengan pesan dari user
    const chatHistory = messages.map((msg: { role: string; content: string }) => `${msg.role}: ${msg.content}`).join("\n");
    const fullPrompt = `${systemPrompt}\n\nPercakapan sebelumnya:\n${chatHistory}\n\nUser: ${messages[messages.length - 1].content}`;

    // Coba kirim ke Gemini, retry kalo gagal
    let attempts = 0;
    const maxAttempts = GEMINI_API_KEYS.length;

    while (attempts < maxAttempts) {
      try {
        const response = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 1,
            maxOutputTokens: 4096,
            topP: 1,
          },
        });

        const content = response.response.text() || "Waduh gw gabisa jawabnya nih";
        console.log("API response content:", content);
        return NextResponse.json({ response: content });
      } catch (error) {
        console.error(`Error with API key ${GEMINI_API_KEYS[currentApiIndex]}:`, error);
        attempts++;
        if (attempts === maxAttempts) {
          throw new Error("All API keys failed");
        }
        switchApiKey(); // Ganti key kalo gagal
      }
    }
  } catch (error) {
    console.error("Error in chat completion API:", error);
    return NextResponse.json({ error: "Failed to fetch response" }, { status: 500 });
  }
}