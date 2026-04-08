import { EntityManager, Repository } from 'typeorm';
import { ActivityAction, ActivityLog } from './activity-log.entity';
interface LogParams {
    entityType: string;
    entityId: string;
    action: ActivityAction;
    performedBy: string;
    organizationId: string;
    metadata?: Record<string, unknown>;
}
export declare class ActivityLogService {
    private readonly repo;
    constructor(repo: Repository<ActivityLog>);
    log(params: LogParams, manager?: EntityManager): Promise<ActivityLog>;
    findForCustomer(customerId: string, organizationId: string): Promise<ActivityLog[]>;
}
export {};
