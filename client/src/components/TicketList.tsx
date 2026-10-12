import { STATUS_LABEL, relativeTime, type Ticket } from "../types";

export function TicketList({ tickets, selectedId, onSelect }: { tickets: Ticket[]; selectedId: number | null; onSelect: (id: number) => void }) {
  if (tickets.length === 0) return <p className="empty">No tickets match these filters.</p>;
  return (
    <ul className="list">
      {tickets.map((t) => (
        <li key={t.id}>
          <button className={`ticket ${t.id === selectedId ? "selected" : ""}`} onClick={() => onSelect(t.id)}>
            <span className={`pill pri-${t.priority}`}>{t.priority}</span>
            <span className="ticket-title">
              <strong>#{t.id}</strong> {t.title}
            </span>
            <span className="ticket-meta">
              <span className={`badge st-${t.status}`}>{STATUS_LABEL[t.status]}</span>
              <span>{t.requester}</span>
              <span>{relativeTime(t.updated_at)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
