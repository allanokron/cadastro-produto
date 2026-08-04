import {PageHeading} from "@/components/page-heading";import {AccountForm} from "@/components/account-form";import {requireSession} from "@/lib/auth";
export default async function Conta(){const session=await requireSession();return <><PageHeading title="Conta" subtitle="Segurança do acesso administrativo."/><AccountForm mustChange={session.user.mustChangePassword}/></>}
