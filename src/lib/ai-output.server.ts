// Keep one streamed result, not the SDK's replay queue of growing partial objects.
export async function readStructuredOutput<T>(
  stream: AsyncIterable<{ type: string; text?: string; error?: unknown; finishReason?: string }>,
  schema: { parse: (value: unknown) => T },
): Promise<T> {
  let text = "";
  let finished = false;
  for await (const part of stream) {
    if (part.type === "error") throw part.error ?? new Error("Analysis failed.");
    if (part.type === "abort") throw new Error("Analysis was stopped.");
    if (part.type === "text-delta") text += part.text ?? "";
    if (part.type === "finish") {
      if (part.finishReason === "length" || part.finishReason === "content-filter" || part.finishReason === "error") {
        throw new Error("The analysis came back incomplete. Please try again.");
      }
      finished = true;
    }
  }
  if (!finished || !text.trim()) throw new Error("The analysis came back incomplete. Please try again.");
  try {
    return schema.parse(JSON.parse(text));
  } catch {
    throw new Error("The analysis came back incomplete. Please try again.");
  }
}