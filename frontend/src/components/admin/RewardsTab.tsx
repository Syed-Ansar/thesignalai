import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { BadgeCheck, CheckCircle2, MessageCircle, RotateCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel, fieldCls } from "@/components/admin/shared";
import { apiGet, apiPost } from "@/lib/api";
import { errorDetail } from "@/lib/errors";
import type { Restaurant, RewardClaim } from "@/lib/types";

const SOURCE: Record<RewardClaim["source"], { label: string; cls: string }> = {
  review: { label: "Google share", cls: "bg-[#DCFCE7] text-[#166534]" },
  feedback: { label: "Sorry gift", cls: "bg-[#FEE2E2] text-[#991B1B]" },
  leaderboard: { label: "Weekly #1", cls: "bg-[#FEF3C7] text-[#92400E]" },
};

const WA: Record<string, { label: string; cls: string }> = {
  sent: { label: "Sent", cls: "text-[#15803D]" },
  failed: { label: "Failed", cls: "text-[#B91C1C]" },
  not_configured: { label: "Not set up", cls: "text-[#A8A29E]" },
  none: { label: "Sending…", cls: "text-[#A8A29E]" },
};

export function RewardsTab({ restaurant }: { restaurant: Restaurant }) {
  const qc = useQueryClient();
  const rid = restaurant.id;
  const [q, setQ] = useState("");
  const list = useQuery({ queryKey: ["rewards", rid], queryFn: () => apiGet<RewardClaim[]>(`/admin/restaurants/${rid}/rewards`) });
  const redeem = useMutation({
    mutationFn: (c: RewardClaim) => apiPost<RewardClaim>(`/admin/restaurants/${rid}/rewards/${c.id}/redeem`, {}),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["rewards", rid] });
      toast.success(`${c.code} redeemed`);
    },
    onError: (err) => toast.error(errorDetail(err, "Couldn't redeem")),
  });

  const resend = useMutation({
    mutationFn: (c: RewardClaim) => apiPost<RewardClaim>(`/admin/restaurants/${rid}/rewards/${c.id}/whatsapp`, {}),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["rewards", rid] });
      if (c.whatsapp_status === "sent") toast.success("Sent on WhatsApp");
      else toast.error(c.whatsapp_error || "WhatsApp delivery isn't set up yet");
    },
    onError: (err) => toast.error(errorDetail(err, "Couldn't resend")),
  });

  const needle = q.trim().toLowerCase();
  const rows = (list.data ?? []).filter((c) => !needle || c.code.toLowerCase().includes(needle) || c.contact_phone.includes(needle));
  const now = Date.now();

  return (
    <Panel
      title="Scratch-card rewards"
      description="Codes guests unlocked. Search the code they show at the counter, then mark it redeemed."
      testId="rewards-panel"
      action={
        <div className="relative w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A8A29E]" />
          <input data-testid="rewards-search-input" className={`${fieldCls} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code or phone" />
        </div>
      }
    >
      {list.isPending ? (
        <div className="h-24 animate-pulse rounded-xl bg-[#F5F2EB]" />
      ) : list.isError || !rows.length ? (
        <p data-testid="rewards-empty" className="py-8 text-center text-sm text-[#A8A29E]">{needle ? "No reward matches that search." : "No rewards claimed yet."}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claimed</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Reward</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const expired = new Date(c.expires_at).getTime() < now;
              return (
                <TableRow key={c.id} data-testid="reward-row">
                  <TableCell className="whitespace-nowrap text-xs tabular-nums text-[#57534E]">{format(new Date(c.created_at), "d MMM, h:mm a")}</TableCell>
                  <TableCell className="text-sm">
                    <span className="block font-medium text-[#1C1917]">{c.contact_name || "Guest"}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#78716C]">
                      {c.contact_phone}
                      {c.contact_method === "sms_verified" && <BadgeCheck className="size-3.5 text-[#15803D]" aria-label="Verified by SMS" />}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal text-sm">
                    {c.title}
                    <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${SOURCE[c.source].cls}`}>{SOURCE[c.source].label}</span>
                  </TableCell>
                  <TableCell data-testid="reward-row-code" className="font-mono text-sm font-semibold tracking-wider">{c.code}</TableCell>
                  <TableCell data-testid="reward-row-whatsapp" className="text-xs">
                    <span className={`inline-flex items-center gap-1 font-semibold ${WA[c.whatsapp_status ?? "none"].cls}`} title={c.whatsapp_error ?? undefined}>
                      <MessageCircle className="size-3.5" /> {WA[c.whatsapp_status ?? "none"].label}
                    </span>
                    {c.whatsapp_status !== "sent" && (
                      <Button size="icon-sm" variant="ghost" data-testid="reward-resend-whatsapp-button" aria-label="Resend on WhatsApp" disabled={resend.isPending} onClick={() => resend.mutate(c)} className="ml-1">
                        <RotateCw className="size-3.5" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.redeemed_at ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D]"><CheckCircle2 className="size-3.5" /> Redeemed {format(new Date(c.redeemed_at), "d MMM")}</span>
                    ) : expired ? (
                      <span className="text-xs font-semibold text-[#A8A29E]">Expired</span>
                    ) : (
                      <Button size="sm" variant="outline" data-testid="reward-redeem-button" disabled={redeem.isPending} onClick={() => redeem.mutate(c)}>
                        Mark redeemed
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
