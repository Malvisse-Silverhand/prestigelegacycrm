import Image from "next/image";
import { checkInviteToken } from "@/lib/join-invite";
import { JoinForm } from "./join-form";

export const metadata = {
  title: "Join Prestige Legacy",
};

// Public: reached by anyone the link is forwarded to, with no account and no
// session. Middleware exempts /join/* for exactly this reason.
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await checkInviteToken(token);

  return (
    <div className="flex flex-1 items-center justify-center bg-cream px-4 py-10">
      <div className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-card bg-cream shadow-elevated">
        <div className="bg-navy px-8 pt-10 pb-11 text-white sm:px-10">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="Prestige Legacy"
              width={40}
              height={40}
              className="h-10 w-10 flex-none rounded-xl object-cover"
              priority
            />
            <div className="text-[17px] font-bold">Prestige Legacy</div>
          </div>
          <div className="mt-7 text-[26px] leading-[1.25] font-extrabold tracking-[-0.02em]">
            {invite.ok ? (
              <>
                Join our team.
                <br />
                <span className="text-gold">Start your Takaful career.</span>
              </>
            ) : (
              <>This link isn&apos;t active.</>
            )}
          </div>
          {invite.ok && (
            <div className="mt-3 text-[13px] font-medium text-white/70">
              {invite.label ? `${invite.label} — invited by ${invite.recruiterName}` : `Invited by ${invite.recruiterName}`}
            </div>
          )}
        </div>

        {invite.ok ? (
          <JoinForm token={token} />
        ) : (
          <div className="px-8 pt-8 pb-10 sm:px-10">
            <p className="text-[13.5px] leading-relaxed font-medium text-muted">
              {invite.reason === "expired"
                ? "This registration link has expired. Ask the person who sent it to share a new one."
                : invite.reason === "disabled"
                  ? "This registration link has been turned off. Ask the person who sent it to share a new one."
                  : "We couldn't find this registration link. Check that you copied the whole address, or ask the person who sent it for a new one."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
