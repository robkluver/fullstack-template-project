/**
 * Tasks API
 * Endpoints for task management (Kanban board).
 *
 * @see docs/backend/dynamodb-spec/04-PHASE2-TASKS.md
 * @see docs/backend/dynamodb-spec/08-REST-API.md
 */

import { api } from './client';

// Task status values
export type TaskStatus = 'BACKLOG' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

// Valid Fibonacci effort values
export const VALID_EFFORT = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89] as const;
export type EffortValue = (typeof VALID_EFFORT)[number];

// Task entity type
export interface Task {
  taskId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: number; // 1-5 (1 is highest)
  effort?: EffortValue;
  startUtc?: string;
  dueUtc?: string;
  completedAt?: string;
  labels?: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

// Kanban board response
export interface KanbanBoard {
  board: Record<TaskStatus, Task[]>;
  counts: {
    total: number;
    byStatus: Record<TaskStatus, number>;
  };
}

// Create task input
export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: number;
  effort?: EffortValue;
  startUtc?: string;
  dueUtc?: string;
  labels?: string[];
}

// Update task input
export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: number;
  effort?: EffortValue | null;
  startUtc?: string | null;
  dueUtc?: string | null;
  labels?: string[];
}

// Task creation response
export interface CreateTaskResponse {
  taskId: string;
  title: string;
  status: TaskStatus;
  priority: number;
  version: number;
  createdAt: string;
}

// Task update response
export interface UpdateTaskResponse {
  taskId: string;
  title: string;
  status: TaskStatus;
  priority: number;
  version: number;
  updatedAt: string;
}

// User ID - in a real app, this would come from auth context
const getUserId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nexus_user_id') || 'demo_user';
  }
  return 'demo_user';
};

export const tasksApi = {
  /**
   * Get Kanban board (all tasks grouped by status)
   * AP11: Get Kanban Board
   */
  getKanban: (status?: TaskStatus): Promise<KanbanBoard> => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<KanbanBoard>(`/users/${getUserId()}/tasks${query}`);
  },

  /**
   * Get single task
   * AP12: Get Single Task
   */
  getTask: (taskId: string): Promise<Task> => {
    return api.get<Task>(`/users/${getUserId()}/tasks/${taskId}`);
  },

  /**
   * Create new task
   * AP13: Create Task
   */
  createTask: (input: CreateTaskInput): Promise<CreateTaskResponse> => {
    return api.post<CreateTaskResponse>(`/users/${getUserId()}/tasks`, input);
  },

  /**
   * Update existing task
   * AP14: Update Task (with optimistic locking)
   */
  updateTask: (
    taskId: string,
    input: UpdateTaskInput,
    version: number
  ): Promise<UpdateTaskResponse> => {
    return api.patch<UpdateTaskResponse>(
      `/users/${getUserId()}/tasks/${taskId}`,
      input,
      version
    );
  },

  /**
   * Delete task
   * AP15: Delete Task
   */
  deleteTask: (taskId: string): Promise<void> => {
    return api.delete<void>(`/users/${getUserId()}/tasks/${taskId}`);
  },

  /**
   * Change task status (convenience method for Kanban drag)
   */
  changeStatus: (
    taskId: string,
    status: TaskStatus,
    version: number
  ): Promise<UpdateTaskResponse> => {
    return api.patch<UpdateTaskResponse>(
      `/users/${getUserId()}/tasks/${taskId}`,
      { status },
      version
    );
  },
};
