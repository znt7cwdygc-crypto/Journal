import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/safe-redirect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Выбор города",
  robots: { index: false, follow: true }
};

export default function SelectCityPage({ searchParams }: { searchParams?: { next?: string } }) {
  redirect(safeInternalPath(searchParams?.next || "/"));
}
