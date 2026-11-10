export interface SessionBinding {
    hostSessionId: string;
    companionId: string;
    logicalChatId: string;
}
/** Host session ids rotate; companion identity and the logical chat must not. */
export declare class SessionBindings {
    private readonly live;
    private readonly blocked;
    constructor(initial?: readonly SessionBinding[]);
    get(hostSessionId: string): SessionBinding | undefined;
    isBlocked(hostSessionId: string): boolean;
    list(): SessionBinding[];
    rotate(oldHostSessionId: string, newHostSessionId: string): SessionBinding | undefined;
}
