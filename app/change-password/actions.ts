"use server";

import { createClient } from "@/lib/supabase/server";

export async function setNewPassword(newPassword: string) {
  if (newPassword.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please log in again." };

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) return { error: "Couldn't set your new password. Please try again." };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);
  if (profileError) return { error: "Password was set, but something went wrong finishing setup. Please contact your admin." };

  return { error: null };
}
