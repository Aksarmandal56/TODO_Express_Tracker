export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date | string | null;
  tags: string[];
  userId: string;
  position: number;
  archived: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  tags?: string[];
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> {
  position?: number;
  archived?: boolean;
}

export interface KanbanBoard {
  todo: Task[];
  in_progress: Task[];
  in_review: Task[];
  done: Task[];
}

export interface TasksResponse {
  tasks: Task[];
  total: number;
  page: number;
  totalPages: number;
}
