"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customer_entity_1 = require("./customer.entity");
const activity_log_service_1 = require("../activity-log/activity-log.service");
const user_entity_1 = require("../users/user.entity");
const MAX_ASSIGNED = 5;
let CustomersService = class CustomersService {
    customers;
    dataSource;
    activity;
    constructor(customers, dataSource, activity) {
        this.customers = customers;
        this.dataSource = dataSource;
        this.activity = activity;
    }
    async findAll(query, user) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const qb = this.customers
            .createQueryBuilder('c')
            .leftJoinAndSelect('c.assignee', 'assignee')
            .where('c.organizationId = :orgId', { orgId: user.organizationId })
            .andWhere('c.deletedAt IS NULL');
        if (query.search) {
            qb.andWhere(new typeorm_2.Brackets((qb2) => {
                qb2
                    .where('c.name ILIKE :s', { s: `%${query.search}%` })
                    .orWhere('c.email ILIKE :s', { s: `%${query.search}%` });
            }));
        }
        const [data, total] = await qb
            .orderBy('c.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findOne(id, user) {
        const customer = await this.customers.findOne({
            where: { id, organizationId: user.organizationId, deletedAt: (0, typeorm_2.IsNull)() },
            relations: ['assignee'],
        });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found');
        return customer;
    }
    async assertEmailUnique(email, organizationId, excludeId) {
        const existing = await this.customers.findOne({
            where: { email: email.toLowerCase(), organizationId, deletedAt: (0, typeorm_2.IsNull)() },
        });
        if (existing && existing.id !== excludeId) {
            throw new common_1.ConflictException('A customer with this email already exists in your organization');
        }
    }
    async create(dto, user) {
        const email = dto.email.toLowerCase();
        await this.assertEmailUnique(email, user.organizationId);
        const customer = this.customers.create({
            ...dto,
            email,
            organizationId: user.organizationId,
        });
        const saved = await this.customers.save(customer);
        await this.activity.log({
            entityType: 'customer',
            entityId: saved.id,
            action: 'created',
            performedBy: user.id,
            organizationId: user.organizationId,
        });
        return saved;
    }
    async update(id, dto, user) {
        const customer = await this.findOne(id, user);
        const next = { ...dto };
        if (next.email) {
            next.email = next.email.toLowerCase();
            if (next.email !== customer.email) {
                await this.assertEmailUnique(next.email, user.organizationId, id);
            }
        }
        Object.assign(customer, next);
        const saved = await this.customers.save(customer);
        await this.activity.log({
            entityType: 'customer',
            entityId: id,
            action: 'updated',
            performedBy: user.id,
            organizationId: user.organizationId,
        });
        return saved;
    }
    async softDelete(id, user) {
        const customer = await this.findOne(id, user);
        await this.customers.softRemove(customer);
        await this.activity.log({
            entityType: 'customer',
            entityId: id,
            action: 'deleted',
            performedBy: user.id,
            organizationId: user.organizationId,
        });
        return { success: true };
    }
    async restore(id, user) {
        const customer = await this.customers.findOne({
            where: { id, organizationId: user.organizationId },
            withDeleted: true,
        });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found');
        if (!customer.deletedAt)
            throw new common_1.BadRequestException('Customer not deleted');
        await this.assertEmailUnique(customer.email, user.organizationId, id);
        await this.customers.restore(id);
        await this.activity.log({
            entityType: 'customer',
            entityId: id,
            action: 'restored',
            performedBy: user.id,
            organizationId: user.organizationId,
        });
        return { success: true };
    }
    async assign(customerId, assignToUserId, currentUser) {
        return this.dataSource.transaction(async (manager) => {
            const targetUser = await manager
                .createQueryBuilder(user_entity_1.User, 'u')
                .where('u.id = :id', { id: assignToUserId })
                .andWhere('u.organizationId = :orgId', { orgId: currentUser.organizationId })
                .setLock('pessimistic_write')
                .getOne();
            if (!targetUser)
                throw new common_1.NotFoundException('Target user not found in your organization');
            const customer = await manager.findOne(customer_entity_1.Customer, {
                where: {
                    id: customerId,
                    organizationId: currentUser.organizationId,
                    deletedAt: (0, typeorm_2.IsNull)(),
                },
            });
            if (!customer)
                throw new common_1.NotFoundException('Customer not found');
            const activeCount = await manager
                .createQueryBuilder(customer_entity_1.Customer, 'c')
                .where('c.assignedTo = :userId', { userId: assignToUserId })
                .andWhere('c.deletedAt IS NULL')
                .andWhere('c.organizationId = :orgId', { orgId: currentUser.organizationId })
                .getCount();
            if (customer.assignedTo !== assignToUserId && activeCount >= MAX_ASSIGNED) {
                throw new common_1.BadRequestException(`User already has ${MAX_ASSIGNED} active customers assigned`);
            }
            await manager.update(customer_entity_1.Customer, customerId, { assignedTo: assignToUserId });
            await this.activity.log({
                entityType: 'customer',
                entityId: customerId,
                action: 'assigned',
                performedBy: currentUser.id,
                organizationId: currentUser.organizationId,
                metadata: { assignedTo: assignToUserId },
            }, manager);
            return manager.findOne(customer_entity_1.Customer, {
                where: { id: customerId },
                relations: ['assignee'],
            });
        });
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource,
        activity_log_service_1.ActivityLogService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map