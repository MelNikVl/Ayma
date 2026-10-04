"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { FormState, RoadmapItem } from "@/lib/validation";
import {
  API_STATUSES,
  API_TYPES,
  PAGE_FONTS,
  PAGE_LAYOUTS,
  PAGE_THEMES,
  ROADMAP_STATUSES,
} from "@/lib/validation";
import { useI18n } from "@/i18n/client";
import { fill } from "@/i18n/format";
import { tTag } from "@/i18n/dictionaries";
import { cn } from "@/lib/cn";
import { SubmitButton } from "./SubmitButton";
import { FieldError } from "./FieldError";
import { FormMessage } from "./FormMessage";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;
export type FundRow = { item: string; amount: string };

export interface StartupFormDefaults {
  name: string;
  shortDesc: string;
  fullDesc: string;
  logoUrl: string;
  coverUrl: string;
  githubUrl: string;
  demoUrl: string;
  websiteUrl: string;
  tagIds: string[];
  preOrderEnabled: boolean;
  preOrderPrice: number;
  preOrderGoal: number;
  preOrderDesc: string;
  paymentUrl: string;
  roadmap: RoadmapItem[];
  advantages: string;
  competitors: string;
  implPrice: string;
  implDays: string;
  fundingNeed: string;
  fundingNeedDesc: string;
  fundingBreakdown: FundRow[];
  fundingContact: string;
  buildMonths: string;
  killerFeatures: string;
  secretSauce: string;
  teamInfo: string;
  hiring: string;
  compensation: string;
  apiStatus: (typeof API_STATUSES)[number];
  apiTypes: string[];
  apiDocsUrl: string;
  openToCollab: boolean;
  collabNote: string;
  pageTheme: (typeof PAGE_THEMES)[number];
  pageAccent: string;
  pageFont: (typeof PAGE_FONTS)[number];
  pageLayout: (typeof PAGE_LAYOUTS)[number];
}

export const emptyStartupDefaults: StartupFormDefaults = {
  name: "",
  shortDesc: "",
  fullDesc: "",
  logoUrl: "",
  coverUrl: "",
  githubUrl: "",
  demoUrl: "",
  websiteUrl: "",
  tagIds: [],
  preOrderEnabled: true,
  preOrderPrice: 10000,
  preOrderGoal: 0,
  preOrderDesc: "",
  paymentUrl: "",
  roadmap: [],
  advantages: "",
  competitors: "",
  implPrice: "",
  implDays: "",
  fundingNeed: "",
  fundingNeedDesc: "",
  fundingBreakdown: [],
  fundingContact: "",
  buildMonths: "",
  killerFeatures: "",
  secretSauce: "",
  teamInfo: "",
  hiring: "",
  compensation: "",
  apiStatus: "NONE",
  apiTypes: [],
  apiDocsUrl: "",
  openToCollab: false,
  collabNote: "",
  pageTheme: "default",
  pageAccent: "",
  pageFont: "sans",
  pageLayout: "classic",
};

const THEME_SWATCH: Record<string, [string, string]> = {
  default: ["#F5F5F7", "#0066FF"],
  midnight: ["#0B0E1A", "#818CF8"],
  paper: ["#F6F1E7", "#B45309"],
  forest: ["#ECF4EE", "#15803D"],
  sunset: ["#FFF3EE", "#EA580C"],
  steppe: ["#EFF6FC", "#0284C7"],
};

export type Tab = "main" | "invest" | "product" | "team" | "api" | "design";
const TAB_FIELDS: Record<Tab, string[]> = {
  main: ["name", "shortDesc", "fullDesc", "tagIds", "logoUrl", "coverUrl"],
  invest: ["fundingNeed", "fundingNeedDesc", "fundingBreakdown", "fundingContact"],
  product: ["roadmap", "advantages", "competitors", "killerFeatures", "secretSauce", "implPrice", "implDays", "buildMonths"],
  team: ["teamInfo", "hiring", "compensation", "collabNote"],
  api: ["apiStatus", "apiTypes", "apiDocsUrl", "githubUrl", "demoUrl", "websiteUrl"],
  design: ["pageTheme", "pageAccent", "pageFont", "pageLayout"],
};

function hexToRgb(hex: string): string | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? `${parseInt(m[1]!, 16)} ${parseInt(m[2]!, 16)} ${parseInt(m[3]!, 16)}` : null;
}

export function StartupForm({
  action,
  tags,
  defaults,
  submitLabel,
  hideImageUrls = false,
  initialTab = "main",
}: {
  action: Action;
  tags: { id: string; name: string; color: string }[];
  defaults: StartupFormDefaults;
  submitLabel: string;
  /** На странице редактирования логотип и обложка загружаются отдельным блоком */
  hideImageUrls?: boolean;
  initialTab?: Tab;
}) {
  const { d } = useI18n();
  const [state, formAction] = useFormState(action, { ok: false });
  const [tab, setTab] = useState<Tab>(initialTab);
  const [shortDesc, setShortDesc] = useState(defaults.shortDesc);
  const [selected, setSelected] = useState<string[]>(defaults.tagIds);
  const [fund, setFund] = useState<FundRow[]>(defaults.fundingBreakdown.length ? defaults.fundingBreakdown : []);
  const fundTotal = fund.reduce((a, r) => a + (Number(r.amount.replace(/\s/g, "")) || 0), 0);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>(defaults.roadmap);
  const [apiStatus, setApiStatus] = useState(defaults.apiStatus);
  const [collab, setCollab] = useState(defaults.openToCollab);
  const [theme, setTheme] = useState(defaults.pageTheme);
  const [accent, setAccent] = useState(defaults.pageAccent);
  const [font, setFont] = useState(defaults.pageFont);
  const [layout, setLayout] = useState(defaults.pageLayout);
  const e = state.fieldErrors ?? {};
  const tabHasError = (t: Tab) => TAB_FIELDS[t].some((f) => e[f]?.length);

  function toggleTag(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 5 ? cur : [...cur, id]));
  }

  const accentRgb = hexToRgb(accent);

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok && <FormMessage ok={false} message={state.message} />}

      <div className="sticky top-[64px] z-20 -mx-1 flex gap-1 overflow-x-auto rounded-xl bg-surface-2/90 p-1 backdrop-blur no-scrollbar">
        {(Object.keys(TAB_FIELDS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "relative shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              tab === t ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
            )}
          >
            {d.form.tabs[t]}
            {tabHasError(t) && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />}
          </button>
        ))}
      </div>

      {/* ---------- Основное ---------- */}
      <div className={cn("space-y-6", tab !== "main" && "hidden")}>
        <section className="card space-y-5 p-5 sm:p-6">
          <h2 className="text-lg font-bold">{d.form.main}</h2>
          <div>
            <label htmlFor="name" className="label">{d.form.name} *</label>
            <input id="name" name="name" defaultValue={defaults.name} maxLength={60} className="input" placeholder={d.form.namePh} />
            <FieldError errors={e.name} />
          </div>
          <div>
            <label htmlFor="shortDesc" className="label">{d.form.shortDesc} *</label>
            <input
              id="shortDesc"
              name="shortDesc"
              value={shortDesc}
              onChange={(ev) => setShortDesc(ev.target.value)}
              maxLength={150}
              className="input"
              placeholder={d.form.shortDescPh}
            />
            <p className="hint">{fill(d.form.shortDescHint, { n: shortDesc.length })}</p>
            <FieldError errors={e.shortDesc} />
          </div>
          <div>
            <label htmlFor="fullDesc" className="label">
              {d.form.fullDesc} * <span className="font-normal text-muted">({d.form.markdown})</span>
            </label>
            <textarea id="fullDesc" name="fullDesc" defaultValue={defaults.fullDesc} rows={10} className="input font-mono text-[13px] leading-6" />
            <FieldError errors={e.fullDesc} />
          </div>
          <div>
            <span className="label">
              {d.form.tags} <span className="font-normal text-muted">({d.form.tagsHint})</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const on = selected.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className={cn("chip", on ? "border-transparent text-white" : "border-border bg-surface hover:border-fg/40")}
                    style={on ? { backgroundColor: t.color } : undefined}
                    aria-pressed={on}
                  >
                    {tTag(d, t.name)}
                  </button>
                );
              })}
            </div>
            {selected.map((id) => (
              <input key={id} type="hidden" name="tagIds" value={id} />
            ))}
            <FieldError errors={e.tagIds} />
          </div>
        </section>


        {!hideImageUrls && (
          <section className="card grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <UrlField name="logoUrl" label={d.form.logoUrl} defaultValue={defaults.logoUrl} errors={e.logoUrl} hint={d.form.logoUrlHint} />
            <UrlField name="coverUrl" label={d.form.coverUrl} defaultValue={defaults.coverUrl} errors={e.coverUrl} hint={d.form.coverUrlHint} />
          </section>
        )}
      </div>

      {/* ---------- Инвестиции ---------- */}
      <div className={cn("space-y-6", tab !== "invest" && "hidden")}>
        <section className="card space-y-5 p-5 sm:p-6" id="funding">
          <div>
            <h2 className="text-lg font-bold">{d.cardForm.investTitle}</h2>
            <p className="mt-1 text-sm text-muted">{d.cardForm.investText}</p>
          </div>
          <div className="space-y-2">
            {fund.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_140px_auto] gap-2">
                <input
                  name="fundItem"
                  value={row.item}
                  onChange={(ev) => setFund((f) => f.map((x, j) => (j === i ? { ...x, item: ev.target.value } : x)))}
                  maxLength={120}
                  className="input"
                  placeholder={d.cardForm.fundItemPh}
                  aria-label={d.cardForm.fundItemPh}
                />
                <input
                  name="fundAmount"
                  value={row.amount}
                  onChange={(ev) => setFund((f) => f.map((x, j) => (j === i ? { ...x, amount: ev.target.value.replace(/[^\d]/g, "") } : x)))}
                  inputMode="numeric"
                  className="input tabular-nums"
                  placeholder={d.cardForm.fundAmountPh}
                  aria-label={d.cardForm.fundAmountPh}
                />
                <button type="button" onClick={() => setFund((f) => f.filter((_, j) => j !== i))} className="btn-ghost px-3 text-danger" aria-label="✕">
                  ✕
                </button>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {fund.length < 12 && (
                <button type="button" onClick={() => setFund((f) => [...f, { item: "", amount: "" }])} className="btn-secondary btn-sm">
                  + {d.cardForm.fundAdd}
                </button>
              )}
              <span className="text-sm">
                {d.cardForm.fundTotal}: <b className="tabular-nums">{new Intl.NumberFormat("ru-RU").format(fundTotal)} ₸</b>
              </span>
            </div>
            <FieldError errors={e.fundingBreakdown} />
          </div>
          <div className={cn("space-y-5", fund.length === 0 && "opacity-60")}>
            <div>
              <label htmlFor="fundingNeedDesc" className="label">{d.cardForm.fundWhy}{fund.length > 0 && " *"}</label>
              <textarea id="fundingNeedDesc" name="fundingNeedDesc" defaultValue={defaults.fundingNeedDesc} rows={4} maxLength={3000} className="input" placeholder={d.cardForm.fundWhyPh} />
              <p className="hint">{d.cardForm.fundWhyHint}</p>
              <FieldError errors={e.fundingNeedDesc} />
            </div>
            <div>
              <label htmlFor="fundingContact" className="label">{d.cardForm.fundContact}{fund.length > 0 && " *"}</label>
              <input id="fundingContact" name="fundingContact" defaultValue={defaults.fundingContact} maxLength={200} className="input" placeholder={d.cardForm.fundContactPh} />
              <p className="hint">{d.cardForm.fundContactHint}</p>
              <FieldError errors={e.fundingContact} />
            </div>
          </div>
        </section>
      </div>

      {/* ---------- Продукт и сроки ---------- */}
      <div className={cn("space-y-6", tab !== "product" && "hidden")}>
        <section className="card space-y-5 p-5 sm:p-6">
          <h2 className="text-lg font-bold">{d.cardForm.timingTitle}</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            <NumberField name="buildMonths" label={d.cardForm.buildMonths} defaultValue={defaults.buildMonths} errors={e.buildMonths} step={1} hint={d.cardForm.buildMonthsHint} />
            <NumberField name="implDays" label={d.cardForm.implDays} defaultValue={defaults.implDays} errors={e.implDays} step={1} />
            <NumberField name="implPrice" label={d.cardForm.implPrice} defaultValue={defaults.implPrice} errors={e.implPrice} step={1000} />
          </div>
        </section>

        <section className="card space-y-5 p-5 sm:p-6">
          <h2 className="text-lg font-bold">{d.cardForm.diffTitle}</h2>
          <div>
            <label htmlFor="advantages" className="label">{d.cardForm.advantages}</label>
            <textarea id="advantages" name="advantages" defaultValue={defaults.advantages} rows={4} className="input" placeholder={d.form.advantagesPh} />
            <FieldError errors={e.advantages} />
          </div>
          <div>
            <label htmlFor="competitors" className="label">{d.cardForm.competitors}</label>
            <input id="competitors" name="competitors" defaultValue={defaults.competitors} maxLength={500} className="input" placeholder={d.form.competitorsPh} />
          </div>
          <div>
            <label htmlFor="killerFeatures" className="label">{d.cardForm.killer}</label>
            <textarea id="killerFeatures" name="killerFeatures" defaultValue={defaults.killerFeatures} rows={3} maxLength={3000} className="input" placeholder={d.cardForm.killerPh} />
            <FieldError errors={e.killerFeatures} />
          </div>
          <div>
            <label htmlFor="secretSauce" className="label">{d.cardForm.sauce}</label>
            <textarea id="secretSauce" name="secretSauce" defaultValue={defaults.secretSauce} rows={3} maxLength={3000} className="input" placeholder={d.cardForm.saucePh} />
            <FieldError errors={e.secretSauce} />
          </div>
        </section>

        <section className="card space-y-5 p-5 sm:p-6">
          <div>
            <span className="label">{d.form.roadmap}</span>
            <p className="hint mb-3 mt-0">{d.form.roadmapHint}</p>
            <div className="space-y-2">
              {roadmap.map((item, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-border p-2 sm:grid-cols-[1fr_120px_140px_auto]">
                  <input
                    name="roadmapTitle"
                    value={item.title}
                    onChange={(ev) => setRoadmap((r) => r.map((x, j) => (j === i ? { ...x, title: ev.target.value } : x)))}
                    maxLength={120}
                    className="input"
                    placeholder={d.form.roadmapTitlePh}
                    aria-label={d.form.roadmapTitle}
                  />
                  <input
                    name="roadmapPeriod"
                    value={item.period ?? ""}
                    onChange={(ev) => setRoadmap((r) => r.map((x, j) => (j === i ? { ...x, period: ev.target.value } : x)))}
                    maxLength={40}
                    className="input"
                    placeholder={d.form.roadmapPeriodPh}
                    aria-label={d.form.roadmapPeriod}
                  />
                  <select
                    name="roadmapStatus"
                    value={item.status}
                    onChange={(ev) =>
                      setRoadmap((r) => r.map((x, j) => (j === i ? { ...x, status: ev.target.value as RoadmapItem["status"] } : x)))
                    }
                    className="input"
                  >
                    {ROADMAP_STATUSES.map((s) => (
                      <option key={s} value={s}>{d.startup.roadmapStatus[s]}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setRoadmap((r) => r.filter((_, j) => j !== i))}
                    className="btn-ghost px-3 text-danger"
                    aria-label={d.form.roadmapRemove}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            {roadmap.length < 20 && (
              <button
                type="button"
                onClick={() => setRoadmap((r) => [...r, { title: "", period: "", status: "planned" }])}
                className="btn-secondary btn-sm mt-2"
              >
                + {d.form.roadmapAdd}
              </button>
            )}
            <FieldError errors={e.roadmap} />
          </div>
        </section>
      </div>

      {/* ---------- Команда ---------- */}
      <div className={cn("space-y-6", tab !== "team" && "hidden")}>
        <section className="card space-y-5 p-5 sm:p-6">
          <h2 className="text-lg font-bold">{d.cardForm.teamTitle}</h2>
          <div>
            <label htmlFor="teamInfo" className="label">{d.cardForm.teamInfo}</label>
            <textarea id="teamInfo" name="teamInfo" defaultValue={defaults.teamInfo} rows={4} maxLength={3000} className="input" placeholder={d.cardForm.teamInfoPh} />
            <FieldError errors={e.teamInfo} />
          </div>
          <div>
            <label htmlFor="hiring" className="label">{d.cardForm.hiring}</label>
            <textarea id="hiring" name="hiring" defaultValue={defaults.hiring} rows={3} maxLength={2000} className="input" placeholder={d.cardForm.hiringPh} />
            <FieldError errors={e.hiring} />
          </div>
          <div>
            <label htmlFor="compensation" className="label">{d.cardForm.compensation}</label>
            <input id="compensation" name="compensation" defaultValue={defaults.compensation} maxLength={1000} className="input" placeholder={d.cardForm.compensationPh} />
            <FieldError errors={e.compensation} />
          </div>
        </section>
        <section className="card space-y-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-bold">{d.form.collabSection}</h2>
            <Toggle name="openToCollab" checked={collab} onChange={setCollab} label={d.form.openToCollab} />
          </div>
          <p className="-mt-3 text-sm text-muted">{d.form.openToCollab}</p>
          <div className={cn(!collab && "pointer-events-none opacity-50")}>
            <label htmlFor="collabNote" className="label">{d.form.collabNote}</label>
            <textarea id="collabNote" name="collabNote" defaultValue={defaults.collabNote} rows={3} maxLength={500} className="input" placeholder={d.form.collabNotePh} />
          </div>
        </section>
      </div>

      {/* ---------- API и ссылки ---------- */}
      <div className={cn("space-y-6", tab !== "api" && "hidden")}>
        <section className="card space-y-5 p-5 sm:p-6">
          <h2 className="text-lg font-bold">{d.form.apiSection}</h2>
          <div>
            <span className="label">{d.form.apiStatus}</span>
            <div className="flex flex-wrap gap-2">
              {API_STATUSES.map((s) => (
                <label key={s} className={cn("chip cursor-pointer", apiStatus === s ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface")}>
                  <input type="radio" name="apiStatus" value={s} checked={apiStatus === s} onChange={() => setApiStatus(s)} className="sr-only" />
                  {d.api.status[s]}
                </label>
              ))}
            </div>
          </div>
          <div className={cn("space-y-5", apiStatus === "NONE" && "hidden")}>
            <div>
              <span className="label">{d.form.apiTypes}</span>
              <div className="flex flex-wrap gap-2">
                {API_TYPES.map((t) => (
                  <label key={t} className="chip cursor-pointer border-border bg-surface has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent">
                    <input type="checkbox" name="apiTypes" value={t} defaultChecked={defaults.apiTypes.includes(t)} className="sr-only" />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <UrlField name="apiDocsUrl" label={d.form.apiDocs} defaultValue={defaults.apiDocsUrl} errors={e.apiDocsUrl} />
          </div>
        </section>


        <section className="card space-y-5 p-5 sm:p-6">
          <h2 className="text-lg font-bold">{d.cardForm.linksTitle}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <UrlField name="githubUrl" label={d.form.githubUrl} defaultValue={defaults.githubUrl} errors={e.githubUrl} placeholder="https://github.com/owner/repo" hint={d.form.githubUrlHint} />
            <UrlField name="demoUrl" label={d.form.demoUrl} defaultValue={defaults.demoUrl} errors={e.demoUrl} />
            <UrlField name="websiteUrl" label={d.form.websiteUrl} defaultValue={defaults.websiteUrl} errors={e.websiteUrl} />
          </div>
        </section>
      </div>

      {/* ---------- Оформление ---------- */}
      <div className={cn("space-y-6", tab !== "design" && "hidden")}>
        <section className="card space-y-6 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold">{d.form.design}</h2>
            <p className="mt-1 text-sm text-muted">{d.form.designText}</p>
          </div>
          <input type="hidden" name="pageTheme" value={theme} />
          <input type="hidden" name="pageFont" value={font} />
          <input type="hidden" name="pageLayout" value={layout} />
          <input type="hidden" name="pageAccent" value={accent} />

          <div>
            <span className="label">{d.form.theme}</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {PAGE_THEMES.map((t) => {
                const [bg, ac] = THEME_SWATCH[t] ?? ["#fff", "#06f"];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    aria-pressed={theme === t}
                    className={cn("rounded-xl border-2 p-1.5 text-left transition-colors", theme === t ? "border-accent" : "border-transparent hover:border-border")}
                  >
                    <span className="block h-12 rounded-lg border border-border/60" style={{ background: `linear-gradient(135deg, ${bg} 55%, ${ac} 55%)` }} />
                    <span className="mt-1 block text-xs font-medium">{d.form.themes[t]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="label">{d.form.accent}</span>
              <input
                type="color"
                value={accent || (THEME_SWATCH[theme]?.[1] ?? "#0066FF")}
                onChange={(ev) => setAccent(ev.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-surface p-1"
              />
            </label>
            {accent && (
              <button type="button" onClick={() => setAccent("")} className="btn-ghost btn-sm">{d.form.accentReset}</button>
            )}
            <FieldError errors={e.pageAccent} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <span className="label">{d.form.font}</span>
              <div className="flex flex-wrap gap-2">
                {PAGE_FONTS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFont(f)}
                    data-pfont={f}
                    className={cn("chip", font === f ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface")}
                  >
                    <span className="p-head">{d.form.fonts[f]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="label">{d.form.layout}</span>
              <div className="flex flex-wrap gap-2">
                {PAGE_LAYOUTS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLayout(l)}
                    className={cn("chip", layout === l ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface")}
                  >
                    {d.form.layouts[l]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Живой предпросмотр */}
          <div>
            <span className="label">{d.form.preview}</span>
            <div
              data-ptheme={theme}
              data-pfont={font}
              style={accentRgb ? ({ "--accent": accentRgb, "--accent-hover": accentRgb } as React.CSSProperties) : undefined}
              className="overflow-hidden rounded-xl border border-border bg-bg text-fg"
            >
              <div className={cn("bg-accent/80", layout === "wide" ? "h-20" : layout === "minimal" ? "h-0" : "h-10")} />
              <div className={cn("p-4", layout === "minimal" && "text-center")}>
                <div className="p-head text-xl font-bold">{defaults.name || d.form.namePh}</div>
                <div className="mt-1 text-sm text-muted">{shortDesc || d.form.shortDescPh}</div>
                <div className={cn("mt-3 flex gap-2", layout === "minimal" && "justify-center")}>
                  <span className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white">{d.card.sponsor}</span>
                  <span className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold">GitHub</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="flex justify-end">
        <SubmitButton className="w-full px-6 sm:w-auto">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

function Toggle({ name, checked, onChange, label }: { name: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
      <input type="checkbox" name={name} checked={checked} onChange={(ev) => onChange(ev.target.checked)} className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-border transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-accent peer-checked:after:translate-x-5" />
      <span className="sr-only">{label}</span>
    </label>
  );
}

function NumberField({
  name,
  label,
  defaultValue,
  errors,
  step,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: string;
  errors?: string[];
  step: number;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} type="number" min={0} step={step} defaultValue={defaultValue} className="input" />
      {hint && <p className="hint">{hint}</p>}
      <FieldError errors={errors} />
    </div>
  );
}

function UrlField({
  name,
  label,
  defaultValue,
  errors,
  placeholder = "https://",
  hint,
}: {
  name: string;
  label: string;
  defaultValue: string;
  errors?: string[];
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} type="url" inputMode="url" defaultValue={defaultValue} placeholder={placeholder} className="input" />
      {hint && <p className="hint">{hint}</p>}
      <FieldError errors={errors} />
    </div>
  );
}
