import {describe,expect,it} from "vitest";import {generateImageUrls} from "./image-urls";
describe("URLs",()=>{it("substitui placeholders",()=>expect(generateImageUrls({pattern:"https://x/{sku}_{numero}.{extensao}",sku:"ABC",count:2,start:1,extension:"jpg"})).toEqual(["https://x/ABC_1.jpg","https://x/ABC_2.jpg"]))});
