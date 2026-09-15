// Kode undangan perusahaan. Tanpa karakter ambigu (I, O, 0, 1) —
// harus cocok dengan regex companyCodes di firestore.rules.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomCode(len = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

export const normalizeCode = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
