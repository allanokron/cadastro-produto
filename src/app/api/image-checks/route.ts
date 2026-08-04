import { NextResponse } from "next/server";
import { assertSameOrigin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractImageUrls, generateImageUrls } from "@/lib/image-urls";

export const maxDuration = 300;

function text(data: unknown, key: string) {
  return String((data as Record<string, unknown> | null)?.[key] ?? "").trim();
}

const CHECK_VERSION="v3:";
async function firstAvailable(urls:string[]):Promise<string|null|undefined>{
  let inconclusive=false;
  for(const url of urls){
    try{
      const response=await fetch(url,{method:"GET",headers:{Range:"bytes=0-0",Accept:"image/*","User-Agent":"Mozilla/5.0 ImageAvailabilityCheck/2.0"},signal:AbortSignal.timeout(5000),cache:"no-store"});
      if(response.ok&&response.headers.get("content-type")?.toLowerCase().startsWith("image/"))return url;
      if(response.status!==404&&response.status!==410)inconclusive=true;
    }catch{inconclusive=true}
  }
  return inconclusive?undefined:null;
}

function buildImageUrls(item:{sku:string;ean:string|null;seniorData:unknown;tinyData:unknown},config:Record<string,unknown>,tinyImageCol:string,overrideUrls:string[]|null):string[]{
  if(overrideUrls)return overrideUrls;
  const generated=generateImageUrls({pattern:String(config.imageUrlPattern??""),sku:item.sku,ean:item.ean,count:Number(config.imageCount??5),start:Number(config.imageStart??1),extension:String(config.imageExtension??"jpg")});
  const seniorUrls=extractImageUrls(item.seniorData);
  const tinyUrls=extractImageUrls(item.tinyData);
  let tinyImageUrl="";
  if(tinyImageCol&&item.tinyData&&typeof item.tinyData==="object"){
    tinyImageUrl=text(item.tinyData,tinyImageCol);
  }
  return [...new Set([...(tinyImageUrl?[tinyImageUrl]:[]),...tinyUrls,...seniorUrls,...generated])];
}

export async function POST(request:Request){
  try{
    assertSameOrigin(request);await requireSession();
    const run=await prisma.syncRun.findFirst({where:{status:{in:["COMPLETED","PARTIAL"]}},orderBy:{createdAt:"desc"}});
    if(!run)return NextResponse.json({checked:0,remaining:0});
    const [snapshots,overrides,setting,checks,tinySource]=await Promise.all([
      prisma.productSnapshot.findMany({where:{syncRunId:run.id},select:{sku:true,skuKey:true,ean:true,seniorData:true,tinyData:true}}),
      prisma.productOverride.findMany({where:{excludedFromAnalysis:false,imageUrls:{not:undefined}},select:{skuKey:true,imageUrls:true}}),
      prisma.appSetting.findUnique({where:{key:"content"}}),
      prisma.imageCheck.findMany(),
      prisma.dataSource.findUnique({where:{type:"TINY"}}),
    ]);
    const config=(setting?.value??{}) as Record<string,unknown>;
    const tinyMapping=(tinySource?.columnMapping??{}) as Record<string,string>;
    const tinyImageCol=tinyMapping.image??"";
    const overrideMap=new Map(overrides.map((item)=>[item.skuKey,item.imageUrls as string[]]));
    const checkMap=new Map(checks.map((item)=>[item.skuKey,item.urlsSignature]));
    const pending=snapshots.map((item)=>{
      const urls=buildImageUrls(item,config,tinyImageCol,overrideMap.get(item.skuKey)??null);
      return{skuKey:item.skuKey,urls,signature:CHECK_VERSION+JSON.stringify(urls)};
    }).filter((item)=>checkMap.get(item.skuKey)!==item.signature);
    const batch=pending.slice(0,100);const checkedResults:{skuKey:string;signature:string;availableUrl:string|null|undefined}[]=[];
    for(let start=0;start<batch.length;start+=50)checkedResults.push(...await Promise.all(batch.slice(start,start+50).map(async(item)=>({...item,availableUrl:await firstAvailable(item.urls)}))));
    const results=checkedResults.filter((item):item is typeof item&{availableUrl:string|null}=>item.availableUrl!==undefined);
    if(results.length)await prisma.$transaction(results.map((item)=>prisma.imageCheck.upsert({where:{skuKey:item.skuKey},update:{urlsSignature:item.signature,available:Boolean(item.availableUrl),availableUrl:item.availableUrl,checkedAt:new Date()},create:{skuKey:item.skuKey,urlsSignature:item.signature,available:Boolean(item.availableUrl),availableUrl:item.availableUrl}})));
    return NextResponse.json({checked:results.length,remaining:Math.max(0,pending.length-results.length)});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Falha ao verificar imagens."},{status:400})}
}
