import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return NextResponse.json({ hasToken: Boolean(settings?.githubToken) });
}

export async function POST(req: NextRequest) {
  const { githubToken } = (await req.json()) as { githubToken?: string };

  await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, githubToken: githubToken || null },
    update: { githubToken: githubToken || null },
  });

  return NextResponse.json({ ok: true });
}
