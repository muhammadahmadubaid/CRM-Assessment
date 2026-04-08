# Multi-Tenant CRM System

A small but production-shaped CRM that demonstrates strict tenant isolation, soft-deletable customers, an audited activity log, and a concurrency-safe assignment workflow. Built as a take-home for a Full Stack Engineer position.

## Tech Stack

- **Backend** — NestJS 11, TypeScript, PostgreSQL, TypeORM
- **Frontend** — Next.js 14 (App Router), TypeScript, TanStack Query, Zustand, Tailwind CSS
- **Auth** — JWT (Bearer)
- **API docs** — Swagger / OpenAPI at `/api/docs`

## What's Inside

The system implements every functional requirement from the brief:

- **Organizations** — seeded only; data is fully isolated per organization.
- **Users** — `admin` and `member` roles. Only admins can create users. Users can only see data within their own organization.
- **Customers** — full CRUD, paginated list, search by name/email, soft delete, restore, and assignment to a user (with the 5-active-customers cap).
- **Notes** — belong to a customer + organization, tracked by `createdById`.
- **Activity Log** — append-only audit trail for `created`, `updated`, `deleted`, `restored`, `note_added`, and `assigned`.

## Project Structure

```
erp-task/
├── backend/   # NestJS API
├── frontend/  # Next.js dashboard
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1. Database

```bash
createdb crm
```

### 2. Backend

```bash
cd backend
# A .env file is committed for convenience so you can run the project without
# hunting for credentials. My local Postgres password is "root" — open
# backend/.env and adjust DATABASE_PASSWORD (and host/port if needed) to match
# your local Postgres setup before running the seed.
# (I know committing .env is not a habit you want in real projects — it's only
# here to make this take-home faster to evaluate.)

npm install
npm run seed         # creates the schema (TypeORM synchronize) and seeds 2 orgs
npm run seed:bulk    # OPTIONAL — inserts 100k fake customers via @faker-js/faker
                     # so you can stress-test the indexes / pagination paths
                     # the assessment asks about. Skip if you only want demo data.
npm run start:dev
```

API runs at `http://localhost:3001/api`
Swagger UI at `http://localhost:3001/api/docs`

### 3. Frontend

```bash
cd frontend
# A .env.local file is committed with NEXT_PUBLIC_API_URL pointing at the
# backend on localhost:3001. Edit it if you ran the backend on another port.

npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Test Accounts

All accounts use the password `password123`.

| Email                 | Role   | Organization  |
| --------------------- | ------ | ------------- |
| alice@techcorp.com    | admin  | TechCorp Inc  |
| bob@techcorp.com      | member | TechCorp Inc  |
| carol@techcorp.com    | member | TechCorp Inc  |
| dave@startupxyz.com   | admin  | StartupXYZ    |
| eve@startupxyz.com    | member | StartupXYZ    |
| frank@startupxyz.com  | member | StartupXYZ    |

Sign in as Alice to see admin-only screens (the Users page); sign in as Bob or Carol to see the member view.

## Architecture Decisions

A few choices worth calling out up-front, because the rest of the README assumes them:

- **Explicit tenancy at every call site, no global filters.** TypeORM has a global subscriber pattern that could inject `organizationId` automatically, but I deliberately chose to pass it through every service method. The boundary is then visible in code review — you can grep for `organizationId` and see exactly where the isolation is enforced. A magic global filter is a single bug away from leaking data across tenants.
- **Activity log written from inside service methods, not via an interceptor.** An interceptor would only know the HTTP request shape; a service can attach the right `entityId`, the right action, and (for `assigned`) include the new assignee in the same DB transaction as the change itself. Atomic auditing matters more than DRY here.
- **Server state vs UI state are kept in different libraries on the frontend.** TanStack Query owns server data (customers, notes, activity, users); Zustand owns UI state (which modal is open, which row is selected). Mixing those is a recipe for stale data and mysterious re-renders.
- **TypeORM `synchronize: true`** is enabled in dev so reviewers can run `npm run seed` and have a working schema in one step. In a real project this would be replaced by versioned migrations.

## How Multi-Tenancy Isolation Is Enforced

Every authenticated request carries a JWT whose payload contains `organizationId`. The `JwtStrategy.validate()` method turns that payload into a typed `CurrentUserPayload`, which controllers inject into services with the `@CurrentUser()` decorator.

From there, **every** service method that touches the database adds `organizationId = :currentUser.organizationId` to its `WHERE` clause. There are no exceptions and no shortcuts:

- `CustomersService.findAll` filters by org.
- `findOne`, `update`, `softDelete`, `restore`, and `assign` all re-resolve the customer with an org filter before doing anything else, so a forged UUID from another tenant returns `404`, not the row.
- `NotesService` resolves the parent customer through the same org-scoped lookup before returning or creating a note.
- `ActivityLogService.findForCustomer` filters by both `entityId` and `organizationId`.
- `UsersService.findAllInOrg` lists only members of the caller's org.

The visibility rule from the brief — *"users can only view data within their organization"* — is interpreted at the **organization** level, not per assignment. Inside an org, members and admins all see the same customer list; `assignedTo` is a data field that drives the 5-customer cap and the activity feed, not an authorization filter. (A reviewer who reads "users can only view data within their organization" as "members only see their assigned customers" would also have to invent how an admin could ever re-assign someone else's record — which the brief asks for. Org-wide visibility is the only consistent reading.)

## How Concurrency Safety Is Achieved

The cap rule is *each user can have a maximum of 5 active customers assigned*. The naive implementation — read the count, compare to 5, write the new assignment — has an obvious race: two parallel requests can both read `4`, both pass the check, and both write, leaving the user at `6`.

`CustomersService.assign()` solves this with a single database transaction whose first statement is a `SELECT ... FOR UPDATE` on the **target user row**:

```ts
const targetUser = await manager
  .createQueryBuilder(User, 'u')
  .where('u.id = :id', { id: assignToUserId })
  .andWhere('u.organizationId = :orgId', { orgId: currentUser.organizationId })
  .setLock('pessimistic_write')
  .getOne();
```

Any other concurrent `POST /customers/:id/assign` aimed at the same user blocks on this row lock until the current transaction commits. Inside the lock we run a normal `COUNT()` of that user's active customers, reject with `400` if it's already at 5, otherwise update the customer and write the activity-log row — all in the same transaction, so the cap check, the update, and the audit row commit atomically.

**Why lock the user row instead of the customer rows?**

1. **Correct under inserts.** Locking existing customer rows wouldn't stop another transaction from inserting a *new* assignment row that wasn't part of the locked set — Postgres has no gap locks for that case. Locking the parent user serializes everything routed at that user, regardless of how many child rows exist.
2. **Postgres-friendly.** `FOR UPDATE` cannot be combined with aggregate functions; `SELECT FOR UPDATE … COUNT()` raises `0A000`. Locking the user row sidesteps the restriction so the cap check is a clean `COUNT()`.
3. **Cheap.** A single-row lock on a small table is much cheaper than locking N rows on a hot table.

A second concurrency concern is duplicate customer emails inside an organization. The service does a check + insert, which is also racy under concurrent requests. The seed script adds a **partial unique index** that turns the race into a hard DB constraint:

```sql
CREATE UNIQUE INDEX idx_customers_org_email_unique
  ON customers ("organizationId", email)
  WHERE "deletedAt" IS NULL;
```

The partial predicate (`WHERE deletedAt IS NULL`) lets the same email be reused after a soft delete, which matches the soft-delete-restores-state expectation.

## Performance Strategy

The brief asks the system to support **100,000 customers per organization**. The decisions below are aimed at that target.

**Indexes (all created in `seed.ts`):**

| Index | Purpose |
| --- | --- |
| `idx_customers_org` on `customers(organizationId)` | Tenant-scoped list queries (the most common read) |
| `idx_customers_assigned` on `customers(assignedTo)` | Counting / filtering by assignee, including the cap check |
| `idx_customers_search` GIN `tsvector(name ‖ email)` | Full-text search on the customer list |
| `idx_customers_org_email_unique` (partial unique) | Race-free email uniqueness inside an org |
| `idx_notes_customer` on `notes(customerId)` | Notes timeline lookup |
| `idx_activity_logs_entity` on `activity_logs(entityId, entityType)` | Activity feed lookup |
| `idx_users_org` on `users(organizationId)` | User list inside an org |

**Avoiding N+1.** Every list endpoint that needs related data uses an explicit join via TypeORM's query builder:

- `GET /customers` — `leftJoinAndSelect('c.assignee', 'assignee')`
- `GET /customers/:id/notes` — `relations: ['createdBy']`
- `GET /customers/:id/activity` — `relations: ['performer']`

There are no per-row lookups in any list path.

**Pagination.** The customer list uses offset pagination (`LIMIT / OFFSET` via TypeORM's `take` / `skip`) with a single `getManyAndCount()` call. The frontend passes `keepPreviousData` to TanStack Query so paging doesn't flicker. Offset pagination is well-understood, easy to wire to the URL, and fine up to a few hundred pages — past that point the cost of `OFFSET N` reading and discarding N rows starts to dominate. The keyset (cursor) alternative is the obvious next step at extreme scale; I left it out because the assessment-sized dataset doesn't need it and offset pagination is what the brief's pseudo-code shows.

**Verifying the 100k target.** `npm run seed:bulk` inserts 100k fake customers into the first organization in batches of 5,000 and prints timing for the most common queries (count, page 1, deep offset, search). On a normal laptop the index plan keeps everything except the deep-offset case under 10 ms.

## Soft Delete Integrity

- Customers use TypeORM's `@DeleteDateColumn`. Every list and `findOne` query filters `deletedAt IS NULL`, so soft-deleted rows do **not** appear in any normal endpoint.
- Notes and activity logs are **never** cascade-deleted when a customer is soft-deleted — the foreign key has no `ON DELETE CASCADE` and the service never touches them. The rows stay in the DB exactly as written.
- The notes and activity-log endpoints resolve the parent customer through the org-scoped lookup, which itself filters out deleted customers. Effect: while a customer is soft-deleted, its notes and activity are *invisible* (returning 404), but they remain *stored*. After `POST /customers/:id/restore`, the parent lookup succeeds again and the notes and activity feed reappear unchanged. This is exactly the "restoring customer must restore visibility of notes" behavior the brief specifies.
- Restore is also defensive: it re-runs the email-uniqueness check before flipping `deletedAt` back to `NULL`, so you can't accidentally end up with two live customers sharing an email if a new customer was created with the same address while the old one was deleted.

## Production Improvement: Swagger / OpenAPI

I picked **API documentation** as the production-grade improvement.

`@nestjs/swagger` generates an OpenAPI spec from the controllers and DTOs and serves an interactive UI at `/api/docs`. Every controller is tagged, every DTO field is annotated with `@ApiProperty`, and the Bearer auth scheme is registered so the **Authorize** button in Swagger UI lets you paste a token from `POST /auth/login` and try every endpoint live.

Why this and not, say, rate limiting or caching? For a small internal API with a separate frontend team, the highest-leverage thing you can ship is a typed, browseable contract. It serves three purposes at once: living documentation, a manual QA tool, and an onboarding aid for whoever picks up the frontend later. Rate limiting and caching are solved by infra (an API gateway, a Redis layer); contract docs are much harder to bolt on after the fact and pay off every day.

## Frontend Approach

- **State management.** Server state lives in TanStack Query (`useCustomers`, `useCustomer`, `useNotes`, `useUsers`, `useCustomerActivity` and the matching mutation hooks). UI state lives in Zustand (`useUIStore`) and only tracks which modal is open and which customer is selected.
- **No `any`.** All API responses are typed in `src/types/index.ts`; the axios wrappers in `src/lib/api/*.api.ts` return those types end-to-end.
- **Avoiding re-renders.** Zustand selectors (`useUIStore((s) => s.openCreateModal)`) are used everywhere instead of pulling the whole store, so components only re-render when the slice they read actually changes.
- **Error handling.** Every page and modal renders an `<ErrorMessage>` for query/mutation errors; the axios interceptor catches `401` globally and redirects to `/login`.
- **Loading states.** Every async surface uses `<LoadingSpinner>` (lists, details, modals).
- **Debounced search.** The customer list search is debounced 400 ms with `use-debounce` so each keystroke doesn't fire a request.
- **Reusable components.** `Modal`, `Avatar`, `Pagination`, `SearchInput`, `LoadingSpinner`, `ErrorMessage` are shared between screens.

## Backend Technical Compliance

A quick checklist of the technical requirements from the brief:

- **No `any`.** Strict TypeScript everywhere — `grep -r ": any\| as any" backend/src` returns nothing.
- **DTO validation.** Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` plus `class-validator` decorators on every DTO. Phone is `@Matches(/^\d+$/)`, email is `@IsEmail`, query params are `@Type(() => Number) @IsInt @Min(1)`.
- **Folder structure.** One folder per feature (`auth`, `users`, `customers`, `notes`, `activity-log`, `organizations`) with `controller.ts`, `service.ts`, `module.ts`, `entity.ts`, `dto/`. Cross-cutting helpers live under `common/`.
- **Controller / service split.** Controllers do nothing but parse, delegate, and return. All business logic — guards, transactions, validation — sits in services.
- **Transactions.** `assign()` runs inside `dataSource.transaction()` and uses a passed-through `EntityManager` for the activity-log write.
- **Foreign keys.** Every relation has an explicit `@ManyToOne` with an `onDelete` policy (`CASCADE` for tenant-scoped data, `SET NULL` for nullable references like `assignedTo` and `performedBy`).
- **Manual indexes.** Six manual indexes plus the partial unique index, listed in the Performance section above.

## Trade-offs

- **`synchronize: true` instead of migrations.** Faster for reviewers; would not ship to prod.
- **Offset pagination instead of keyset.** Simpler and matches the brief; deep offsets would slow down past page ~1000.
- **No tests.** I deliberately scoped the test suite out to keep the deliverable focused. The structure is jest-ready (the controllers are thin, services are pure).
- **Soft-delete UI.** There's no "restore" button in the frontend — restore is reachable through the API and Swagger. Surfacing it in the UI would have meant a "show deleted" toggle on the list, which felt out of scope.
- **Frontend slot-count preview.** The assign modal fetches up to 200 customers to show "X/5 slots used" next to each user. The number is for UX; the **only** authoritative cap check lives on the backend, behind the row lock.
- **Swagger over rate limiting / caching.** See the production-improvement section for the reasoning.
