import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isUploadedFile, saveUploadedImage } from "@/lib/uploaded-image";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");

  if (!isUploadedFile(file)) return NextResponse.json({ error: "File missing" }, { status: 400 });
  try {
    const url = await saveUploadedImage(file);
    if (!url) return NextResponse.json({ error: "File missing" }, { status: 400 });
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
