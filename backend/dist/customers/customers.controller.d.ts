import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { AssignCustomerDto } from './dto/assign-customer.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ActivityLogService } from '../activity-log/activity-log.service';
export declare class CustomersController {
    private readonly customersService;
    private readonly activity;
    constructor(customersService: CustomersService, activity: ActivityLogService);
    findAll(query: QueryCustomerDto, user: CurrentUserPayload): Promise<{
        data: import("./customer.entity").Customer[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    create(dto: CreateCustomerDto, user: CurrentUserPayload): Promise<import("./customer.entity").Customer>;
    findOne(id: string, user: CurrentUserPayload): Promise<import("./customer.entity").Customer>;
    update(id: string, dto: UpdateCustomerDto, user: CurrentUserPayload): Promise<import("./customer.entity").Customer>;
    remove(id: string, user: CurrentUserPayload): Promise<{
        success: boolean;
    }>;
    restore(id: string, user: CurrentUserPayload): Promise<{
        success: boolean;
    }>;
    assign(id: string, dto: AssignCustomerDto, user: CurrentUserPayload): Promise<import("./customer.entity").Customer | null>;
    activityLogs(id: string, user: CurrentUserPayload): Promise<import("../activity-log/activity-log.entity").ActivityLog[]>;
}
