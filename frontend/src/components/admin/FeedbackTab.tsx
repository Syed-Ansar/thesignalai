import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, CircleDot, CloudOff, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel } from "@/components/admin/shared";
import { apiGet, apiPatch } from "@/lib/api";
import { errorDetail } from "@/lib/errors";
import type { CrmFeedback, FeedbackStatus, Restaurant } from "@/lib/types";

const FILTER_LABELS: Record<string, string> = { all: "All statuses", new: "New", resolved: "Resolved" };

export function FeedbackTab({ restaurant }: { restaurant: Restaurant }) {
  const qc = useQueryClient();
  const rid = restaurant.id;
  const [filter, setFilter] = useState("all");
  const list = useQuery({
    queryKey: ["feedback", rid, filter],
    queryFn: () => apiGet<CrmFeedback[]>(`/admin/restaurants/${rid}/feedback${filter === "all" ? "" : `?status=${filter}`}`),
  });
  const toggle = useMutation({
    mutationFn: (f: CrmFeedback) => apiPatch<CrmFeedback>(`/admin/restaurants/${rid}/feedback/${f.id}`, { status: (f.status === "new" ? "resolved" : "new") as FeedbackStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback", rid] });
      qc.invalidateQueries({ queryKey: ["analytics", rid] });
    },
    onError: (err) => toast.error(errorDetail(err, "Couldn't update")),
  });

  return (
    <Panel
      title="CRM feedback"
      description="Private 1–3★ complaints. They never reach Google."
      testId="feedback-panel"
      action={
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger data-testid="feedback-filter-select" className="w-[150px]">
            <SelectValue>{(v) => FILTER_LABELS[v as string]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(FILTER_LABELS).map(([k, l]) => (
              <SelectItem key={k} value={k} data-testid={`feedback-filter-${k}`}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {list.isPending ? (
        <div className="h-24 animate-pulse rounded-xl bg-[#F5F2EB]" />
      ) : list.isError || !list.data.length ? (
        <p data-testid="feedback-empty" className="py-8 text-center text-sm text-[#A8A29E]">No complaints here. Nice.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Stars</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.map((f) => (
              <TableRow key={f.id} data-testid="feedback-row">
                <TableCell className="whitespace-nowrap text-xs tabular-nums text-[#57534E]">
                  {format(new Date(f.created_at), "d MMM, h:mm a")}
                  {f.created_offline && <CloudOff className="ml-1 inline size-3 text-[#B45309]" aria-label="Sent offline" />}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-[#B91C1C]">{f.rating}<Star className="size-3 fill-current" /></span>
                </TableCell>
                <TableCell className="max-w-[160px] whitespace-normal text-xs text-[#44403C]">{f.issues.join(", ") || "—"}</TableCell>
                <TableCell className="max-w-[340px] whitespace-normal text-sm text-[#1C1917]">
                  {f.message}
                  {f.contact_phone && <span data-testid="feedback-contact" className="mt-1 block text-xs text-[#78716C]">{f.contact_name ? `${f.contact_name} · ` : ""}{f.contact_phone}</span>}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid="feedback-status-toggle"
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate(f)}
                    className={`gap-1 ${f.status === "new" ? "border-[#FECACA] text-[#B91C1C]" : "border-[#BBF7D0] text-[#15803D]"}`}
                  >
                    {f.status === "new" ? <CircleDot className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                    {f.status === "new" ? "New" : "Resolved"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
