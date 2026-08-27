import { createClient } from "@/lib/supabase/server";

export default async function TestConnectionPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("units").select("*");

  return (
    <pre style={{ padding: 24, fontSize: 14 }}>
      {JSON.stringify({ data, error }, null, 2)}
    </pre>
  );
}
