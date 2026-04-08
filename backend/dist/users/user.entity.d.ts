import { Organization } from '../organizations/organization.entity';
export type UserRole = 'admin' | 'member';
export declare class User {
    id: string;
    name: string;
    email: string;
    password: string;
    role: UserRole;
    organizationId: string;
    organization: Organization;
    createdAt: Date;
}
