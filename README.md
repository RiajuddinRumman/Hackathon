# Hackathon API

Hackathon API is a NestJS and PostgreSQL backend for managing hackathons,
users, authentication, authorization, and participation.

The API provides:

1. Email and password authentication
2. Session based authorization
3. Participant and administrator roles
4. Hackathon creation and management
5. Hackathon participation
6. Prisma ORM database access
7. Arcjet security protection
8. Global request validation
9. Consistent successful response formatting
10. NestJS observability instrumentation

## Technology stack

### Application framework

| Technology | Purpose |
| --- | --- |
| Node.js | JavaScript runtime |
| TypeScript | Application language |
| NestJS 12 | Backend framework |
| Express | HTTP adapter used by NestJS |
| RxJS | Observable support used by NestJS interceptors |

The repository conventions describe NestJS 11, but the installed application
packages use NestJS 12.

### Authentication and authorization

| Package | Purpose |
| --- | --- |
| `better-auth` | Authentication, sessions, cookies, and user accounts |
| `@thallesp/nestjs-better-auth` | NestJS Better Auth integration, global authentication guard, session decorator, and role decorator |

Authentication uses email and password sign up and sign in. Sessions are stored
in PostgreSQL and use secure HTTP only cookies in the normal browser flow.

### Database

| Package | Purpose |
| --- | --- |
| `prisma` | Prisma CLI, schema management, formatting, migrations, and client generation |
| `@prisma/client` | Type safe database client |
| `@prisma/adapter-pg` | PostgreSQL driver adapter for Prisma |
| `pg` | PostgreSQL connection pool |

The application uses a direct PostgreSQL connection through `PrismaPg`. The
database URL is configured through `DATABASE_URL` in the local environment.
Never commit `.env` or expose database credentials.

### Security and request controls

| Package | Purpose |
| --- | --- |
| `@arcjet/node` | Arcjet Shield WAF, token bucket rate limiting, and bot detection |
| `class-validator` | DTO validation decorators |
| `class-transformer` | Request transformation, including string dates to `Date` values |
| `reflect-metadata` | Decorator metadata support |

### Observability and tooling

| Package | Purpose |
| --- | --- |
| `@nestjs/observe` | Distributed tracing, metrics, logging, and request observability |
| `@nestjs/config` | Environment configuration |
| `oxlint` | Type aware linting |
| `prettier` | Source formatting |
| `jest` | Unit testing |
| `@nestjs/testing` | NestJS testing utilities |
| `supertest` | HTTP testing support |
| `@nestjs/cli` | NestJS build and development commands |
| `typescript` | Type checking and compilation |

## Project structure

```text
src/
  auth/
    auth.ts
    auth.module.ts
  common/
    decorators/
      arcjet-public.decorator.ts
      response-message.decorator.ts
    guards/
      arcjet.guard.ts
    interceptors/
      response.interceptor.ts
    validators/
      is-after-date.validator.ts
      is-future-date.validator.ts
  lib/
    arcjet/
      arcjet.module.ts
      arcjet.service.ts
    database/
      prisma.module.ts
      prisma.service.ts
  module/
    hackathon/
      dto/
        create-hackathon.dto.ts
        update-hackathon.dto.ts
      hackathon.controller.ts
      hackathon.service.ts
      hackathon.module.ts
  users/
    user.controller.ts
    users.controller.ts
    users.service.ts
  app.controller.ts
  app.module.ts
  app.service.ts
  main.ts

prisma/
  schema.prisma
  migrations/

prisma.config.ts
```

## Application bootstrap workflow

The application starts in [src/main.ts](./src/main.ts).

1. NestJS creates the Express application.
2. Better Auth requires `bodyParser: false`, so the application keeps the raw
   request body available to the authentication integration.
3. The global validation pipe transforms and validates DTOs.
4. The global Arcjet guard evaluates Shield, rate limiting, and public route bot
   detection.
5. Better Auth registers its global authentication guard through
   `AuthModule.forRootAsync`.
6. The global response interceptor wraps successful responses.
7. NestJS starts listening on `PORT`, or port `3000` by default.

The global Better Auth guard protects routes unless a route uses the
integration's anonymous access decorator. The root route is marked public for
Arcjet's route policy through `@ArcjetPublic()`. That decorator only controls
Arcjet's public client. Authentication behavior is handled by Better Auth.

## Authentication workflow

Better Auth is configured in [src/auth/auth.ts](./src/auth/auth.ts).

1. A user signs up with a name, email, and password.
2. Better Auth creates a `User` record and a password `Account` record.
3. The admin plugin assigns `PARTICIPANT` by default.
4. The role field is not accepted from the sign up request.
5. Better Auth creates a database backed session.
6. The session token is returned as an HTTP only cookie.
7. Protected routes read the session through the NestJS Better Auth guard.
8. Controllers can read the current session with `@Session()`.

The configured session lifetime is seven days. Session activity can refresh
once per day. Trusted origins come from `BETTER_AUTH_TRUSTED_ORIGINS`, with
`http://localhost:3000` as the local default.

Useful authentication routes include:

```text
POST /api/auth/sign-up/email
POST /api/auth/sign-in/email
POST /api/auth/sign-out
GET  /api/auth/ok
```

Example sign up request:

```json
{
  "name": "Participant User",
  "email": "participant@example.com",
  "password": "StrongPassword123!"
}
```

The following is intentionally rejected:

```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "StrongPassword123!",
  "role": "ADMIN"
}
```

An administrator must be assigned through a controlled administrative process.
Clients cannot promote themselves during sign up.

## Users and roles

### Participant

`PARTICIPANT` is the default role for every new user.

Participants can:

1. Read their own session through `GET /users/me`.
2. Read one user through `GET /user/:id`.
3. Read the hackathon list.
4. Read one hackathon.
5. Join an active hackathon that has not ended.

### Administrator

`ADMIN` is the administrative role.

Administrators can:

1. Read all users through `GET /user/all`.
2. Create hackathons.
3. Update hackathons.
4. Delete hackathons.

Role protection uses `@Roles(['ADMIN'])` and
`@Roles(['PARTICIPANT'])` from `@thallesp/nestjs-better-auth`. The
authentication guard is global, so controllers do not need to register the
same guard again.

## Hackathon data model

The Prisma schema is defined in [prisma/schema.prisma](./prisma/schema.prisma).

### User

Users include:

```text
id
email
name
role
emailVerified
image
banned
banReason
banExpires
createdAt
updatedAt
```

Users also relate to sessions, accounts, authored hackathons, and
hackathon participation records.

### Hackathon

A hackathon includes:

```text
id
name
description
startDate
endDate
isActive
authorId
createdAt
updatedAt
```

Each hackathon belongs to one author through `authorId`.

### HackathonParticipant

Participation includes:

```text
id
hackathonId
userId
joinedAt
```

The database enforces this rule:

```prisma
@@unique([hackathonId, userId])
```

This prevents a user from joining the same hackathon more than once, even if
two requests arrive at nearly the same time.

## API routes

All routes require an authenticated session unless explicitly stated
otherwise.

### User routes

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/users/me` | Authenticated users | Returns the current session user |
| `GET` | `/user/all` | Administrators | Returns all users |
| `GET` | `/user/:id` | Authenticated users | Returns one user or `404` |

Sensitive account fields such as passwords, access tokens, refresh tokens, and
session records are not selected in user responses.

### Hackathon routes

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/hackathon` | Administrators | Creates a hackathon |
| `GET` | `/hackathon` | Authenticated users | Returns all hackathons |
| `GET` | `/hackathon/:id` | Authenticated users | Returns one hackathon or `404` |
| `PATCH` | `/hackathon/:id` | Administrators | Updates a hackathon |
| `DELETE` | `/hackathon/:id` | Administrators | Deletes a hackathon |
| `POST` | `/hackathon/:id?join` | Participants | Joins a hackathon |

The create route takes the author ID from the logged in session. Clients cannot
choose or override the author ID.

The join route checks:

1. The hackathon exists.
2. The hackathon is active.
3. The end date has not passed.
4. The user has not already joined.

It returns `400 Bad Request` when the user has already joined, and relies on
the database composite unique constraint to handle concurrent duplicate
requests safely.

## Request and response format

### Successful responses

The global response interceptor in
[src/common/interceptors/response.interceptor.ts](./src/common/interceptors/response.interceptor.ts)
wraps every successful response:

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {}
}
```

Write operations use the `@ResponseMessage()` decorator:

```json
{
  "statusCode": 201,
  "message": "Hackathon created successfully",
  "data": {}
}
```

The decorator is defined in
[src/common/decorators/response-message.decorator.ts](./src/common/decorators/response-message.decorator.ts).

### Validation errors

The global validation pipe in [src/main.ts](./src/main.ts) uses
`class-validator` and `class-transformer`.

Validation errors are returned as a `400 Bad Request` with property and
message entries:

```json
{
  "statusCode": 400,
  "message": [
    {
      "property": "name",
      "message": "name must be longer than or equal to 3 characters"
    }
  ],
  "error": "Bad Request"
}
```

The Hackathon DTO validates:

1. `name` as a required string with at least three characters.
2. `description` as an optional string between ten and one thousand
   characters.
3. `startsAt` as a future date.
4. `endsAt` as a future date after `startsAt`.
5. `isActive` as an optional boolean.

`@Type(() => Date)` converts incoming date strings into JavaScript `Date`
values before validation.

Errors raised by NestJS exceptions retain the normal NestJS error shape. The
successful response interceptor does not rewrite exception responses.

## Security workflow

Arcjet is configured in [src/lib/arcjet/arcjet.service.ts](./src/lib/arcjet/arcjet.service.ts).

The global Arcjet guard applies:

1. Shield WAF protection in live mode.
2. Token bucket rate limiting with a capacity of 100 requests.
3. A refill rate of 10 requests every 60 seconds.
4. AI bot detection on routes marked public for Arcjet.

Arcjet denials return:

```text
403 Forbidden
```

Rate limit denials return:

```text
429 Too Many Requests
```

Arcjet requires `ARCJET_KEY` to be configured. The service fails during
startup when the key is missing rather than silently running without the
security policy.

## Environment variables

Create a local `.env` file and provide values similar to:

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
ARCJET_KEY=your_arcjet_key
BETTER_AUTH_SECRET=your_better_auth_secret
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000
PORT=3000
```

Do not copy real credentials into this file in documentation, commits, issue
reports, or chat messages.

The Prisma configuration in [prisma.config.ts](./prisma.config.ts) reads
`DATABASE_URL`. The runtime Prisma service uses the same variable to create a
PostgreSQL pool.

## Local setup

### Install dependencies

```bash
npm install
```

### Format the Prisma schema

```bash
npm run db:format
```

### Apply migrations

For development:

```bash
npm run db:migrate -- --name your_migration_name
```

### Generate Prisma Client

```bash
npm run db:generate
```

### Start the application

```bash
npm start
```

Development watch mode:

```bash
npm run start:dev
```

The default local URL is:

```text
http://localhost:3000
```

## Example requests

### Sign up

```bash
curl -i -c cookies.txt \
  -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Participant User",
    "email": "participant@example.com",
    "password": "StrongPassword123!"
  }'
```

### Sign in

```bash
curl -i -c cookies.txt \
  -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "participant@example.com",
    "password": "StrongPassword123!"
  }'
```

### Read the current user

```bash
curl -b cookies.txt http://localhost:3000/users/me
```

### Create a hackathon as an administrator

```bash
curl -X POST http://localhost:3000/hackathon \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Innovation Challenge",
    "description": "Build an innovative AI solution for a real world problem.",
    "startsAt": "2027-01-15T09:00:00.000Z",
    "endsAt": "2027-01-17T18:00:00.000Z",
    "isActive": true
  }'
```

### Read hackathons

```bash
curl -b cookies.txt http://localhost:3000/hackathon
```

### Join a hackathon as a participant

```bash
curl -X POST "http://localhost:3000/hackathon/HACKATHON_ID?join" \
  -b cookies.txt
```

The `?join` query marker is required by the current route contract.

### Sign out

```bash
curl -X POST http://localhost:3000/api/auth/sign-out \
  -b cookies.txt
```

## Database commands

The database scripts are defined in [package.json](./package.json):

```bash
npm run db:format
npm run db:migrate -- --name your_migration_name
npm run db:generate
npx prisma migrate status
```

The current Prisma migrations create the Better Auth tables, role fields,
administrative fields, and Hackathon participation tables.

## Testing and quality checks

The project uses Jest with NestJS testing utilities.

Run the unit test suite:

```bash
npm test
```

Run tests serially:

```bash
npm test -- --runInBand
```

Run linting:

```bash
npm run lint
```

Run the TypeScript and NestJS build:

```bash
npm run build
```

Run end to end tests when configured:

```bash
npm run test:e2e
```

Run coverage:

```bash
npm run test:cov
```

### Test cases handled

The current test suite verifies that:

1. The root controller is created correctly.
2. The Hackathon controller is created correctly with mocked Prisma and
   authentication dependencies.
3. The Hackathon service is created correctly with a mocked Prisma service.
4. The application builds successfully.
5. Type aware linting passes.
6. Prisma migrations are applied and the database is up to date.

Manual smoke checks also covered:

1. Unauthenticated access returns `401`.
2. Authenticated participant sign up receives the `PARTICIPANT` role.
3. Sending a role during sign up is rejected.
4. Authenticated sessions can access `/users/me`.
5. Participant users cannot access administrator routes.
6. Hackathon creation uses the logged in session user as author.
7. Unknown user and hackathon IDs return `404`.
8. Joining an inactive or ended hackathon returns `400`.
9. Duplicate participation returns `400`.
10. Successful writes include custom response messages.

The tests use mocks for isolated unit tests. Database behavior is also
validated through Prisma migration and live request smoke checks.

## Imports and module responsibilities

### External imports

The source imports these external APIs:

```text
@nestjs/common
@nestjs/core
@nestjs/config
@nestjs/testing
@nestjs/observe
@prisma/client
@prisma/adapter-pg
@thallesp/nestjs-better-auth
better-auth
better-auth/adapters/prisma
better-auth/plugins/admin
@arcjet/node
class-validator
class-transformer
pg
rxjs
```

### Internal imports

The application imports these local modules:

```text
AppModule
AppController
AppService
AppAuthModule
createAuth
UsersModule
UsersController
UserController
UsersService
HackathonModule
HackathonController
HackathonService
CreateHackathonDto
UpdateHackathonDto
PrismaModule
PrismaService
ArcjetModule
ArcjetService
ArcjetGuard
ArcjetPublic
ResponseMessage
ResponseInterceptor
IsFutureDate
IsAfterDate
```

Infrastructure integrations use global NestJS modules and constructor
injection. Services are not instantiated directly by feature code.

## Skills and development workflows used

The implementation used these documented skills and workflows:

1. `arcjet`, to configure Arcjet Node protection, Shield WAF, rate limiting,
   bot detection, and request denials.
2. `architect`, to define the Better Auth integration before implementation.
3. `better-auth-best-practices`, to configure Better Auth according to the
   installed version and NestJS integration requirements.
4. `develop`, to implement the approved authentication, users, Hackathon,
   DTO, validation, and request pipeline changes.
5. Prisma ORM guidance, to create the Prisma schema, PostgreSQL adapter,
   migrations, and generated client.
6. `document`, to prepare repository documentation from the implemented
   project behavior.

The architecture decisions included database backed Better Auth sessions,
secure HTTP only cookies, protected routes by default, environment based
trusted origins, and administrator and participant roles.

## Original implementation prompts

The following prompts were the primary prompts that generated the
implementation. Follow up questions and troubleshooting messages are not
included.

### Arcjet

```text
Add Arcjet protection to my app
```

```text
Use the Arcjet MCP tools to check how to integrate Arcjet in this NestJS project.
```

```text
Install the Arcjet NestJS/Node SDK dependency.
Add ARCJET_KEY to the environment configuration.
Create a dedicated global ArcjetModule and injected ArcjetService.
Add a NestJS guard or interceptor that calls Arcjet for incoming requests.
Configure initial protection rules, typically:
Shield/WAF protection
Rate limiting
Bot detection for public endpoints
Return explicit HTTP responses for denied Arcjet decisions.
Validate with the project’s build and tests.
```

```text
Add Arcjet Shield WAF
```

### Prisma and database

```text
Create a new NestJS API with Prisma ORM, seed it, and deploy it to Prisma Compute.
```

```text
Add DATABASE_URL in .env
```

The Prisma work was later integrated into the existing repository with a
global Prisma module, injected Prisma service, PostgreSQL adapter, schema,
migrations, and generated client.

### Better Auth

```text
/architect read # NestJS Integration (/docs/integrations/nestjs)

Integrate Better Auth with NestJS.
```

```text
Follow the NestJS integration guide exactly. Users should have a role, either PARTICIPANT or ADMIN defaulting to PARTICIPANT, and it can't be set during sign-up.

Then migrate and regenarate the DB.
```

### Users and Hackathons

```text
Hold the user module with two endpoints:
Get/user/all, which needs to return all users (admin only),
Get/user/id, which returns a single user by ID and throws a not found exception if not found.

Use Prisma service for database access.
Use the auth guard for roles decorator from @thallesp/nestjs-better-auth for route protection.
```

```text
Create a global response interceptor that wraps every response in {statusCode, message, data}.

Support a @ResponseMessage decorator for custom message, defaulting to "Success".
Write it globally in main.ts.
```

```text
Create a Hackathon and HackathonParticipant Prisma schema.

Hackathon has name, optional description, start & end dates, is active, and belongs to a User author.

Hackathon Participant tracks which user joined which hackathon with a unique constraint on hackathonId + userId.

Then run db:format, db:migrate, db:generate.
```

```text
Install class-validator and class-transformer.

Set up a global validation pipe in main.ts that returns clean validation errors as an array of {property, message} objects using a bad request exception.
```

```text
Create a Hackathon DTO with:

name: minimum 3 characters
optional description: minimum 10, maximum 1000 characters
startsAt and endsAt as future dates
Optional isActive: boolean

Use @Type(() => Date) to transform date strings.
```

```text
Build the Hackathon CRUD service and controller.

Admins can create, update, and delete, and everyone else can read.

Pass the logged-in user's ID as author ID when creating.

Use auth-guard and roles from the nestjs-better-auth package.

Add a response message on write operations.
```

```text
Add a POST /hackathon/:id?join endpoint. Participant only.

We want to check the hackathon exists, that is active is set to true, and endsAt hasn't passed.

Prevent duplicate joins using the unique constratin on hackathon ID plus the user id. Throw a bad request exception if already joined.

Create the Hackathon Participant record and return it.
```

## Useful references

1. [NestJS documentation](https://docs.nestjs.com)
2. [Better Auth documentation](https://better-auth.com/docs)
3. [NestJS Better Auth integration](https://github.com/ThallesP/nestjs-better-auth)
4. [Prisma documentation](https://www.prisma.io/docs)
5. [Arcjet documentation](https://docs.arcjet.com)
6. [NestJS Observe](https://observe.nestjs.com)

## License

This project is private and currently has no public license.
