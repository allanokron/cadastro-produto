import OpenAI from "openai";

export async function generateDescription(input: Record<string, unknown>, prompt: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada.");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
    input: `${prompt}\n\nDados fornecidos:\n${JSON.stringify(input, null, 2)}`,
  });
  return response.output_text.trim();
}
