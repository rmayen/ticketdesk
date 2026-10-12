import { z } from "zod";

export const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];

/** Which status changes are allowed. Anything not listed is rejected with 409. */
export const TRANSITIONS: Record<Status, readonly Status[]> = {
  open: ["in_progress", "resolved", "closed"],
  in_progress: ["open", "resolved", "closed"],
  resolved: ["closed", "open"],
  closed: ["open"],
};

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const createTicketSchema = z.object({
  title: trimmed(120),
  description: z.string().trim().max(5000).default(""),
  priority: z.enum(PRIORITIES).default("medium"),
  category: trimmed(40).default("general"),
  requester: trimmed(80),
  assignee: trimmed(80).nullable().optional(),
});

export const updateTicketSchema = z
  .object({
    title: trimmed(120),
    description: z.string().trim().max(5000),
    priority: z.enum(PRIORITIES),
    category: trimmed(40),
    assignee: trimmed(80).nullable(),
    status: z.enum(STATUSES),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: "No fields to update" });

export const createCommentSchema = z.object({
  author: trimmed(80),
  body: trimmed(2000),
});

export const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignee: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateTicket = z.infer<typeof createTicketSchema>;
export type UpdateTicket = z.infer<typeof updateTicketSchema>;
export type CreateComment = z.infer<typeof createCommentSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
