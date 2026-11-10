import type { ColdRecord } from '../../core/index.js';
import type { DshSession, DshSessionEvent } from './contracts.js';
/** Content is deliberately excluded: a changed payload at the same position must conflict. */
export declare function hostSourceId(hostSessionId: string, seq: number): string;
/** Only direct, live, original appends cross the boundary. */
export declare function mapSessionEvent(session: DshSession, event: DshSessionEvent): ColdRecord | undefined;
export interface AdmissionMeta {
    learning?: string;
    contentMode?: string;
    toolVerified?: boolean;
}
/** Group chats, temporary sessions, roleplay and unverified tool output stay out. */
export declare function isLongTermSourceAllowed(record: ColdRecord, meta?: AdmissionMeta): boolean;
