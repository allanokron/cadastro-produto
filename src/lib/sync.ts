import { prisma } from "./db";
import { mapSourceRow, readPublicSheet } from "./sheets";
import { createMatchIndexes, matchIndexed } from "./matching";
import { parseDecimal, skuIdentity } from "./normalization";
import { validatePhysicalData } from "./validation";

type Loaded = ReturnType<typeof mapSourceRow> & { rowNumber:number; sourceId:string };

function mappedValue(item:Loaded|undefined,key:string){return item?.read(key)??""}
function decimal(item:Loaded|undefined,key:string){return parseDecimal(mappedValue(item,key))}

export async function processSync(runId:string){
  try{
    await prisma.syncRun.update({where:{id:runId},data:{status:"RUNNING",startedAt:new Date(),progress:2}});
    const sources=await prisma.dataSource.findMany({where:{active:true}});
    const required=["SENIOR","TINY","STOCK","CLASSIFICATION","PRICE_COST"];
    const missing=required.filter(type=>!sources.some(source=>source.type===type));
    if(missing.length)throw new Error(`Configure todas as cinco fontes. Faltam: ${missing.join(", ")}`);
    const loaded=new Map<string,Loaded[]>(); const counts:Record<string,number>={}; const errors:string[]=[];
    for(let index=0;index<sources.length;index++){
      const source=sources[index];
      try{
        const rows=await readPublicSheet(source.spreadsheetUrl,source.sheetName,source.headerRow);
        const mapping=source.columnMapping as Record<string,string>;
        const items=rows.map((row,rowIndex)=>({...mapSourceRow(row,mapping),rowNumber:rowIndex+2,sourceId:source.id}));
        const usableKeys=items.filter((item)=>item.skuKey||item.eanKey).length;
        if(items.length>0&&usableKeys===0)throw new Error(`Nenhuma chave SKU/EAN foi encontrada. Revise a linha do cabeçalho e o mapeamento.`);
        loaded.set(source.type,items); counts[source.type]=items.length;counts[`${source.type}_KEYED`]=usableKeys;
        for(let start=0;start<items.length;start+=500){
          await prisma.sourceRecord.createMany({data:items.slice(start,start+500).map(item=>({syncRunId:runId,dataSourceId:source.id,rowNumber:item.rowNumber,skuOriginal:item.sku||null,skuKey:item.skuKey||null,eanOriginal:item.ean||null,eanKey:item.eanKey,raw:JSON.parse(JSON.stringify(item.row))}))});
        }
      }catch(error){errors.push(`${source.name}: ${error instanceof Error?error.message:"erro de leitura"}`);loaded.set(source.type,[])}
      await prisma.syncRun.update({where:{id:runId},data:{progress:10+index*10}});
    }
    const seniorAll=loaded.get("SENIOR")??[];const tiny=loaded.get("TINY")??[];const stock=loaded.get("STOCK")??[];const classifications=loaded.get("CLASSIFICATION")??[];const prices=loaded.get("PRICE_COST")??[];
    const inactive=await prisma.productOverride.findMany({where:{excludedFromAnalysis:true},select:{skuKey:true}});
    const inactiveIdentities=new Set(inactive.map((item)=>skuIdentity(item.skuKey)).filter(Boolean));
    const senior=seniorAll.filter((item)=>!inactiveIdentities.has(skuIdentity(item.skuKey)));
    counts.EXCLUDED_INACTIVE=seniorAll.length-senior.length;
    const snapshots=[];let pending=0;let withStock=0;
    const indexes={tiny:createMatchIndexes(tiny),stock:createMatchIndexes(stock),classifications:createMatchIndexes(classifications),prices:createMatchIndexes(prices)};
    const skuCounts=new Map<string,number>();
    for(const item of senior)if(item.skuKey)skuCounts.set(item.skuKey,(skuCounts.get(item.skuKey)??0)+1);
    const duplicateSkus=new Set([...skuCounts].filter(([,count])=>count>1).map(([sku])=>sku));
    for(let productIndex=0;productIndex<senior.length;productIndex++){
      const product=senior[productIndex];
      if(!product.skuKey)continue;
      const tinyMatch=matchIndexed(product,indexes.tiny);const priceMatch=matchIndexed(product,indexes.prices);
      let comparisonStatus:string=tinyMatch.status;
      if(tinyMatch.status==="UNMATCHED"){comparisonStatus="PENDING_TINY";pending++}
      if(duplicateSkus.has(product.skuKey))comparisonStatus="AMBIGUOUS";
      const stockMatches=indexes.stock.sku.get(product.skuKey)??(product.eanKey?indexes.stock.ean.get(product.eanKey):undefined)??[];
      const stockValues=stockMatches.map((item)=>decimal(item,"stock")).filter((value):value is number=>value!==null);
      const stockValue=stockValues.length?stockValues.reduce((total,value)=>total+value,0):null;if((stockValue??0)>0)withStock++;
      const physical=validatePhysicalData({weight:mappedValue(product,"weight"),length:mappedValue(product,"length"),width:mappedValue(product,"width"),height:mappedValue(product,"height")});
      if(tinyMatch.record){const seniorId=mappedValue(product,"tinyId");const realId=mappedValue(tinyMatch.record,"tinyId");if(!seniorId&&realId)comparisonStatus="ID_MISSING";else if(seniorId&&realId&&seniorId!==realId)comparisonStatus="ID_DIVERGENT";else if(seniorId&&realId)comparisonStatus="CORRECT"}
      const classMatches=indexes.classifications.sku.get(product.skuKey)??(product.eanKey?indexes.classifications.ean.get(product.eanKey):undefined)??[];
      const classValues=[...new Set(classMatches.map((item)=>mappedValue(item,"classification")).filter(Boolean))];
      snapshots.push({syncRunId:runId,sku:product.sku,skuKey:product.skuKey,ean:product.ean||null,eanKey:product.eanKey,name:mappedValue(product,"name")||product.sku,brand:mappedValue(product,"brand")||null,category:mappedValue(product,"category")||null,seniorData:JSON.parse(JSON.stringify(product.row)),tinyData:tinyMatch.record?JSON.parse(JSON.stringify(tinyMatch.record.row)):undefined,stock:stockValue,classification:classValues.length===1?classValues[0]:null,price:decimal(priceMatch.record??undefined,"price"),cost:decimal(priceMatch.record??undefined,"cost"),comparisonStatus:comparisonStatus as never,productStatus:(physical.valid&&classValues.length<=1?"READY":"REVIEW_REQUIRED") as never,physicalIssues:JSON.parse(JSON.stringify({...physical.issues,...(classValues.length>1?{classification:`Classificações conflitantes: ${classValues.join(", ")}`}:{})}))});
      if(productIndex>0&&productIndex%1000===0)await prisma.syncRun.update({where:{id:runId},data:{progress:50+Math.round(productIndex/senior.length*35)}});
    }
    await prisma.syncRun.update({where:{id:runId},data:{progress:88}});
    for(let start=0;start<snapshots.length;start+=500){await prisma.productSnapshot.createMany({data:snapshots.slice(start,start+500)});await prisma.syncRun.update({where:{id:runId},data:{progress:88+Math.round(Math.min(start+500,snapshots.length)/snapshots.length*10)}})}
    await prisma.syncRun.update({where:{id:runId},data:{status:errors.length?"PARTIAL":"COMPLETED",finishedAt:new Date(),progress:100,counts:{...counts,pending,withStock,total:senior.length},errors}});
  }catch(error){await prisma.syncRun.update({where:{id:runId},data:{status:"FAILED",finishedAt:new Date(),progress:100,errors:[error instanceof Error?error.message:"Falha inesperada"]}})}
}
