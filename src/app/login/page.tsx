import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return <main className="grid min-h-screen lg:grid-cols-2">
    <section className="hidden bg-neutral-950 p-14 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="text-xl font-black tracking-tight"><span className="text-orange-500">OK</span>Ron</div>
      <div><p className="mb-5 text-sm font-bold uppercase tracking-[.2em] text-orange-500">Operação integrada</p><h1 className="max-w-xl text-5xl font-black leading-[1.05]">Do Senior ao Tiny, sem perder tempo no caminho.</h1><p className="mt-6 max-w-lg text-lg leading-relaxed text-neutral-400">Cruze bases, corrija cadastros e gere a planilha final em um fluxo confiável.</p></div>
      <p className="text-sm text-neutral-600">Sistema interno • Acesso restrito</p>
    </section>
    <section className="flex items-center justify-center p-6"><div className="w-full max-w-md"><div className="mb-8 lg:hidden text-xl font-black"><span className="text-orange-500">OK</span>Ron</div><p className="text-sm font-bold uppercase tracking-[.18em] text-orange-600">Bem-vindo</p><h2 className="mt-2 text-3xl font-black">Acesse sua operação</h2><p className="mb-8 mt-2 text-gray-500">Use suas credenciais de administrador.</p><LoginForm /></div></section>
  </main>;
}
