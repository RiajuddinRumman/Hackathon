# Hackathon API

Hackathon API is a backend for running online hackathons. It lets
administrators create and manage hackathons, and lets participants discover
active hackathons and join them.

The project provides:

1. Email and password sign up and sign in
2. Secure session based authentication
3. Participant and administrator roles
4. Hackathon creation, reading, updating, and deletion
5. Hackathon participation with duplicate join protection
6. PostgreSQL persistence through Prisma ORM
7. Request validation and consistent successful responses
8. Arcjet security protection
9. Application observability through NestJS Observe

## How the application works

There are two types of users.

### Participant

Every new account is a participant by default.

Participants can:

1. Sign up and sign in
2. View their own account
3. Read user and Hackathon information
4. Join an active Hackathon that has not ended

### Administrator

Administrators manage the Hackathon platform.

Administrators can:

1. View all users
2. Create Hackathons
3. Update Hackathons
4. Delete Hackathons

Users cannot choose `ADMIN` during sign up. This prevents a new user from
promoting themselves.

## Main API routes

All application routes require an authenticated session unless the route is
explicitly public.

### Authentication

```text
POST /api/auth/sign-up/email
POST /api/auth/sign-in/email
POST /api/auth/sign-out
GET  /api/auth/ok
```

### Users

```text
GET /users/me
GET /user/:id
GET /user/all
```

`GET /user/all` is available only to administrators. `GET /user/:id` returns
one user or a `404 Not Found` response.

### Hackathons

```text
POST   /hackathon
GET    /hackathon
GET    /hackathon/:id
PATCH  /hackathon/:id
DELETE /hackathon/:id
POST   /hackathon/:id?join
```

Administrators can create, update, and delete Hackathons. Authenticated users
can read them. Participants can join a Hackathon with the join route.

The join operation checks that:

1. The Hackathon exists
2. `isActive` is `true`
3. The end date has not passed
4. The participant has not already joined

The database also enforces a unique combination of `hackathonId` and `userId`,
so duplicate participation is prevented even when requests arrive at the same
time.

## Technology used

### Backend

1. Node.js
2. TypeScript
3. NestJS 12
4. Express
5. RxJS

### Authentication

1. `better-auth` for authentication, sessions, cookies, and accounts
2. `@thallesp/nestjs-better-auth` for NestJS integration, session access,
   authentication guards, and role checks

### Database

1. PostgreSQL
2. Prisma ORM
3. `@prisma/client`
4. `@prisma/adapter-pg`
5. `pg`

### Security

1. `@arcjet/node`
2. Arcjet Shield WAF
3. Arcjet token bucket rate limiting
4. Arcjet bot detection for public routes

### Validation and application support

1. `class-validator`
2. `class-transformer`
3. `@nestjs/config`
4. `@nestjs/observe`
5. `reflect-metadata`
6. `rxjs`

### Development tools

1. NestJS CLI
2. TypeScript
3. Jest
4. NestJS testing utilities
5. Supertest
6. Oxlint
7. Prettier

## Project structure

```text
src/
  auth/                         Better Auth configuration
  common/                       Shared guards, decorators, interceptors, validators
  lib/arcjet/                   Arcjet module and service
  lib/database/                 Prisma module and service
  module/hackathon/             Hackathon module, controller, service, and DTOs
  users/                        User controllers and service
  app.module.ts                 Root NestJS module
  main.ts                       Application bootstrap

prisma/
  schema.prisma                 Database models
  migrations/                   Database migration history

prisma.config.ts                Prisma 7 configuration
```

## Database models

The database schema is in [prisma/schema.prisma](./prisma/schema.prisma).

### User

Users contain their identity, email, role, account status, sessions, and
authentication accounts.

### Hackathon

A Hackathon contains:

```text
name
description
startDate
endDate
isActive
authorId
createdAt
updatedAt
```

Each Hackathon belongs to the user who created it.

### HackathonParticipant

This model connects a user to a Hackathon:

```text
hackathonId
userId
joinedAt
```

The schema uses this constraint:

```prisma
@@unique([hackathonId, userId])
```

## Response format

Successful responses are wrapped by a global interceptor:

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {}
}
```

Write operations use custom messages, for example:

```json
{
  "statusCode": 201,
  "message": "Hackathon created successfully",
  "data": {}
}
```

Validation errors are returned as clean property and message entries:

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

## Security

Arcjet is registered as a global NestJS guard.

It provides:

1. Shield WAF protection
2. Token bucket rate limiting
3. AI bot detection for routes marked public
4. Explicit `403 Forbidden` responses for blocked requests
5. Explicit `429 Too Many Requests` responses for rate limits

Better Auth also registers a global authentication guard. Routes use
`@Roles(['ADMIN'])` and `@Roles(['PARTICIPANT'])` where a specific role is
required.

## Environment setup

Create a local `.env` file:

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
ARCJET_KEY=your_arcjet_key
BETTER_AUTH_SECRET=your_secret_at_least_32_characters_long
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000
PORT=3000
```

Never commit `.env` or share real credentials. `DATABASE_URL` is used by both
Prisma and the PostgreSQL runtime adapter.

## Run the project

Install dependencies:

```bash
npm install
```

Format the Prisma schema:

```bash
npm run db:format
```

Apply a development migration:

```bash
npm run db:migrate -- --name your_migration_name
```

Generate Prisma Client:

```bash
npm run db:generate
```

Start the application:

```bash
npm start
```

For watch mode:

```bash
npm run start:dev
```

The local server runs at:

```text
http://localhost:3000
```

## Example request flow

### 1. Create an account

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

New accounts receive the `PARTICIPANT` role.

### 2. Sign in

```bash
curl -i -c cookies.txt \
  -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "participant@example.com",
    "password": "StrongPassword123!"
  }'
```

### 3. Read the current user

```bash
curl -b cookies.txt http://localhost:3000/users/me
```

### 4. Create a Hackathon as an administrator

```bash
curl -X POST http://localhost:3000/hackathon \
  -b admin-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Innovation Challenge",
    "description": "Build an innovative AI solution for a real world problem.",
    "startsAt": "2027-01-15T09:00:00.000Z",
    "endsAt": "2027-01-17T18:00:00.000Z",
    "isActive": true
  }'
```

The author ID comes from the authenticated administrator session. It is not
accepted from the request body.

### 5. Read Hackathons

```bash
curl -b cookies.txt http://localhost:3000/hackathon
```

### 6. Join a Hackathon

```bash
curl -X POST \
  "http://localhost:3000/hackathon/HACKATHON_ID?join" \
  -b cookies.txt
```

## How the project was built

The project was built in the following stages.

### Stage 1: Create the NestJS application

The project started as a NestJS TypeScript API using the Express adapter.
The standard NestJS module, controller, service, and test structure was kept
as the application grew.

### Stage 2: Add Arcjet security

Arcjet MCP tools were used to inspect the Arcjet workspace and integration
options. The application then received:

1. A global `ArcjetModule`
2. An injected `ArcjetService`
3. A global `ArcjetGuard`
4. Shield WAF protection
5. Token bucket rate limiting
6. AI bot detection for public routes
7. Explicit error responses for denied requests

The official NestJS Arcjet package was not used because it did not support the
installed NestJS version. The Node SDK was integrated through a NestJS service
and guard instead.

### Stage 3: Add Prisma and PostgreSQL

Prisma documentation and Prisma tools were used to configure PostgreSQL.
The application received:

1. A Prisma schema
2. A Prisma 7 configuration file
3. A global `PrismaModule`
4. An injected `PrismaService`
5. A PostgreSQL pool with `PrismaPg`
6. Better Auth database tables
7. Prisma migration history
8. Generated Prisma Client

### Stage 4: Add Better Auth

The Better Auth NestJS integration guide was used to add:

1. Email and password authentication
2. Database backed sessions
3. HTTP only session cookies
4. Protected routes by default
5. `PARTICIPANT` and `ADMIN` roles
6. A default participant role
7. Role checks through the Better Auth roles decorator
8. The protected `/users/me` route

The NestJS integration requires the application to use
`bodyParser: false`, which is configured in `src/main.ts`.

### Stage 5: Add users and Hackathons

The users module was expanded with user lookup routes. The Hackathon module
was then built with:

1. Prisma Hackathon models
2. Create and update DTOs
3. Administrator protected write routes
4. Authenticated read routes
5. Session based author assignment
6. Participant join logic
7. Duplicate join protection
8. Active and end date checks

### Stage 6: Add validation and response handling

Global request handling was added in `src/main.ts`:

1. `ValidationPipe` for DTO validation
2. `class-transformer` date conversion
3. Clean validation error objects
4. A global response interceptor
5. The `@ResponseMessage()` decorator

Custom validators were added for future dates and correct Hackathon date order.

### Stage 7: Review and verify behavior

The request pipeline was reviewed for logical errors and unhandled cases.
This review found and fixed:

1. Static date validation that became stale after application startup
2. Missing validation that `endsAt` must be after `startsAt`
3. Duplicate registration of the Better Auth guard on controllers

## Testing

Run the unit tests:

```bash
npm test
```

Run tests serially:

```bash
npm test -- --runInBand
```

Run the build:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

Check migration status:

```bash
npx prisma migrate status
```

The tests currently verify that:

1. The root controller is created correctly
2. The Hackathon controller is created with mocked dependencies
3. The Hackathon service is created with a mocked Prisma service
4. The application compiles successfully
5. Type aware linting passes
6. Prisma migrations are applied

Manual request checks verified:

1. Unauthenticated requests return `401`
2. Participant accounts receive the default role
3. Clients cannot submit `ADMIN` during sign up
4. Participants cannot access administrator routes
5. Unknown IDs return `404`
6. Inactive Hackathons cannot be joined
7. Ended Hackathons cannot be joined
8. Duplicate joins return `400`
9. Successful writes include custom response messages

The unit tests mock infrastructure dependencies so they remain fast and
isolated. Prisma migrations and request smoke tests verify integration
behavior.

## Skills and MCP servers used

### Skills

The implementation used these skills:

1. `architect`, to make and record the Better Auth architecture decisions
2. `better-auth-best-practices`, to follow the installed Better Auth version
3. `arcjet`, to integrate Arcjet protection
4. `develop`, to implement the application features
5. `document`, to prepare this project documentation

### MCP servers

The implementation used these MCP servers:

1. Arcjet MCP Server, to inspect Arcjet teams, sites, rules, guards, and
   protection configuration
2. Prisma MCP Server, to inspect Prisma projects and databases, create
   connection information, and work with Prisma Postgres
3. GitHub MCP Server, available for repository and project reference

The implementation also used official documentation and local package
documentation for NestJS, Prisma, Better Auth, and Arcjet.

## Useful documentation

1. [NestJS documentation](https://docs.nestjs.com)
2. [Better Auth documentation](https://better-auth.com/docs)
3. [NestJS Better Auth integration](https://github.com/thallesp/nestjs-better-auth)
4. [Prisma documentation](https://www.prisma.io/docs)
5. [Arcjet documentation](https://docs.arcjet.com)
6. [NestJS Observe](https://observe.nestjs.com)

## License

This project is private and does not currently declare a public license.
