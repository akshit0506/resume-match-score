import { describe, expect, it } from "vitest";
import { z } from "zod";
import { readStructuredOutput, finalOnlyObject } from "./ai-output.server";

const schema = z.object({ summary: z.string() });
async function* parts(values: Array<{ type: string; text?: string; error?: unknown; finishReason?: string }>) {
  for (const value of values) {
    await Promise.resolve();
    yield value;
  }
}

describe("Final-only AI stream consumption", () => {
  it("preserves the strict wire schema without parsing partial document JSON", async () => {
    const output = finalOnlyObject(schema);
    const format = await output.responseFormat;
    expect(format?.type).toBe("json");
    if (format?.type !== "json") throw new Error("Expected JSON format");
    expect(format.schema).toMatchObject({
      type: "object", required: ["summary"], additionalProperties: false,
    });
    // Incomplete and long fragments must never invoke JSON repair/validation.
    for (const text of ['{"summary":', '{"summary":"' + "resume evidence ".repeat(5000)]) {
      expect(await output.parsePartialOutput({ text })).toBeUndefined();
    }
  });

  it("reads split JSON with reasoning and metadata before text", async () => {
    const result = await readStructuredOutput(parts([
      { type: "start" }, { type: "reasoning-delta", text: "not report text" },
      { type: "text-delta", text: '{"summary":' },
      { type: "text-delta", text: '"Supported experience"}' },
      { type: "finish", finishReason: "stop" },
    ]), schema);
    expect(result.summary).toBe("Supported experience");
  });

  it("propagates upstream failures instead of returning partial results", async () => {
    const error = new Error("Access denied");
    await expect(readStructuredOutput(parts([
      { type: "text-delta", text: '{"summary":"partial"}' }, { type: "error", error },
    ]), schema)).rejects.toBe(error);
  });

  it("rejects a disconnected stream even if the JSON is complete", async () => {
    await expect(readStructuredOutput(parts([
      { type: "text-delta", text: '{"summary":"partial"}' },
    ]), schema)).rejects.toThrow("incomplete");
  });

  it("rejects truncated, empty and schema-invalid completed output", async () => {
    for (const text of ['{"summary":', '', '{"summary":42}']) {
      await expect(readStructuredOutput(parts([
        { type: "text-delta", text }, { type: "finish", finishReason: "stop" },
      ]), schema)).rejects.toThrow("incomplete");
    }
  });

  it("rejects filtered or output-limited completions", async () => {
    for (const finishReason of ["length", "content-filter"]) {
      await expect(readStructuredOutput(parts([
        { type: "text-delta", text: '{"summary":"partial"}' }, { type: "finish", finishReason },
      ]), schema)).rejects.toThrow("incomplete");
    }
  });
});