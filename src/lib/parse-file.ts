// Browser-side file reading. PDFs go to the AI as files; Word/text files become text here.
export type ParsedDoc =
  | { kind: "pdf"; name: string; base64: string }
  | { kind: "text"; name: string; text: string };

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export async function parseFile(file: File): Promise<ParsedDoc> {
  if (file.size > MAX_FILE_BYTES) throw new Error("File is larger than 10MB.");
  const name = file.name;
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf") || file.type === "application/pdf") {
    return { kind: "pdf", name, base64: toBase64(await file.arrayBuffer()) };
  }
  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (!value.trim()) throw new Error("Couldn't read any text from that Word file.");
    return { kind: "text", name, text: value };
  }
  if (lower.endsWith(".doc")) {
    throw new Error("Old .doc files aren't supported. Please save as .docx or PDF.");
  }
  if (lower.endsWith(".txt") || lower.endsWith(".md") || file.type.startsWith("text/")) {
    return { kind: "text", name, text: await file.text() };
  }
  throw new Error("Please upload a PDF, Word (.docx) or text file.");
}
