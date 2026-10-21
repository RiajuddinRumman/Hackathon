# 0001. Integrate Better Auth with NestJS

**Date**: 2026-10-22
**Status**: Accepted

## Summary

This decision adds Better Auth as the authentication boundary for the NestJS API. It uses email and password sign in, database backed sessions, and secure cookies. Protected routes stay protected by default, while selected routes can allow anonymous access.

The existing PostgreSQL database remains the single source of truth. Better Auth records are added to the current Prisma schema in one reviewed migration.

## Context

The API currently has Prisma database connectivity and Arcjet request protection, but it has no application authentication or session model. New routes would otherwise need to invent their own credential handling, cookie behavior, and access checks.

The existing User model uses an integer identifier. Its rows are considered empty or disposable, so the model can adopt Better Auth's string identifier and required authentication fields without a compatibility migration for live users.

This topic includes authentication, session handling, and the default route boundary. Roles, organizations, email delivery, social sign in, and multi factor authentication are outside this decision.

## Requirements

**User stories**:

1. As a user, I want to create an account and sign in with email and password so that I can use protected API routes.
2. As an API client, I want a session endpoint so that I can determine the current signed in user.
3. As an API owner, I want new routes protected by default so that an omitted guard cannot expose private data.
4. As an API client, I want unauthenticated access to return a consistent JSON error so that I can handle it reliably.

**Acceptance criteria**:

1. **AC-1**: Better Auth exposes its standard handler under `/api/auth/*` and supports email and password account creation, sign in, and sign out.
2. **AC-2**: A successful sign in creates a database backed session and sends a secure, httpOnly cookie with a seven day lifetime and activity refresh.
3. **AC-3**: `GET /users/me` returns the authenticated user from the current session and returns JSON status `401` when no valid session exists.
4. **AC-4**: Routes are protected by default, and an explicit anonymous decorator is required for public routes such as authentication endpoints or health checks.
5. **AC-5**: Prisma contains the Better Auth User, Session, Account, and Verification records with the agreed keys, relations, and constraints.
6. **AC-6**: Trusted origins come from environment configuration, with `http://localhost:3000` as the development default.
7. **AC-7**: Invalid credentials, expired sessions, revoked sessions, and malformed cookies fail without exposing password material or session secrets.
8. **AC-8**: Existing Arcjet protection continues to run for authentication and protected API requests.

## Options considered

### Option 1: Better Auth with the NestJS community integration

Use Better Auth with its Prisma adapter and `@thallesp/nestjs-better-auth` for the NestJS handler, global guard, session decorator, and anonymous route decorator.

**Pros**:

1. Uses a maintained authentication library instead of custom password and session code.
2. Matches the current NestJS and Prisma stack.
3. Provides a small integration surface with standard session behavior.

**Cons**:

1. The NestJS package is community maintained.
2. Its request and body parser integration must be tested against the current NestJS version.

### Option 2: Custom NestJS controller and guard around Better Auth

Use Better Auth core and write the NestJS route adapter and access guard inside this repository.

**Pros**:

1. Full control over request parsing, error mapping, and dependency injection.
2. Less reliance on a community NestJS adapter.

**Cons**:

1. More code owns security sensitive behavior.
2. Cookie, route matching, and session context behavior can drift from Better Auth guidance.

### Option 3: Build authentication directly in the application

Implement password hashing, sessions, cookies, and account flows without Better Auth.

**Pros**:

1. No additional authentication package.

**Cons**:

1. Recreates difficult security behavior.
2. Increases the risk of session fixation, token leakage, incorrect expiry, and password handling bugs.

## Decision

**Chosen option**: Option 1: Better Auth with the NestJS community integration

Use Better Auth version 1.7.x with the Prisma adapter and `@thallesp/nestjs-better-auth`. Keep the current direct PostgreSQL Prisma adapter for runtime and migrations. Do not switch `DATABASE_URL` to a `prisma+postgres` Accelerate URL until a separate adapter decision is made.

**Implementation skills**: `better-auth-best-practices` (`project`, `/Users/macbook/Desktop/Hackathon/.agents/skills/better-auth-best-practices/`)

## Rationale

Better Auth removes the highest risk work from the feature while preserving application ownership of the database and session records. The community NestJS integration is the smallest path that provides the required global guard and session access patterns.

The custom adapter remains a valid fallback if the community package fails compatibility checks. Building authentication without a proven library is rejected because the project does not need to own password and session security primitives.

## Feature design

**Data model sketch**:

| Entity | Key fields | Relations and constraints |
|---|---|---|
| User | `id` string primary key, `email` unique, `name`, `image` nullable, `emailVerified`, `createdAt`, `updatedAt` | Has many sessions and accounts |
| Session | `id` string primary key, `token` unique, `expiresAt`, `ipAddress` nullable, `userAgent` nullable, `createdAt`, `updatedAt`, `userId` | Belongs to one User, indexed by `userId` |
| Account | `id` string primary key, `providerId`, `accountId`, token fields nullable, `password` nullable, `createdAt`, `updatedAt`, `userId` | Belongs to one User, unique on `providerId` and `accountId` |
| Verification | `id` string primary key, `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt` | No direct User relation, indexed for lookup and expiry |

The existing integer User identifier is replaced because existing rows are disposable. Better Auth owns the exact field mappings and adapter model names.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/auth/*` | Standard Better Auth methods | Email, password, session cookie, and flow specific fields | Better Auth response and session cookie | Anonymous for sign up and sign in, session for protected auth actions | Standard Better Auth 4xx responses |
| `/users/me` | GET | Session cookie | Current user identity and safe profile fields | Required | 401 JSON |
| Existing health or root route | Existing methods | None | Existing response | Explicit anonymous decorator | Existing errors |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Sign up | User identifier | Better Auth generated identifier |
| Sign up | Email and name | Validated request fields |
| Sign in | Session token and expiry | Better Auth session creation and configured seven day lifetime |
| Session check | Current user | Session token lookup through the Prisma adapter |
| Session check | User profile fields | User database record, excluding password and token material |
| Access failure | HTTP status and JSON error | NestJS auth guard and Better Auth error mapping |
| Trusted origin check | Allowed origin list | Environment configuration |

**Key invariants**:

1. Email is unique and normalized according to Better Auth behavior.
2. Password material is never returned by an API response or logged.
3. Session tokens are unique, expire after seven days, and refresh only through valid session activity.
4. Protected routes require a valid session unless explicitly marked anonymous.
5. Authentication failures do not bypass Arcjet protection.
6. Cookie security settings follow the deployment protocol. Production cookies must be secure.
7. Better Auth model names and Prisma model names remain aligned with the adapter configuration.

**Security model**:

Authentication is session based. Sign up and sign in are anonymous operations. User identity endpoints require a valid session. There are no roles or organization boundaries in this slice. Passwords are handled only by Better Auth. Session cookies are httpOnly and secure in production. CSRF and origin checks remain enabled. Arcjet remains the outer request protection layer.

**Configuration required**:

1. `BETTER_AUTH_SECRET`: at least 32 random characters, used for authentication secrets.
2. `BETTER_AUTH_URL`: the public API base URL.
3. `BETTER_AUTH_TRUSTED_ORIGINS`: comma separated trusted origins, with localhost in development.
4. `DATABASE_URL`: the direct PostgreSQL URL used by the current Prisma driver adapter and Better Auth Prisma adapter.
5. `DIRECT_URL`: the direct PostgreSQL URL used by migration tooling if the Prisma configuration requires a separate migration connection.

**Critical test scenarios**:

1. Happy path: create an account, sign in, call `/users/me`, sign out, and verify the session is no longer accepted, verifies **AC-1**, **AC-2**, and **AC-3**.
2. Anonymous access: call `/users/me` without a cookie and verify a JSON `401`, verifies **AC-3** and **AC-4**.
3. Invalid credentials: submit an incorrect password and verify a standard 4xx response with no secret material, verifies **AC-7**.
4. Expired or revoked session: use an invalidated session cookie and verify `401`, verifies **AC-2**, **AC-3**, and **AC-7**.
5. Route default: add a protected test route without an anonymous decorator and verify it rejects anonymous access, verifies **AC-4**.
6. Trusted origin: reject an origin outside the configured list, verifies **AC-6**.
7. Arcjet continuity: send authentication and session requests through the global Arcjet guard and verify the existing protection still evaluates them, verifies **AC-8**.
8. Database shape: apply the migration and verify all four Better Auth records, keys, indexes, and relations, verifies **AC-5**.

## Build plan

1. Install Better Auth 1.7.x, the Prisma adapter, and the NestJS community integration. Add configuration validation for the required secrets and origins, satisfies **AC-1**, **AC-2**, **AC-6**, and **AC-7**.
2. Generate and review the Better Auth Prisma schema against the existing User model. Apply one migration that changes User to the string identifier shape and adds Session, Account, and Verification, satisfies **AC-5**.
3. Create the Better Auth instance with the Prisma adapter, email and password enabled, seven day database sessions, secure cookie settings, trusted origins, and no required email verification, satisfies **AC-1**, **AC-2**, **AC-6**, and **AC-7**.
4. Register the Better Auth NestJS module and standard handler under `/api/auth/*`. Mark sign up and sign in operations anonymous while retaining the global route protection default, satisfies **AC-1** and **AC-4**.
5. Add the protected `/users/me` endpoint and map missing or invalid sessions to JSON `401`, satisfies **AC-3**, **AC-4**, and **AC-7**.
6. Verify Arcjet ordering and behavior around authentication routes, then add unit and end to end coverage for the critical scenarios, satisfies **AC-7** and **AC-8**.
7. Run Prisma generation, migration checks, build, lint, unit tests, and an authenticated smoke test, satisfies **AC-1** through **AC-8**.

## Consequences

**Positive**:

1. Authentication and session security use a proven library.
2. New NestJS routes are private by default.
3. Session revocation is possible through database records.
4. The existing Prisma and Arcjet infrastructure remains in use.

**Negative or tradeoffs**:

1. The project depends on a community NestJS integration package.
2. The first migration changes the User identifier type.
3. Email verification and password recovery need a future mail integration.

**Neutral**:

1. The API remains a modular monolith.
2. Social providers, roles, organizations, and multi factor authentication remain future decisions.

## Follow-up

1. Add the Better Auth conventions to an auth area context file such as `src/auth/AGENTS.md` before implementation begins.
2. Decide on an email provider before enabling email verification or password reset delivery.
3. Create a separate decision for Prisma Accelerate runtime usage if the application needs pooled or cached Prisma access.
4. Consider adding a community skill entry for Better Auth to `AGENTS.md` so future auth work loads the same conventions.

## References

**Project sources**:

1. `AGENTS.md`, NestJS dependency injection and infrastructure module conventions.
2. `prisma/schema.prisma`, current User model and PostgreSQL schema.
3. `better-auth-best-practices`, the installed Better Auth integration guidance.

**Practices and standards**:

1. OWASP session management guidance.
2. Secure cookie and CSRF protection practices.
3. Strangler migration principles for changing an existing data model.

**Links**:

1. Better Auth documentation index: https://better-auth.com/llms.txt
