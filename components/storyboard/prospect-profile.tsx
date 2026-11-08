import { t } from "@/lib/storyboard/i18n";

type Props = {
  name: string;
  age?: number | null;
  phone?: string | null;
};

export function ProspectProfile({ name, age, phone }: Props) {
  const dt = "text-[11px] font-semibold uppercase tracking-wide text-muted-2";
  return (
    <section className="rounded-[20px] border border-sand bg-white px-4 py-3 shadow-card">
      <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
        <div>
          <dt className={dt}>{t("prospect.name")}</dt>
          <dd className="m-0 text-sm font-bold text-navy">{name}</dd>
        </div>
        <div>
          <dt className={dt}>{t("prospect.age")}</dt>
          <dd className="m-0 text-sm text-navy">
            {age != null ? t("prospect.ageValue", "en", { age }) : t("prospect.none")}
          </dd>
        </div>
        <div>
          <dt className={dt}>{t("prospect.phone")}</dt>
          <dd className="m-0 text-sm text-navy">{phone || t("prospect.none")}</dd>
        </div>
      </dl>
    </section>
  );
}
