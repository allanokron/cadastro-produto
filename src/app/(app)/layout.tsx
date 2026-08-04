import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";
export default async function ProtectedLayout({children}:{children:React.ReactNode}){
  const session = await getSession(); if(!session) redirect("/login");
  return <AppShell login={session.user.login}>{children}</AppShell>;
}
