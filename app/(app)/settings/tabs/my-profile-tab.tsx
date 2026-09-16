"use client";

import { useState, useTransition } from "react";
import { updateMyProfile } from "../actions";
import type { MyProfileDetails } from "../data";

const input =
  "h-[38px] w-full rounded-[9px] border border-sand-2 bg-cream px-3 text-[12.5px] font-medium text-navy outline-none focus:border-gold";

/**
 * The one settings tab that is about the signed-in person rather than the
 * organisation -- open to every role, not gated by the manager check that
 * decides the rest of this page.
 *
 * The phone number saved here is what the client portal's "WhatsApp Agent"
 * button calls: an agent whose portal button doesn't appear almost always
 * has no phone on their own profile, not a bug in the portal.
 */
export function MyProfileTab({ details }: { details: MyProfileDetails }) {
  const [fullName, setFullName] = useState(details.fullName);
  const [phone, setPhone] = useState(details.phone ?? "");
  const [email, setEmail] = useState(details.email);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = fullName !== details.fullName || phone !== (details.phone ?? "") || email !== details.email;

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await updateMyProfile({ fullName, phone, email });
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="max-w-md">
      <div className="rounded-[14px] border border-sand bg-white p-4">
        <div className="flex flex-col gap-3.5">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">Name</span>
            <input
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setSaved(false);
              }}
              className={`mt-[5px] ${input}`}
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">Phone number</span>
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setSaved(false);
              }}
              placeholder="012-345 6789"
              className={`mt-[5px] ${input}`}
            />
            <p className="mt-1 text-[10.5px] font-medium text-taupe">
              Used for the WhatsApp Agent button on your clients&rsquo; portal. Nothing shows there without this.
            </p>
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSaved(false);
              }}
              className={`mt-[5px] ${input}`}
            />
            <p className="mt-1 text-[10.5px] font-medium text-taupe">
              This is also what you sign in with. Changing it takes effect immediately, with no confirmation email.
            </p>
          </label>

          {error && <p className="text-[11.5px] font-semibold text-alert-red">{error}</p>}
          {saved && !dirty && <p className="text-[11.5px] font-semibold text-green">Saved.</p>}

          <button
            type="button"
            disabled={pending || !dirty}
            onClick={save}
            className="press mt-1 inline-flex h-10 items-center justify-center rounded-[10px] bg-navy px-5 text-[12.5px] font-bold text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
