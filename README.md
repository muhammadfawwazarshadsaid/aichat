# **API Dokumen**
---
## **🔑 Authentication**
Semua request harus pakai `apikey` di header:  
```http
Authorization: Bearer YOUR_API_KEY
apikey: YOUR_API_KEY
Content-Type: application/json
```

> **Base URL:**  
> `https://utvamweozojavcwqyzvc.supabase.co/rest/v1/`

---

## **🧑‍💻 Users**
### **1️⃣ Register User**
**Endpoint:**  
```http
POST /users
```
**Request Body:**
```json
{
  "username": "arshad",
  "password_hash": "hashed_password"
}
```
**Response:**
```json
{
  "id": "uuid",
  "username": "arshad",
  "created_at": "timestamp"
}
```

---

### **2️⃣ Get User by ID**
**Endpoint:**  
```http
GET /users?id=eq.UUID_HERE
```
**Response:**
```json
{
  "id": "uuid",
  "username": "arshad",
  "created_at": "timestamp"
}
```

---

## **💬 Chat Sessions (Obrolan)**
### **3️⃣ Start New Chat**
**Endpoint:**  
```http
POST /obrolan
```
**Request Body:**
```json
{
  "user_id": "uuid"
}
```
**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "created_at": "timestamp"
}
```

---

### **4️⃣ Get Chats by User**
**Endpoint:**  
```http
GET /obrolan?user_id=eq.UUID_HERE
```
**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "created_at": "timestamp"
  }
]
```

---

## **📩 Messages (Pesan)**
### **5️⃣ Send Message (Auto Create Chat if First Message)**
**Endpoint:**  
```http
POST /rpc/send_message
```
**Request Body:**
```json
{
  "user_id": "uuid",
  "message": "Halo!",
  "role": "user"
}
```
**Response:**
```json
{
  "id": "uuid",
  "chat_id": "uuid",
  "role": "user",
  "message": "Halo!",
  "sequence": 1,
  "timestamp": "timestamp"
}
```

🔧 **Stored Procedure (`send_message`)**
Di Supabase, kita bisa buat **RPC function** biar kalau user belum punya chat, dia otomatis buat baru:
```sql
CREATE OR REPLACE FUNCTION send_message(user_id UUID, message TEXT, role TEXT)
RETURNS JSON AS $$
DECLARE chat_id UUID;
DECLARE seq INTEGER;
BEGIN
    -- Cek kalau user udah punya chat, pakai yang terakhir
    SELECT id INTO chat_id FROM obrolan WHERE user_id = send_message.user_id ORDER BY created_at DESC LIMIT 1;
    
    -- Kalau belum ada chat, buat baru
    IF chat_id IS NULL THEN
        INSERT INTO obrolan (id, user_id, created_at)
        VALUES (gen_random_uuid(), send_message.user_id, NOW()) RETURNING id INTO chat_id;
    END IF;

    -- Hitung sequence ID
    SELECT COUNT(*) INTO seq FROM pesan WHERE chat_id = chat_id;

    -- Masukkan pesan
    INSERT INTO pesan (id, chat_id, role, message, sequence, timestamp)
    VALUES (gen_random_uuid(), chat_id, send_message.role, send_message.message, seq + 1, NOW());

    -- Return data pesan
    RETURN json_build_object(
        'id', chat_id,
        'chat_id', chat_id,
        'role', send_message.role,
        'message', send_message.message,
        'sequence', seq + 1,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;
```
---

### **6️⃣ Get Messages in a Chat**
**Endpoint:**  
```http
GET /pesan?chat_id=eq.UUID_HERE&order=sequence.asc
```
**Response:**
```json
[
  {
    "id": "uuid",
    "chat_id": "uuid",
    "role": "user",
    "message": "Halo!",
    "sequence": 1,
    "timestamp": "timestamp"
  },
  {
    "id": "uuid",
    "chat_id": "uuid",
    "role": "ai",
    "message": "Hai juga!",
    "sequence": 2,
    "timestamp": "timestamp"
  }
]
```

---

## **🔥 Authentication (JWT)**
Kalau lo mau **bikin token JWT buat login**, bisa pakai Supabase Auth.

### **7️⃣ Login User (via Supabase Auth)**
**Endpoint:**  
```http
POST /auth/v1/token?grant_type=password
```
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "access_token": "jwt_token",
  "expires_in": 3600,
  "token_type": "bearer",
  "refresh_token": "refresh_token"
}
```

---

### **8️⃣ Protecting Endpoints with JWT**
Supabase bisa **aktifin Row Level Security (RLS)** buat amankan data:  
Misal, hanya user yang punya chat bisa lihat pesannya.
```sql
ALTER TABLE obrolan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can only access their own chats"
ON obrolan FOR SELECT USING (auth.uid() = user_id);
```

