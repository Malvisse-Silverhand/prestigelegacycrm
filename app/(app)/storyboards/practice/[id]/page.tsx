import { redirect } from "next/navigation";

// /storyboards/practice/<id> has no screen of its own: start at Step 1.
export default async function PracticeIndex({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/storyboards/practice/${encodeURIComponent(id)}/fill`);
}
