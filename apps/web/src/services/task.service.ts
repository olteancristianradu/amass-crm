import { api } from './api';

export interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  assignedToId?: string;
  contact?: { id: string; firstName: string; lastName: string };
  company?: { id: string; name: string };
  deal?: { id: string; title: string };
  assignedTo?: { id: string; name: string; avatar?: string };
  createdAt: string;
  updatedAt: string;
}

export interface TaskListResult {
  tasks: Task[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listTasks(
  filters?: Record<string, string | number | undefined>,
): Promise<TaskListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<TaskListResult>(`/tasks?${params}`);
}

export async function getTask(id: string): Promise<Task> {
  return api<Task>(`/tasks/${id}`);
}

export async function createTask(data: Partial<Task>): Promise<Task> {
  return api<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  return api<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteTask(id: string): Promise<void> {
  await api(`/tasks/${id}`, { method: 'DELETE' });
}

export async function getOverdueTasks(): Promise<TaskListResult> {
  return api<TaskListResult>('/tasks/overdue');
}

export async function getUpcomingTasks(
  filters?: Record<string, string | number | undefined>,
): Promise<TaskListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<TaskListResult>(`/tasks/upcoming?${params}`);
}
