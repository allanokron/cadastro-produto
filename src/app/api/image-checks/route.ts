import { NextResponse } from "next/server";
import { assertSameOrigin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractImageUrls, generateImageUrls } from "@/lib/image-urls";

export const maxDuration = 300;

async function firstAvailable(urls:string[]){
  for(const url of urls){
    try{
      const response=await fetch(url,{method:"HEAD",signal:AbortSignal.timeout(3000),cache:"no-store"});
      if(response.ok)return url;
    }catch{}
  }
  return null;
}

export async function POST(request:Request){
  try{
    assertSameOrigin(request);await requireSession();
    const run=await prisma.syncRun.findFirst({where:{status:{in:["COMPLETED","PARTIAL"]}},orderBy:{createdAt:"desc"}});
    if(!run)return NextResponse.json({checked:0,remaining:0});
    const [snapshots,overrides,setting,checks]=await Promise.all([
      prisma.productSnapshot.findMany({where:{syncRunId:run.id,comparisonStatus:"PENDING_TINY"},select:{sku:true,skuKey:true,ean:true,seniorData:true}}),
      prisma.productOverride.findMany({where:{excludedFromAnalysis:false,imageUrls:{not:undefined}},select:{skuKey:true,imageUrls:true}}),
      prisma.appSetting.findUnique({where:{key:"content"}}),
      prisma.imageCheck.findMany(),
    ]);
    const config=(setting?.value??{}) as Record<string,unknown>;
    const overrideMap=new Map(overrides.map((item)=>[item.skuKey,item.imageUrls as string[]]));
    const checkMap=new Map(checks.map((item)=>[item.skuKey,item.urlsSignature]));
    const pending=snapshots.map((item)=>{const generated=generateImageUrls({pattern:String(config.imageUrlPattern??""),sku:item.sku,ean:item.ean,count:Number(config.imageCount??5),start:Number(config.imageStart??1),extension:String(config.imageExtension??"jpg")});const urls=overrideMap.get(item.skuKey)??[...new Set([...extractImageUrls(item.seniorData),...generated])];return{skuKey:item.skuKey,urls,signature:JSON.stringify(urls)}}).filter((item)=>checkMap.get(item.skuKey)!==item.signature);
    const batch=pending.slice(0,300);
    const results=await Promise.all(batch.map(async(item)=>({...item,availableUrl:await firstAvailable(item.urls)})));
    if(results.length)await prisma.$transaction(results.map((item)=>prisma.imageCheck.upsert({where:{skuKey:item.skuKey},update:{urlsSignature:item.signature,available:Boolean(item.availableUrl),availableUrl:item.availableUrl,checkedAt:new Date()},create:{skuKey:item.skuKey,urlsSignature:item.signature,available:Boolean(item.availableUrl),availableUrl:item.availableUrl}})));
    return NextResponse.json({checked:results.length,remaining:Math.max(0,pending.length-results.length)});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Falha ao verificar imagens."},{status:400})}
}
