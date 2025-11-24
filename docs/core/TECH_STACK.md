# Technology Stack & Hard Constraints

**⚠️ CRITICAL:** Do not install libraries not listed here without explicit user permission.

## 🖥️ Frontend (Web)
* **Framework:** Next.js 16+ (App Router required).
* **Language:** TypeScript 5.9+ (Strict Mode).
* **Styling:** Tailwind CSS (Paid/Plus tier features allowed).
* **State Management:**
    * Global/Client: **Zustand**.
    * Server/Async: **TanStack Query** (React Query).
* **Testing:** Jest + React Testing Library.

## ☁️ Backend (AWS Serverless)
* **IaC:** **Terraform** (Primary) & Serverless Framework (Lambda deployment).
* **Runtime:** Node.js 20.x (AWS Lambda).
* **Database:** DynamoDB (Single-Table Design required).
* **Architecture:** Eventual Consistency (EventBridge/SQS allowed).

## 🛠️ Shared / Tools
* **Package Manager:** Yarn (Workspaces enabled).
* **Linting:** ESLint (Flat Config) + Prettier.
* **Docs:** Markdown + Mermaid.js for diagrams.
* **Testing:**
    * Unit: Jest.
    * E2E: Cypress (Gherkin/Cucumber syntax required).