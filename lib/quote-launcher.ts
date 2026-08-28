export function quoteLauncherUrl(tool: string, lead: { id: string; full_name: string; phone: string; email?: string | null }) {
  const params = new URLSearchParams({
    lead_id: lead.id,
    name: lead.full_name,
    phone: lead.phone,
    email: lead.email ?? "",
  });
  return `/tools/${tool}?${params.toString()}`;
}
