/**
 * Наполнение каталога реальными проектами:
 *  - удаляет демо-данные сида (стартапы demo_founder, демо-спонсоров);
 *  - импортирует проекты финала HackAlem.ai (описания, README, авторы, коммиты, структура
 *    репозиториев; данные в prisma/data/hackalem.json.gz);
 *  - добавляет проект Hatuli.
 *
 * Идемпотентен: повторный запуск обновляет карточки по slug.
 * Запуск: npx tsx prisma/import-catalog.ts
 * В Docker: docker compose run --rm migrate npx tsx prisma/import-catalog.ts
 */
import { readFileSync } from "fs";
import { gunzipSync } from "zlib";
import { join } from "path";
import { PrismaClient, Prisma } from "@prisma/client";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();

interface Track {
  industry: string;
  partner: string;
  short: string;
  task: string;
}
interface AtlasRepo {
  id: string;
  n: string; // имя репозитория
  t: string; // команда
  tr: number; // id трека
  pn: string | null; // название проекта
  su: string; // суть
  ap: string | null; // подход
  te: string[] | null; // ключевые техники
  sk: string[] | null; // стек
  ll: string[] | null; // модели
  me: string | null; // метрики
  no: string | null; // особенности
  co: string[] | null; // категории
  ma: string; // зрелость
  fc: string | null; // первый коммит
  lc: string | null; // последний коммит
  rd: string; // README
  rp: string | null; // путь к README
  au: Array<[string, number]>; // авторы коммитов
  cm: Array<[string, string, string]>; // коммиты
  bn: string[]; // ветки
  tree: string[]; // файлы
}
interface Atlas {
  generated: string;
  tracks: Record<string, Track>;
  repos: AtlasRepo[];
}

const ORG = "BAITC-Hacks";
const DEFAULT_PRICE = 10_000;
const DEFAULT_PREORDER_DESC =
  "Предзаказ консультации или доработки решения под вашу задачу. Формат, объём и сроки команда согласует с вами лично.";

/** Категории атласа → теги каталога */
const CATEGORY_TAGS: Record<string, { name: string; color: string }> = {
  llm_agent_tools: { name: "AI-агенты", color: "#4F46E5" },
  llm_pipeline: { name: "LLM", color: "#6366F1" },
  rag: { name: "RAG", color: "#0891B2" },
  speech_stt_tts: { name: "Voice", color: "#DB2777" },
  classic_ml: { name: "ML", color: "#059669" },
  deep_learning: { name: "Deep Learning", color: "#7C3AED" },
  graph_analytics: { name: "Графы", color: "#CA8A04" },
  optimization_rules: { name: "Оптимизация", color: "#EA580C" },
  simulation_game: { name: "Симуляции", color: "#9333EA" },
  dashboard_ui: { name: "Дашборды", color: "#0284C7" },
};

/** Отрасли треков → теги */
const INDUSTRY_COLORS: Record<string, string> = {
  Энергетика: "#16A34A",
  Финансы: "#CA8A04",
  Менеджмент: "#0D9488",
  Телеком: "#7C3AED",
  Логистика: "#EA580C",
  "Креативные индустрии": "#DB2777",
  Образование: "#2563EB",
  Инновации: "#0891B2",
  Коммуникации: "#4F46E5",
  Торговля: "#DC2626",
  Спецтрек: "#475569",
};

const MATURITY: Record<string, string> = {
  polished: "Доведённый продукт",
  working_mvp: "Рабочий MVP",
  prototype: "Прототип",
  no_code: "Без кода",
  idea_only: "Идея",
};

const DEMO_SLUGS = [
  "qazaq-speech",
  "doc-lens",
  "kaspi-bot-builder",
  "code-review-ai",
  "agro-vision",
  "tutor-gpt",
  "fin-parser",
  "voice-clone-studio",
];

function shortDesc(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const first = clean.match(/^.+?[.!?…](?=\s|$)/)?.[0] ?? clean;
  const candidate = first.length >= 40 && first.length <= 150 ? first : clean;
  if (candidate.length <= 150) return candidate;
  const cut = candidate.slice(0, 149);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:—–-]+$/, "")}…`;
}

/** «2026-09-23T17:58» (время Астаны) → Date */
function atlasDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(`${s}:00+05:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function codeList(items: string[] | null): string {
  return (items ?? []).map((x) => `\`${x.replace(/`/g, "")}\``).join(" · ");
}

function fullDesc(r: AtlasRepo, track: Track | undefined): string {
  const parts: string[] = [];
  const meta = [
    `**Команда:** ${r.t}`,
    track ? `**Кейс HackAlem.ai:** ${track.industry} — ${track.partner}` : null,
    `**Стадия:** ${MATURITY[r.ma] ?? r.ma}`,
  ].filter(Boolean);
  parts.push(meta.join("  \n"));
  if (track) parts.push(`> Задача кейса: ${track.task}`);
  parts.push(`## Суть\n\n${r.su}`);
  if (r.ap) parts.push(`## Как устроено\n\n${r.ap}`);
  if (r.te?.length) parts.push(`## Ключевые решения\n\n${r.te.map((t) => `- ${t}`).join("\n")}`);
  if (r.me) parts.push(`## Метрики\n\n${r.me}`);
  if (r.no) parts.push(`## Особенности\n\n${r.no}`);
  if (r.sk?.length) parts.push(`## Стек\n\n${codeList(r.sk)}`);
  if (r.ll?.length) parts.push(`## Модели\n\n${codeList(r.ll)}`);
  parts.push(
    `---\n\nПроект создан за 5 часов на финале хакатона HackAlem.ai (23 сентября 2026, Астана). ` +
      `Код — [${ORG}/${r.n}](https://github.com/${ORG}/${r.n}).`,
  );
  return parts.join("\n\n");
}

async function ensureTag(name: string, color: string) {
  return prisma.tag.upsert({ where: { name }, create: { name, color }, update: {}, select: { id: true } });
}

async function removeDemo() {
  const demoFounder = await prisma.user.findUnique({ where: { telegramId: BigInt(1) } });
  const demoStartups = await prisma.startup.findMany({
    where: { OR: [{ slug: { in: DEMO_SLUGS } }, ...(demoFounder ? [{ founderId: demoFounder.id }] : [])] },
    select: { id: true },
  });
  const ids = demoStartups.map((s) => s.id);
  await prisma.preOrder.deleteMany({ where: { startupId: { in: ids } } });
  const { count } = await prisma.startup.deleteMany({ where: { id: { in: ids } } });

  // демо-пользователи сида (telegramId 1, 100–105) без собственных данных
  const demoUsers = await prisma.user.findMany({
    where: { telegramId: { in: [1n, 100n, 101n, 102n, 103n, 104n, 105n] } },
    select: { id: true },
  });
  for (const u of demoUsers) {
    await prisma.preOrder.deleteMany({ where: { sponsorId: u.id } });
    const owns = await prisma.startup.count({ where: { founderId: u.id } });
    if (owns === 0) await prisma.user.delete({ where: { id: u.id } });
  }
  console.log(`✓ Удалено демо-стартапов: ${count}`);
}

async function importAtlas() {
  const atlas = JSON.parse(
    gunzipSync(readFileSync(join(__dirname, "data", "hackalem.json.gz"))).toString("utf8"),
  ) as Atlas;

  // Системный пользователь-«владелец» импортированных карточек.
  // Команды смогут забрать карточку себе через администратора.
  const owner = await prisma.user.upsert({
    where: { telegramId: BigInt(-1001) },
    create: { telegramId: BigInt(-1001), username: null, firstName: "HackAlem Atlas", role: "FOUNDER" },
    update: { firstName: "HackAlem Atlas" },
  });

  const hackalem = await ensureTag("HackAlem", "#0B6E69");
  const tagCache = new Map<string, string>();
  const tagId = async (name: string, color: string) => {
    const cached = tagCache.get(name);
    if (cached) return cached;
    const { id } = await ensureTag(name, color);
    tagCache.set(name, id);
    return id;
  };

  // уникальные slug: при совпадении названий добавляем id репозитория
  const baseCount = new Map<string, number>();
  for (const r of atlas.repos) {
    const base = slugify(r.pn || r.t);
    baseCount.set(base, (baseCount.get(base) ?? 0) + 1);
  }

  let n = 0;
  for (const r of atlas.repos) {
    const track = atlas.tracks[String(r.tr)];
    const base = slugify(r.pn || r.t);
    const slug = (baseCount.get(base) ?? 0) > 1 ? `${base}-${r.id}` : base;
    const name = (r.pn || r.t).slice(0, 60);

    const tagIds = [hackalem.id];
    if (track) tagIds.push(await tagId(track.industry, INDUSTRY_COLORS[track.industry] ?? "#475569"));
    for (const c of r.co ?? []) {
      const t = CATEGORY_TAGS[c];
      if (t && tagIds.length < 5) tagIds.push(await tagId(t.name, t.color));
    }

    const repoMeta = {
      team: r.t,
      hackathon: track ? { industry: track.industry, partner: track.partner, task: track.task } : null,
      maturity: MATURITY[r.ma] ?? r.ma,
      readmePath: r.rp,
      authors: r.au,
      commits: r.cm,
      branches: r.bn,
      tree: r.tree,
    };
    // Данные репозитория обновляем всегда
    const repoData = {
      readme: r.rd?.trim() ? r.rd : null,
      repoMeta,
      githubUrl: `https://github.com/${ORG}/${r.n}`,
      githubLastCommit: atlasDate(r.lc),
      websiteUrl: null,
    };
    // Карточку (название, описание, цену, теги) — только пока команда не забрала проект
    const cardData = {
      name,
      shortDesc: shortDesc(r.su),
      fullDesc: fullDesc(r, track),
      status: "APPROVED" as const,
      preOrderEnabled: true,
      preOrderPrice: DEFAULT_PRICE,
      preOrderDesc: DEFAULT_PREORDER_DESC,
    };

    const existing = await prisma.startup.findUnique({
      where: { slug },
      select: { id: true, _count: { select: { members: true } } },
    });
    if (!existing) {
      await prisma.startup.create({
        data: {
          ...repoData,
          ...cardData,
          slug,
          founderId: owner.id,
          createdAt: atlasDate(r.fc) ?? new Date("2026-09-23T10:00:00+05:00"),
          tags: { connect: tagIds.map((id) => ({ id })) },
        },
      });
    } else if (existing._count.members === 0) {
      await prisma.startup.update({
        where: { id: existing.id },
        data: { ...repoData, ...cardData, tags: { set: tagIds.map((id) => ({ id })) } },
      });
    } else {
      await prisma.startup.update({ where: { id: existing.id }, data: repoData });
    }
    if (++n % 100 === 0) console.log(`  … ${n}/${atlas.repos.length}`);
  }
  console.log(`✓ Импортировано проектов HackAlem: ${n}`);
}

const HATULI_DESC = `Аналитическая платформа для инвестиций в недвижимость Астаны. Hatuli сам собирает объявления о продаже и аренде квартир, считает для каждого объекта Deal Score и помогает решить, стоит ли покупать.

## Что умеет

- **Deal Score** — скор 0–100 по четырём факторам: цена относительно локального рынка, локация и инфраструктура, качество ЖК, доходность и ликвидность. Риски объекта собраны в отдельный «паспорт рисков».
- **Гексагональный анализ цены** — ожидаемая цена за м² по своему гексагону, соседям и городу с учётом класса ЖК.
- **Анализ торга** по реальным аналогам: гексагон, комнатность, площадь ±15%, класс ЖК.
- **ЖК и застройщики** — обогащение из Korter, Homsters, Krisha и официального реестра homeportal.kz: класс жилья, этажность, лифты, сроки сдачи, рейтинг застройщика.
- **Тепловые карты города** — цены продажи и аренды, шум, транспортная доступность, преступность, хайп локаций.
- **Хайп по новостям** — LLM разбирает новости недвижимости и привязывает их к станциям ЛРТ и ЖК.
- **Ипотека** — 14 банков, 27 программ, калькулятор платежа.
- **Детекция планировок и чистка фото** (SigLIP + OpenCV).
- **Telegram-алерты** о новых выгодных объектах.

## Стек

\`Python\` · \`FastAPI\` · \`PostgreSQL\` · \`systemd\` · \`Playwright\` · \`SigLIP\` · \`OpenCV\` · \`DeepSeek\` · \`OSRM\` · \`H3\``;

async function importHatuli() {
  const existing = await prisma.startup.findUnique({
    where: { slug: "hatuli" },
    select: { id: true, _count: { select: { members: true } } },
  });
  // Проект уже забрал владелец — карточку не трогаем
  if (existing && existing._count.members > 0) {
    console.log("✓ Hatuli: уже у команды, пропускаем");
    return;
  }

  // Пока никто не забрал — «владелец» служебный. Автор забирает проект кнопкой
  // «Это мой проект» после входа через GitHub (MelNikVl — контрибьютор репозитория).
  const placeholder = await prisma.user.upsert({
    where: { telegramId: BigInt(-1002) },
    create: { telegramId: BigInt(-1002), firstName: "Hatuli" },
    update: {},
  });

  const tags = await Promise.all([
    ensureTag("Недвижимость", "#B45309"),
    ensureTag("ML", "#059669"),
    ensureTag("LLM", "#6366F1"),
    ensureTag("Дашборды", "#0284C7"),
    ensureTag("SaaS", "#059669"),
  ]);

  const data: Prisma.StartupUncheckedUpdateInput = {
    name: "Hatuli",
    shortDesc: "Аналитика инвестиций в недвижимость Астаны: Deal Score для каждой квартиры, тепловые карты, рейтинг ЖК и застройщиков.",
    fullDesc: HATULI_DESC,
    githubUrl: "https://github.com/MelNikVl/hatuli",
    websiteUrl: "https://hatuli.ai-groundtruth.com",
    demoUrl: "https://hatuli.ai-groundtruth.com",
    status: "APPROVED",
    founderId: placeholder.id,
    preOrderEnabled: true,
    preOrderPrice: DEFAULT_PRICE,
    preOrderDesc: "Предзаказ доступа к аналитике Hatuli или персонального разбора квартиры перед покупкой.",
  };
  await prisma.startup.upsert({
    where: { slug: "hatuli" },
    create: {
      ...(data as Prisma.StartupUncheckedCreateInput),
      slug: "hatuli",
      viewsCount: 1, // первым в «Популярных», пока у остальных 0 просмотров
      tags: { connect: tags.map((t) => ({ id: t.id })) },
    },
    update: { ...data, tags: { set: tags.map((t) => ({ id: t.id })) } },
  });
  console.log("✓ Hatuli");
}

async function main() {
  await removeDemo();
  await importAtlas();
  await importHatuli();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
