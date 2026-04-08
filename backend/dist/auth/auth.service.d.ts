import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly users;
    private readonly jwt;
    constructor(users: Repository<User>, jwt: JwtService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("../users/user.entity").UserRole;
            organizationId: string;
            organizationName: string;
        };
    }>;
}
