import type { ReactNode } from "react";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiPatch } from "@/lib/api";
import { errorDetail } from "@/lib/errors";
import type { PublicRestaurant, Restaurant, RestaurantUpdate, Theme } from "@/lib/types";

export function Panel({ title, description, action, children, testId }: { title: string; description?: string; action?: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <section data-testid={testId} className="rounded-2xl border border-[#E7E2DA] bg-white p-5 shadow-[0_1px_0_rgba(28,25,23,0.04)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-[#1C1917]">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-[#78716C]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function putRestaurant(qc: QueryClient, r: Restaurant) {
  qc.setQueryData<Restaurant[]>(["restaurants"], (list) => list?.map((x) => (x.id === r.id ? r : x)));
}

export function useSaveRestaurant(rid: string, successMsg = "Saved") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RestaurantUpdate) => apiPatch<Restaurant>(`/admin/restaurants/${rid}`, body),
    onSuccess: (r) => {
      putRestaurant(qc, r);
      toast.success(successMsg);
    },
    onError: (err) => toast.error(errorDetail(err, "Couldn't save")),
  });
}

export function toPublic(r: Restaurant, theme?: Theme): PublicRestaurant {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    location: r.location,
    menu: r.menu.map((m) => m.name),
    theme: theme ?? r.theme,
    otp_enabled: r.otp_enabled,
    otp_available: r.otp_enabled,
    whatsapp_enabled: !!r.whatsapp_number.trim(),
    sms_demo: true,
    google_review_url: "",
    reward: r.reward,
  };
}

export const fieldCls =
  "h-10 w-full rounded-lg border border-[#E7E2DA] bg-white px-3 text-sm text-[#1C1917] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15";
