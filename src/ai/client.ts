import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAiClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function ask(
  prompt: string,
  system: string,
  model: "haiku" | "sonnet" = "sonnet",
): Promise<string | null> {
  const ai = getAiClient();
  if (!ai) return null;

  const modelId = model === "haiku"
    ? "claude-haiku-4-5-20251001"
    : "claude-sonnet-4-6";

  const response = await ai.messages.create({
    model: modelId,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content[0];
  if (block.type === "text") return block.text;
  return null;
}
