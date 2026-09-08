"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TrackingCodeSettings, TrackablePage, PageTestResult } from "../types";
import { saveTrackingCode, testLandingPages } from "../actions";

const SLOTS = [
  {
    key: "head" as const,
    label: "Header code",
    hint: "Runs first, before the page draws. This is where the Meta Pixel base code and the TikTok Pixel code go.",
  },
  {
    key: "body" as const,
    label: "Body code",
    hint: "Runs as the page content starts. Use it for <noscript> fallback pixels and chat widgets.",
  },
  {
    key: "footer" as const,
    label: "Footer code",
    hint: "Runs last. Best for anything that should not compete with the page loading — heatmaps, survey tools.",
  },
];

const PLACEHOLDER = `<!-- Meta Pixel Code -->
<script>
  !function(f,b,e,v,n,t,s){...}(window, document,'script', 'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>`;

export function TrackingCodeTab({
  initial,
  pages,
}: {
  initial: TrackingCodeSettings;
  pages: TrackablePage[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const [testing, startTesting] = useTransition();
  const [results, setResults] = useState<PageTestResult[] | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const dirty =
    draft.head !== initial.head ||
    draft.body !== initial.body ||
    draft.footer !== initial.footer ||
    draft.enabled !== initial.enabled;

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await saveTrackingCode(draft);
        if (result.error) {
          setError(result.error);
          return;
        }
        setSaved(true);
        // Results describe the pages as they were before this save.
        setResults(null);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  function runTest() {
    setTestError(null);
    startTesting(async () => {
      try {
        const result = await testLandingPages();
        if (result.error) {
          setTestError(result.error);
          setResults(null);
          return;
        }
        setResults(result.results as PageTestResult[]);
      } catch {
        setTestError("Couldn't run the test. Please try again.");
      }
    });
  }

  return (
    <div className="flex max-w-[820px] flex-col gap-4">
      <div className="rounded-[18px] border border-sand bg-white px-[22px] pt-5 pb-[22px]">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="text-[15px] font-bold text-navy">Tracking &amp; pixel code</div>
            <div className="mt-1 text-[12.5px] leading-relaxed font-medium text-muted">
              Added to every published landing page and QuickQuote form. It is never added to the CRM itself — an ad
              network has no business seeing your leads&apos; names and phone numbers.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.enabled}
            aria-label="Tracking code enabled"
            onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}
            disabled={pending}
            className={`mt-1 flex h-[21px] w-[38px] flex-none items-center rounded-full px-[3px] transition-colors disabled:opacity-70 ${
              draft.enabled ? "justify-end bg-green" : "justify-start bg-sand-2"
            }`}
          >
            <span className="h-[15px] w-[15px] rounded-full bg-white" />
          </button>
        </div>

        {!draft.enabled && (
          <div className="mt-3 rounded-control bg-warn-gold-bg px-[14px] py-[11px] text-[12px] font-medium text-warn-gold-text">
            Turned off. Your snippets are kept, but nothing is added to the landing pages.
          </div>
        )}

        <div className="mt-5 flex flex-col gap-[18px]">
          {SLOTS.map((slot) => (
            <label key={slot.key} className="block">
              <span className="text-[11px] font-bold tracking-[0.1em] text-taupe-2 uppercase">{slot.label}</span>
              <span className="mt-[3px] block text-[11.5px] leading-relaxed font-medium text-taupe">{slot.hint}</span>
              <textarea
                spellCheck={false}
                rows={6}
                value={draft[slot.key]}
                placeholder={slot.key === "head" ? PLACEHOLDER : ""}
                onChange={(e) => setDraft({ ...draft, [slot.key]: e.target.value })}
                disabled={pending}
                className="mt-[7px] w-full resize-y rounded-control border border-sand-2 bg-cream px-[13px] py-[11px] font-mono text-[12px] leading-relaxed text-navy outline-none focus:border-[1.5px] focus:border-gold focus:shadow-[0_0_0_4px_rgba(250,199,72,.18)]"
              />
            </label>
          ))}
        </div>

        <div className="mt-3 rounded-control bg-cream px-[14px] py-[11px] text-[11.5px] leading-relaxed font-medium text-taupe">
          Paste the vendor&apos;s snippet exactly as given, including its <code>&lt;script&gt;</code> tags. It is stored
          and served as-is, so a broken tag will break the page — use the load test below after saving. Header code is
          placed at the very top of the page body, which is early enough for every pixel we have seen; it is not
          literally inside <code>&lt;head&gt;</code>.
        </div>

        {error && <div className="mt-3 text-[12px] font-medium text-alert-red">{error}</div>}
        {saved && !error && <div className="mt-3 text-[12px] font-medium text-green">Saved and live.</div>}

        <div className="mt-4 flex items-center gap-2.5">
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="rounded-[11px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save tracking code"}
          </button>
          {dirty && !pending && (
            <button
              type="button"
              onClick={() => {
                setDraft(initial);
                setError(null);
                setSaved(false);
              }}
              className="rounded-[11px] border border-sand-2 bg-cream px-4 py-2.5 text-[13px] font-semibold text-navy"
            >
              Discard changes
            </button>
          )}
        </div>
      </div>

      <div className="rounded-[18px] border border-sand bg-white px-[22px] pt-5 pb-[22px]">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="text-[15px] font-bold text-navy">Landing page load test</div>
            <div className="mt-1 text-[12.5px] leading-relaxed font-medium text-muted">
              Requests each published page the way a visitor would and reports how long it took and whether your code
              actually reached the page.
            </div>
          </div>
          <button
            type="button"
            onClick={runTest}
            disabled={testing || pages.length === 0}
            className="flex-none rounded-[11px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {testing ? "Testing…" : "Run test"}
          </button>
        </div>

        {testError && <div className="mt-3 text-[12px] font-medium text-alert-red">{testError}</div>}

        {pages.length === 0 ? (
          <p className="mt-4 text-[12.5px] font-medium text-muted">
            No published landing pages yet. Publish one under Lead Generation and it will show up here.
          </p>
        ) : results === null ? (
          <div className="mt-4 flex flex-col gap-1.5">
            {pages.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
                <span className="font-semibold text-navy">{p.name}</span>
                <span className="text-taupe">/p/{p.slug}</span>
                <span className="rounded-[5px] bg-cream px-[6px] py-[1px] text-[10px] font-bold text-taupe-2 uppercase">
                  {p.layout === "quickquote" ? "QuickQuote" : "Landing"}
                </span>
                <span className="text-taupe">· {p.agentName}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[2fr_.7fr_.7fr_1.4fr] bg-cream px-3 py-2 text-[10.5px] font-bold tracking-[0.08em] text-taupe-2 uppercase">
                <div>Page</div>
                <div>Status</div>
                <div>Load</div>
                <div>Tracking code</div>
              </div>
              {results.map((r) => (
                <div
                  key={r.slug}
                  className="grid grid-cols-[2fr_.7fr_.7fr_1.4fr] items-center border-b border-sand-3 px-3 py-2.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-bold text-navy">{r.name}</div>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-[11px] font-medium text-green underline"
                    >
                      /p/{r.slug}
                    </a>
                  </div>
                  <div>
                    <span
                      className={`rounded-[6px] px-[7px] py-[2px] text-[11px] font-bold ${
                        r.ok ? "bg-success-bg text-green" : "bg-alert-red-bg text-alert-red"
                      }`}
                    >
                      {r.status ?? "ERR"}
                    </span>
                  </div>
                  <div className="text-[12px] font-semibold text-navy">{r.ms}ms</div>
                  <div className="flex flex-wrap gap-1">
                    {r.error ? (
                      <span className="text-[11.5px] font-medium text-alert-red">{r.error}</span>
                    ) : (
                      SLOTS.map((slot) => {
                        const found = slot.key === "head" ? r.headFound : slot.key === "body" ? r.bodyFound : r.footerFound;
                        return (
                          <span
                            key={slot.key}
                            className={`rounded-[6px] px-[7px] py-[2px] text-[10.5px] font-bold ${
                              found ? "bg-success-bg text-green" : "bg-alert-red-bg text-alert-red"
                            }`}
                          >
                            {slot.key} {found ? "✓" : "✗"}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
              <p className="mt-3 text-[11.5px] leading-relaxed font-medium text-taupe">
                A slot you left empty always shows ✓ — there is nothing to look for. Load times include the server
                render; the first request after a deploy is always the slowest.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
