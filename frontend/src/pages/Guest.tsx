import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { GuestFlow } from "@/components/guest/GuestFlow";
import { ErrorScreen, SplashScreen } from "@/components/guest/StateScreens";
import { DEFAULT_THEME, themeVars } from "@/lib/theme";
import { useOnline } from "@/hooks/useOnline";
import { ApiError, apiGet } from "@/lib/api";
import { cacheGet, cacheSet, flushQueue, getQueue } from "@/lib/offline";
import { DEFAULT_SLUG } from "@/lib/tags";
import type { PublicRestaurant } from "@/lib/types";

export default function Guest() {
  const { slug: pathSlug } = useParams();
  const [params] = useSearchParams();
  const slug = (pathSlug ?? params.get("restaurant") ?? DEFAULT_SLUG).toLowerCase();
  const online = useOnline();
  const cacheKey = `restaurant:${slug}`;

  // Restaurant config (menu, theme, links) is cached on the phone so the flow works offline.
  const { data, error, refetch } = useQuery({
    queryKey: ["public-restaurant", slug],
    initialData: cacheGet<PublicRestaurant>(cacheKey) ?? undefined,
    initialDataUpdatedAt: 0,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
    queryFn: async () => {
      const r = await apiGet<PublicRestaurant>(`/public/restaurants/${encodeURIComponent(slug)}`);
      cacheSet(cacheKey, r);
      return r;
    },
  });

  useEffect(() => {
    if (data) document.title = `${data.name} · Rate, share & win`;
  }, [data]);

  // Offline queue: flush on reconnect, on SW background-sync, and on load if anything is pending.
  useEffect(() => {
    const flush = () =>
      flushQueue().then((n) => {
        if (n > 0) toast.success("Your saved feedback was sent to the restaurant.");
      });
    if (getQueue().length) flush();
    window.addEventListener("online", flush);
    window.addEventListener("crm-sync", flush);
    return () => {
      window.removeEventListener("online", flush);
      window.removeEventListener("crm-sync", flush);
    };
  }, []);

  const notFound = !data && error instanceof ApiError && error.status === 404;

  return (
    <div className="min-h-screen bg-[#1E1B18] sm:px-4 sm:py-6">
      <main
        data-testid="guest-shell"
        className="mx-auto flex min-h-screen max-w-[480px] flex-col overflow-hidden bg-[#FDFBF7] shadow-2xl sm:min-h-[calc(100vh-3rem)] sm:rounded-[28px]"
      >
        {data ? (
          <GuestFlow restaurant={data} online={online} />
        ) : (
          <div style={themeVars(DEFAULT_THEME)} className="flex flex-1 flex-col bg-[var(--g-bg)] text-[var(--g-ink)]">
            {notFound ? (
              <ErrorScreen
                testId="guest-not-found"
                emoji="🧭"
                title="We couldn't find this table"
                body="This QR link looks out of date. Please scan the code on your table again or ask your server."
                actions={[{ label: "Try again", onClick: () => window.location.reload(), testId: "not-found-retry-button", primary: true }]}
              />
            ) : error ? (
              <ErrorScreen
                testId="guest-offline"
                emoji="📡"
                title="No signal at this table"
                body="Connect once to load the restaurant. After that, everything works offline too."
                actions={[{ label: "Try again", onClick: () => refetch(), testId: "offline-retry-button", primary: true }]}
              />
            ) : (
              <SplashScreen />
            )}
          </div>
        )}
      </main>
      <Toaster richColors position="top-center" />
    </div>
  );
}
