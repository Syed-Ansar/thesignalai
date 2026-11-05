import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BadgeCheck, Copy, ExternalLink, MessageCircle, Phone, Star } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/admin/shared";
import { apiGet } from "@/lib/api";
import { copyText } from "@/lib/errors";
import type { Analytics, ContactMethod, Restaurant, ReviewLog } from "@/lib/types";

const METHOD: Record<ContactMethod, { label: string; cls: string }> = {
  sms_verified: { label: "SMS verified", cls: "bg-[#DCFCE7] text-[#166534]" },
  whatsapp_pending: { label: "WhatsApp: pending", cls: "bg-[#DCFCE7]/60 text-[#15803D]" },
  unverified: { label: "Unverified", cls: "bg-[#F5F5F4] text-[#57534E]" },
};

function Stat({ label, value, hint, testId }: { label: string; value: string; hint?: string; testId: string }) {
  return (
    <div className="rounded-2xl border border-[#E7E2DA] bg-white p-5">
      <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-[#78716C]">{label}</p>
      <p data-testid={testId} className="mt-2 text-[30px] font-semibold tabular-nums tracking-[-0.02em] text-[#1C1917]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#A8A29E]">{hint}</p>}
    </div>
  );
}

export function ReviewsTab({ restaurant }: { restaurant: Restaurant }) {
  const rid = restaurant.id;
  const analytics = useQuery({ queryKey: ["analytics", rid], queryFn: () => apiGet<Analytics>(`/admin/restaurants/${rid}/analytics`) });
  const reviews = useQuery({ queryKey: ["reviews", rid], queryFn: () => apiGet<ReviewLog[]>(`/admin/restaurants/${rid}/reviews`) });
  const a = analytics.isError ? undefined : analytics.data;
  const guestLink = `${window.location.origin}/app/${restaurant.slug}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
        <span className="text-[13px] font-medium text-[#78350F]">Guest link</span>
        <code data-testid="guest-link" className="min-w-0 flex-1 truncate text-[13px] text-[#44403C]">{guestLink}</code>
        <button type="button" data-testid="copy-guest-link-button" onClick={() => copyText(guestLink).then(() => toast.success("Guest link copied"))} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-[#B45309] transition-colors duration-150 hover:bg-[#FEF3C7]">
          <Copy className="size-3.5" /> Copy
        </button>
        <a data-testid="open-guest-link" href={guestLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-[#B45309] transition-colors duration-150 hover:bg-[#FEF3C7]">
          <ExternalLink className="size-3.5" /> Open
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat testId="stat-total-reviews" label="Total Reviews Generated" value={a ? String(a.total_reviews) : "—"} hint="Reviews copied to Google" />
        <Stat
          testId="stat-conversion-rate"
          label="Conversion Rate"
          value={a ? `${(a.conversion_rate * 100).toFixed(1)}%` : "—"}
          hint={a ? `${a.total_reviews} copied ÷ ${a.total_visits} star taps` : undefined}
        />
        <div className="rounded-2xl border border-[#E7E2DA] bg-white p-5 sm:col-span-2 xl:col-span-1">
          <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-[#78716C]">Top Mentioned Dishes</p>
          <ol data-testid="top-dishes-list" className="mt-3 space-y-1.5">
            {a?.top_dishes.length ? (
              a.top_dishes.map((d, i) => (
                <li key={d.name} className="flex items-center justify-between text-sm">
                  <span className="text-[#44403C]"><span className="mr-2 tabular-nums text-[#A8A29E]">{i + 1}.</span>{d.name}</span>
                  <span className="tabular-nums font-semibold text-[#1C1917]">{d.count}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-[#A8A29E]">No dishes mentioned yet</li>
            )}
          </ol>
        </div>
      </div>

      <Panel title="Review log" description="Every review a guest copied, newest first." testId="review-log-panel">
        {reviews.isPending ? (
          <div className="h-24 animate-pulse rounded-xl bg-[#F5F2EB]" />
        ) : reviews.isError || !reviews.data.length ? (
          <p data-testid="review-log-empty" className="py-8 text-center text-sm text-[#A8A29E]">No reviews yet. Share the guest link to get started.</p>
        ) : (
          <ul className="divide-y divide-[#EFEAE1]">
            {reviews.data.map((r) => (
              <li key={r.id} data-testid="review-log-item" className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#78716C]">
                  <span className="tabular-nums">{format(new Date(r.created_at), "d MMM yyyy, h:mm a")}</span>
                  <span className="inline-flex items-center gap-0.5 text-[#D97706]">
                    {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="size-3 fill-current" />)}
                  </span>
                  {r.draft_style && <span className="rounded bg-[#F5F2EB] px-1.5 py-0.5">{r.draft_style}</span>}
                  {r.dishes.map((d) => <span key={d} className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[#C2410C]">{d}</span>)}
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-[#1C1917]">{r.final_text}</p>
                {(r.contact_name || r.contact_phone) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
                    {r.contact_name && <span className="font-medium">{r.contact_name}</span>}
                    {r.contact_phone && <span className="inline-flex items-center gap-1 tabular-nums"><Phone className="size-3" />{r.contact_phone}</span>}
                    {r.contact_method && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${METHOD[r.contact_method].cls}`}>
                        {r.contact_method === "whatsapp_pending" ? <MessageCircle className="size-3" /> : <BadgeCheck className="size-3" />}
                        {METHOD[r.contact_method].label}
                      </span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
