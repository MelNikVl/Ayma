"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { profileSchema, type FormState } from "@/lib/validation";
import { refreshUserScore } from "@/lib/score";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "loginRequired" };

  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName") ?? "",
    bio: formData.get("bio") ?? "",
    skills: formData.get("skills") ?? "",
    contactUrl: formData.get("contactUrl") ?? "",
    openToCollab: formData.get("openToCollab") === "on",
  });
  if (!parsed.success) {
    return { ok: false, message: "checkForm", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  await refreshUserScore(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/u/[handle]", "page");
  revalidatePath("/collabs");
  return { ok: true, message: "saved" };
}
