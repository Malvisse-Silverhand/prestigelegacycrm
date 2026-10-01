"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FIELD_TYPES,
  FIELD_TYPE_LABEL,
  LIMITS,
  SLUG_RE,
  isChoiceType,
  makeFieldId,
  randomSuffix,
  slugify,
  type FeedbackField,
  type FieldType,
  type FormRow,
} from "./constants";
import { createForm, updateForm } from "./actions";
import { FIELD, LABEL, SMALL_BTN } from "./feedback-chips";

// A field being edited. `fresh` fields (added in this session) get their id
// re-derived from the label; saved fields keep their id so old answers still map.
type BuilderField = {
  uid: string;
  id: string;
  suffix: string;
  fresh: boolean;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
};

function newField(): BuilderField {
  const suffix = randomSuffix();
  return {
    uid: `n-${suffix}-${Date.now()}`,
    id: makeFieldId("", suffix),
    suffix,
    fresh: true,
    label: "",
    type: "short_text",
    required: false,
    options: [""],
  };
}

function fromSaved(f: FeedbackField): BuilderField {
  return {
    uid: `s-${f.id}`,
    id: f.id,
    suffix: "",
    fresh: false,
    label: f.label,
    type: f.type,
    required: f.required,
    options: f.options && f.options.length > 0 ? f.options : [""],
  };
}

export function FormBuilder({ initial }: { initial?: FormRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isOpen, setIsOpen] = useState(initial?.isOpen ?? true);
  const [fields, setFields] = useState<BuilderField[]>(() =>
    initial && initial.fields.length > 0 ? initial.fields.map(fromSaved) : [newField()],
  );
  const [error, setError] = useState<string | null>(null);

  function setTitleAndSlug(next: string) {
    setTitle(next);
    if (!slugTouched) setSlug(slugify(next));
  }

  function patch(uid: string, p: Partial<BuilderField>) {
    setFields((fs) => fs.map((f) => (f.uid === uid ? { ...f, ...p } : f)));
  }

  function setLabel(f: BuilderField, label: string) {
    patch(f.uid, f.fresh ? { label, id: makeFieldId(label, f.suffix) } : { label });
  }

  function move(index: number, dir: -1 | 1) {
    setFields((fs) => {
      const to = index + dir;
      if (to < 0 || to >= fs.length) return fs;
      const next = [...fs];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanSlug = slug.trim();
    if (!SLUG_RE.test(cleanSlug)) {
      setError("Link name can only use lowercase letters, numbers and hyphens (no spaces).");
      return;
    }
    if (fields.length === 0) {
      setError("Add at least one question.");
      return;
    }
    const payload: FeedbackField[] = fields.map((f) => {
      const out: FeedbackField = { id: f.id, label: f.label.trim(), type: f.type, required: f.required };
      if (isChoiceType(f.type)) out.options = f.options.map((o) => o.trim()).filter(Boolean);
      return out;
    });
    const input = { title, slug: cleanSlug, description, isOpen, fields: payload };

    startTransition(async () => {
      try {
        const res = initial ? await updateForm(initial.id, input) : await createForm(input);
        if (res.error) {
          setError(res.error);
          return;
        }
        router.push("/support/feedback");
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div>
      <div className="sticky top-0 z-20 lg:static border-b border-sand bg-white/85 backdrop-blur-md px-5 py-4 lg:bg-white lg:backdrop-blur-none lg:px-[30px] lg:py-5">
        <Link href="/support/feedback" className="text-[12px] font-semibold text-taupe hover:text-navy">
          &larr; All forms
        </Link>
        <div className="mt-1 text-2xl font-extrabold tracking-[-0.025em] text-navy">
          {initial ? "Edit form" : "New form"}
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-muted">
          Build the questions, then share the link with your team.
        </div>
      </div>

      <form onSubmit={submit} className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-[22px] pb-[30px] lg:mx-0 lg:px-[30px]">
        <div>
          <label htmlFor="fb-title" className={LABEL}>
            Title
          </label>
          <input
            id="fb-title"
            required
            minLength={LIMITS.titleMin}
            maxLength={LIMITS.titleMax}
            value={title}
            onChange={(e) => setTitleAndSlug(e.target.value)}
            placeholder="e.g. CRM feedback"
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="fb-slug" className={LABEL}>
            Link name
          </label>
          <input
            id="fb-slug"
            required
            maxLength={LIMITS.slugMax}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            className={FIELD}
          />
          <div className="mt-1 break-all text-[11.5px] font-medium text-taupe">
            Share link: /support/feedback/f/{slug || "link-name"}
          </div>
        </div>

        <div>
          <label htmlFor="fb-desc" className={LABEL}>
            Description <span className="font-medium text-taupe">(optional)</span>
          </label>
          <textarea
            id="fb-desc"
            rows={3}
            maxLength={LIMITS.description}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${FIELD} resize-y`}
          />
        </div>

        <label className="flex items-center gap-2.5 text-[13px] font-semibold text-navy">
          <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} className="h-4 w-4 accent-brand" />
          Open (taking answers)
        </label>

        <div className="border-t border-sand pt-4">
          <div className="text-[14px] font-bold text-navy">Questions</div>
          <div className="mt-3 flex flex-col gap-3">
            {fields.map((f, i) => (
              <div key={f.uid} className="rounded-2xl border border-sand bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-bold text-taupe">Question {i + 1}</span>
                  <div className="flex items-center gap-1.5">
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className={SMALL_BTN}>
                      Up
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={i === fields.length - 1}
                      onClick={() => move(i, 1)}
                      className={SMALL_BTN}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => setFields((fs) => fs.filter((x) => x.uid !== f.uid))}
                      className={`${SMALL_BTN} text-alert-red`}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_170px]">
                  <div>
                    <label className={LABEL} htmlFor={`fb-label-${f.uid}`}>
                      Label
                    </label>
                    <input
                      id={`fb-label-${f.uid}`}
                      required
                      maxLength={LIMITS.label}
                      value={f.label}
                      onChange={(e) => setLabel(f, e.target.value)}
                      className={FIELD}
                    />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor={`fb-type-${f.uid}`}>
                      Type
                    </label>
                    <select
                      id={`fb-type-${f.uid}`}
                      value={f.type}
                      onChange={(e) => patch(f.uid, { type: e.target.value as FieldType })}
                      className={FIELD}
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {FIELD_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {isChoiceType(f.type) && (
                  <div className="mt-3">
                    <label className={LABEL} htmlFor={`fb-opts-${f.uid}`}>
                      Options <span className="font-medium text-taupe">(one per line)</span>
                    </label>
                    <textarea
                      id={`fb-opts-${f.uid}`}
                      rows={Math.min(8, Math.max(3, f.options.length + 1))}
                      value={f.options.join("\n")}
                      onChange={(e) => patch(f.uid, { options: e.target.value.split("\n") })}
                      className={`${FIELD} resize-y`}
                    />
                  </div>
                )}

                <label className="mt-3 flex items-center gap-2.5 text-[12.5px] font-semibold text-navy">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) => patch(f.uid, { required: e.target.checked })}
                    className="h-4 w-4 accent-brand"
                  />
                  Required
                </label>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={fields.length >= LIMITS.maxFields}
            onClick={() => setFields((fs) => [...fs, newField()])}
            className={`${SMALL_BTN} mt-3`}
          >
            Add question
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-alert-red">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <button
            type="submit"
            disabled={pending}
            className="rounded-[10px] border border-brand bg-brand px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Saving..." : initial ? "Save changes" : "Create form"}
          </button>
          <Link href="/support/feedback" className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
