// Pure, client-safe -- kept separate from the server-only stale-threshold
// fetch (lib/staleness-server.ts) so client components can import this
// without dragging in next/headers via the Supabase server client.
export function daysSinceLastActivity(createdAt: string, activityTimestamps: string[]): number {
  const timestamps = [createdAt, ...activityTimestamps];
  const last = timestamps.reduce((max, t) => (t > max ? t : max));
  return Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
}
