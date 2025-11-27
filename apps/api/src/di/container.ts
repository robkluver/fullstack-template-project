/**
 * Dependency Injection Container
 *
 * Registers all interfaces to their concrete implementations.
 *
 * @see docs/backend/CODING_STANDARDS_BACKEND.md#3-dependency-injection-tsyringe
 */

import 'reflect-metadata';
import { container } from 'tsyringe';

// Infrastructure implementations
import { DynamoUserRepository } from '../infrastructure/storage/dynamodb/repositories/DynamoUserRepository.js';
import { DynamoEventRepository } from '../infrastructure/storage/dynamodb/repositories/DynamoEventRepository.js';
import { DynamoNotificationRepository } from '../infrastructure/storage/dynamodb/repositories/DynamoNotificationRepository.js';
import { GoogleCalendarAdapter } from '../infrastructure/http/GoogleCalendarAdapter.js';

// Register repositories
container.register('UserRepository', { useClass: DynamoUserRepository });
container.register('EventRepository', { useClass: DynamoEventRepository });
container.register('NotificationRepository', { useClass: DynamoNotificationRepository });

// Register external service adapters
container.register('GoogleCalendarService', { useClass: GoogleCalendarAdapter });

export { container };
