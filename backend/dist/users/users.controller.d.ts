import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(user: CurrentUserPayload): Promise<import("./user.entity").User[]>;
    create(dto: CreateUserDto, user: CurrentUserPayload): Promise<{
        id: string;
        name: string;
        email: string;
        role: import("./user.entity").UserRole;
        organizationId: string;
        organization: import("../organizations/organization.entity").Organization;
        createdAt: Date;
    }>;
}
