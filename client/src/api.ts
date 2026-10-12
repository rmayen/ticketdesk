import type { Comment, Filters, Stats, Ticket } from "./types";

export class ApiError extends Error {
  status: number;
  details?: Record<string, string[]>;
  constructor(status: number, message: string, details?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...init });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? res.statusText, body.details);
  return body as T;
}

export const api = {
  listTickets: (f: Filters) => {
    const params = new URLSearchParams();
    if (f.status) params.set("status", f.status);
    if (f.priority) params.set("priority", f.priority);
    if (f.q) params.set("q", f.q);
    return call<{ items: Ticket[]; total: number }>(`/api/tickets?${params}`);
  },
  stats: () => call<Stats>("/api/tickets/stats"),
  createTicket: (input: Partial<Ticket>) => call<Ticket>("/api/tickets", { method: "POST", body: JSON.stringify(input) }),
  updateTicket: (id: number, patch: Partial<Ticket>) =>
    call<Ticket>(`/api/tickets/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteTicket: (id: number) => call<void>(`/api/tickets/${id}`, { method: "DELETE" }),
  listComments: (id: number) => call<Comment[]>(`/api/tickets/${id}/comments`),
  addComment: (id: number, input: { author: string; body: string }) =>
    call<Comment>(`/api/tickets/${id}/comments`, { method: "POST", body: JSON.stringify(input) }),
};
