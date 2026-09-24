import type { Prisma } from '@prisma/client';

function coerceNumber(val: unknown): number | undefined {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function pickRawChatArray(body: Record<string, unknown>): unknown {
  const keys = ['chatBodies', 'chatLog', 'chatMessages', 'messagesTexts'] as const;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(body, k)) {
      const v = body[k];
      if (v !== undefined && v !== null) return v;
    }
  }
  return undefined;
}

function normalizeLines(raw: unknown[]): string[] {
  return raw
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry === 'object' && 'text' in entry) {
        const t = (entry as { text?: unknown }).text;
        return typeof t === 'string' ? t.trim() : '';
      }
      return '';
    })
    .filter((s) => s.length > 0);
}

export function deriveActivityEndChatFields(body: Record<string, unknown>): {
  messages: number;
  chatLog?: Prisma.InputJsonValue;
} {
  const rawArr = pickRawChatArray(body);
  const legacyN = coerceNumber(body.messages);

  if (Array.isArray(rawArr)) {
    const lines = normalizeLines(rawArr);
    const messages = lines.length > 0 ? lines.length : legacyN !== undefined ? legacyN : 0;
    return {
      messages,
      chatLog: lines as unknown as Prisma.InputJsonValue,
    };
  }

  return {
    messages: legacyN ?? 0,
  };
}

export function normalizeChatLogLines(chatLog: unknown): string[] {
  if (chatLog == null) return [];
  if (!Array.isArray(chatLog)) return [];
  return normalizeLines(chatLog as unknown[]);
}
