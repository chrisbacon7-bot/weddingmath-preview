/** Shared HTML escaping for the static build. */

/** "a" before a consonant sound, "an" before a vowel sound. Utah stays "a". */
export function articleFor(phrase) {
  const word = String(phrase || "").trim().toLowerCase();
  if (!word) return "a";
  if (/^(ut|eu|uni|one|u\.s\b|us\b)/.test(word)) return "a";
  return /^[aeiou]/.test(word) ? "an" : "a";
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
