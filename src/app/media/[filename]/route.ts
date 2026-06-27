import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { filename: string } }) {
  redirect(`/uploads/${params.filename}`);
}
