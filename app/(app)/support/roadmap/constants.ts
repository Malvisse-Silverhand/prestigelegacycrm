export const ROADMAP_STATUSES = ["shipped", "in_progress", "planned", "exploring"] as const;
export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];

export const STATUS_LABEL: Record<RoadmapStatus, string> = {
  shipped: "Shipped",
  in_progress: "In progress",
  planned: "Planned",
  exploring: "Exploring",
};

export const STATUS_HINT: Record<RoadmapStatus, string> = {
  shipped: "Live and ready to use",
  in_progress: "Being built right now",
  planned: "Next in line",
  exploring: "Ideas we are looking into",
};

export type RoadmapItem = {
  id: string;
  title: string;
  description: string | null;
  area: string | null;
  status: RoadmapStatus;
  target: string | null;
  shippedOn: string | null;
  sortOrder: number;
};

// Mirrors the CHECK constraints on public.roadmap_items.
export const LIMITS = { title: 160, description: 2000, area: 60, target: 40 } as const;

export type RoadmapInput = {
  title: string;
  description: string;
  area: string;
  status: RoadmapStatus;
  target: string;
  shippedOn: string;
};
