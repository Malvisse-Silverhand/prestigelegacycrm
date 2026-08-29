export function quoteLauncherUrl(
  tool: string,
  lead: {
    id: string;
    full_name: string;
    phone: string;
    email?: string | null;
    date_of_birth?: string | null;
    gender?: "male" | "female" | null;
    is_smoker?: boolean | null;
  },
) {
  const params = new URLSearchParams({
    lead_id: lead.id,
    name: lead.full_name,
    phone: lead.phone,
    email: lead.email ?? "",
  });
  if (lead.date_of_birth) params.set("dob", lead.date_of_birth);
  if (lead.gender) params.set("gender", lead.gender);
  if (lead.is_smoker !== null && lead.is_smoker !== undefined) params.set("smoker", String(lead.is_smoker));
  return `/tools/${tool}?${params.toString()}`;
}
