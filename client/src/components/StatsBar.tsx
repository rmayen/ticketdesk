import type { Stats } from "../types";
import { STATUS_LABEL, STATUSES } from "../types";

export function StatsBar({ stats }: { stats: Stats | null }) {
  if (!stats) return <div className="stats" aria-busy="true" />;
  return (
    <div className="stats">
      <div className="stat">
        <span className="stat-n">{stats.total}</span>
        <span className="stat-l">Total</span>
      </div>
      {STATUSES.map((s) => (
        <div className="stat" key={s}>
          <span className="stat-n">{stats.byStatus[s]}</span>
          <span className="stat-l">{STATUS_LABEL[s]}</span>
        </div>
      ))}
      <div className="stat stat-urgent">
        <span className="stat-n">{stats.byPriority.urgent}</span>
        <span className="stat-l">Urgent</span>
      </div>
    </div>
  );
}
