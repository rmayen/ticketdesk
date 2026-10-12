import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { StatsBar } from "./components/StatsBar";
import { TicketDetail } from "./components/TicketDetail";
import { TicketForm } from "./components/TicketForm";
import { TicketList } from "./components/TicketList";
import { PRIORITIES, STATUSES, STATUS_LABEL, type Filters, type Priority, type Stats, type Status, type Ticket } from "./types";

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([api.listTickets(filters), api.stats()]);
      setTickets(list.items);
      setStats(s);
      setError(null);
    } catch (e) {
      setError(`Could not reach the API: ${(e as Error).message}`);
    }
  }, [filters]);

  // refresh() awaits the network before touching state, so this is not a synchronous set-state-in-effect.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);

  // Debounce free-text search so we don't hit the API on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setFilters((f) => ({ ...f, q: search.trim() || undefined })), 250);
    return () => clearTimeout(id);
  }, [search]);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  function onTicketChanged(t: Ticket) {
    setTickets((ts) => ts.map((x) => (x.id === t.id ? t : x)));
    void api.stats().then(setStats);
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>ticketdesk</h1>
        <button onClick={() => { setCreating(true); setSelectedId(null); }}>+ New ticket</button>
      </header>

      <StatsBar stats={stats} />

      <div className="filters">
        <input type="search" placeholder="Search title, description, requester…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={filters.status ?? ""} onChange={(e) => setFilters({ ...filters, status: (e.target.value || undefined) as Status | undefined })}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select value={filters.priority ?? ""} onChange={(e) => setFilters({ ...filters, priority: (e.target.value || undefined) as Priority | undefined })}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {error && <p className="err banner">{error}</p>}

      <main className={`layout ${selected || creating ? "with-side" : ""}`}>
        <TicketList tickets={tickets} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); setCreating(false); }} />
        {creating && (
          <TicketForm
            onCreated={(t) => { setCreating(false); setSelectedId(t.id); void refresh(); }}
            onCancel={() => setCreating(false)}
          />
        )}
        {selected && (
          <TicketDetail
            key={selected.id}
            ticket={selected}
            onChange={onTicketChanged}
            onDelete={(id) => { setSelectedId(null); setTickets((ts) => ts.filter((t) => t.id !== id)); void api.stats().then(setStats); }}
            onClose={() => setSelectedId(null)}
          />
        )}
      </main>
    </div>
  );
}
