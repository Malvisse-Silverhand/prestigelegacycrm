"use client";

import { useState } from "react";
import Link from "next/link";
import { AddLeadModal } from "@/app/(app)/leads/add-lead-modal";
import { LogApproachModal } from "./log-approach-modal";
import { LeadsIcon, CalendarIcon, QuotationIcon, WaFlowIcon } from "@/components/icons";

const LINKS = [
  { href: "/appointments", label: "Book an appointment", icon: CalendarIcon },
  { href: "/quotations", label: "Build a quotation", icon: QuotationIcon },
  { href: "/wa-flow/scripts", label: "Closing scripts", icon: WaFlowIcon },
];

/**
 * The things you open the CRM to do, one tap from the dashboard.
 *
 * Adding a lead is the one that opens in place rather than navigating: it is
 * the most common of them and the one most likely to be done while you are
 * still looking at today's numbers.
 */
export function QuickAction({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [addingLead, setAddingLead] = useState(false);
  const [loggingApproach, setLoggingApproach] = useState(false);

  return (
    <div className="relative flex-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`press flex items-center gap-1.5 rounded-[10px] bg-gold font-bold text-navy ${
          compact ? "h-9 px-2.5 text-[12px]" : "px-3.5 py-[10px] text-[12.5px]"
        }`}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" />
        </svg>
        {compact ? "Quick" : "Quick Action"}
      </button>

      {open && (
        <>
          {/* Catches the next click anywhere else, so the menu closes the way
              a menu is expected to. */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 z-30 mt-1.5 w-[218px] rounded-[14px] border border-sand-2 bg-white p-1.5 shadow-elevated dark:border-white/10 dark:bg-[#12283f]">
            <div className="px-2 pt-1 pb-1.5 text-[9.5px] font-bold tracking-[0.1em] text-taupe-2 uppercase">
              Quick action
            </div>
            {/* First in the list on purpose: this is the one done many times
                a day, standing up, between conversations. */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setLoggingApproach(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold text-navy hover:bg-cream dark:text-[#eef3f8] dark:hover:bg-white/5"
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="text-gold">
                <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" />
              </svg>
              Log an approach
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setAddingLead(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold text-navy hover:bg-cream dark:text-[#eef3f8] dark:hover:bg-white/5"
            >
              <LeadsIcon width={15} height={15} className="text-green" />
              Add a lead (full form)
            </button>
            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-semibold text-navy hover:bg-cream dark:text-[#eef3f8] dark:hover:bg-white/5"
              >
                <Icon width={15} height={15} className="text-taupe" />
                {label}
              </Link>
            ))}
          </div>
        </>
      )}

      <AddLeadModal open={addingLead} onClose={() => setAddingLead(false)} />
      <LogApproachModal open={loggingApproach} onClose={() => setLoggingApproach(false)} />
    </div>
  );
}
