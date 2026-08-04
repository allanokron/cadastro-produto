import OpenAI from "openai";
import { getOpenAIConfiguration } from "@/lib/openai-config";

export async function generateDescription(input: Record<string, unknown>, prompt: string) {
  const config = await getOpenAIConfiguration();
  if (!config.apiKey) throw new Error("Configure a chave da OpenAI em Conteúdo > Integração OpenAI.");
  const client = new OpenAI({ apiKey: config.apiKey });
  const response = await client.responses.create({
    model: config.model,
    input: `${prompt}\n\nDados fornecidos:\n${JSON.stringify(input, null, 2)}`,
  });
  return response.output_text.trim();
}
