import { redirect } from "next/navigation";

// /leads/<id>/storyboard has no screen of its own: start at Hibah, Step 1.
export default async function StoryboardIndex({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/leads/${encodeURIComponent(id)}/storyboard/hibah/fill`);
}
