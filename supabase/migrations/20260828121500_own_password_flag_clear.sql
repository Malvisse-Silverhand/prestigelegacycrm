-- Any authenticated user needs to clear their own must_change_password flag
-- once they've set a new password -- column-level grant caps this to that one
-- column (same pattern as the is_active toggle), and the policy caps it to
-- their own row only.
grant update (must_change_password) on public.profiles to authenticated;

create policy "users clear their own password flag" on profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());
