import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Crown, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel } from "@/components/admin/shared";
import { apiGet, apiPost } from "@/lib/api";
import { errorDetail } from "@/lib/errors";
import type { AwardIn, Leaderboard, Restaurant, RewardClaim } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];
const WEEKS = [
  { value: 0, label: "This week" },
  { value: 1, label: "Last week" },
];

export function LeaderboardTab({ restaurant }: { restaurant: Restaurant }) {
  const qc = useQueryClient();
  const rid = restaurant.id;
  const [weeksAgo, setWeeksAgo] = useState(0);
  const board = useQuery({
    queryKey: ["leaderboard", rid, weeksAgo],
    queryFn: () => apiGet<Leaderboard>(`/admin/restaurants/${rid}/leaderboard?weeks_ago=${weeksAgo}`),
  });
  const award = useMutation({
    mutationFn: () => apiPost<RewardClaim>(`/admin/restaurants/${rid}/leaderboard/award`, { weeks_ago: weeksAgo } satisfies AwardIn),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["leaderboard", rid] });
      qc.invalidateQueries({ queryKey: ["rewards", rid] });
      toast.success(`Prize code ${c.code} created`, {
        description: c.whatsapp_status === "sent" ? "Sent to the guest on WhatsApp." : "WhatsApp isn't set up, so share the code with the guest yourself.",
      });
    },
    onError: (err) => toast.error(errorDetail(err, "Couldn't award the prize")),
  });

  const b = board.data;
  const top = b?.entries[0];
  const range = b ? `${format(parseISO(b.week_start), "d MMM")} – ${format(parseISO(b.week_end), "d MMM yyyy")}` : "";

  return (
    <div className="space-y-5">
      <Panel
        title="Weekly leaderboard"
        description="Guests ranked by coins earned this week (Mon–Sun, India time). Only you can see this. Guests never do."
        testId="leaderboard-panel"
        action={
          <div className="flex rounded-lg border border-[#E7E2DA] p-0.5">
            {WEEKS.map((w) => (
              <button
                key={w.value}
                type="button"
                data-testid={`leaderboard-week-${w.value}`}
                aria-pressed={weeksAgo === w.value}
                onClick={() => setWeeksAgo(w.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-[background-color,color] duration-150 ${weeksAgo === w.value ? "bg-[#1C1917] text-white" : "text-[#57534E] hover:bg-[#F5F2EB]"}`}
              >
                {w.label}
              </button>
            ))}
          </div>
        }
      >
        <p data-testid="leaderboard-range" className="-mt-2 mb-3 text-xs font-medium text-[#78716C]">{range}</p>
        {board.isPending ? (
          <div className="h-24 animate-pulse rounded-xl bg-[#F5F2EB]" />
        ) : board.isError || !b?.entries.length ? (
          <p data-testid="leaderboard-empty" className="py-8 text-center text-sm text-[#A8A29E]">No finished runs this week yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead className="text-right">Runs</TableHead>
                <TableHead className="text-right">Coins</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {b.entries.map((e) => (
                <TableRow key={e.phone} data-testid="leaderboard-row" className={e.rank === 1 ? "bg-[#FFFBEB]" : undefined}>
                  <TableCell className="text-lg">{MEDALS[e.rank - 1] ?? <span className="text-sm font-semibold text-[#78716C]">#{e.rank}</span>}</TableCell>
                  <TableCell className="text-sm">
                    <span className="block font-medium text-[#1C1917]">{e.name || "Guest"}</span>
                    <span className="text-xs text-[#78716C]">{e.phone}</span>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{e.runs}</TableCell>
                  <TableCell data-testid="leaderboard-row-coins" className="text-right font-heading text-base font-semibold tabular-nums">{e.coins}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Panel title="Bonus prize for the #1 guest" description="Change the prize in Restaurant Setup → Scratch-card reward." testId="leaderboard-prize-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[#FEF3C7] text-[#B45309]">
              <Crown className="size-5" />
            </span>
            <div>
              <p data-testid="leaderboard-prize-title" className="font-medium text-[#1C1917]">{b?.prize_title ?? restaurant.reward.weekly_prize}</p>
              <p className="text-xs text-[#78716C]">
                {b?.award
                  ? `Awarded to ${b.award.contact_name || b.award.contact_phone} · code ${b.award.code} · WhatsApp: ${b.award.whatsapp_status === "sent" ? "sent" : "not sent"}`
                  : top
                    ? `Current #1: ${top.name || "Guest"} (${top.coins} coins)`
                    : "No one to award yet"}
              </p>
            </div>
          </div>
          <Button data-testid="leaderboard-award-button" disabled={!top || !!b?.award || award.isPending} onClick={() => award.mutate()} className="gap-1.5 bg-[#EA580C] hover:bg-[#C2410C]">
            {award.isPending ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
            {b?.award ? "Prize awarded" : "Award prize to #1"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
