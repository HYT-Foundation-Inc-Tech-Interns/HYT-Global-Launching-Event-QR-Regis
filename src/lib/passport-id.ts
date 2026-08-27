const PASSPORT_ID_PATTERN = /\bHYT-[A-Z0-9-]+\b/i;

export function extractPassportId(value: string): string {
  const match = value.trim().match(PASSPORT_ID_PATTERN);
  return match ? match[0] : "";
}

type NfcRecord = {
  data: DataView | ArrayBuffer | null;
  toText?: () => string | null;
  toUrl?: () => string | null;
};

export function extractPassportIdFromNfcRecord(record: NfcRecord): string {
  const url = record.toUrl?.();
  if (url) {
    const passportId = extractPassportId(url);
    if (passportId) return passportId;
  }

  const text = record.toText?.();
  if (text) {
    const passportId = extractPassportId(text);
    if (passportId) return passportId;
  }

  if (!record.data) return "";
  const bytes = record.data instanceof DataView
    ? new Uint8Array(record.data.buffer, record.data.byteOffset, record.data.byteLength)
    : new Uint8Array(record.data);
  const decoder = new TextDecoder();
  const candidates = [decoder.decode(bytes)];

  // Text NDEF records begin with a status byte and language-code bytes.
  if (bytes.length > 1) {
    const languageLength = bytes[0] & 0x3f;
    candidates.push(decoder.decode(bytes.slice(languageLength + 1)));
  }

  return candidates.map(extractPassportId).find(Boolean) || "";
}