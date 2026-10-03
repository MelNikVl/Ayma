import { z } from "zod";

/**
 * Сообщения об ошибках — ключи словаря `errors` (src/i18n/dictionaries),
 * интерфейс переводит их на язык пользователя.
 */

const optionalUrl = z
  .string()
  .trim()
  .max(500, "tooLong")
  .transform((v) => (v === "" ? null : v))
  .pipe(
    z
      .string()
      .url("url")
      .refine((v) => /^https?:\/\//.test(v), "urlHttp")
      .nullable(),
  );

const intFromForm = (min: number, max: number) =>
  z.coerce.number({ invalid_type_error: "number" }).int("int").min(min, "range").max(max, "range");

/** Пустая строка → null, иначе целое в диапазоне */
const optionalInt = (max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.coerce.number({ invalid_type_error: "number" }).int("int").min(0, "range").max(max, "range").nullable());

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .transform((v) => (v === "" ? null : v));

export const API_STATUSES = ["NONE", "PLANNED", "BETA", "PUBLIC"] as const;
export const API_TYPES = ["REST", "GraphQL", "gRPC", "WebSocket", "SDK", "Webhooks", "MCP"] as const;
export const ROADMAP_STATUSES = ["done", "doing", "planned"] as const;
export const PAGE_THEMES = ["default", "midnight", "paper", "forest", "sunset", "steppe"] as const;
export const PAGE_FONTS = ["sans", "serif", "mono", "rounded"] as const;
export const PAGE_LAYOUTS = ["classic", "wide", "minimal"] as const;
export const COLLAB_KINDS = ["integration", "api", "team", "pilot", "other"] as const;

export type RoadmapItem = { title: string; period: string | null; status: (typeof ROADMAP_STATUSES)[number] };

const roadmapItem = z.object({
  title: z.string().trim().min(1).max(120, "tooLong"),
  period: z
    .string()
    .trim()
    .max(40, "tooLong")
    .transform((v) => (v === "" ? null : v)),
  status: z.enum(ROADMAP_STATUSES),
});

export const startupSchema = z
  .object({
    name: z.string().trim().min(2, "min2").max(60, "max60"),
    shortDesc: z.string().trim().min(10, "min10").max(150, "max150"),
    fullDesc: z.string().trim().min(30, "min30").max(20_000, "tooLong"),
    logoUrl: optionalUrl,
    coverUrl: optionalUrl,
    githubUrl: optionalUrl.refine(
      (v) => v === null || /^https:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/.test(v),
      "github",
    ),
    demoUrl: optionalUrl,
    websiteUrl: optionalUrl,
    tagIds: z.array(z.string().min(1)).max(5, "tags5"),
    preOrderEnabled: z.boolean(),
    preOrderPrice: intFromForm(0, 100_000_000),
    preOrderGoal: intFromForm(0, 1_000_000_000),
    preOrderDesc: optionalText(2000),
    paymentUrl: optionalUrl,
    // бизнес
    roadmap: z.array(roadmapItem).max(20, "tooLong"),
    advantages: optionalText(5000),
    competitors: optionalText(500),
    implPrice: optionalInt(10_000_000_000),
    implDays: optionalInt(3650),
    fundingNeed: optionalInt(100_000_000_000),
    fundingNeedDesc: optionalText(3000),
    // API и коллабы
    apiStatus: z.enum(API_STATUSES),
    apiTypes: z.array(z.enum(API_TYPES)).max(API_TYPES.length),
    apiDocsUrl: optionalUrl,
    openToCollab: z.boolean(),
    collabNote: optionalText(500),
    // оформление
    pageTheme: z.enum(PAGE_THEMES),
    pageAccent: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .pipe(z.string().regex(/^#[0-9a-fA-F]{6}$/, "color").nullable()),
    pageFont: z.enum(PAGE_FONTS),
    pageLayout: z.enum(PAGE_LAYOUTS),
  })
  .superRefine((data, ctx) => {
    if (data.preOrderEnabled && data.preOrderPrice < 100) {
      ctx.addIssue({ code: "custom", path: ["preOrderPrice"], message: "price100" });
    }
    if (data.preOrderEnabled && !data.preOrderDesc) {
      ctx.addIssue({ code: "custom", path: ["preOrderDesc"], message: "preorderDesc" });
    }
  });

export type StartupInput = z.infer<typeof startupSchema>;

function str(formData: FormData, key: string, fallback = ""): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : fallback;
}

function parseRoadmap(formData: FormData) {
  const titles = formData.getAll("roadmapTitle").map(String);
  const periods = formData.getAll("roadmapPeriod").map(String);
  const statuses = formData.getAll("roadmapStatus").map(String);
  return titles
    .map((title, i) => ({ title, period: periods[i] ?? "", status: statuses[i] ?? "planned" }))
    .filter((r) => r.title.trim() !== "");
}

export function parseStartupForm(formData: FormData) {
  return startupSchema.safeParse({
    name: str(formData, "name"),
    shortDesc: str(formData, "shortDesc"),
    fullDesc: str(formData, "fullDesc"),
    logoUrl: str(formData, "logoUrl"),
    coverUrl: str(formData, "coverUrl"),
    githubUrl: str(formData, "githubUrl"),
    demoUrl: str(formData, "demoUrl"),
    websiteUrl: str(formData, "websiteUrl"),
    tagIds: formData.getAll("tagIds").map(String),
    preOrderEnabled: formData.get("preOrderEnabled") === "on",
    preOrderPrice: str(formData, "preOrderPrice") || 0,
    preOrderGoal: str(formData, "preOrderGoal") || 0,
    preOrderDesc: str(formData, "preOrderDesc"),
    paymentUrl: str(formData, "paymentUrl"),
    roadmap: parseRoadmap(formData),
    advantages: str(formData, "advantages"),
    competitors: str(formData, "competitors"),
    implPrice: str(formData, "implPrice"),
    implDays: str(formData, "implDays"),
    fundingNeed: str(formData, "fundingNeed"),
    fundingNeedDesc: str(formData, "fundingNeedDesc"),
    apiStatus: str(formData, "apiStatus", "NONE") || "NONE",
    apiTypes: formData.getAll("apiTypes").map(String),
    apiDocsUrl: str(formData, "apiDocsUrl"),
    openToCollab: formData.get("openToCollab") === "on",
    collabNote: str(formData, "collabNote"),
    pageTheme: str(formData, "pageTheme", "default") || "default",
    pageAccent: str(formData, "pageAccent"),
    pageFont: str(formData, "pageFont", "sans") || "sans",
    pageLayout: str(formData, "pageLayout", "classic") || "classic",
  });
}

export const preOrderSchema = z.object({
  startupId: z.string().min(1),
  quantity: intFromForm(1, 100),
  contactInfo: z.string().trim().min(3, "contact").max(200, "tooLong"),
  agree: z.literal(true, { errorMap: () => ({ message: "agree" }) }),
});

export const profileSchema = z.object({
  firstName: z.string().trim().min(2, "min2").max(60, "max60"),
  bio: optionalText(300),
  skills: z
    .string()
    .max(500, "tooLong")
    .transform((v) =>
      Array.from(
        new Set(
          v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => s.slice(0, 30)),
        ),
      ).slice(0, 15),
    ),
  contactUrl: optionalUrl,
  openToCollab: z.boolean(),
});

export const collabSchema = z
  .object({
    toStartupId: z.string().nullable(),
    toUserId: z.string().nullable(),
    fromStartupId: z.string().nullable(),
    kind: z.enum(COLLAB_KINDS),
    message: z.string().trim().min(10, "message").max(1000, "tooLong"),
    contact: optionalText(200),
  })
  .refine((v) => Boolean(v.toStartupId) !== Boolean(v.toUserId), { message: "required", path: ["message"] });

/** Сообщение — ключ словаря `msg`, ошибки полей — ключи словаря `errors`. */
export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
