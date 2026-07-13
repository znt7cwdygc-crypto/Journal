"use client";

import { Suspense } from "react";
import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const yandexMetrikaId = 110404557;

type YandexMetrikaParams = Record<string, string | number | boolean | null | undefined>;
type SearchParamsLike = Pick<URLSearchParams, "get" | "toString">;

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
  }
}

export function reachYandexGoal(target: string, params?: YandexMetrikaParams) {
  if (typeof window === "undefined" || typeof window.ym !== "function") return;
  window.ym(yandexMetrikaId, "reachGoal", target, params);
}

function successGoal(pathname: string, searchParams: SearchParamsLike) {
  if (pathname !== "/cabinet") return null;

  const created = searchParams.get("created");
  const updated = searchParams.get("updated");
  const invited = searchParams.get("invited");

  if (created === "article" || created === "blog") return "article_publish";
  if (created === "product") return "product_publish";
  if (created === "vacancy") return "vacancy_publish";
  if (created === "service") return "service_publish";
  if (created === "listing") return "listing_publish";
  if (created === "matchProfile") return "match_profile_publish";
  if (updated === "resume") return "resume_publish";
  if (invited === "1") return "resume_invite_sent";

  return null;
}

function YandexMetrikaRouterInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousUrlRef = useRef<string | null>(null);
  const sentGoalsRef = useRef<Set<string>>(new Set());

  const currentUrl = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.ym !== "function") return;

    const previousUrl = previousUrlRef.current;
    if (!previousUrl) {
      previousUrlRef.current = currentUrl;
      return;
    }

    if (previousUrl !== currentUrl) {
      const absoluteUrl = new URL(currentUrl, window.location.origin).toString();
      const absoluteReferer = new URL(previousUrl, window.location.origin).toString();

      window.ym(yandexMetrikaId, "hit", absoluteUrl, {
        referer: absoluteReferer,
        title: document.title
      });
      previousUrlRef.current = currentUrl;
    }
  }, [currentUrl]);

  useEffect(() => {
    const goal = successGoal(pathname, searchParams);
    if (!goal) return;

    const key = `${goal}:${currentUrl}`;
    if (sentGoalsRef.current.has(key)) return;
    sentGoalsRef.current.add(key);

    reachYandexGoal(goal, { path: pathname });
  }, [currentUrl, pathname, searchParams]);

  return null;
}

export function YandexMetrikaRouter() {
  return (
    <Suspense fallback={null}>
      <YandexMetrikaRouterInner />
    </Suspense>
  );
}
