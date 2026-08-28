const ROLES = [
  {
    tier: 1,
    name: "SuperAdmin",
    bg: "bg-navy",
    text: "text-white",
    sub: "text-white/60",
    description:
      "Full access to every unit, agent and system setting. Can create and remove any account, appoint Group Managers, and change lead distribution rules.",
  },
  {
    tier: 2,
    name: "Group Manager",
    bg: "bg-green",
    text: "text-white",
    sub: "text-white/65",
    description:
      "Monitors every Unit Manager beneath them. Can open any Unit Manager or Agent dashboard, and set up Unit Manager and Agent accounts.",
  },
  {
    tier: 3,
    name: "Unit Manager",
    bg: "bg-white border border-sand",
    text: "text-navy",
    sub: "text-muted-2",
    description: "Monitors only the agents assigned under them. Can reassign leads, open an agent dashboard, and see every quotation in the unit.",
  },
  {
    tier: 4,
    name: "Agent",
    bg: "bg-white border border-sand",
    text: "text-navy",
    sub: "text-muted-2",
    description: "Own leads only. Kanban pipeline, quotations for their own clients, WA Flow templates, and a personal activity log.",
  },
];

const MATRIX: { menu: string; access: [string, string, string, string] }[] = [
  { menu: "Dashboard", access: ["All units", "Their units", "Their agents", "Themselves"] },
  { menu: "Leads Manager", access: ["All", "All (their units)", "Their unit", "Own leads only"] },
  { menu: "Sales Pipeline", access: ["All", "All (their units)", "Their unit", "Own leads only"] },
  { menu: "My Team", access: ["✓", "✓", "✓", "—"] },
  { menu: "Quotation", access: ["✓", "✓", "✓", "✓"] },
  { menu: "WA Flow", access: ["Manage templates", "Manage templates", "Use templates", "Use templates"] },
  { menu: "Statistics", access: ["✓", "✓", "✓ (own unit)", "—"] },
  { menu: "Settings — hierarchy setup", access: ["✓", "✓", "—", "—"] },
];

export function RolesPermissionsTab() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="text-[15.5px] font-bold text-navy">Role definitions</div>
        <div className="mb-3.5 mt-0.5 text-xs font-medium text-muted">
          What each tier can reach. Applied to every user created in Users &amp; Hierarchy.
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => (
            <div key={r.name} className={`rounded-[18px] px-[18px] pb-5 pt-[18px] ${r.bg}`}>
              <div className="flex items-center gap-2">
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-gold text-xs font-extrabold text-navy">
                  {r.tier}
                </span>
                <span className={`text-[13.5px] font-bold ${r.text}`}>{r.name}</span>
              </div>
              <div className={`mt-2.5 text-xs leading-[1.6] ${r.sub}`}>{r.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[15.5px] font-bold text-navy">Permission matrix</div>
        <div className="mb-3.5 mt-0.5 text-xs font-medium text-muted">
          Same menu for everyone — data scope changes, not the menu. Enforced by row-level security, not just hidden navigation.
        </div>
        <div className="overflow-x-auto rounded-[14px] border border-sand">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="bg-sand-3 text-left text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-2">
                <th className="px-4 py-2.5">Menu</th>
                <th className="px-4 py-2.5">SuperAdmin</th>
                <th className="px-4 py-2.5">Group Manager</th>
                <th className="px-4 py-2.5">Unit Manager</th>
                <th className="px-4 py-2.5">Agent</th>
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row) => (
                <tr key={row.menu} className="border-t border-sand-3">
                  <td className="px-4 py-2.5 font-semibold text-navy">{row.menu}</td>
                  {row.access.map((a, i) => (
                    <td key={i} className="px-4 py-2.5 text-ink">
                      {a}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
