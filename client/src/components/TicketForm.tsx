import { useState, type FormEvent } from "react";
import { ApiError, api } from "../api";
import { PRIORITIES, type Priority, type Ticket } from "../types";

export function TicketForm({ onCreated, onCancel }: { onCreated: (t: Ticket) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requester, setRequester] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState<Priority>("medium");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const t = await api.createTicket({ title, description, requester, category, priority });
      onCreated(t);
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      else setErrors({ _: [(err as Error).message] });
    } finally {
      setBusy(false);
    }
  }

  const err = (k: string) => errors[k]?.[0] && <span className="err">{errors[k][0]}</span>;

  return (
    <form className="card form" onSubmit={submit}>
      <h2>New ticket</h2>
      <label>
        Title {err("title")}
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Projector shows no signal" autoFocus />
      </label>
      <label>
        Requester {err("requester")}
        <input value={requester} onChange={(e) => setRequester(e.target.value)} placeholder="Name or email" />
      </label>
      <div className="row">
        <label>
          Category {err("category")}
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label>
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Description {err("description")}
        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {errors._ && <p className="err">{errors._[0]}</p>}
      <div className="actions">
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create ticket"}</button>
      </div>
    </form>
  );
}
