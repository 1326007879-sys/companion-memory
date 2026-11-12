export interface SessionBinding {
  hostSessionId: string;
  companionId: string;
  logicalChatId: string;
}

/** Host session ids rotate; companion identity and the logical chat must not. */
export class SessionBindings {
  private readonly live = new Map<string, SessionBinding>();
  private readonly blocked = new Set<string>();

  constructor(initial: readonly SessionBinding[] = []) {
    for (const binding of initial) this.live.set(binding.hostSessionId, binding);
  }

  get(hostSessionId: string): SessionBinding | undefined {
    return this.live.get(hostSessionId);
  }

  /** Idempotent registration for sessions seen before their agent lifecycle edge. */
  register(hostSessionId: string, companionId: string, logicalChatId: string): void {
    if (this.blocked.has(hostSessionId)) return;
    this.live.set(hostSessionId, { hostSessionId, companionId, logicalChatId });
  }

  isBlocked(hostSessionId: string): boolean {
    return this.blocked.has(hostSessionId);
  }

  list(): SessionBinding[] {
    return [...this.live.values()];
  }

  rotate(oldHostSessionId: string, newHostSessionId: string): SessionBinding | undefined {
    const previous = this.live.get(oldHostSessionId);
    if (!previous) return undefined;
    this.live.delete(oldHostSessionId);
    this.blocked.add(oldHostSessionId);
    const successor: SessionBinding = { ...previous, hostSessionId: newHostSessionId };
    this.live.set(newHostSessionId, successor);
    return successor;
  }
}
