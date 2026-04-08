"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const customers_module_1 = require("./customers/customers.module");
const notes_module_1 = require("./notes/notes.module");
const activity_log_module_1 = require("./activity-log/activity-log.module");
const organization_entity_1 = require("./organizations/organization.entity");
const user_entity_1 = require("./users/user.entity");
const customer_entity_1 = require("./customers/customer.entity");
const note_entity_1 = require("./notes/note.entity");
const activity_log_entity_1 = require("./activity-log/activity-log.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    host: config.get('DATABASE_HOST', 'localhost'),
                    port: parseInt(config.get('DATABASE_PORT', '5432'), 10),
                    username: config.get('DATABASE_USER', 'postgres'),
                    password: config.get('DATABASE_PASSWORD', 'postgres'),
                    database: config.get('DATABASE_NAME', 'crm'),
                    entities: [organization_entity_1.Organization, user_entity_1.User, customer_entity_1.Customer, note_entity_1.Note, activity_log_entity_1.ActivityLog],
                    synchronize: true,
                }),
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            customers_module_1.CustomersModule,
            notes_module_1.NotesModule,
            activity_log_module_1.ActivityLogModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map