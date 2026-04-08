import { User } from '../users/user.entity';
export type ActivityAction = 'created' | 'updated' | 'deleted' | 'restored' | 'note_added' | 'assigned';
export declare class ActivityLog {
    id: string;
    entityType: string;
    entityId: string;
    action: ActivityAction;
    performedBy: string;
    performer: User;
    organizationId: string;
    metadata: Record<string, unknown> | null;
    timestamp: Date;
}
