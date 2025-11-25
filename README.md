# Fullstack Template Project

A template for multi-agent AI development using Next.js and AWS Serverless.

## 🏗 Architecture
* **Frontend:** Next.js 16, React 19, Zustand, TanStack Query.
* **Backend:** AWS Lambda (Node 20), DynamoDB (Single Table), Terraform.
* **Docs:** Markdown-driven development with Gherkin specifications.

## 🤖 Agent Usage
1.  **Initialize:** Agents should read `PROJECT_OVERVIEW.md` to understand boundaries.
2.  **Work:** Agents pick tasks from `TODO.md`.
3.  **Log:** Agents document progress in `docs/iterations/YYMMDD_Feature/WORK_LOG.md`.

## 🚀 Quick Start
```bash
# Install dependencies
yarn install

# Start Development
yarn dev