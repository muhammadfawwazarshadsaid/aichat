"use client";
import { useEffect } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

const Logout = () => {
  const router = useRouter();

  useEffect(() => {
    Cookies.remove("auth_token"); // Hapus token dari cookies
    Cookies.remove("user_id"); // Hapus user_id dari cookies
    router.replace("/login"); // Redirect ke login
  }, []);

  return <p>Logging out...</p>;
};

export default Logout;
