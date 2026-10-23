import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/lib/schema-missing";
import { ROADMAP_STATUSES, type RoadmapItem, type RoadmapStatus } from "./constants";

export type RoadmapResult = { setup: false } | { setup: true; items: RoadmapItem[] };

export async function getRoadmapItems(): Promise<RoadmapResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roadmap_items")
    .select("id, title, description, area, status, target, shipped_on, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingSchema(error)) return { setup: false };
    Sentry.captureException(error, { tags: { page: "roadmap" } });
    return { setup: true, items: [] };
  }

  const items: RoadmapItem[] = [];
  for (const r of data ?? []) {
    if (!(ROADMAP_STATUSES as readonly string[]).includes(r.status as string)) continue;
    items.push({
      id: r.id as string,
      title: r.title as string,
      description: (r.description as string | null) ?? null,
      area: (r.area as string | null) ?? null,
      status: r.status as RoadmapStatus,
      target: (r.target as string | null) ?? null,
      shippedOn: (r.shipped_on as string | null) ?? null,
      sortOrder: (r.sort_order as number) ?? 0,
    });
  }
  return { setup: true, items };
}
