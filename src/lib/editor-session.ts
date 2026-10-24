export type EditorDocuments = { resume: string; job: string; name: string };
const key = (id: string) => `shortlist-editor:${id}`;
// Only the submitting tab keeps the source documents; share links never return them.
export function saveEditor(id: string, documents: EditorDocuments) {
  try { sessionStorage.setItem(key(id), JSON.stringify(documents)); } catch { /* storage can be disabled */ }
}
export function readEditor(id: string): EditorDocuments | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key(id)) ?? "null");
    return value && typeof value.resume === "string" && typeof value.job === "string" && typeof value.name === "string" ? value : null;
  } catch { return null; }
}