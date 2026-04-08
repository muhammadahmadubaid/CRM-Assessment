import { DataSource, Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ActivityLogService } from '../activity-log/activity-log.service';
export declare class CustomersService {
    private readonly customers;
    private readonly dataSource;
    private readonly activity;
    constructor(customers: Repository<Customer>, dataSource: DataSource, activity: ActivityLogService);
    findAll(query: QueryCustomerDto, user: CurrentUserPayload): Promise<{
        data: Customer[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string, user: CurrentUserPayload): Promise<Customer>;
    private assertEmailUnique;
    create(dto: CreateCustomerDto, user: CurrentUserPayload): Promise<Customer>;
    update(id: string, dto: UpdateCustomerDto, user: CurrentUserPayload): Promise<Customer>;
    softDelete(id: string, user: CurrentUserPayload): Promise<{
        success: boolean;
    }>;
    restore(id: string, user: CurrentUserPayload): Promise<{
        success: boolean;
    }>;
    assign(customerId: string, assignToUserId: string, currentUser: CurrentUserPayload): Promise<Customer | null>;
}
