import { Repository } from 'typeorm';
import { Note } from './note.entity';
import { Customer } from '../customers/customer.entity';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ActivityLogService } from '../activity-log/activity-log.service';
export declare class NotesService {
    private readonly notes;
    private readonly customers;
    private readonly activity;
    constructor(notes: Repository<Note>, customers: Repository<Customer>, activity: ActivityLogService);
    private assertCustomerInOrg;
    listForCustomer(customerId: string, user: CurrentUserPayload): Promise<Note[]>;
    create(customerId: string, content: string, user: CurrentUserPayload): Promise<Note | null>;
}
