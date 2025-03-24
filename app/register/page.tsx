"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle, Eye, EyeOff, Loader2, XCircle } from "lucide-react";
import { z } from "zod";
import { registerUser } from "@/lib/supabaseClient";
import { ToastAction } from "@radix-ui/react-toast";
import { toast } from "sonner";
import error from "next/error";
const schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 8 karakter")
    .regex(/^(?=.*[A-Z])(?=.*\d).{8,}$/, "Password harus minimal 8 karakter, mengandung 1 huruf kapital, dan 1 angka"),
  username: z.string().min(3, "Username minimal 3 karakter"),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
});

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; username?: string; fullName?: string; apiError?: string }>({});
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = schema.safeParse({ email, password, username, fullName });

    if (!result.success) {
      const newErrors = result.error.format();
      setErrors({
        email: newErrors.email?._errors[0],
        password: newErrors.password?._errors[0],
        username: newErrors.username?._errors[0],
        fullName: newErrors.fullName?._errors[0],
      });
      return;
    }

    const toastId = toast("Memproses pendaftaran...", {
          position: "top-center",
          icon: <Loader2 className="animate-spin" />,
        });

    try {
      const data = await registerUser(email, password, username, fullName);

        Cookies.set("auth_token", data.authData.access_token, { expires: 7 });
        router.push("/"); // Redirect ke home setelah toast muncul sebentar
        setTimeout(() => {
          toast.success("Berhasil daftar!", {
          description: "Selamat datang 👋",
          position: "top-center",
          icon: <CheckCircle className="text-green-500" />,
          // action: {
          //   label: "Try again",
          //   onClick: () => console.log("Trying again..."),
          // },
        })
        }, 2000);
    } catch (error) {
    console.error("Register error:", error);
      if (error instanceof Error) {
        setErrors({ apiError: error.message || "Terjadi kesalahan, coba lagi" });
      } else {
        setErrors({ apiError: "Terjadi kesalahan, coba lagi" });
      }
      toast.dismiss(toastId);
      toast.error("Gagal mendaftar", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        position: "top-center",
        icon: <XCircle className="text-red-500" />,
      });
    }
  };

  const handleNavigate = () => {
    setTimeout(() => router.push("/login"), 10);
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Daftar</CardTitle>
          <CardDescription>Isi data untuk membuat akun</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contoh: arshad@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              {errors.username && <p className="text-red-500 text-sm">{errors.username}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Nama Lengkap"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName}</p>}
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
            </div>
            {errors.apiError && <p className="text-red-500 text-sm">{errors.apiError}</p>}
            <Button type="submit" className="w-full">
              Daftar
            </Button>
            <p className="flex items-center justify-center text-sm">Sudah punya akun? <Button className="font-bold" type="button" variant="link" onClick={handleNavigate}>Masuk</Button></p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
