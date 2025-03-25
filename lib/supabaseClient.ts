import Cookies from "js-cookie";
import { v4 as uuidv4 } from "uuid";

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;


if (!API_URL || !API_KEY) {
  throw new Error("Missing Supabase environment variables");
}

// 🔥 Helper buat bikin headers sesuai kondisi
const getStoredToken = () => localStorage.getItem("auth_token") || null;

const getHeaders = (token?: string, requireAuth: boolean = true): HeadersInit => {
  const authToken = token || getStoredToken();

  if (requireAuth && !authToken) throw new Error("User not authenticated");

  return {
    "apikey": API_KEY!,
    "Authorization": authToken ? `Bearer ${authToken}` : `Bearer ${API_KEY}`, // Cegah undefined token
    "Content-Type": "application/json"
  };
};


// 1️⃣ Register User
export const registerUser = async (email: string, password: string, username: string, fullName: string) => {
  try {
    // 1️⃣ Register dengan Supabase Auth
    const authRes = await fetch(`${API_URL}/auth/v1/signup`, {
      method: "POST",
      headers: getHeaders(undefined, false),
      body: JSON.stringify({ email, password, options: { data: { username, full_name: fullName } } })
    });

    const authData = await authRes.json();
    if (!authRes.ok) throw new Error(authData.error?.message || "Gagal register");

    console.log("Auth Response Data:", authData);

    const userId = authData.user?.id;
    let token = authData.session?.access_token;

    // 2️⃣ Jika token tidak ada, lakukan login manual
    if (!token) {
      console.warn("Token kosong, mencoba login ulang...");

      const loginRes = await fetch(`${API_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: getHeaders(undefined, false),
        body: JSON.stringify({ email, password })
      });

      const loginData = await loginRes.json();
      console.log("Login Data:", loginData);

      if (!loginRes.ok || !loginData.access_token) {
        throw new Error("Gagal login setelah register");
      }
      // 3️⃣ Simpan token ke cookies
      Cookies.set("auth_token", loginData.access_token, { expires: 7 });
      Cookies.set("user_id", loginData.user.id, { expires: 7 });
    }
    // 4️⃣ Simpan username & full_name ke tabel `profiles`
    const profileRes = await fetch(`${API_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: getHeaders(token, false),
      body: JSON.stringify({ id: userId, email, username, full_name: fullName })
    });

    if (!profileRes.ok) {
      throw new Error("Gagal menyimpan profil user");
    }

    return { authData };

  } catch (error) {
    console.error("Error saat register:", error);
    throw error;
  }

};

// 2️⃣ Login User (Dapatkan token JWT)
export const loginUser = async (email: string, password: string) => {
    // 1️⃣ Request login untuk mendapatkan token
    const res = await fetch(`${API_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: getHeaders(undefined, false),
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok || !data.access_token) {
      throw new Error(data.error?.message || "Gagal login");
    }
    // 2️⃣ Simpan token di cookies
    Cookies.set("auth_token", data.access_token, { expires: 7 });
    Cookies.set("user_id", data.user.id, { expires: 7 });

    // 3️⃣ Ambil profil user setelah login sukses
    const userProfile = await getUserProfile(data.user?.id, data.access_token);

    // 4️⃣ Return data lengkap (auth data + profil)
    return { authData: data, userProfile };
};

// 3️⃣ Start New Chat
export const startNewChatWithMessage = async (
  userId: string,
  message: string,
  alias: string = "chat baru", // Default sebagai fallback
  token?: string
) => {
  try {
    const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chatId = uuidv4(); // Generate chat_id client-side since no return

    // Generate alias dari AI berdasarkan pesan pertama
    const recommendedAlias = await generateChatTitle(message, token);

    // Step 1: Create new chat dengan alias dari AI
    const chatRes = await fetch(`${API_URL}/rest/v1/obrolan`, {
      method: "POST",
      headers: getHeaders(token, true),
      body: JSON.stringify({
        id: chatId, // Explicitly set ID
        user_id: userId,
        alias: recommendedAlias, // Gunakan alias dari AI
      }),
    });

    if (!chatRes.ok) {
      const errorData = await chatRes.json();
      throw new Error(errorData.message || "Failed to create chat");
    }

    // Step 2: Send initial message
    const messageRes = await fetch(`${API_URL}/rest/v1/pesan`, {
      method: "POST",
      headers: getHeaders(token, true),
      body: JSON.stringify({
        chat_id: chatId,
        role: "user",
        message,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!messageRes.ok) {
      const errorData = await messageRes.json();
      throw new Error(errorData.message || "Failed to send initial message");
    }

    // Return chatId untuk redirection
    return { id: chatId };
  } catch (error) {
    console.error("Start new chat with message error:", error);
    throw error;
  }
};

// Fungsi untuk menghasilkan judul dari AI
const generateChatTitle = async (message: string, token?: string) => {
  try {
    const response = await fetch("/api/chat-completion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "Buat judul obrolan maksimal 30 karakter dalam bahasa Indonesia berdasarkan pesan ini." },
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate title");
    }

    const data = await response.json();
    let title = data.response || "Obrolan Baru";
    // Pastikan judul tidak lebih dari 30 karakter
    return title.length > 30 ? `${title.substring(0, 27)}...` : title;
  } catch (error) {
    console.error("Error generating chat title:", error);
    return "Obrolan Baru"; // Fallback jika gagal
  }
};

// 4️⃣ Get Chats by User
export const getChatsByUser = async (userId: string, token?: string) => {
    const res = await fetch(`${API_URL}/rest/v1/obrolan?user_id=eq.${userId}`, {
        headers: getHeaders(token, true) // Butuh token user
    });
    return res.json();
};

// 5️⃣ Send Message
export const sendContinueMessage = async (
  chatId: string,
  message: string,
  role: string = "user",
  token?: string
) => {
  try {
    const res = await fetch(`${API_URL}/rest/v1/pesan`, {
      method: "POST",
      headers: getHeaders(token, true),
      body: JSON.stringify({
        chat_id: chatId,
        role,
        message,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to send message");
    }

    // Since there's "no return", we return the input data for optimism
    return { chat_id: chatId, role, message, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error("Send continue message error:", error);
    throw error;
  }
};

// 6️⃣ Get Messages in a Chat
export const getMessages = async (chatId: string, token?: string) => {
    const res = await fetch(`${API_URL}/rest/v1/pesan?chat_id=eq.${chatId}&order=sequence.asc`, {
        headers: getHeaders(token, true) // Butuh token user
    });
    return res.json();
};

// 7️⃣ Logout User
export const logoutUser = () => {
  Cookies.remove("auth_token"); // Hapus token dari cookies
  Cookies.remove("user_id"); // Hapus user_id dari cookies
  window.location.href = "/login"; // Redirect ke login
}

// 8️⃣ Get User Profile
export const getUserProfile = async (userId: string, token: string) => {
    const res = await fetch(`${API_URL}/rest/v1/profiles?id=eq.${userId}`, {
        headers: getHeaders(token, false),
    });

    if (!res.ok) throw new Error("Gagal mengambil profil user");

    const data = await res.json();
    return data[0]; // Ambil data user pertama (karena ID unik)
};

// 9️⃣ Update User Profile
export const updateProfile = async (userId: string, token: string, username?: string, fullName?: string) => {
    const updateData: any = {};
    if (username) updateData.username = username;
    if (fullName) updateData.full_name = fullName;

    const res = await fetch(`${API_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: "PATCH",
        headers: getHeaders(token, true),
        body: JSON.stringify(updateData),
    });

    if (!res.ok) throw new Error("Gagal update profil");

    return res.json();
};

// 1️⃣0️⃣ Get Chat by ID
export const getChatById = async (chatId: string, token: string) => {
    const res = await fetch(`${API_URL}/rest/v1/obrolan?id=eq.${chatId}`, {
        headers: getHeaders(token, true)
    });

    if (!res.ok) throw new Error("Gagal mengambil detail obrolan");

    const data = await res.json();
    return data[0]; // Ambil data obrolan pertama (karena ID unik)
}
// 1️⃣1️⃣ Toggle Chat Pin
export const togglePin = async (chatId: string, pinned: boolean, token?: string) => {
  console.log("Sending PATCH request for chatId:", chatId, "with pinned:", pinned);

  const headers = getHeaders(token, true) as HeadersInit & { Prefer?: string };
  headers["Prefer"] = "return=representation"; // Ensure updated row is returned

  const res = await fetch(`${API_URL}/rest/v1/obrolan?id=eq.${chatId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ pinned }),
  });

  console.log("Response status:", res.status, "statusText:", res.statusText);

  if (!res.ok) {
    const errorData = await res.text();
    console.error("Raw error response:", errorData);
    let parsedError;
    try {
      parsedError = JSON.parse(errorData);
    } catch (e) {
      parsedError = errorData || "No error details returned";
    }
    throw new Error(parsedError.message || "Failed to toggle pin");
  }

  const responseData = await res.json();
  console.log("Response JSON:", responseData);
  return responseData[0]; // Return the first (and only) updated row
};

// 1️⃣2️⃣ Delete Chat
export const deleteChat = async (chatId: string, token?: string) => {
  console.log("Sending DELETE request for chatId:", chatId);

  const headers = getHeaders(token, true) as HeadersInit & { Prefer?: string };
  headers["Prefer"] = "return=representation"; // Optional: return deleted row

  const res = await fetch(`${API_URL}/rest/v1/obrolan?id=eq.${chatId}`, {
    method: "DELETE",
    headers,
  });

  console.log("Response status:", res.status, "statusText:", res.statusText);

  if (!res.ok) {
    const errorData = await res.text();
    console.error("Raw error response:", errorData);
    let parsedError;
    try {
      parsedError = JSON.parse(errorData);
    } catch (e) {
      parsedError = errorData || "No error details returned";
    }
    throw new Error(parsedError.message || "Failed to delete chat");
  }

  const responseData = await res.json();
  console.log("Response JSON:", responseData);
  return responseData; // Returns deleted row(s) or empty array
};