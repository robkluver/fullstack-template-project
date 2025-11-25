#!/usr/bin/env node

/**
 * Project Provisioning Script
 *
 * Creates a new project from templates based on project type.
 *
 * Usage:
 *   node scripts/provision.js --name "My TODO Web App" --type fullstack
 *   node scripts/provision.js --name "API Service" --type backend --scope @mycompany
 *   node scripts/provision.js --name "Marketing Site" --type frontend --output ./projects
 *
 * Arguments:
 *   --name, -n      Project display name (required) - e.g., "My TODO Web App"
 *   --type, -t      Project type: fullstack, frontend, backend (required)
 *   --output, -o    Output directory (default: ./<slug>)
 *   --scope, -s     Package scope for monorepo (default: @repo)
 *   --description   Project description (default: derived from name)
 *   --skip-git      Skip git initialization
 *   --skip-install  Skip pnpm install
 *   --dry-run       Show what would be created without writing files
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const PACKAGES_DIR = path.join(__dirname, '..', 'packages');

// =============================================================================
// Argument Parsing
// =============================================================================

function parseArgs(args) {
  const parsed = {
    name: null,
    type: null,
    output: null,
    scope: '@repo',
    description: null,
    skipGit: false,
    skipInstall: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--name':
      case '-n':
        parsed.name = next;
        i++;
        break;
      case '--type':
      case '-t':
        parsed.type = next;
        i++;
        break;
      case '--output':
      case '-o':
        parsed.output = next;
        i++;
        break;
      case '--scope':
      case '-s':
        parsed.scope = next;
        i++;
        break;
      case '--description':
        parsed.description = next;
        i++;
        break;
      case '--skip-git':
        parsed.skipGit = true;
        break;
      case '--skip-install':
        parsed.skipInstall = true;
        break;
      case '--dry-run':
        parsed.dryRun = true;
        break;
      case '--help':
      case '-h':
        parsed.help = true;
        break;
    }
  }

  return parsed;
}

function showHelp() {
  console.log(`
Project Provisioning Script

Creates a new project from templates based on project type.

USAGE:
  node scripts/provision.js --name "My TODO Web App" --type fullstack
  node scripts/provision.js --name "API Service" --type backend --scope @mycompany
  node scripts/provision.js --name "Marketing Site" --type frontend --output ./projects

ARGUMENTS:
  --name, -n      Project display name (required)
                  Example: "My TODO Web App"

  --type, -t      Project type (required)
                  Options: fullstack, frontend, backend

  --output, -o    Output directory
                  Default: ./<project-slug>

  --scope, -s     Package scope for monorepo packages
                  Default: @repo
                  Example: @mycompany

  --description   Project description
                  Default: Derived from project name

  --skip-git      Skip git repository initialization

  --skip-install  Skip running pnpm install

  --dry-run       Show what would be created without writing files

  --help, -h      Show this help message

EXAMPLES:
  # Create a fullstack project
  node scripts/provision.js -n "My TODO Web App" -t fullstack

  # Create a backend-only API
  node scripts/provision.js -n "User Service API" -t backend -s @acme

  # Create frontend in specific directory
  node scripts/provision.js -n "Marketing Site" -t frontend -o ./apps
`);
}

function validateArgs(args) {
  const errors = [];

  if (!args.name) {
    errors.push('--name is required. Example: --name "My TODO Web App"');
  }

  if (!args.type) {
    errors.push('--type is required. Options: fullstack, frontend, backend');
  } else if (!['fullstack', 'frontend', 'backend'].includes(args.type)) {
    errors.push(`Invalid --type "${args.type}". Options: fullstack, frontend, backend`);
  }

  return errors;
}

// =============================================================================
// String Utilities
// =============================================================================

/**
 * Convert display name to slug
 * "My TODO Web App" -> "my-todo-web-app"
 */
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Convert display name to PascalCase
 * "My TODO Web App" -> "MyTodoWebApp"
 */
function toPascalCase(name) {
  return name
    .split(/[\s-_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

// =============================================================================
// File Operations
// =============================================================================

function readJsonTemplate(templatePath) {
  const content = fs.readFileSync(templatePath, 'utf-8');
  return JSON.parse(content);
}

function writeJson(filePath, data, dryRun = false) {
  const content = JSON.stringify(data, null, 2) + '\n';
  if (dryRun) {
    console.log(`  [DRY-RUN] Would write: ${filePath}`);
    return;
  }
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log(`  Created: ${filePath}`);
}

function writeFile(filePath, content, dryRun = false) {
  if (dryRun) {
    console.log(`  [DRY-RUN] Would write: ${filePath}`);
    return;
  }
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log(`  Created: ${filePath}`);
}

function copyFile(src, dest, dryRun = false) {
  if (dryRun) {
    console.log(`  [DRY-RUN] Would copy: ${src} -> ${dest}`);
    return;
  }
  const dir = path.dirname(dest);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`  Copied: ${dest}`);
}

function copyDir(src, dest, dryRun = false) {
  if (!fs.existsSync(src)) {
    console.warn(`  Warning: Source directory not found: ${src}`);
    return;
  }

  if (dryRun) {
    console.log(`  [DRY-RUN] Would copy directory: ${src} -> ${dest}`);
    return;
  }

  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, dryRun);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`  Copied: ${destPath}`);
    }
  }
}

// =============================================================================
// Template Transformations
// =============================================================================

function transformPackageJson(template, replacements) {
  const pkg = { ...template };

  // Replace name
  if (pkg.name) {
    pkg.name = pkg.name.replace(/@repo/g, replacements.scope);
    if (pkg.name === replacements.scope) {
      pkg.name = replacements.slug;
    }
  }

  // Replace dependencies with scope
  for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (pkg[depType]) {
      const newDeps = {};
      for (const [key, value] of Object.entries(pkg[depType])) {
        const newKey = key.replace(/@repo/g, replacements.scope);
        newDeps[newKey] = value;
      }
      pkg[depType] = newDeps;
    }
  }

  return pkg;
}

// =============================================================================
// Project Structure Creation
// =============================================================================

function createRootFiles(outputDir, config, dryRun) {
  console.log('\nCreating root configuration files...');

  // package.json
  const rootPkg = readJsonTemplate(path.join(TEMPLATES_DIR, 'package.root.json'));
  rootPkg.name = config.slug;
  rootPkg.description = config.description;
  const transformedPkg = transformPackageJson(rootPkg, config);
  writeJson(path.join(outputDir, 'package.json'), transformedPkg, dryRun);

  // turbo.json
  const turboConfig = readJsonTemplate(path.join(TEMPLATES_DIR, 'turbo.json'));
  writeJson(path.join(outputDir, 'turbo.json'), turboConfig, dryRun);

  // pnpm-workspace.yaml
  const workspaceContent = fs.readFileSync(
    path.join(TEMPLATES_DIR, 'pnpm-workspace.yaml'),
    'utf-8'
  );
  writeFile(path.join(outputDir, 'pnpm-workspace.yaml'), workspaceContent, dryRun);

  // .prettierrc (from root)
  const prettierrcPath = path.join(__dirname, '..', '.prettierrc');
  if (fs.existsSync(prettierrcPath)) {
    copyFile(prettierrcPath, path.join(outputDir, '.prettierrc'), dryRun);
  }

  // .prettierignore (from root)
  const prettierignorePath = path.join(__dirname, '..', '.prettierignore');
  if (fs.existsSync(prettierignorePath)) {
    copyFile(prettierignorePath, path.join(outputDir, '.prettierignore'), dryRun);
  }

  // .gitignore
  const gitignoreContent = `# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
.next/
out/

# Generated files
*.generated.*
coverage/
.turbo/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Terraform
.terraform/
*.tfstate
*.tfstate.*
*.tfvars

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
`;
  writeFile(path.join(outputDir, '.gitignore'), gitignoreContent, dryRun);

  // README.md
  const readmeContent = `# ${config.name}

${config.description}

## Getting Started

\`\`\`bash
# Install dependencies
pnpm install

# Run development servers
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
\`\`\`

## Project Structure

\`\`\`
${config.slug}/
├── apps/
${config.type !== 'backend' ? '│   ├── web/              # Next.js frontend\n' : ''}${config.type !== 'frontend' ? '│   └── api/              # AWS Lambda backend\n' : ''}├── packages/
│   ├── shared/           # Shared types & schemas
│   ├── eslint-config/    # Shared ESLint configuration
│   └── tsconfig/         # Shared TypeScript configuration
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
\`\`\`

## Available Scripts

- \`pnpm dev\` - Start development servers
- \`pnpm build\` - Build all packages
- \`pnpm test\` - Run tests
- \`pnpm lint\` - Lint code
- \`pnpm format\` - Format code with Prettier
- \`pnpm typecheck\` - Type check with TypeScript
`;
  writeFile(path.join(outputDir, 'README.md'), readmeContent, dryRun);
}

function createSharedPackage(outputDir, config, dryRun) {
  console.log('\nCreating shared package...');

  const sharedDir = path.join(outputDir, 'packages', 'shared');

  // package.json
  const sharedPkg = readJsonTemplate(path.join(TEMPLATES_DIR, 'package.shared.json'));
  const transformedPkg = transformPackageJson(sharedPkg, config);
  writeJson(path.join(sharedDir, 'package.json'), transformedPkg, dryRun);

  // tsconfig.json
  const tsconfigContent = {
    extends: `${config.scope}/tsconfig/base.json`,
    compilerOptions: {
      outDir: './dist',
      rootDir: './src',
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  };
  writeJson(path.join(sharedDir, 'tsconfig.json'), tsconfigContent, dryRun);

  // eslint.config.mjs
  const eslintContent = `import baseConfig from '${config.scope}/eslint-config/base';

export default [...baseConfig];
`;
  writeFile(path.join(sharedDir, 'eslint.config.mjs'), eslintContent, dryRun);

  // src/index.ts
  const indexContent = `// Shared types and utilities
export * from './types/index.js';
export * from './contracts/index.js';
`;
  writeFile(path.join(sharedDir, 'src', 'index.ts'), indexContent, dryRun);

  // src/types/index.ts
  const typesContent = `// API Response envelope
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  timestamp?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
`;
  writeFile(path.join(sharedDir, 'src', 'types', 'index.ts'), typesContent, dryRun);

  // src/contracts/index.ts
  const contractsContent = `import { z } from 'zod';

// Auth contracts
export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
  }),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
`;
  writeFile(path.join(sharedDir, 'src', 'contracts', 'index.ts'), contractsContent, dryRun);
}

function createConfigPackages(outputDir, config, dryRun) {
  console.log('\nCreating config packages...');

  // ESLint config
  const eslintDir = path.join(outputDir, 'packages', 'eslint-config');
  copyDir(path.join(PACKAGES_DIR, 'eslint-config'), eslintDir, dryRun);

  // Update package.json name
  if (!dryRun) {
    const eslintPkgPath = path.join(eslintDir, 'package.json');
    if (fs.existsSync(eslintPkgPath)) {
      const eslintPkg = JSON.parse(fs.readFileSync(eslintPkgPath, 'utf-8'));
      eslintPkg.name = `${config.scope}/eslint-config`;
      fs.writeFileSync(eslintPkgPath, JSON.stringify(eslintPkg, null, 2) + '\n');
    }
  }

  // TypeScript config
  const tsconfigDir = path.join(outputDir, 'packages', 'tsconfig');
  copyDir(path.join(PACKAGES_DIR, 'tsconfig'), tsconfigDir, dryRun);

  // Update package.json name
  if (!dryRun) {
    const tsconfigPkgPath = path.join(tsconfigDir, 'package.json');
    if (fs.existsSync(tsconfigPkgPath)) {
      const tsconfigPkg = JSON.parse(fs.readFileSync(tsconfigPkgPath, 'utf-8'));
      tsconfigPkg.name = `${config.scope}/tsconfig`;
      fs.writeFileSync(tsconfigPkgPath, JSON.stringify(tsconfigPkg, null, 2) + '\n');
    }
  }
}

function createWebApp(outputDir, config, dryRun) {
  console.log('\nCreating web app (Next.js)...');

  const webDir = path.join(outputDir, 'apps', 'web');

  // package.json
  const webPkg = readJsonTemplate(path.join(TEMPLATES_DIR, 'package.web.json'));
  const transformedPkg = transformPackageJson(webPkg, config);
  writeJson(path.join(webDir, 'package.json'), transformedPkg, dryRun);

  // tsconfig.json
  const tsconfigContent = {
    extends: `${config.scope}/tsconfig/nextjs.json`,
    compilerOptions: {
      paths: {
        '@/*': ['./src/*'],
      },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  };
  writeJson(path.join(webDir, 'tsconfig.json'), tsconfigContent, dryRun);

  // eslint.config.mjs
  const eslintContent = `import reactConfig from '${config.scope}/eslint-config/react';

export default [...reactConfig];
`;
  writeFile(path.join(webDir, 'eslint.config.mjs'), eslintContent, dryRun);

  // next.config.ts
  const nextConfigContent = `import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['${config.scope}/shared'],
};

export default nextConfig;
`;
  writeFile(path.join(webDir, 'next.config.ts'), nextConfigContent, dryRun);

  // src/app/layout.tsx
  const layoutContent = `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${config.name}',
  description: '${config.description}',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
  writeFile(path.join(webDir, 'src', 'app', 'layout.tsx'), layoutContent, dryRun);

  // src/app/page.tsx
  const pageContent = `export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">${config.name}</h1>
      <p className="mt-4 text-lg text-gray-600">
        ${config.description}
      </p>
    </main>
  );
}
`;
  writeFile(path.join(webDir, 'src', 'app', 'page.tsx'), pageContent, dryRun);

  // src/app/globals.css
  const globalsCssContent = `@import "tailwindcss";
`;
  writeFile(path.join(webDir, 'src', 'app', 'globals.css'), globalsCssContent, dryRun);

  // jest.config.js
  const jestConfigContent = `/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
};

module.exports = config;
`;
  writeFile(path.join(webDir, 'jest.config.js'), jestConfigContent, dryRun);

  // jest.setup.js
  const jestSetupContent = `import '@testing-library/jest-dom';
`;
  writeFile(path.join(webDir, 'jest.setup.js'), jestSetupContent, dryRun);
}

function createApiApp(outputDir, config, dryRun) {
  console.log('\nCreating API app (AWS Lambda)...');

  const apiDir = path.join(outputDir, 'apps', 'api');

  // package.json
  const apiPkg = readJsonTemplate(path.join(TEMPLATES_DIR, 'package.api.json'));
  const transformedPkg = transformPackageJson(apiPkg, config);
  writeJson(path.join(apiDir, 'package.json'), transformedPkg, dryRun);

  // tsconfig.json
  const tsconfigContent = {
    extends: `${config.scope}/tsconfig/node.json`,
    compilerOptions: {
      outDir: './dist',
      rootDir: './src',
      paths: {
        '@/*': ['./src/*'],
      },
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  };
  writeJson(path.join(apiDir, 'tsconfig.json'), tsconfigContent, dryRun);

  // eslint.config.mjs
  const eslintContent = `import baseConfig from '${config.scope}/eslint-config/base';

export default [...baseConfig];
`;
  writeFile(path.join(apiDir, 'eslint.config.mjs'), eslintContent, dryRun);

  // serverless.yml
  const serverlessContent = `service: ${config.slug}-api

provider:
  name: aws
  runtime: nodejs20.x
  stage: \${opt:stage, 'dev'}
  region: \${opt:region, 'us-east-1'}
  environment:
    STAGE: \${self:provider.stage}

functions:
  health:
    handler: dist/handlers/health.handler
    events:
      - http:
          path: /health
          method: get
          cors: true

  login:
    handler: dist/handlers/auth/login.handler
    events:
      - http:
          path: /auth/login
          method: post
          cors: true

plugins:
  - serverless-offline

custom:
  serverless-offline:
    httpPort: 3001
`;
  writeFile(path.join(apiDir, 'serverless.yml'), serverlessContent, dryRun);

  // src/handlers/health.ts
  const healthHandlerContent = `import type { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      error: null,
    }),
  };
};
`;
  writeFile(path.join(apiDir, 'src', 'handlers', 'health.ts'), healthHandlerContent, dryRun);

  // src/handlers/auth/login.ts
  const loginHandlerContent = `import 'reflect-metadata';
import type { APIGatewayProxyHandler } from 'aws-lambda';
import { LoginRequestSchema } from '${config.scope}/shared';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const validated = LoginRequestSchema.parse(body);

    // TODO: Implement actual authentication
    // This is a placeholder response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          token: 'placeholder-token',
          user: {
            id: 'user-123',
            email: validated.email,
            name: 'Test User',
          },
        },
        error: null,
      }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Invalid request',
        },
      }),
    };
  }
};
`;
  writeFile(path.join(apiDir, 'src', 'handlers', 'auth', 'login.ts'), loginHandlerContent, dryRun);

  // jest.config.js
  const jestConfigContent = `/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
};

module.exports = config;
`;
  writeFile(path.join(apiDir, 'jest.config.js'), jestConfigContent, dryRun);
}

// =============================================================================
// Git Initialization
// =============================================================================

function initGit(outputDir, dryRun) {
  console.log('\nInitializing git repository...');

  if (dryRun) {
    console.log('  [DRY-RUN] Would run: git init');
    console.log('  [DRY-RUN] Would run: git add .');
    console.log('  [DRY-RUN] Would run: git commit -m "Initial commit"');
    return;
  }

  try {
    execSync('git init', { cwd: outputDir, stdio: 'pipe' });
    console.log('  Initialized git repository');

    execSync('git add .', { cwd: outputDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit from project template"', {
      cwd: outputDir,
      stdio: 'pipe',
    });
    console.log('  Created initial commit');
  } catch (error) {
    console.warn('  Warning: Git initialization failed. You may need to initialize manually.');
  }
}

// =============================================================================
// Package Installation
// =============================================================================

function installPackages(outputDir, dryRun) {
  console.log('\nInstalling dependencies...');

  if (dryRun) {
    console.log('  [DRY-RUN] Would run: pnpm install');
    return;
  }

  try {
    execSync('pnpm install', { cwd: outputDir, stdio: 'inherit' });
    console.log('  Dependencies installed successfully');
  } catch (error) {
    console.warn('  Warning: pnpm install failed. You may need to run it manually.');
  }
}

// =============================================================================
// Main
// =============================================================================

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  const errors = validateArgs(args);
  if (errors.length > 0) {
    console.error('Error(s):');
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error('\nRun with --help for usage information.');
    process.exit(1);
  }

  // Build configuration
  const slug = toSlug(args.name);
  const config = {
    name: args.name,
    slug: slug,
    type: args.type,
    scope: args.scope,
    description: args.description || `${args.name} - A modern web application`,
  };

  const outputDir = args.output ? path.resolve(args.output, slug) : path.resolve(process.cwd(), slug);

  console.log('');
  console.log('='.repeat(60));
  console.log('Project Provisioning');
  console.log('='.repeat(60));
  console.log(`  Name:        ${config.name}`);
  console.log(`  Slug:        ${config.slug}`);
  console.log(`  Type:        ${config.type}`);
  console.log(`  Scope:       ${config.scope}`);
  console.log(`  Output:      ${outputDir}`);
  console.log(`  Description: ${config.description}`);
  if (args.dryRun) {
    console.log('  Mode:        DRY RUN (no files will be written)');
  }
  console.log('='.repeat(60));

  // Check if output directory exists
  if (fs.existsSync(outputDir) && !args.dryRun) {
    console.error(`\nError: Directory already exists: ${outputDir}`);
    console.error('Please remove it or choose a different output location.');
    process.exit(1);
  }

  // Create project structure
  createRootFiles(outputDir, config, args.dryRun);
  createConfigPackages(outputDir, config, args.dryRun);
  createSharedPackage(outputDir, config, args.dryRun);

  if (config.type === 'fullstack' || config.type === 'frontend') {
    createWebApp(outputDir, config, args.dryRun);
  }

  if (config.type === 'fullstack' || config.type === 'backend') {
    createApiApp(outputDir, config, args.dryRun);
  }

  // Initialize git
  if (!args.skipGit) {
    initGit(outputDir, args.dryRun);
  }

  // Install packages
  if (!args.skipInstall && !args.dryRun) {
    installPackages(outputDir, args.dryRun);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Project created successfully!');
  console.log('='.repeat(60));
  console.log(`\nNext steps:`);
  console.log(`  cd ${slug}`);
  if (args.skipInstall) {
    console.log(`  pnpm install`);
  }
  console.log(`  pnpm dev`);
  console.log('');
}

main();
