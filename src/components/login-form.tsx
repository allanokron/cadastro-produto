"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ login:data.get("login"), password:data.get("password") }) });
    const result = await response.json(); setLoading(false);
    if (!response.ok) return setError(result.error ?? "Não foi possível entrar.");
    router.push("/dashboard"); router.refresh();
  }
  return <form onSubmit={submit} className="space-y-4">
    <div><label className="label" htmlFor="login">Usuário</label><input className="input" id="login" name="login" defaultValue="admin" autoComplete="username" required /></div>
    <div><label className="label" htmlFor="password">Senha</label><input className="input" id="password" name="password" type="password" autoComplete="current-password" required /></div>
    {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button className="btn btn-primary w-full" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>
  </form>;
}
