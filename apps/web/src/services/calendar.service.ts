import { api } from './api';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: string;
  location: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  recurrence?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  assignedToId?: string;
  contact?: { id: string; firstName: string; lastName: string };
  company?: { id: string; name: string };
  deal?: { id: string; title: string };
  assignedTo?: { id: string; name: string; avatar?: string };
  attendees?: Array<{ id: string; email: string; name: string; status: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventListResult {
  events: CalendarEvent[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listEvents(
  filters?: Record<string, string | number | undefined>,
): Promise<CalendarEventListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<CalendarEventListResult>(`/calendar/events?${params}`);
}

export async function getEvent(id: string): Promise<CalendarEvent> {
  return api<CalendarEvent>(`/calendar/events/${id}`);
}

export async function createEvent(data: Partial<CalendarEvent>): Promise<CalendarEvent> {
  return api<CalendarEvent>('/calendar/events', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateEvent(
  id: string,
  data: Partial<CalendarEvent>,
): Promise<CalendarEvent> {
  return api<CalendarEvent>(`/calendar/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteEvent(id: string): Promise<void> {
  await api(`/calendar/events/${id}`, { method: 'DELETE' });
}

export async function getAgenda(
  filters?: Record<string, string | number | undefined>,
): Promise<CalendarEventListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<CalendarEventListResult>(`/calendar/agenda?${params}`);
}
