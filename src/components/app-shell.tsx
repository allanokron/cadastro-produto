"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Boxes, Database, FileClock, FileSpreadsheet, Gauge, LogOut, PackageCheck, ShieldCheck, UserRound, WandSparkles } from "lucide-react";
import clsx from "clsx";

const links = [
  ["/dashboard", "Dashboard", Gauge], ["/pendentes", "Pendentes", Boxes], ["/validacao", "Validação", ShieldCheck],
  ["/historico", "Exportações", FileClock], ["/fontes", "Fontes", Database], ["/modelo-tiny", "Modelo Tiny", FileSpreadsheet],
  ["/conteudo", "Conteúdo", WandSparkles], ["/variacoes", "Variações", PackageCheck], ["/conta", "Conta", UserRound],
] as const;

export function AppShell({ children, login }: { children:React.ReactNode; login:string }) {
  const path = usePathname(); const router = useRouter();
  async function logout(){ await fetch("/api/auth/logout",{method:"POST"}); router.push("/login"); router.refresh(); }
  return <div className="min-h-screen lg:grid lg:grid-cols-[238px_1fr]">
    <aside className="border-b border-neutral-800 bg-neutral-950 text-white lg:fixed lg:inset-y-0 lg:w-[238px] lg:border-b-0 lg:border-r">
      <div className="flex h-16 items-center justify-between px-5 lg:h-20"><div className="text-xl font-black"><span className="text-orange-500">OK</span>Ron</div><span className="badge bg-neutral-800 text-neutral-300">Admin</span></div>
      <nav className="flex gap-1 overflow-auto px-3 pb-3 lg:block lg:space-y-1">
        {links.map(([href,label,Icon])=><Link key={href} href={href} className={clsx("flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition", path===href ? "bg-orange-600 text-white" : "text-neutral-400 hover:bg-neutral-900 hover:text-white")}><Icon size={17}/>{label}</Link>)}
      </nav>
      <div className="hidden absolute bottom-0 left-0 right-0 border-t border-neutral-800 p-3 lg:block"><button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-neutral-400 hover:bg-neutral-900 hover:text-white"><LogOut size={17}/>Sair</button></div>
    </aside>
    <div className="lg:col-start-2"><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/90 px-5 backdrop-blur lg:h-20 lg:px-8"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">Cadastro de produtos</p><p className="text-sm text-gray-500">Senior × Tiny</p></div><div className="text-sm font-semibold">{login}</div></header><main className="mx-auto max-w-[1500px] p-5 lg:p-8">{children}</main></div>
  </div>;
}
