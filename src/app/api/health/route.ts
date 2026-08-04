import {NextResponse} from "next/server";import {prisma} from "@/lib/db";
export async function GET(){try{await prisma.$queryRaw`SELECT 1`;return NextResponse.json({status:"ok",database:"connected",version:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7)??"local"})}catch{return NextResponse.json({status:"degraded",database:"unavailable"},{status:503})}}
