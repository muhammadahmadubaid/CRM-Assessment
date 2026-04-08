"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const typeorm_1 = require("typeorm");
const faker_1 = require("@faker-js/faker");
const app_module_1 = require("../app.module");
const customer_entity_1 = require("../customers/customer.entity");
const organization_entity_1 = require("../organizations/organization.entity");
const user_entity_1 = require("../users/user.entity");
const TOTAL = Number(process.env.BULK_COUNT ?? 100_000);
const BATCH = 5_000;
async function bulk() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const ds = app.get(typeorm_1.DataSource);
    const org = await ds.getRepository(organization_entity_1.Organization).findOne({
        where: { name: 'TechCorp Inc' },
    });
    if (!org)
        throw new Error('Run `npm run seed` first to create base data');
    const members = await ds.getRepository(user_entity_1.User).find({
        where: { organizationId: org.id },
    });
    const memberIds = members.map((m) => m.id);
    console.log(`Seeding ${TOTAL} fake customers into "${org.name}"...`);
    console.time('bulk-insert');
    for (let i = 0; i < TOTAL; i += BATCH) {
        const rows = Array.from({ length: Math.min(BATCH, TOTAL - i) }, () => ({
            name: faker_1.faker.company.name(),
            email: `${faker_1.faker.string.uuid()}@${faker_1.faker.internet.domainName()}`,
            phone: faker_1.faker.string.numeric(10),
            organizationId: org.id,
            assignedTo: Math.random() < 0.0001
                ? memberIds[Math.floor(Math.random() * memberIds.length)]
                : null,
        }));
        await ds
            .createQueryBuilder()
            .insert()
            .into(customer_entity_1.Customer)
            .values(rows)
            .execute();
        process.stdout.write(`  inserted ${i + rows.length}/${TOTAL}\r`);
    }
    console.log('');
    console.timeEnd('bulk-insert');
    console.log('\nBenchmark queries:');
    console.time('count all');
    await ds.getRepository(customer_entity_1.Customer).count({ where: { organizationId: org.id } });
    console.timeEnd('count all');
    console.time('paginated page 1');
    await ds.getRepository(customer_entity_1.Customer).find({
        where: { organizationId: org.id },
        take: 20,
        skip: 0,
    });
    console.timeEnd('paginated page 1');
    console.time('paginated page 5000 (deep offset)');
    await ds.getRepository(customer_entity_1.Customer).find({
        where: { organizationId: org.id },
        take: 20,
        skip: 100_000,
    });
    console.timeEnd('paginated page 5000 (deep offset)');
    console.time('search ILIKE');
    await ds
        .createQueryBuilder(customer_entity_1.Customer, 'c')
        .where('c.organizationId = :org', { org: org.id })
        .andWhere('c.deletedAt IS NULL')
        .andWhere('(c.name ILIKE :s OR c.email ILIKE :s)', { s: '%inc%' })
        .take(20)
        .getMany();
    console.timeEnd('search ILIKE');
    await app.close();
    process.exit(0);
}
bulk().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=seed-bulk.js.map