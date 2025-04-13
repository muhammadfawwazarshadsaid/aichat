import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value; // Ambil token dari cookies

  const url = req.nextUrl.clone();

  if (url.pathname === "/" && !token) {
    url.pathname = "/login"; // Redirect ke /login kalau belum login
    return NextResponse.redirect(url);
  }

  if ((url.pathname === "/login" || url.pathname === "/register") && token) {
    url.pathname = "/"; // Redirect ke / kalau sudah login
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Tentukan path yang akan diproses middleware
// export const config = {
//   matcher: ["/", "/login"], // Middleware hanya berjalan di "/" dan "/login"
// };
export const config = {
  matcher: "/:path*", // Middleware jalan di semua route
};

