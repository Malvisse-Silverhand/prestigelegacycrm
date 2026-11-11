"use client";

// One place that knows which panels each module renders, so the workspace,
// present mode and the report don't each grow a three-way branch.
import type { HibahInputs, HibahResult } from "@/lib/storyboard/hibah";
import type { MedicalInputs, MedicalResult } from "@/lib/storyboard/medical";
import type { CiInputs, CiResult } from "@/lib/storyboard/ci";
import type { StoryboardModule, StoryboardProfile } from "@/lib/storyboard/modules";
import { STORYBOARD_TEXT, type Lang } from "@/lib/storyboard/i18n";
import { ciTalkTrack, hibahTalkTrack, medicalTalkTrack } from "@/lib/storyboard/story";
import { HibahAnalytics, HibahBreakdown, HibahGap, HibahInputsForm } from "./hibah-panel";
import { MedicalAnalytics, MedicalBreakdown, MedicalGap, MedicalInputsForm, MedicalRisk } from "./medical-panel";
import { CiAnalytics, CiBreakdown, CiGap, CiInputsForm } from "./ci-panel";

export type ModuleViews = {
  question: string;
  intro: string;
  /** Shown above the gap (e.g. Medical's risk gauge) -- its own slide in present mode. */
  lead: { title: string; node: React.ReactNode } | null;
  inputsForm: React.ReactNode;
  gap: React.ReactNode;
  breakdown: React.ReactNode;
  analytics: React.ReactNode;
  talkTrack: string[];
  assumptions: string[];
};

export function moduleViews({
  module,
  result,
  inputs,
  profile,
  lang,
  set,
}: {
  module: StoryboardModule;
  result: unknown;
  inputs: unknown;
  profile: StoryboardProfile;
  lang: Lang;
  set: (patch: object) => void;
}): ModuleViews {
  const t = STORYBOARD_TEXT[lang];
  const name = profile.nickname.trim() || (lang === "bm" ? "prospek" : "the prospect");

  if (module === "hibah") {
    const r = result as HibahResult;
    const i = inputs as HibahInputs;
    return {
      question: t.hibah.question(name),
      intro: t.hibah.intro,
      lead: null,
      inputsForm: <HibahInputsForm inputs={i} set={set} lang={lang} />,
      gap: <HibahGap result={r} profile={profile} lang={lang} />,
      breakdown: <HibahBreakdown result={r} lang={lang} />,
      analytics: <HibahAnalytics result={r} inputs={i} profile={profile} lang={lang} />,
      talkTrack: hibahTalkTrack(r, i, profile, lang),
      assumptions: t.hibah.assumptions,
    };
  }

  if (module === "medical") {
    const r = result as MedicalResult;
    const i = inputs as MedicalInputs;
    return {
      question: t.medical.gapQuestion,
      intro: t.medical.riskIntro,
      lead: { title: t.medical.riskQuestion, node: <MedicalRisk result={r} lang={lang} /> },
      inputsForm: <MedicalInputsForm inputs={i} set={set} lang={lang} />,
      gap: <MedicalGap result={r} lang={lang} />,
      breakdown: <MedicalBreakdown result={r} lang={lang} />,
      analytics: <MedicalAnalytics result={r} inputs={i} profile={profile} lang={lang} />,
      talkTrack: medicalTalkTrack(r, i, profile, lang),
      assumptions: t.medical.assumptions,
    };
  }

  const r = result as CiResult;
  return {
    question: t.ci.question(name),
    intro: t.ci.intro,
    lead: null,
    inputsForm: <CiInputsForm inputs={inputs as CiInputs} set={set} lang={lang} />,
    gap: <CiGap result={r} profile={profile} lang={lang} />,
    breakdown: <CiBreakdown result={r} lang={lang} />,
    analytics: <CiAnalytics result={r} profile={profile} lang={lang} />,
    talkTrack: ciTalkTrack(r, profile, lang),
    assumptions: t.ci.assumptions,
  };
}
