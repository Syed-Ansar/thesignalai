// Strips phone numbers (+91 / 10-digit), emails and bill numbers before text leaves the device.
// Mirrors backend/lib/pii.py.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /(?:\+?91[\s-]?)?(?<!\d)[6-9]\d{4}[\s-]?\d{5}(?!\d)/g;
const BILL_RE =
  /\b(?:bill|invoice|inv|order|receipt|kot)\s*(?:no\.?|number|num|#|id)?\s*[:#-]?\s*[A-Za-z]*[-_]?\d{3,}\b/gi;
const LONG_DIGITS_RE = /\b\d{6,}\b/g;

export function sanitize(text: string): string {
  return text
    .replace(EMAIL_RE, "")
    .replace(PHONE_RE, "")
    .replace(BILL_RE, "")
    .replace(LONG_DIGITS_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function hasPii(text: string): boolean {
  return sanitize(text) !== text.replace(/\s{2,}/g, " ").trim();
}
