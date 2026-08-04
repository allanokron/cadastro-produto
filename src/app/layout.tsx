import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OKR.on | Cadastro de Produtos",
  description: "Cruzamento Senior e Tiny e geração de cadastro",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
