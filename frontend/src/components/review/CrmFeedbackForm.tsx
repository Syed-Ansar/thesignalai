import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, CloudOff, Loader2, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiPost } from "@/lib/api";
import { enqueueFeedback, newClientId } from "@/lib/offline";
import { hasPii, sanitize } from "@/lib/pii";
import { CRM_ISSUES } from "@/lib/tags";
import type { CrmFeedback, CrmFeedbackCreate } from "@/lib/types";
import { Pill } from "@/components/review/Pill";

interface Props {
  rating: number;
  orderId: string | null;
  onBack: () => void;
  onRestart: () => void;
}

export function CrmFeedbackForm({ rating, orderId, onBack, onRestart }: Props) {
  const [issues, setIssues] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<"sent" | "queued" | null>(null);

  const submit = useMutation({
    mutationFn: async (payload: CrmFeedbackCreate): Promise<"sent" | "queued"> => {
      if (!navigator.onLine) {
        enqueueFeedback({ ...payload, created_offline: true });
        return "queued";
      }
      try {
        await apiPost<CrmFeedback>("/crm-feedback", payload);
        return "sent";
      } catch (err) {
        if (err instanceof ApiError && err.status < 500) throw err;
        enqueueFeedback({ ...payload, created_offline: true });
        return "queued";
      }
    },
    onSuccess: (r) => setResult(r),
    onError: () => toast.error("Couldn't send that. Please add a few more details."),
  });

  const toggle = (i: string) => setIssues((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  const canSubmit = message.trim().length > 0 || issues.length > 0;

  function handleSubmit() {
    const clean = sanitize(message) || issues.join(", ");
    submit.mutate({
      rating,
      message: clean,
      issues,
      order_id: orderId,
      client_id: newClientId(),
      created_offline: false,
    });
  }

  if (result) {
    return (
      <motion.section
        data-testid="crm-thank-you"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="px-5 pb-10 pt-10 text-center"
      >
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#DCFCE7]">
          <CheckCircle2 className="size-8 text-[#15803D]" />
        </div>
        <h2
          data-testid="crm-thank-you-message"
          className="mx-auto mt-5 max-w-[320px] font-heading text-[24px] font-semibold leading-snug tracking-[-0.02em]"
        >
          Thank you. Our restaurant manager has been notified directly.
        </h2>
        <p className="mx-auto mt-3 max-w-[320px] text-[15px] text-[#57534E]">
          We're sorry we missed the mark today. We read every note and will make it right.
        </p>
        {result === "queued" && (
          <p
            data-testid="crm-queued-note"
            className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-[#FEF3C7] px-3.5 py-1.5 text-xs font-medium text-[#78350F]"
          >
            <CloudOff className="size-3.5" /> Saved on this device — it will sync automatically when you're back online.
          </p>
        )}
        <div className="mt-8">
          <Button variant="ghost" data-testid="crm-restart-button" onClick={onRestart} className="text-[#C2410C]">
            Start over
          </Button>
        </div>
      </motion.section>
    );
  }

  return (
    <section data-testid="crm-feedback-form" className="px-5 pb-10 pt-6">
      <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-[#991B1B]">
        Private feedback · Goes straight to our manager, not to Google.
      </div>
      <h2 className="mt-5 font-heading text-[26px] font-semibold leading-tight tracking-[-0.02em]">
        What went wrong with your food or service?
      </h2>
      <p className="mt-1.5 text-[15px] text-[#57534E]">Pick what applies and tell us a little more.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {CRM_ISSUES.map((i) => (
          <Pill
            key={i}
            label={i}
            selected={issues.includes(i)}
            onClick={() => toggle(i)}
            testId={`crm-issue-${i.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          />
        ))}
      </div>

      <Textarea
        data-testid="crm-message-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="e.g. Biryani was cold and we waited 40 minutes for starters…"
        rows={5}
        className="mt-5 min-h-[120px] rounded-2xl border-[#E7E2DA] bg-white text-[15px]"
      />
      <p className="mt-2 flex items-center gap-1.5 text-xs text-[#78716C]">
        <ShieldCheck className="size-3.5 text-[#15803D]" />
        {hasPii(message)
          ? "Phone numbers, emails and bill numbers will be removed before sending."
          : "No personal details needed."}
      </p>

      <div className="mt-6 flex gap-3">
        <Button
          variant="outline"
          data-testid="crm-back-button"
          onClick={onBack}
          className="h-12 rounded-full px-5"
        >
          Back
        </Button>
        <Button
          data-testid="crm-submit-button"
          disabled={!canSubmit || submit.isPending}
          onClick={handleSubmit}
          className="h-12 flex-1 rounded-full bg-[#EA580C] text-[15px] font-semibold hover:bg-[#C2410C]"
        >
          {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : "Send to Manager"}
        </Button>
      </div>
    </section>
  );
}
