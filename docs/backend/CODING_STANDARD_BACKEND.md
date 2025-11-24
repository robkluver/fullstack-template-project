# Backend Coding Standards

**Scope:** Node.js 20.x, AWS Lambda, DynamoDB (Single Table), Terraform.
**Architecture:** Clean Architecture with Dependency Injection (TSyringe).

## 1. Architectural Layers
We enforce a strict separation of concerns using **Dependency Injection**. Dependencies point INWARD.

```text
Presentation (Handlers) -> Application (Use Cases) -> Domain (Entities) <- Infrastructure (Storage/HTTP)
````

### Layers & Directory Structure

1.  **Presentation** (`src/handlers/`)
      * Lambda entry points.
      * **Responsibility:** Orchestration only. No business logic.
      * **Validation:** Data contract validation (Zod) — request body shape, auth tokens, and query parameters.
2.  **Application** (`src/application/usecases/`)
      * **Responsibility:** Orchestrates business logic.
      * **Validation:** Semantic Validation (checks the state of the data) or Business Rule Validation.
      * *Example:* "If user is active, then send email."
      * *Dependencies:* Depends on Domain Interfaces.
3.  **Domain** (`src/domain/entities/`, `src/domain/interfaces/`)
      * **Entities:** Pure TypeScript types/classes (including typescript interfaces) defining data models.
      * **Interfaces:** Data contracts for repositories and external services.
      * **Constraint:** Must NOT depend on any outer layer (no DynamoDB imports here).
4.  **Infrastructure** (`src/infrastructure/storage/`, `src/infrastructure/http/`)
      * **Storage:** DynamoDB calls (`PutItem`, `Query`), S3 interactions.
      * **Http:** Adapters for external APIs (Stripe, SendGrid).

-----

## 2. Lambda Handler Pattern

Every handler must follow this try-catch-response pattern. Use `reflect-metadata` for DI.

```typescript
import 'reflect-metadata'; // Must be first
import { container } from '@/di/container';
import { CreateUser } from '@/application/usecases/CreateUser';
import { z } from 'zod';

// Contract Validation Schema
const schema = z.object({ email: z.string().email() });

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    // 1. Validate Input (Contract)
    const body = JSON.parse(event.body || '{}');
    const { email } = schema.parse(body);

    // 2. Resolve Dependency
    const useCase = container.resolve(CreateUser);

    // 3. Execute Business Logic
    const result = await useCase.execute(email);

    // 4. Return Standard Response
    return {
      statusCode: 201,
      body: JSON.stringify({ data: result }),
    };
  } catch (error) {
    // 5. Centralized Error Handling
    return handleApiError(error);
  }
};
```

-----

## 3. Dependency Injection (TSyringe)

Since interfaces are erased at runtime, use string tokens matching the interface name.

```typescript
// src/di/container.ts
import { DynamoUserRepository } from '@/infrastructure/storage/dynamodb/DynamoUserRepository';

// Register the Interface Token to the Concrete Class
container.register('UserRepository', { useClass: DynamoUserRepository });
```

```typescript
// src/application/usecases/CreateUser.ts
import { injectable, inject } from 'tsyringe';
import type { UserRepository } from '@/domain/interfaces/UserRepository';

@injectable()
export class CreateUser {
  constructor(
    // @inject is MANDATORY for interfaces
    @inject('UserRepository') private userRepo: UserRepository
  ) {}
}
```

-----

## 4. DynamoDB Standards

### Single Table Design

  * **PK/SK Naming:** Always use generic names `PK` and `SK`.
  * **Prefixing:** Always prefix values to prevent collisions (e.g., `USER#123`).
  * **GSIs:** Use generic names `GSI1PK`, `GSI1SK`.

### Operations

  * **No Scans:** `Scan` operations are strictly forbidden in production code. Use `Query`.
  * **Batching:** Use `BatchGetItem` or `BatchWriteItem` when processing \> 1 record.

-----

## 5. Error Handling

Do not throw generic errors. Use typed App Errors.

```typescript
// lib/errors.ts
export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
```

-----

## 6. Testing Standards

### Unit Tests

  * **Mocking:** Use `aws-sdk-client-mock` to mock DynamoDB/S3. Do not hit real AWS services in Unit Tests.
  * **Coverage:** Target \> 80% branch coverage.

### Integration Tests

  * Use `docker-compose` to spin up **DynamoDB Local**.
  * Tests should write to local DB and read back to verify.

-----

## 7. File Naming & Structure

| Type | Convention | Path Example |
| :--- | :--- | :--- |
| **Handlers** | camelCase | `src/handlers/createUser.ts` |
| **Use Cases** | PascalCase | `src/application/usecases/CreateUser.ts` |
| **Entities** | PascalCase | `src/domain/entities/User.ts` |
| **Interfaces** | PascalCase | `src/domain/interfaces/UserRepository.ts` |
| **Implementations** | PascalCase | `src/infrastructure/storage/dynamodb/DynamoUserRepository.ts` |
| **Tests** | `.test.ts` | `tests/unit/CreateUser.test.ts` |

```
