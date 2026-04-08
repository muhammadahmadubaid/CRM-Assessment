import { User } from '../users/user.entity';
import { Customer } from '../customers/customer.entity';
export declare class Organization {
    id: string;
    name: string;
    createdAt: Date;
    users: User[];
    customers: Customer[];
}
