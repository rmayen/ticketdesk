import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { openDb } from "../src/db.js";

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp(openDb(":memory:"));
});

const base = { title: "Monitor flickers", requester: "A. Smith", priority: "high", category: "hardware" };

async function createTicket(overrides: Record<string, unknown> = {}) {
  const res = await request(app).post("/api/tickets").send({ ...base, ...overrides });
  expect(res.status).toBe(201);
  return res.body;
}

describe("tickets", () => {
  it("creates a ticket with defaults applied", async () => {
    const t = await createTicket({ priority: undefined, category: undefined });
    expect(t).toMatchObject({ title: "Monitor flickers", status: "open", priority: "medium", category: "general", assignee: null });
    expect(t.id).toBeGreaterThan(0);
    expect(t.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("rejects invalid input with field-level errors", async () => {
    const res = await request(app).post("/api/tickets").send({ title: "", priority: "sky-high" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
    expect(Object.keys(res.body.details)).toEqual(expect.arrayContaining(["title", "priority", "requester"]));
  });

  it("rejects malformed JSON", async () => {
    const res = await request(app).post("/api/tickets").set("Content-Type", "application/json").send("{not json");
    expect(res.status).toBe(400);
  });

  it("lists tickets ordered by priority then newest, with total count", async () => {
    await createTicket({ title: "low one", priority: "low" });
    await createTicket({ title: "urgent one", priority: "urgent" });
    await createTicket({ title: "medium one", priority: "medium" });
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items.map((t: { title: string }) => t.title)).toEqual(["urgent one", "medium one", "low one"]);
  });

  it("filters by status, priority and free-text search", async () => {
    await createTicket({ title: "Wi-Fi drops in lab", priority: "high" });
    const t2 = await createTicket({ title: "Keyboard missing keys", priority: "low" });
    await request(app).patch(`/api/tickets/${t2.id}`).send({ status: "resolved" });

    const byStatus = await request(app).get("/api/tickets?status=resolved");
    expect(byStatus.body.items.map((t: { id: number }) => t.id)).toEqual([t2.id]);

    const byPriority = await request(app).get("/api/tickets?priority=high");
    expect(byPriority.body.total).toBe(1);

    const bySearch = await request(app).get("/api/tickets?q=wi-fi");
    expect(bySearch.body.items[0].title).toBe("Wi-Fi drops in lab");
  });

  it("paginates with limit and offset", async () => {
    for (let i = 0; i < 5; i++) await createTicket({ title: `t${i}`, priority: "medium" });
    const res = await request(app).get("/api/tickets?limit=2&offset=2");
    expect(res.body.items).toHaveLength(2);
    expect(res.body.total).toBe(5);
    const bad = await request(app).get("/api/tickets?limit=0");
    expect(bad.status).toBe(400);
  });

  it("returns 404 for unknown or malformed ids", async () => {
    expect((await request(app).get("/api/tickets/999")).status).toBe(404);
    expect((await request(app).get("/api/tickets/abc")).status).toBe(404);
    expect((await request(app).delete("/api/tickets/999")).status).toBe(404);
  });

  it("updates fields and bumps updated_at", async () => {
    const t = await createTicket();
    await new Promise((r) => setTimeout(r, 5));
    const res = await request(app).patch(`/api/tickets/${t.id}`).send({ assignee: "Rene", priority: "urgent" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ assignee: "Rene", priority: "urgent" });
    expect(res.body.updated_at >= t.updated_at).toBe(true);
    expect((await request(app).patch(`/api/tickets/${t.id}`).send({})).status).toBe(400);
  });

  it("enforces the status workflow", async () => {
    const t = await createTicket();
    const bad = await request(app).patch(`/api/tickets/${t.id}`).send({ status: "closed" }).then((r) => r);
    expect(bad.status).toBe(200); // open -> closed is allowed
    const reopen = await request(app).patch(`/api/tickets/${t.id}`).send({ status: "in_progress" });
    expect(reopen.status).toBe(409); // closed -> in_progress is not
    expect(reopen.body.error).toMatch(/Cannot move ticket/);
    expect((await request(app).patch(`/api/tickets/${t.id}`).send({ status: "open" })).status).toBe(200);
  });

  it("deletes a ticket and cascades its comments", async () => {
    const t = await createTicket();
    await request(app).post(`/api/tickets/${t.id}/comments`).send({ author: "Rene", body: "Looking into it" });
    expect((await request(app).delete(`/api/tickets/${t.id}`)).status).toBe(204);
    expect((await request(app).get(`/api/tickets/${t.id}/comments`)).status).toBe(404);
  });
});

describe("comments", () => {
  it("adds and lists comments in order", async () => {
    const t = await createTicket();
    const c1 = await request(app).post(`/api/tickets/${t.id}/comments`).send({ author: "Rene", body: "First" });
    expect(c1.status).toBe(201);
    await request(app).post(`/api/tickets/${t.id}/comments`).send({ author: "A. Smith", body: "Second" });
    const list = await request(app).get(`/api/tickets/${t.id}/comments`);
    expect(list.body.map((c: { body: string }) => c.body)).toEqual(["First", "Second"]);
  });

  it("validates comment body and ticket existence", async () => {
    const t = await createTicket();
    expect((await request(app).post(`/api/tickets/${t.id}/comments`).send({ author: "x", body: "   " })).status).toBe(400);
    expect((await request(app).post(`/api/tickets/999/comments`).send({ author: "x", body: "hi" })).status).toBe(404);
  });
});

describe("stats", () => {
  it("counts tickets by status and priority", async () => {
    await createTicket({ priority: "low" });
    const t = await createTicket({ priority: "urgent" });
    await request(app).patch(`/api/tickets/${t.id}`).send({ status: "resolved" });
    const res = await request(app).get("/api/tickets/stats");
    expect(res.body).toEqual({
      total: 2,
      byStatus: { open: 1, in_progress: 0, resolved: 1, closed: 0 },
      byPriority: { low: 1, medium: 0, high: 0, urgent: 1 },
    });
  });
});
