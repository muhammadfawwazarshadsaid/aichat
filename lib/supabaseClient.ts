import Cookies from "js-cookie";

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

      token = loginData.access_token;
    }

    // 3️⃣ Simpan token ke cookies
    Cookies.set("auth_token", token, { expires: 7 });

    // 4️⃣ Simpan username & full_name ke tabel `profiles`
    const profileRes = await fetch(`${API_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: getHeaders(token, true),
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
    const res = await fetch(`${API_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: getHeaders(undefined, false),
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok && data.access_token) {
        Cookies.set("auth_token", data.access_token, { expires: 7 }); // Simpan token di cookies selama 7 hari
    }

    return data;
};

// 3️⃣ Start New Chat
export const startNewChat = async (userId: string, token?: string) => {
    const res = await fetch(`${API_URL}/rest/v1/obrolan`, {
        method: "POST",
        headers: getHeaders(token, true), // Butuh token user
        body: JSON.stringify({ user_id: userId })
    });
    return res.json();
};

// 4️⃣ Get Chats by User
export const getChatsByUser = async (userId: string, token?: string) => {
    const res = await fetch(`${API_URL}/rest/v1/obrolan?user_id=eq.${userId}`, {
        headers: getHeaders(token, true) // Butuh token user
    });
    return res.json();
};

// 5️⃣ Send Message
export const sendMessage = async (userId: string, message: string, role: string = "user", token?: string) => {
    const res = await fetch(`${API_URL}/rpc/send_message`, {
        method: "POST",
        headers: getHeaders(token, true), // Butuh token user
        body: JSON.stringify({ user_id: userId, message, role })
    });
    return res.json();
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
  window.location.href = "/login"; // Redirect ke login
}

// 8️⃣ Get User Profile
export const getUserProfile = async (userId: string, token: string) => {
    const res = await fetch(`${API_URL}/rest/v1/profiles?id=eq.${userId}`, {
        headers: getHeaders(token, true),
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
