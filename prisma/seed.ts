/**
 * Сид: базовые теги + демо-данные (отключаются SEED_DEMO=false).
 * Идемпотентен — можно запускать повторно.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TAGS: Array<{ name: string; color: string }> = [
  { name: "NLP", color: "#0066FF" },
  { name: "Computer Vision", color: "#7C3AED" },
  { name: "SaaS", color: "#059669" },
  { name: "Chatbots", color: "#0891B2" },
  { name: "Voice", color: "#DB2777" },
  { name: "Vision", color: "#9333EA" },
  { name: "DevTools", color: "#EA580C" },
  { name: "LLM", color: "#4F46E5" },
  { name: "EdTech", color: "#16A34A" },
  { name: "FinTech", color: "#CA8A04" },
];

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 3600 * 1000);

const DEMO = [
  {
    slug: "qazaq-speech",
    name: "QazaqSpeech",
    shortDesc: "Распознавание и синтез казахской речи с точностью 94% — API для колл-центров и госсервисов.",
    tags: ["Voice", "NLP", "SaaS"],
    stars: 1240,
    lastCommit: daysAgo(2),
    price: 5000,
    goal: 500000,
    desc: "Годовая подписка на Pro API (100 часов распознавания в месяц) после публичного релиза.",
    views: 830,
  },
  {
    slug: "doc-lens",
    name: "DocLens",
    shortDesc: "OCR для сканов казахстанских документов: удостоверения, справки, накладные. Выгрузка в 1С.",
    tags: ["Computer Vision", "SaaS"],
    stars: 312,
    lastCommit: daysAgo(5),
    price: 15000,
    goal: 300000,
    desc: "Внедрение под ваш тип документов + 3 месяца поддержки.",
    views: 512,
  },
  {
    slug: "kaspi-bot-builder",
    name: "ShopBot KZ",
    shortDesc: "Конструктор Telegram-ботов для продавцов маркетплейсов: ответы на вопросы, статусы заказов, FAQ.",
    tags: ["Chatbots", "LLM", "SaaS"],
    stars: 89,
    lastCommit: daysAgo(1),
    price: 3000,
    goal: 0,
    desc: "Месяц тарифа «Бизнес» после запуска.",
    views: 420,
  },
  {
    slug: "code-review-ai",
    name: "ReviewPilot",
    shortDesc: "AI-ревьюер пулл-реквестов на русском: находит баги, уязвимости и пишет понятные комментарии.",
    tags: ["DevTools", "LLM"],
    stars: 2870,
    lastCommit: daysAgo(0.3),
    price: 9900,
    goal: 1000000,
    desc: "Годовая лицензия на команду до 10 разработчиков.",
    views: 1290,
  },
  {
    slug: "agro-vision",
    name: "AgroVision",
    shortDesc: "Анализ снимков с дронов: болезни посевов, прогноз урожайности для фермеров Северного Казахстана.",
    tags: ["Vision", "Computer Vision"],
    stars: 156,
    lastCommit: daysAgo(14),
    price: 50000,
    goal: 2000000,
    desc: "Пилотный анализ 500 га в сезон 2027 с отчётом агроному.",
    views: 260,
  },
  {
    slug: "tutor-gpt",
    name: "Ustaz AI",
    shortDesc: "Персональный репетитор по ЕНТ на трёх языках: объясняет ошибки и подбирает задачи.",
    tags: ["EdTech", "LLM", "Chatbots"],
    stars: 47,
    lastCommit: daysAgo(3),
    price: 2500,
    goal: 200000,
    desc: "Полгода премиум-доступа для одного ученика.",
    views: 610,
  },
  {
    slug: "fin-parser",
    name: "Tenge Insights",
    shortDesc: "Разбор банковских выписок и категоризация расходов для ИП и бухгалтеров.",
    tags: ["FinTech", "NLP", "SaaS"],
    stars: 0,
    lastCommit: null,
    price: 0,
    goal: 0,
    desc: null,
    views: 95,
  },
  {
    slug: "voice-clone-studio",
    name: "Dauys Studio",
    shortDesc: "Озвучка видео и подкастов казахскими и русскими голосами с эмоциями.",
    tags: ["Voice", "SaaS"],
    stars: 534,
    lastCommit: daysAgo(9),
    price: 7000,
    goal: 0,
    desc: "10 часов озвучки после релиза студии.",
    views: 380,
  },
];

const FULL_DESC = (name: string) => `## Проблема

Компании тратят сотни часов на рутину, которую можно автоматизировать. Готовые зарубежные решения плохо работают с казахским и русским языками.

## Решение

**${name}** — продукт, обученный на локальных данных и развёрнутый в Казахстане. Данные не покидают страну.

## Что уже сделано

- [x] MVP и закрытая бета
- [x] 12 пилотных клиентов
- [ ] Публичный API
- [ ] Мобильное приложение

## Команда

Три инженера из Астаны и Алматы, опыт в ML с 2017 года.

> Это демо-карточка из сид-данных. Удалите её или запустите сид с \`SEED_DEMO=false\`.
`;

async function main() {
  for (const tag of TAGS) {
    await prisma.tag.upsert({ where: { name: tag.name }, create: tag, update: { color: tag.color } });
  }
  console.log(`✓ Теги: ${TAGS.length}`);

  if (process.env.SEED_DEMO === "false") return;

  const founder = await prisma.user.upsert({
    where: { telegramId: BigInt(1) },
    create: { telegramId: BigInt(1), username: "demo_founder", firstName: "Demo Founder" },
    update: {},
  });

  const sponsors = await Promise.all(
    ["aidana_dev", "nurlan_ml", "olga_pm", "timur_kz", "asel_ai", "daniyar"].map((username, i) =>
      prisma.user.upsert({
        where: { telegramId: BigInt(100 + i) },
        create: { telegramId: BigInt(100 + i), username, firstName: username, role: "SPONSOR" },
        update: {},
      }),
    ),
  );

  for (const [index, d] of DEMO.entries()) {
    const data = {
      name: d.name,
      shortDesc: d.shortDesc,
      fullDesc: FULL_DESC(d.name),
      githubUrl: d.stars > 0 ? `https://github.com/example/${d.slug}` : null,
      githubStars: d.stars,
      githubLastCommit: d.lastCommit,
      demoUrl: "https://example.com",
      preOrderEnabled: d.price > 0,
      preOrderPrice: d.price,
      preOrderGoal: d.goal,
      preOrderDesc: d.desc,
      status: "APPROVED" as const,
      viewsCount: d.views,
      founderId: founder.id,
      tags: { set: [] as { name: string }[], connect: d.tags.map((name) => ({ name })) },
    };
    const startup = await prisma.startup.upsert({
      where: { slug: d.slug },
      create: { ...data, slug: d.slug, tags: { connect: d.tags.map((name) => ({ name })) } },
      update: data,
    });

    // Немного оплаченных предзаказов для прогресс-бара и списка спонсоров
    const existing = await prisma.preOrder.count({ where: { startupId: startup.id } });
    if (existing === 0 && d.price > 0) {
      const n = (index % 4) + 1;
      for (let i = 0; i < n; i++) {
        const sponsor = sponsors[(index + i) % sponsors.length]!;
        const quantity = (i % 3) + 1;
        await prisma.preOrder.create({
          data: {
            startupId: startup.id,
            sponsorId: sponsor.id,
            quantity,
            amount: d.price * quantity,
            status: "PAID",
            contactInfo: `@${sponsor.username}`,
          },
        });
      }
    }
  }
  console.log(`✓ Демо-стартапы: ${DEMO.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
