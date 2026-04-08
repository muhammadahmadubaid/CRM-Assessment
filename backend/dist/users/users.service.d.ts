import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
export declare class UsersService {
    private readonly users;
    constructor(users: Repository<User>);
    findAllInOrg(currentUser: CurrentUserPayload): Promise<User[]>;
    create(dto: CreateUserDto, currentUser: CurrentUserPayload): Promise<{
        id: string;
        name: string;
        email: string;
        role: import("./user.entity").UserRole;
        organizationId: string;
        organization: import("../organizations/organization.entity").Organization;
        createdAt: Date;
    }>;
}
