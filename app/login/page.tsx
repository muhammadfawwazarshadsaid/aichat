"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { loginUser } from "@/lib/supabaseClient";

const schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; apiError?: string }>({});
  const router = useRouter(); // Untuk redirect setelah login sukses

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = schema.safeParse({ email, password });

    if (!result.success) {
      const newErrors = result.error.format();
      setErrors({
        email: newErrors.email?._errors[0],
        password: newErrors.password?._errors[0],
      });
      return;
    }

    try {
      const data = await loginUser(email, password);

      if (data?.access_token) {
        Cookies.set("auth_token", data.access_token, { expires: 7 });
        router.push("/"); // Redirect ke home setelah login sukses
      } else {
        setErrors({ apiError: "Email atau password salah" });
      }
    } catch (error) {
      setErrors({ apiError: "Terjadi kesalahan, coba lagi" });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Masuk</CardTitle>
          <CardDescription>Masukkan email dan password untuk masuk</CardDescription>
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
              Masuk
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
