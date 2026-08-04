"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AccountForm() {
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    setMessage(response.ok ? "Senha alterada com sucesso." : result.error);
    if (response.ok) {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  return <form onSubmit={save} className="card max-w-2xl space-y-4">
    {message && <p className="rounded-lg bg-gray-50 p-3 text-sm">{message}</p>}
    <div><label className="label">Nova senha</label><input className="input" name="newPassword" type="password" required /></div>
    <button className="btn btn-primary">Alterar senha</button>
  </form>;
}
