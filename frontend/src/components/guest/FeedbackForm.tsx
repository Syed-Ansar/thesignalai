import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CloudOff, Loader2, Lock, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArcadeButton, Chip, Dock, LevelHead, SPRING_POP } from "@/components/guest/GuestKit";
import { errorDetail } from "@/lib/errors";
import { newClientId, postOrQueue } from "@/lib/offline";
import { hasPii, sanitize } from "@/lib/pii";
import { CRM_ISSUES, ISSUE_EMOJI } from "@/lib/tags";
import type { CrmFeedbackCreate } from "@/lib/types";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

interface Props {
  base: string;
  rating: number;
  preview: boolean;
  rewardOn: boolean;
  onSent: (clientId: string) => void;
  onNext: () => void;
}

export function FeedbackForm({ base, rating, preview, rewardOn, onSent, onNext }: Props) {
  const [issues, setIssues] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<"sent" | "queued" | null>(null);

  const submit = useMutation({
    mutationFn: async (payload: CrmFeedbackCreate) => (preview ? ("sent" as const) : postOrQueue(`${base}/feedback`, payload)),
    onSuccess: (r, payload) => {
      setResult(r);
      if (payload.client_id) onSent(payload.client_id);
    },
    onError: (err) => toast.error(errorDetail(err, "Couldn't send that. Please try again.")),
  });

  if (result) {
    return (
      <section data-testid="feedback-thank-you" className="flex flex-1 flex-col px-[var(--g-pad)] pt-10 text-center">
        <motion.div initial={{ scale: 0.3, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={SPRING_POP} className="mx-auto grid size-[104px] place-items-center rounded-[30px] bg-[var(--g-card)] text-[56px] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.4)] ring-1 ring-[var(--g-line)]" aria-hidden>
          💌
        </motion.div>
        <h2 data-testid="feedback-thank-you-message" className="mx-auto mt-6 max-w-[330px] font-display text-[25px] font-bold leading-tight tracking-[-0.03em]">
          Thank you. Our restaurant manager has been notified directly.
        </h2>
        <p className="mx-auto mt-2 max-w-[320px] text-[15px] text-[var(--g-muted)]">We're sorry we missed the mark today. Every word gets read.</p>
        {result === "queued" && (
          <p data-testid="feedback-queued-note" className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-[#FEF3C7] px-3.5 py-1.5 text-xs font-medium text-[#78350F]">
            <CloudOff className="size-3.5" /> Saved on this phone. It sends automatically once you're online.
          </p>
        )}
        <Dock>
          <ArcadeButton data-testid="feedback-next-button" onClick={onNext} className={rewardOn ? "animate-glow" : ""}>
            {rewardOn ? "Grab your sorry gift 🎁" : "All done"}
          </ArcadeButton>
        </Dock>
      </section>
    );
  }

  const canSubmit = message.trim().length > 0 || issues.length > 0;

  return (
    <section data-testid="feedback-form" className="flex flex-1 flex-col px-[var(--g-pad)] pt-6">
      <LevelHead
        kicker="Level 2 · Just between us"
        title="Oh no. Let's make it right."
        sub={
          <span className="inline-flex items-center gap-1.5">
            <Lock className="size-3.5" /> Goes privately to the manager, never online.
          </span>
        }
      />
      <h3 className="mt-6 text-[13px] font-bold text-[var(--g-ink)]">What went wrong with your food or service?</h3>
      <div className="mt-3 flex flex-wrap gap-[var(--g-gap)]">
        {CRM_ISSUES.map((i) => (
          <Chip key={i} label={i} emoji={ISSUE_EMOJI[i]} selected={issues.includes(i)} onClick={() => setIssues((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))} testId={`issue-${slug(i)}`} />
        ))}
      </div>
      <textarea
        data-testid="feedback-message-input"
        aria-label="Tell us what happened"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder="Tell us what happened, we're listening…"
        className="mt-5 w-full resize-none rounded-[var(--g-card-r)] border-2 border-[var(--g-line)] bg-[var(--g-card)] p-4 text-[16px] text-[var(--g-card-ink)] outline-none transition-[border-color] duration-150 focus:border-[var(--g-accent)]"
      />
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--g-muted)]">
        <ShieldCheck className="size-3.5 text-[#15803D]" />
        {hasPii(message) ? "Phone numbers, emails & bill numbers will be removed." : "No personal details needed."}
      </p>
      <Dock>
        <ArcadeButton
          data-testid="feedback-submit-button"
          disabled={!canSubmit || submit.isPending}
          onClick={() =>
            submit.mutate({
              rating,
              message: sanitize(message) || issues.join(", "),
              issues,
              client_id: newClientId(),
              created_offline: !navigator.onLine,
            })
          }
        >
          {submit.isPending ? <Loader2 className="size-5 animate-spin" /> : "Send to the manager"}
        </ArcadeButton>
      </Dock>
    </section>
  );
}
