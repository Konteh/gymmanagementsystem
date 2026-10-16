export function normalizePhone(input: string) {
  const raw = input.trim();
  if (!raw) return "";
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (hasPlus) return `+${digits}`;
  if (digits.startsWith("220") && digits.length >= 10) return `+${digits}`;
  if (digits.length === 7) return `+220${digits}`;
  if (digits.length === 8 && digits.startsWith("0")) return `+220${digits.slice(1)}`;
  return `+220${digits.replace(/^0+/, "")}`;
}

export function phoneTail(input: string) {
  return normalizePhone(input).replace(/\D/g, "").slice(-7);
}

export function phonesMatch(stored: string, input: string) {
  const a = phoneTail(stored);
  const b = phoneTail(input);
  return a.length >= 7 && a === b;
}
