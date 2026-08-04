import {describe,expect,it} from "vitest";import {normalizeEan,normalizeSku,parseDecimal} from "./normalization";
describe("normalização",()=>{it("preserva zeros do EAN",()=>expect(normalizeEan(" 00123 ")).toBe("00123"));it("normaliza SKU sem perder conteúdo",()=>expect(normalizeSku(" ab  01 ")).toBe("AB 01"));it("converte decimal brasileiro",()=>expect(parseDecimal("1.234,50")).toBe(1234.5))});
