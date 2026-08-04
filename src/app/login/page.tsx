import { LoginForm } from "@/components/login-form";
import Image from "next/image";

export default function LoginPage() {
  return <main className="grid min-h-screen lg:grid-cols-2">
    <section className="relative hidden overflow-hidden bg-[#14181f] p-14 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[#1fadad]/10 blur-3xl" /><div className="absolute -bottom-48 -left-32 h-96 w-96 rounded-full bg-[#f5a661]/10 blur-3xl" />
      <Image src="/okron-logo.png" alt="OKR.on" width={84} height={84} className="relative h-20 w-20 object-contain" priority />
      <div className="relative"><p className="mb-5 text-sm font-bold uppercase tracking-[.2em] text-[#1fadad]">Operação integrada</p><h1 className="max-w-xl text-5xl font-black leading-[1.05]">Do Senior ao Tiny, com a operação sempre ON.</h1><p className="mt-6 max-w-lg text-lg leading-relaxed text-[#8f96a3]">Cruze bases, corrija cadastros e gere a planilha final em um fluxo confiável.</p></div>
      <p className="relative text-sm text-[#8f96a3]">Sistema interno • OKR.on</p>
    </section>
    <section className="flex items-center justify-center p-6"><div className="w-full max-w-md"><Image src="/okron-logo.png" alt="OKR.on" width={64} height={64} className="mb-8 h-16 w-16 object-contain lg:hidden" priority /><p className="text-sm font-bold uppercase tracking-[.18em] text-[#1fadad]">Bem-vindo</p><h2 className="mt-2 text-3xl font-black text-[#14181f]">Acesse sua operação</h2><p className="mb-8 mt-2 text-[#8f96a3]">Use suas credenciais de administrador.</p><LoginForm /></div></section>
  </main>;
}
