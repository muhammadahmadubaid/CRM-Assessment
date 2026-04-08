"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const typeorm_1 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const app_module_1 = require("../app.module");
const organization_entity_1 = require("../organizations/organization.entity");
const user_entity_1 = require("../users/user.entity");
const customer_entity_1 = require("../customers/customer.entity");
const note_entity_1 = require("../notes/note.entity");
const activity_log_entity_1 = require("../activity-log/activity-log.entity");
async function seed() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const ds = app.get(typeorm_1.DataSource);
    console.log('🧹 Clearing existing data...');
    await ds.query('TRUNCATE TABLE activity_logs, notes, customers, users, organizations RESTART IDENTITY CASCADE');
    try {
        await ds.query(`CREATE INDEX IF NOT EXISTS idx_customers_search ON customers USING gin(to_tsvector('english', name || ' ' || email))`);
    }
    catch (e) {
        console.warn('Could not create FTS index:', e.message);
    }
    try {
        await ds.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_org_email_unique
       ON customers ("organizationId", email) WHERE "deletedAt" IS NULL`);
    }
    catch (e) {
        console.warn('Could not create unique email index:', e.message);
    }
    const orgRepo = ds.getRepository(organization_entity_1.Organization);
    const userRepo = ds.getRepository(user_entity_1.User);
    const customerRepo = ds.getRepository(customer_entity_1.Customer);
    const noteRepo = ds.getRepository(note_entity_1.Note);
    const logRepo = ds.getRepository(activity_log_entity_1.ActivityLog);
    const password = await bcrypt.hash('password123', 10);
    const seedOrg = async (orgName, userDefs, customerDefs) => {
        const org = await orgRepo.save(orgRepo.create({ name: orgName }));
        const users = [];
        for (const u of userDefs) {
            users.push(await userRepo.save(userRepo.create({
                ...u,
                password,
                organizationId: org.id,
            })));
        }
        const admin = users[0];
        for (const c of customerDefs) {
            const assignee = users[c.assigneeIdx];
            const customer = await customerRepo.save(customerRepo.create({
                name: c.name,
                email: c.email,
                phone: c.phone,
                organizationId: org.id,
                assignedTo: assignee.id,
            }));
            await logRepo.save(logRepo.create({
                entityType: 'customer',
                entityId: customer.id,
                action: 'created',
                performedBy: admin.id,
                organizationId: org.id,
            }));
            for (let i = 1; i <= 2; i++) {
                await noteRepo.save(noteRepo.create({
                    content: `Sample note ${i} for ${c.name}`,
                    customerId: customer.id,
                    organizationId: org.id,
                    createdById: assignee.id,
                }));
                await logRepo.save(logRepo.create({
                    entityType: 'customer',
                    entityId: customer.id,
                    action: 'note_added',
                    performedBy: assignee.id,
                    organizationId: org.id,
                }));
            }
        }
        console.log(`✅ Seeded org "${orgName}"`);
    };
    await seedOrg('TechCorp Inc', [
        { name: 'Alice Admin', email: 'alice@techcorp.com', role: 'admin' },
        { name: 'Bob Member', email: 'bob@techcorp.com', role: 'member' },
        { name: 'Carol Member', email: 'carol@techcorp.com', role: 'member' },
    ], [
        { name: 'Acme Corp', email: 'contact@acme.com', phone: '555-0101', assigneeIdx: 1 },
        { name: 'Globex', email: 'hello@globex.com', phone: '555-0102', assigneeIdx: 1 },
        { name: 'Initech', email: 'info@initech.com', phone: '555-0103', assigneeIdx: 1 },
        { name: 'Umbrella', email: 'contact@umbrella.com', phone: '555-0104', assigneeIdx: 1 },
        { name: 'Hooli', email: 'hi@hooli.com', phone: '555-0105', assigneeIdx: 1 },
        { name: 'Pied Piper', email: 'pp@pp.com', phone: '555-0106', assigneeIdx: 2 },
        { name: 'Stark Industries', email: 'stark@stark.com', phone: '555-0107', assigneeIdx: 2 },
        { name: 'Wayne Enterprises', email: 'wayne@wayne.com', phone: '555-0108', assigneeIdx: 2 },
        { name: 'Cyberdyne', email: 'cyber@cyber.com', phone: '555-0109', assigneeIdx: 2 },
        { name: 'Soylent', email: 'soy@soy.com', phone: '555-0110', assigneeIdx: 2 },
    ]);
    await seedOrg('StartupXYZ', [
        { name: 'Dave Admin', email: 'dave@startupxyz.com', role: 'admin' },
        { name: 'Eve Member', email: 'eve@startupxyz.com', role: 'member' },
        { name: 'Frank Member', email: 'frank@startupxyz.com', role: 'member' },
    ], [
        { name: 'Alpha LLC', email: 'a@alpha.com', phone: '555-0201', assigneeIdx: 1 },
        { name: 'Beta Co', email: 'b@beta.com', phone: '555-0202', assigneeIdx: 1 },
        { name: 'Gamma Inc', email: 'g@gamma.com', phone: '555-0203', assigneeIdx: 1 },
        { name: 'Delta Group', email: 'd@delta.com', phone: '555-0204', assigneeIdx: 1 },
        { name: 'Epsilon', email: 'e@eps.com', phone: '555-0205', assigneeIdx: 1 },
        { name: 'Zeta Ltd', email: 'z@zeta.com', phone: '555-0206', assigneeIdx: 2 },
        { name: 'Eta Tech', email: 'h@eta.com', phone: '555-0207', assigneeIdx: 2 },
        { name: 'Theta Labs', email: 't@theta.com', phone: '555-0208', assigneeIdx: 2 },
        { name: 'Iota Co', email: 'i@iota.com', phone: '555-0209', assigneeIdx: 2 },
        { name: 'Kappa Inc', email: 'k@kappa.com', phone: '555-0210', assigneeIdx: 2 },
    ]);
    console.log('🌱 Seeding complete');
    await app.close();
    process.exit(0);
}
seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map