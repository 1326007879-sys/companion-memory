import { createHash } from 'node:crypto';
import type { ColdRecord } from '../../core/index.js';
import type { DshSession, DshSessionEvent } from './contracts.js';

const SOURCE_ID_NAMESPACE = 'companion-cold:v1';
const MAX_CONTENT_LENGTH = 32_000;

/** Content is deliberately excluded: a changed payload at the same position must conflict. */
export function hostSourceId(hostSessionId: string, seq: number): string {
  return `dsh:${createHash('sha256')
    .update(JSON.stringify([SOURCE_ID_NAMESPACE, hostSessionId, seq]))
    .digest('hex')}`;
}

function textOf(content: unknown): string | undefined {
  let text: string;
  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    text = content
      .filter((block) => block && typeof block === 'object' && (block as { type?: string }).type === 'text')
      .map((block) => String((block as { text?: string }).text ?? ''))
      .join('\n');
  } else {
    return undefined;
  }
  if (!text.trim() || text.length > MAX_CONTENT_LENGTH || text.includes('\u0000')) return undefined;
  return text;
}

function dayOf(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** Only direct, live, original appends cross the boundary. */
export function mapSessionEvent(
  session: DshSession,
  event: DshSessionEvent,
): ColdRecord | undefined {
  if (!Number.isSafeInteger(event.seq) || !Number.isSafeInteger(event.time)) return undefined;
  if (!Number.isSafeInteger(session.firstLiveSeq)) return undefined;
  if (event.seq < session.firstLiveSeq) return undefined;
  if (event.sourceEventSeqs !== undefined || event.surfaceOp !== 'append') return undefined;
  if (!session.id) return undefined;

  const data = event.data ?? {};
  let role: ColdRecord['role'];
  let content: string | undefined;
  switch (event.type) {
    case 'user/message':
      if ((data.source as { kind?: string } | undefined)?.kind !== 'user') return undefined;
      role = 'user';
      content = textOf(data.content);
      break;
    case 'assistant/message':
      if (data.interrupted === true) return undefined;
      role = 'assistant';
      content = textOf((data.message as { content?: unknown } | undefined)?.content);
      break;
    case 'tool/result':
      role = 'tool';
      content = textOf((data.message as { content?: unknown } | undefined)?.content);
      break;
    default:
      return undefined;
  }
  if (content === undefined) return undefined;

  return {
    id: hostSourceId(session.id, event.seq),
    day: dayOf(event.time),
    ts: event.time,
    role,
    content,
    source: 'dsh',
    hostSessionId: session.id,
    seq: event.seq,
    visibility: 'private',
  };
}

export interface AdmissionMeta {
  learning?: string;
  contentMode?: string;
  toolVerified?: boolean;
}

/** Group chats, temporary sessions, roleplay and unverified tool output stay out. */
export function isLongTermSourceAllowed(record: ColdRecord, meta: AdmissionMeta = {}): boolean {
  if (record.visibility !== 'private') return false;
  if (record.role === 'tool' && meta.toolVerified !== true) return false;
  if (record.role !== 'user' && record.role !== 'assistant' && record.role !== 'tool') return false;
  return meta.learning !== 'temporary' && meta.contentMode !== 'roleplay';
}
