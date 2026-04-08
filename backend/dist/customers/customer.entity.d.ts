import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';
export declare class Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    organizationId: string;
    organization: Organization;
    assignedTo: string | null;
    assignee: User | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
