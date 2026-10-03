import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" ? null : v))
  .pipe(
    z
      .string()
      .url("Некорректная ссылка")
      .refine((v) => /^https?:\/\//.test(v), "Ссылка должна начинаться с http(s)://")
      .nullable(),
  );

const intFromForm = (min: number, max: number) =>
  z.coerce
    .number({ invalid_type_error: "Введите число" })
    .int("Только целое число")
    .min(min, `Минимум ${min}`)
    .max(max, `Максимум ${max}`);

export const startupSchema = z
  .object({
    name: z.string().trim().min(2, "Минимум 2 символа").max(60, "Максимум 60 символов"),
    shortDesc: z.string().trim().min(10, "Минимум 10 символов").max(150, "Максимум 150 символов"),
    fullDesc: z.string().trim().min(30, "Опишите проект подробнее (от 30 символов)").max(20_000),
    logoUrl: optionalUrl,
    coverUrl: optionalUrl,
    githubUrl: optionalUrl.refine(
      (v) => v === null || /^https:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/.test(v),
      "Нужна ссылка вида https://github.com/owner/repo",
    ),
    demoUrl: optionalUrl,
    websiteUrl: optionalUrl,
    tagIds: z.array(z.string().min(1)).max(5, "Не больше 5 тегов"),
    preOrderEnabled: z.boolean(),
    preOrderPrice: intFromForm(0, 100_000_000),
    preOrderGoal: intFromForm(0, 1_000_000_000),
    preOrderDesc: z
      .string()
      .trim()
      .max(2000)
      .transform((v) => (v === "" ? null : v)),
    paymentUrl: optionalUrl,
  })
  .superRefine((data, ctx) => {
    if (data.preOrderEnabled && data.preOrderPrice < 100) {
      ctx.addIssue({ code: "custom", path: ["preOrderPrice"], message: "Цена предзаказа — от 100 ₸" });
    }
    if (data.preOrderEnabled && !data.preOrderDesc) {
      ctx.addIssue({ code: "custom", path: ["preOrderDesc"], message: "Опишите, что получит спонсор" });
    }
  });

export type StartupInput = z.infer<typeof startupSchema>;

export function parseStartupForm(formData: FormData) {
  return startupSchema.safeParse({
    name: formData.get("name") ?? "",
    shortDesc: formData.get("shortDesc") ?? "",
    fullDesc: formData.get("fullDesc") ?? "",
    logoUrl: formData.get("logoUrl") ?? "",
    coverUrl: formData.get("coverUrl") ?? "",
    githubUrl: formData.get("githubUrl") ?? "",
    demoUrl: formData.get("demoUrl") ?? "",
    websiteUrl: formData.get("websiteUrl") ?? "",
    tagIds: formData.getAll("tagIds").map(String),
    preOrderEnabled: formData.get("preOrderEnabled") === "on",
    preOrderPrice: formData.get("preOrderPrice") || 0,
    preOrderGoal: formData.get("preOrderGoal") || 0,
    preOrderDesc: formData.get("preOrderDesc") ?? "",
    paymentUrl: formData.get("paymentUrl") ?? "",
  });
}

export const preOrderSchema = z.object({
  startupId: z.string().min(1),
  quantity: intFromForm(1, 100),
  contactInfo: z.string().trim().min(3, "Укажите Telegram или email для связи").max(200),
  agree: z.literal(true, { errorMap: () => ({ message: "Подтвердите условия предзаказа" }) }),
});

export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
