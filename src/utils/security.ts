// Security utilities: input sanitization, API key validation, and safe text handling.

const API_KEY_STORAGE = 'GEMINI_API_KEY';
const MAX_IDEA_LEN = 2000;
const MAX_AUDIENCE_LEN = 300;
const MAX_AGENT_OUTPUT_LEN = 2000;

// Google AI Studio API keys: start with "AIza", followed by 35 base64-url chars.
const API_KEY_PATTERN = /^AIza[A-Za-z0-9_-]{35}$/;

// Control characters (C0 + C1 + delete) that should never survive sanitization.
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

// HTML tags and entities — defense-in-depth strip, even though React escapes text.
const HTML_TAG = /<\/?[^>]+>/g;

// Prompt-injection sentinel phrases — wrapped in a delimiter so the model can
// distinguish user content from system instructions. We also strip attempts to
// close/override the delimiter from the user payload itself.
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi,
  /disregard\s+(all\s+)?(previous|prior)\s+/gi,
  /you\s+are\s+now\s+(?:a|an)\s+/gi,
  /system\s*:\s*/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
];

export function sanitizeUserInput(input: string, maxLen: number): string {
  if (typeof input !== 'string') return '';
  let out = input;
  out = out.replace(CONTROL_CHARS, '');
  out = out.replace(HTML_TAG, '');
  for (const pattern of INJECTION_PATTERNS) {
    out = out.replace(pattern, '');
  }
  // Collapse runs of whitespace to prevent overflow payloads.
  out = out.replace(/\s{3,}/g, ' ').trim();
  if (out.length > maxLen) out = out.slice(0, maxLen);
  return out;
}

export function sanitizeIdea(input: string): string {
  return sanitizeUserInput(input, MAX_IDEA_LEN);
}

export function sanitizeAudience(input: string): string {
  return sanitizeUserInput(input, MAX_AUDIENCE_LEN);
}

export function sanitizeAgentOutput(input: string): string {
  if (typeof input !== 'string') return '';
  let out = input;
  out = out.replace(CONTROL_CHARS, '');
  out = out.replace(HTML_TAG, '');
  // Agent output is rendered as React text nodes (auto-escaped), but we still
  // cap length to protect the UI from runaway model output.
  out = out.trim();
  if (out.length > MAX_AGENT_OUTPUT_LEN) out = out.slice(0, MAX_AGENT_OUTPUT_LEN) + '…';
  return out;
}

export function isValidApiKey(key: string): boolean {
  if (typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  return API_KEY_PATTERN.test(trimmed);
}

export function getStoredApiKey(): string | null {
  try {
    const raw = window.localStorage.getItem(API_KEY_STORAGE);
    if (!raw) return null;
    return isValidApiKey(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function storeApiKey(key: string): boolean {
  const trimmed = (key ?? '').trim();
  if (!trimmed) {
    clearApiKey();
    return true;
  }
  if (!isValidApiKey(trimmed)) return false;
  try {
    window.localStorage.setItem(API_KEY_STORAGE, trimmed);
    return true;
  } catch {
    return false;
  }
}

export function clearApiKey(): void {
  try {
    window.localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    // Storage may be unavailable (private mode); nothing to clear.
  }
}

export const SECURITY_LIMITS = {
  MAX_IDEA_LEN,
  MAX_AUDIENCE_LEN,
  MAX_AGENT_OUTPUT_LEN,
} as const;

export { API_KEY_STORAGE };
