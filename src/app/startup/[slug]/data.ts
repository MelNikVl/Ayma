import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getStartupBySlug = cache(async (slug: string) =>
  prisma.startup.findUnique({
    where: { slug },
    include: {
      tags: { orderBy: { name: "asc" } },
      founder: { select: { id: true, username: true, firstName: true, avatarUrl: true } },
      members: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: { id: true, username: true, firstName: true, avatarUrl: true, githubLogin: true, linkedinUrl: true, resumeUrl: true },
          },
        },
      },
    },
  }),
);
