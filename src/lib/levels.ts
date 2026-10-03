export type Level = "newbie" | "builder" | "pro" | "expert" | "legend";

/** Уровень разработчика по рейтингу */
export function levelFor(score: number): Level {
  if (score >= 80) return "legend";
  if (score >= 60) return "expert";
  if (score >= 40) return "pro";
  if (score >= 20) return "builder";
  return "newbie";
}
