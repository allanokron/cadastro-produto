import { PageHeading } from "@/components/page-heading";
import { AccountForm } from "@/components/account-form";
import { requireSession } from "@/lib/auth";

export default async function Conta() {
  await requireSession();
  return <><PageHeading title="Conta" subtitle="Alteração simples da senha administrativa." /><AccountForm /></>;
}
