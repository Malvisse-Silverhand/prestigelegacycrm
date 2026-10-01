"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { LIMITS, ROADMAP_STATUSES, type RoadmapInput, type RoadmapStatus } from "./constants";

type Result = { error: string | null };
type Supabase = Awaited<ReturnType<typeof createClient>>;

const MIGRATION_MSG = "Run the latest database migration first.";
const GENERIC_MSG = "Couldn't save the roadmap. Please try again.";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function failure(error: { code?: string }, action: string): Result {
  // 42P01 = table missing, 42703 = column missing.
  if (error.code === "42P01" || error.code === "42703") return { error: MIGRATION_MSG };
  Sentry.captureException(error, { tags: { action } });
  return { error: GENERIC_MSG };
}

async function requireSuperAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") return null;
  return profile;
}

function isStatus(v: unknown): v is RoadmapStatus {
  return typeof v === "string" && (ROADMAP_STATUSES as readonly string[]).includes(v);
}

function validate(input: RoadmapInput) {
  if (!input || typeof input !== "object") return { error: "Invalid item." } as const;
  const title = String(input.title ?? "").trim();
  const description = String(input.description ?? "").trim();
  const area = String(input.area ?? "").trim();
  const target = String(input.target ?? "").trim();
  const shippedOn = String(input.shippedOn ?? "").trim();
  if (title.length < 2 || title.length > LIMITS.title) {
    return { error: `Title must be 2 to ${LIMITS.title} characters.` } as const;
  }
  if (description.length > LIMITS.description) {
    return { error: `Description can be at most ${LIMITS.description} characters.` } as const;
  }
  if (area.length > LIMITS.area) return { error: `Area can be at most ${LIMITS.area} characters.` } as const;
  if (target.length > LIMITS.target) return { error: `Target can be at most ${LIMITS.target} characters.` } as const;
  if (!isStatus(input.status)) return { error: "Pick a valid status." } as const;
  if (shippedOn && (!DATE_RE.test(shippedOn) || Number.isNaN(Date.parse(shippedOn)))) {
    return { error: "Shipped date is not valid." } as const;
  }
  return {
    error: null,
    value: {
      title,
      description: description || null,
      area: area || null,
      status: input.status,
      target: input.status === "shipped" ? null : target || null,
      shipped_on: input.status === "shipped" ? shippedOn || null : null,
    },
  } as const;
}

async function audit(supabase: Supabase, actorId: string, action: string, metadata: Record<string, unknown>) {
  // target_id references profiles, so item ids go in metadata instead.
  const { error } = await supabase.from("audit_log").insert({ actor_id: actorId, action, metadata });
  if (error) console.error(`${action}: audit_log insert failed`, error);
}

async function nextSortOrder(supabase: Supabase, status: RoadmapStatus) {
  const { data } = await supabase
    .from("roadmap_items")
    .select("sort_order")
    .eq("status", status)
    .order("sort_order", { ascending: false })
    .limit(1);
  const top = data?.[0]?.sort_order as number | undefined;
  return (top ?? 0) + 10;
}

export async function createRoadmapItem(input: RoadmapInput): Promise<Result> {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "Not allowed." };
  const v = validate(input);
  if (v.error) return { error: v.error };

  try {
    const supabase = await createClient();
    const sortOrder = await nextSortOrder(supabase, v.value.status);
    const { data, error } = await supabase
      .from("roadmap_items")
      .insert({ ...v.value, sort_order: sortOrder, updated_by: profile.id, updated_at: new Date().toISOString() })
      .select("id")
      .maybeSingle();
    if (error) return failure(error, "createRoadmapItem");
    await audit(supabase, profile.id, "roadmap_item_created", {
      item_id: data?.id ?? null,
      title: v.value.title,
      status: v.value.status,
    });
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "createRoadmapItem" } });
    return { error: GENERIC_MSG };
  }
  revalidatePath("/support/roadmap");
  return { error: null };
}

export async function updateRoadmapItem(id: string, input: RoadmapInput): Promise<Result> {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "Not allowed." };
  if (!UUID_RE.test(id)) return { error: "Invalid item." };
  const v = validate(input);
  if (v.error) return { error: v.error };

  try {
    const supabase = await createClient();
    const { data: current, error: readError } = await supabase
      .from("roadmap_items")
      .select("status")
      .eq("id", id)
      .maybeSingle();
    if (readError) return failure(readError, "updateRoadmapItem");
    if (!current) return { error: "That item no longer exists." };

    // Moving to another column puts the item at the end of it.
    const patch: Record<string, unknown> = {
      ...v.value,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    };
    if (current.status !== v.value.status) patch.sort_order = await nextSortOrder(supabase, v.value.status);

    const { error } = await supabase.from("roadmap_items").update(patch).eq("id", id);
    if (error) return failure(error, "updateRoadmapItem");
    await audit(supabase, profile.id, "roadmap_item_updated", {
      item_id: id,
      title: v.value.title,
      status: v.value.status,
    });
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "updateRoadmapItem" } });
    return { error: GENERIC_MSG };
  }
  revalidatePath("/support/roadmap");
  return { error: null };
}

export async function setRoadmapStatus(id: string, status: RoadmapStatus): Promise<Result> {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "Not allowed." };
  if (!UUID_RE.test(id)) return { error: "Invalid item." };
  if (!isStatus(status)) return { error: "Pick a valid status." };

  try {
    const supabase = await createClient();
    const { data: current, error: readError } = await supabase
      .from("roadmap_items")
      .select("status, shipped_on")
      .eq("id", id)
      .maybeSingle();
    if (readError) return failure(readError, "setRoadmapStatus");
    if (!current) return { error: "That item no longer exists." };
    if (current.status === status) return { error: null };

    const patch: Record<string, unknown> = {
      status,
      sort_order: await nextSortOrder(supabase, status),
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    };
    if (status === "shipped") {
      // Stamp today (Malaysia) when shipping without a date.
      if (!current.shipped_on) {
        patch.shipped_on = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date());
      }
      patch.target = null;
    } else {
      patch.shipped_on = null;
    }
    const { error } = await supabase.from("roadmap_items").update(patch).eq("id", id);
    if (error) return failure(error, "setRoadmapStatus");
    await audit(supabase, profile.id, "roadmap_item_status", { item_id: id, from: current.status, to: status });
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "setRoadmapStatus" } });
    return { error: GENERIC_MSG };
  }
  revalidatePath("/support/roadmap");
  return { error: null };
}

// Swaps the item with its neighbour in the same column, then renumbers the
// column (10, 20, 30 ...) so tied sort_order values can never get stuck.
export async function moveRoadmapItem(id: string, direction: "up" | "down"): Promise<Result> {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "Not allowed." };
  if (!UUID_RE.test(id)) return { error: "Invalid item." };
  if (direction !== "up" && direction !== "down") return { error: "Invalid direction." };

  try {
    const supabase = await createClient();
    const { data: row, error: readError } = await supabase
      .from("roadmap_items")
      .select("status")
      .eq("id", id)
      .maybeSingle();
    if (readError) return failure(readError, "moveRoadmapItem");
    if (!row) return { error: "That item no longer exists." };

    const { data: siblings, error: listError } = await supabase
      .from("roadmap_items")
      .select("id, sort_order")
      .eq("status", row.status as string)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (listError) return failure(listError, "moveRoadmapItem");

    const ids = (siblings ?? []).map((s) => s.id as string);
    const from = ids.indexOf(id);
    const to = direction === "up" ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= ids.length) return { error: null };
    [ids[from], ids[to]] = [ids[to], ids[from]];

    const now = new Date().toISOString();
    for (let i = 0; i < ids.length; i++) {
      const order = (i + 1) * 10;
      const prev = siblings?.find((s) => s.id === ids[i]);
      if (prev && prev.sort_order === order) continue;
      const { error } = await supabase
        .from("roadmap_items")
        .update({ sort_order: order, updated_by: profile.id, updated_at: now })
        .eq("id", ids[i]);
      if (error) return failure(error, "moveRoadmapItem");
    }
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "moveRoadmapItem" } });
    return { error: GENERIC_MSG };
  }
  revalidatePath("/support/roadmap");
  return { error: null };
}

export async function deleteRoadmapItem(id: string): Promise<Result> {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "Not allowed." };
  if (!UUID_RE.test(id)) return { error: "Invalid item." };

  try {
    const supabase = await createClient();
    const { data: row, error: readError } = await supabase
      .from("roadmap_items")
      .select("title, status")
      .eq("id", id)
      .maybeSingle();
    if (readError) return failure(readError, "deleteRoadmapItem");
    if (!row) return { error: null };

    const { error } = await supabase.from("roadmap_items").delete().eq("id", id);
    if (error) return failure(error, "deleteRoadmapItem");
    await audit(supabase, profile.id, "roadmap_item_deleted", {
      item_id: id,
      title: row.title,
      status: row.status,
    });
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "deleteRoadmapItem" } });
    return { error: GENERIC_MSG };
  }
  revalidatePath("/support/roadmap");
  return { error: null };
}
