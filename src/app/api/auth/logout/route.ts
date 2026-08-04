import {NextResponse} from "next/server";import {assertSameOrigin,destroySession} from "@/lib/auth";
export async function POST(request:Request){try{assertSameOrigin(request);await destroySession();return NextResponse.json({ok:true})}catch{return NextResponse.json({error:"Falha ao sair."},{status:400})}}
