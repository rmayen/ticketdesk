import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import type { Db } from "./db.js";
import { createCommentSchema, createTicketSchema, listQuerySchema, updateTicketSchema } from "./schemas.js";
import { NotFoundError, TransitionError, ticketRepo } from "./tickets.js";

function idParam(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new NotFoundError(`Ticket ${req.params.id} not found`);
  return id;
}

/** Build the Express app around a database handle. Keeping this a factory makes it trivial to test. */
export function createApp(db: Db) {
  const app = express();
  const repo = ticketRepo(db);
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.get("/api/tickets", (req, res) => {
    const q = listQuerySchema.parse(req.query);
    res.json(repo.list(q));
  });

  app.get("/api/tickets/stats", (_req, res) => res.json(repo.stats()));

  app.post("/api/tickets", (req, res) => {
    const ticket = repo.create(createTicketSchema.parse(req.body));
    res.status(201).json(ticket);
  });

  app.get("/api/tickets/:id", (req, res) => res.json(repo.get(idParam(req))));

  app.patch("/api/tickets/:id", (req, res) => {
    res.json(repo.update(idParam(req), updateTicketSchema.parse(req.body)));
  });

  app.delete("/api/tickets/:id", (req, res) => {
    repo.remove(idParam(req));
    res.status(204).end();
  });

  app.get("/api/tickets/:id/comments", (req, res) => res.json(repo.listComments(idParam(req))));

  app.post("/api/tickets/:id/comments", (req, res) => {
    res.status(201).json(repo.addComment(idParam(req), createCommentSchema.parse(req.body)));
  });

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten().fieldErrors });
    }
    if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
    if (err instanceof TransitionError) return res.status(409).json({ error: err.message });
    if (err instanceof SyntaxError && "body" in err) return res.status(400).json({ error: "Malformed JSON body" });
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
