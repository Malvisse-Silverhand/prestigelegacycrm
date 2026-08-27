import type { AgentMetrics } from "@/app/(app)/team/metrics";

export function StatCard({
  label, value, delta, dark,
}: { label: string; value: string | number; delta?: string | null; dark?: boolean }) {
  return (
    <div className={dark ? "rounded-2xl bg-navy p-4" : "rounded-2xl border border-sand bg-white p-4"}>
      <div className={`text-[11px] font-bold tracking-[0.08em] uppercase ${dark ? "text-gold" : "text-taupe"}`}>
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className={`text-[26px] font-extrabold tracking-[-0.03em] ${dark ? "text-white" : "text-navy"}`}>
          {value}
        </span>
        {delta && <span className={`text-[11px] font-bold ${dark ? "text-gold" : "text-green"}`}>{delta}</span>}
      </div>
    </div>
  );
}

function sparkline(trend: number[]) {
  const max = Math.max(1, ...trend);
  const points = trend.map((v, i) => {
    const x = 2 + i * 42;
    const y = 22 - Math.round((v / max) * 18);
    return `${x},${y}`;
  });
  return points.join(" ");
}

export function LeagueTable({
  rows,
}: {
  rows: ReturnType<typeof import("./data").computeLeague>;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-sand bg-white p-8 text-center text-[13px] text-muted">
        No unit managers to rank yet.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-card">
      <div className="flex items-baseline justify-between px-[22px] pt-[18px] pb-3.5">
        <div>
          <div className="text-[15.5px] font-bold text-navy">Unit Manager league table</div>
          <div className="mt-0.5 text-xs font-medium text-muted">Ranked by conversion, then response time</div>
        </div>
      </div>
      <div className="grid grid-cols-[40px_2fr_.7fr_.8fr_.8fr_.8fr_.9fr_.9fr_1fr] border-t border-b border-sand bg-cream px-[22px] py-2.5 text-[10.5px] font-bold tracking-[0.07em] text-taupe-2 uppercase">
        <div>#</div><div>Unit Manager</div><div>Agents</div><div>Leads</div><div>Quoted</div><div>Closed</div><div>Conv.</div><div>Response</div><div>3-month trend</div>
      </div>
      {rows.map((row, i) => (
        <div key={row.id} className="grid grid-cols-[40px_2fr_.7fr_.8fr_.8fr_.8fr_.9fr_.9fr_1fr] items-center border-b border-sand-3 px-[22px] py-3.5 last:border-b-0">
          <div className={`text-[13px] font-extrabold ${i === 0 ? "text-warn-gold-text" : "text-taupe"}`}>{i + 1}</div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-navy text-[11px] font-bold text-gold">
              {row.avatarInitials || row.name.split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase()}
            </span>
            <div>
              <div className="text-[13px] font-bold text-navy">{row.name}</div>
            </div>
          </div>
          <div className="text-[12.5px] font-bold text-navy">{row.agentCount}</div>
          <div className="text-[12.5px] font-bold text-navy">{row.leadCount}</div>
          <div className="text-[12.5px] font-semibold text-ink">{row.quoted}</div>
          <div className="text-[12.5px] font-bold text-navy">{row.closed}</div>
          <div className="text-[13px] font-extrabold text-green">{row.convRate}%</div>
          <div className="text-[12.5px] font-semibold text-navy">
            {row.avgResponse !== null ? `${row.avgResponse.toFixed(1)}h` : "—"}
          </div>
          <div>
            <svg width={88} height={26} viewBox="0 0 88 26">
              <polyline points={sparkline(row.trend)} fill="none" stroke="#0f4c35" strokeWidth={2.2} strokeLinecap="round" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AgentTable({
  metrics, agents,
}: { metrics: Map<string, AgentMetrics>; agents: { id: string; full_name: string; avatar_initials: string | null }[] }) {
  const rows = agents
    .map((a) => ({ ...a, m: metrics.get(a.id) }))
    .filter((r) => r.m)
    .sort((a, b) => (b.m!.convRate !== a.m!.convRate ? b.m!.convRate - a.m!.convRate : a.m!.leadCount - b.m!.leadCount));

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-sand bg-white p-8 text-center text-[13px] text-muted">
        No agent activity to rank yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-card">
      <div className="px-[22px] pt-[18px] pb-3.5 text-[15.5px] font-bold text-navy">Agent performance</div>
      <div className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1fr] border-t border-b border-sand bg-cream px-[22px] py-2.5 text-[10.5px] font-bold tracking-[0.07em] text-taupe-2 uppercase">
        <div>#</div><div>Agent</div><div>Leads</div><div>Conv.</div><div>Response</div><div>Stale</div>
      </div>
      {rows.map((row, i) => (
        <div key={row.id} className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1fr] items-center border-b border-sand-3 px-[22px] py-3.5 last:border-b-0">
          <div className={`text-[13px] font-extrabold ${i === 0 ? "text-warn-gold-text" : "text-taupe"}`}>{i + 1}</div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-navy text-[11px] font-bold text-gold">
              {row.avatar_initials || row.full_name.split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase()}
            </span>
            <span className="text-[13px] font-bold text-navy">{row.full_name}</span>
          </div>
          <div className="text-[12.5px] font-bold text-navy">{row.m!.leadCount}</div>
          <div className="text-[13px] font-extrabold text-green">{row.m!.convRate}%</div>
          <div className="text-[12.5px] font-semibold text-navy">{row.m!.avgResponseHours !== null ? `${row.m!.avgResponseHours}h` : "—"}</div>
          <div className="text-[12.5px] font-semibold text-navy">{row.m!.staleCount}</div>
        </div>
      ))}
    </div>
  );
}

export function ProductMix({ data }: { data: { label: string; count: number; pct: number; barPct: number }[] }) {
  const colors = ["#0f2540", "#0f4c35", "#fac748"];
  return (
    <div className="rounded-[18px] border border-sand bg-white p-5">
      <div className="text-[15px] font-bold text-navy">Product mix</div>
      <div className="mt-4 flex flex-col gap-3">
        {data.map((d, i) => (
          <div key={d.label}>
            <div className="mb-[5px] flex justify-between text-[12.5px] font-semibold text-navy">
              <span>{d.label}</span>
              <span>{d.count} · <span className="text-green">{d.pct}%</span></span>
            </div>
            <div className="h-2 overflow-hidden rounded-lg bg-sand">
              <div className="h-full" style={{ width: `${d.barPct}%`, background: colors[i % colors.length] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResponseHistogram({
  data,
}: { data: ReturnType<typeof import("./data").computeResponseBuckets> }) {
  const totalResponded = data.buckets.reduce((s, b) => s + b.count, 0);
  const ratio = data.over4 > 0 ? (data.under1 / data.over4).toFixed(1) : null;
  return (
    <div className="rounded-[18px] border border-sand bg-white p-5">
      <div className="text-[15px] font-bold text-navy">Response time spread</div>
      {totalResponded === 0 ? (
        <p className="mt-6 text-[13px] text-muted">No responded leads yet to measure.</p>
      ) : (
        <>
          <div className="mt-[18px] flex h-[108px] items-end gap-2">
            {data.buckets.map((b) => (
              <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="w-full rounded-[6px]" style={{ height: `${Math.max(b.heightPct, 4)}%`, background: b.color }} />
                <span className="text-[10px] font-semibold text-taupe">{b.label}</span>
              </div>
            ))}
          </div>
          {ratio && (
            <p className="mt-3 text-[11.5px] leading-relaxed font-medium text-muted-2">
              Leads answered inside an hour close at <strong className="text-green">{ratio}×</strong> the rate of those answered after four.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function StageFunnel({ stages }: { stages: { label: string; pct: number; color: string }[] }) {
  const weakest = [...stages].sort((a, b) => a.pct - b.pct)[0];
  return (
    <div className="rounded-[18px] border border-sand bg-white p-5">
      <div className="text-[15px] font-bold text-navy">Stage conversion</div>
      <div className="mt-4 flex flex-col gap-2.5">
        {stages.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <span className="w-[84px] text-xs font-semibold text-navy">{s.label}</span>
            <div className="h-[7px] flex-1 overflow-hidden rounded-lg bg-sand">
              <div className="h-full" style={{ width: `${s.pct}%`, background: s.color }} />
            </div>
            <span className="w-[34px] text-right text-xs font-bold text-navy">{s.pct}%</span>
          </div>
        ))}
      </div>
      {weakest && (
        <div className="mt-3.5 rounded-xl border border-[#f7e9c2] bg-warn-gold-bg px-3 py-2.5 text-[11.5px] leading-relaxed font-medium text-warn-gold-text">
          The leak is {weakest.label}. Tightening this stage lifts the whole funnel.
        </div>
      )}
    </div>
  );
}
