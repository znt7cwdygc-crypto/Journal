import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isUserBlocked } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isUploadedFile, saveUploadedImage } from "@/lib/uploaded-image";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, blockedPermanently: true, blockedUntil: true }
  });
  if (!user || isUserBlocked(user)) return NextResponse.json({ error: "Действие недоступно" }, { status: 403 });
  if (!user.emailVerified) return NextResponse.json({ error: "Подтвердите email перед загрузкой файлов" }, { status: 403 });
  if (consumeRateLimit(`upload:${session.user.id}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Слишком много загрузок. Попробуйте позже" }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!isUploadedFile(file)) return NextResponse.json({ error: "File missing" }, { status: 400 });
  try {
    const seoContext = String(formData.get("seoContext") ?? "");
    const url = await saveUploadedImage(file, seoContext || undefined);
    if (!url) return NextResponse.json({ error: "File missing" }, { status: 400 });
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
