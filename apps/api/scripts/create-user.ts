#!/usr/bin/env npx ts-node
/**
 * Create User Script
 *
 * Creates a user in DynamoDB for testing/development.
 *
 * Usage:
 *   npx ts-node scripts/create-user.ts --email user@example.com --password MyP@ssw0rd --name "John Doe"
 *
 * Environment:
 *   IS_LOCAL=true - Use local DynamoDB
 *   DYNAMODB_ENDPOINT - Local DynamoDB endpoint (default: http://localhost:8000)
 */

import { parseArgs } from 'util';
import { createUser, findUserByEmail } from '../src/infrastructure/storage/dynamodb/repositories/userRepository.js';
import { hashPassword } from '../src/infrastructure/auth/password.js';

// Set local environment
process.env.IS_LOCAL = 'true';
process.env.DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
process.env.TABLE_NAME = process.env.TABLE_NAME || 'ProductivityData-dev';

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: 'string', short: 'e' },
      password: { type: 'string', short: 'p' },
      name: { type: 'string', short: 'n' },
    },
  });

  const { email, password, name } = values;

  if (!email || !password || !name) {
    console.error('Usage: npx ts-node scripts/create-user.ts --email <email> --password <password> --name <name>');
    console.error('');
    console.error('Options:');
    console.error('  --email, -e     User email address');
    console.error('  --password, -p  User password (min 8 characters)');
    console.error('  --name, -n      User display name');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters');
    process.exit(1);
  }

  console.log(`Creating user: ${email}`);

  // Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    console.error(`Error: User with email ${email} already exists`);
    process.exit(1);
  }

  // Hash password
  console.log('Hashing password...');
  const passwordHash = await hashPassword(password);

  // Create user
  console.log('Creating user in DynamoDB...');
  const user = await createUser({
    email,
    passwordHash,
    name,
  });

  console.log('');
  console.log('User created successfully!');
  console.log('---');
  console.log(`ID:    ${user.id}`);
  console.log(`Email: ${user.email}`);
  console.log(`Name:  ${user.name}`);
  console.log('');
  console.log('You can now authenticate using:');
  console.log(`  curl -X POST http://localhost:3001/dev/oauth/token \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"grant_type":"password","username":"${email}","password":"<your-password>"}'`);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
