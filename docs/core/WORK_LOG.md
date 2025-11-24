# Work Log: [Title]

## Backend Agent
* [COMPLETED] Created DynamoDB table via Terraform.
* [DECISION] Used GSI1 for email lookups to avoid scan.

## Frontend Agent
* [COMPLETED] Scaffolded Login form.
* [ISSUE] TanStack Query caching was aggressive; set staleTime to 0 for auth token.