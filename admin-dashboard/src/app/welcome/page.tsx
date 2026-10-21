"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAuthSession } from "aws-amplify/auth";
import "@/app/amplify-config";
import { isAdminFromToken, isMarketingFromToken } from "@/utils/jwt";

export default function WelcomePage() {
  const router = useRouter();
  const [error, setError] = useState("");
  useEffect(() => {
    fetchAuthSession().then((session) => {
      const token = session.tokens?.idToken?.toString();
      if (!token) { sessionStorage.setItem("post_login_path", "/welcome"); router.replace("/login"); return; }
      localStorage.setItem("auth_id_token", token);
      localStorage.setItem("auth_token", token);
      if (isAdminFromToken(token) || isMarketingFromToken(token)) router.replace("/dashboard");
      else window.location.replace("https://www.ai4impact.in/");
    }).catch(() => setError("We couldn’t continue your session. Please sign in again."));
  }, [router]);
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="max-w-md rounded-2xl border bg-white p-10 text-center shadow-sm"><h1 className="text-2xl font-bold text-primary-700">Welcome to AI4Impact</h1><p className="mt-4 text-gray-600">{error || "Preparing your next step…"}</p>{error && <a className="mt-5 inline-block text-primary-700" href="/login">Sign in</a>}</div></main>;
}
