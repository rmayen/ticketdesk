import type { Db } from "./db.js";
import { row, rows } from "./rows.js";
import {
  TRANSITIONS,
  type CreateComment,
  type CreateTicket,
  type ListQuery,
  type Priority,
  type Status,
  type UpdateTicket,
} from "./schemas.js";

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  category: string;
  requester: string;
  assignee: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  ticket_id: number;
  author: string;
  body: string;
  created_at: string;
}

export class NotFoundError extends Error {}
export class TransitionError extends Error {}

/** Data-access layer. Every function takes the db explicitly so tests can use an in-memory database. */
export function ticketRepo(db: Db) {
  const getStmt = db.prepare("SELECT * FROM tickets WHERE id = ?");

  function get(id: number): Ticket {
    const found = row<Ticket>(getStmt.get(id));
    if (!found) throw new NotFoundError(`Ticket ${id} not found`);
    return found;
  }

  function list(q: ListQuery): { items: Ticket[]; total: number } {
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (q.status) { where.push("status = ?"); params.push(q.status); }
    if (q.priority) { where.push("priority = ?"); params.push(q.priority); }
    if (q.assignee) { where.push("assignee = ?"); params.push(q.assignee); }
    if (q.q) {
      where.push("(title LIKE ? OR description LIKE ? OR requester LIKE ?)");
      const like = `%${q.q}%`;
      params.push(like, like, like);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total = row<{ n: number }>(db.prepare(`SELECT COUNT(*) AS n FROM tickets ${clause}`).get(...params))!.n;
    const items = rows<Ticket>(
      db.prepare(
        `SELECT * FROM tickets ${clause}
         ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                  created_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...params, q.limit, q.offset),
    );
    return { items, total };
  }

  function create(input: CreateTicket): Ticket {
    const res = db
      .prepare(
        `INSERT INTO tickets (title, description, priority, category, requester, assignee)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(input.title, input.description, input.priority, input.category, input.requester, input.assignee ?? null);
    return get(Number(res.lastInsertRowid));
  }

  function update(id: number, patch: UpdateTicket): Ticket {
    const current = get(id);
    if (patch.status && patch.status !== current.status) {
      if (!TRANSITIONS[current.status].includes(patch.status)) {
        throw new TransitionError(`Cannot move ticket from '${current.status}' to '${patch.status}'`);
      }
    }
    const sets: string[] = [];
    const params: (string | null)[] = [];
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      sets.push(`${k} = ?`);
      params.push(v as string | null);
    }
    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
    db.prepare(`UPDATE tickets SET ${sets.join(", ")} WHERE id = ?`).run(...params, id);
    return get(id);
  }

  function remove(id: number): void {
    const res = db.prepare("DELETE FROM tickets WHERE id = ?").run(id);
    if (res.changes === 0) throw new NotFoundError(`Ticket ${id} not found`);
  }

  function listComments(ticketId: number): Comment[] {
    get(ticketId);
    return rows<Comment>(db.prepare("SELECT * FROM comments WHERE ticket_id = ? ORDER BY created_at ASC, id ASC").all(ticketId));
  }

  function addComment(ticketId: number, input: CreateComment): Comment {
    get(ticketId);
    const res = db
      .prepare("INSERT INTO comments (ticket_id, author, body) VALUES (?, ?, ?)")
      .run(ticketId, input.author, input.body);
    db.prepare("UPDATE tickets SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(ticketId);
    return row<Comment>(db.prepare("SELECT * FROM comments WHERE id = ?").get(Number(res.lastInsertRowid)))!;
  }

  function stats(): { byStatus: Record<Status, number>; byPriority: Record<Priority, number>; total: number } {
    const byStatus = { open: 0, in_progress: 0, resolved: 0, closed: 0 } as Record<Status, number>;
    const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 } as Record<Priority, number>;
    for (const r of rows<{ status: Status; n: number }>(db.prepare("SELECT status, COUNT(*) AS n FROM tickets GROUP BY status").all())) byStatus[r.status] = r.n;
    for (const r of rows<{ priority: Priority; n: number }>(db.prepare("SELECT priority, COUNT(*) AS n FROM tickets GROUP BY priority").all())) byPriority[r.priority] = r.n;
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    return { byStatus, byPriority, total };
  }

  return { get, list, create, update, remove, listComments, addComment, stats };
}
