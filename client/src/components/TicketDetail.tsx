import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { STATUS_LABEL, nextStatuses, relativeTime, type Comment, type Status, type Ticket } from "../types";

interface Props {
  ticket: Ticket;
  onChange: (t: Ticket) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export function TicketDetail({ ticket, onChange, onDelete, onClose }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [assignee, setAssignee] = useState(ticket.assignee ?? "");
  const [error, setError] = useState<string | null>(null);

  // The parent renders this component with key={ticket.id}, so state resets per ticket.
  useEffect(() => {
    api.listComments(ticket.id).then(setComments).catch(() => setComments([]));
  }, [ticket.id]);

  async function run<T>(fn: () => Promise<T>, then?: (v: T) => void) {
    setError(null);
    try {
      then?.(await fn());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const move = (status: Status) => run(() => api.updateTicket(ticket.id, { status }), onChange);
  const saveAssignee = () => run(() => api.updateTicket(ticket.id, { assignee: assignee.trim() || null }), onChange);
  const remove = () => run(() => api.deleteTicket(ticket.id), () => onDelete(ticket.id));

  async function addComment(e: FormEvent) {
    e.preventDefault();
    await run(
      () => api.addComment(ticket.id, { author, body }),
      (c) => {
        setComments((cs) => [...cs, c]);
        setBody("");
      },
    );
  }

  return (
    <aside className="card detail">
      <header className="detail-head">
        <div>
          <span className={`pill pri-${ticket.priority}`}>{ticket.priority}</span>
          <span className={`badge st-${ticket.status}`}>{STATUS_LABEL[ticket.status]}</span>
        </div>
        <button className="ghost" onClick={onClose} aria-label="Close">×</button>
      </header>
      <h2>#{ticket.id} {ticket.title}</h2>
      <p className="muted">
        {ticket.category} · requested by {ticket.requester} · opened {relativeTime(ticket.created_at)}
      </p>
      {ticket.description && <p className="desc">{ticket.description}</p>}

      <section>
        <h3>Move to</h3>
        <div className="chips">
          {nextStatuses(ticket.status).map((s) => (
            <button key={s} className="chip" onClick={() => move(s)}>{STATUS_LABEL[s]}</button>
          ))}
        </div>
      </section>

      <section>
        <h3>Assignee</h3>
        <div className="row">
          <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Unassigned" />
          <button onClick={saveAssignee} disabled={(ticket.assignee ?? "") === assignee.trim()}>Save</button>
        </div>
      </section>

      <section>
        <h3>Comments ({comments.length})</h3>
        <ul className="comments">
          {comments.map((c) => (
            <li key={c.id}>
              <strong>{c.author}</strong> <span className="muted">{relativeTime(c.created_at)}</span>
              <p>{c.body}</p>
            </li>
          ))}
        </ul>
        <form onSubmit={addComment} className="comment-form">
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" required />
          <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add an update…" required />
          <button type="submit">Post</button>
        </form>
      </section>

      {error && <p className="err">{error}</p>}
      <button className="danger" onClick={remove}>Delete ticket</button>
    </aside>
  );
}
