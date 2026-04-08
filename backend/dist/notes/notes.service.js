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
exports.NotesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const note_entity_1 = require("./note.entity");
const customer_entity_1 = require("../customers/customer.entity");
const activity_log_service_1 = require("../activity-log/activity-log.service");
let NotesService = class NotesService {
    notes;
    customers;
    activity;
    constructor(notes, customers, activity) {
        this.notes = notes;
        this.customers = customers;
        this.activity = activity;
    }
    async assertCustomerInOrg(customerId, orgId) {
        const customer = await this.customers.findOne({
            where: { id: customerId, organizationId: orgId, deletedAt: (0, typeorm_2.IsNull)() },
        });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found');
        return customer;
    }
    async listForCustomer(customerId, user) {
        await this.assertCustomerInOrg(customerId, user.organizationId);
        return this.notes.find({
            where: { customerId, organizationId: user.organizationId },
            relations: ['createdBy'],
            order: { createdAt: 'DESC' },
        });
    }
    async create(customerId, content, user) {
        await this.assertCustomerInOrg(customerId, user.organizationId);
        const note = this.notes.create({
            content,
            customerId,
            organizationId: user.organizationId,
            createdById: user.id,
        });
        const saved = await this.notes.save(note);
        await this.activity.log({
            entityType: 'customer',
            entityId: customerId,
            action: 'note_added',
            performedBy: user.id,
            organizationId: user.organizationId,
        });
        return this.notes.findOne({ where: { id: saved.id }, relations: ['createdBy'] });
    }
};
exports.NotesService = NotesService;
exports.NotesService = NotesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(note_entity_1.Note)),
    __param(1, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        activity_log_service_1.ActivityLogService])
], NotesService);
//# sourceMappingURL=notes.service.js.map