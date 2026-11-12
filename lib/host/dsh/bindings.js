/** Host session ids rotate; companion identity and the logical chat must not. */
export class SessionBindings {
    live = new Map();
    blocked = new Set();
    constructor(initial = []) {
        for (const binding of initial)
            this.live.set(binding.hostSessionId, binding);
    }
    get(hostSessionId) {
        return this.live.get(hostSessionId);
    }
    /** Idempotent registration for sessions seen before their agent lifecycle edge. */
    register(hostSessionId, companionId, logicalChatId) {
        if (this.blocked.has(hostSessionId))
            return;
        this.live.set(hostSessionId, { hostSessionId, companionId, logicalChatId });
    }
    isBlocked(hostSessionId) {
        return this.blocked.has(hostSessionId);
    }
    list() {
        return [...this.live.values()];
    }
    rotate(oldHostSessionId, newHostSessionId) {
        const previous = this.live.get(oldHostSessionId);
        if (!previous)
            return undefined;
        this.live.delete(oldHostSessionId);
        this.blocked.add(oldHostSessionId);
        const successor = { ...previous, hostSessionId: newHostSessionId };
        this.live.set(newHostSessionId, successor);
        return successor;
    }
}
