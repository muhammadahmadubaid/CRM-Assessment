import { Customer } from '../customers/customer.entity';
import { User } from '../users/user.entity';
export declare class Note {
    id: string;
    content: string;
    customerId: string;
    customer: Customer;
    organizationId: string;
    createdById: string;
    createdBy: User;
    createdAt: Date;
}
