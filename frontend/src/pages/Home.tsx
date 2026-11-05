import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader, OfflineBanner, StepIndicator } from "@/components/review/Chrome";
import { StarGate } from "@/components/review/StarGate";
import { CrmFeedbackForm } from "@/components/review/CrmFeedbackForm";
import { TagSelector } from "@/components/review/TagSelector";
import { DraftPicker, type OptionKey } from "@/components/review/DraftPicker";
import { useOnline } from "@/hooks/useOnline";
import { apiGet, apiPost } from "@/lib/api";
import { cacheGet, cacheSet, flushQueue, generateOfflineDrafts, getQueue } from "@/lib/offline";
import { sanitize } from "@/lib/pii";
import { DEFAULT_CONFIG, loadTagModel } from "@/lib/tags";
import type { AppConfig, DraftRequest, DraftResponse, PetpoojaOrder } from "@/lib/types";

type Step = "rating" | "crm" | "tags" | "drafts";
const STEP_INDEX: Record<Step, number> = { rating: 0, crm: 1, tags: 1, drafts: 2 };

function copyFallback(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}

export default function Home() {
  const online = useOnline();
  const [params] = useSearchParams();
  const orderId = params.get("order") ?? cacheGet<string>("last-order-id");

  const [step, setStep] = useState<Step>("rating");
  const [rating, setRating] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [drafts, setDrafts] = useState<DraftResponse | null>(null);
  const [draftKey, setDraftKey] = useState<OptionKey | null>(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  const categories = useMemo(loadTagModel, []);

  // Config + order degrade to the last cached copy (or defaults) when offline.
  const { data: config = cacheGet<AppConfig>("config") ?? DEFAULT_CONFIG } = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      try {
        const c = await apiGet<AppConfig>("/config");
        cacheSet("config", c);
        return c;
      } catch {
        return cacheGet<AppConfig>("config") ?? DEFAULT_CONFIG;
      }
    },
  });

  const { data: order = null } = useQuery({
    queryKey: ["order", orderId],
    enabled: !!orderId,
    queryFn: async (): Promise<PetpoojaOrder | null> => {
      try {
        const o = await apiGet<PetpoojaOrder>(`/orders/${encodeURIComponent(orderId!)}`);
        cacheSet(`order:${o.petpooja_order_id}`, o);
        cacheSet("last-order-id", o.petpooja_order_id);
        return o;
      } catch {
        return cacheGet<PetpoojaOrder>(`order:${orderId}`);
      }
    },
  });

  // Offline CRM queue: flush on reconnect (and on load if anything is pending).
  useEffect(() => {
    const flush = () =>
      flushQueue().then((n) => {
        if (n > 0) toast.success(`${n} saved feedback note${n > 1 ? "s" : ""} synced to the manager.`);
      });
    if (getQueue().length) flush();
    window.addEventListener("online", flush);
    window.addEventListener("crm-sync", flush);
    return () => {
      window.removeEventListener("online", flush);
      window.removeEventListener("crm-sync", flush);
    };
  }, []);

  const dishNames = order?.order_items.map((i) => i.itemname) ?? [];

  const generate = useMutation({
    mutationFn: async (): Promise<DraftResponse> => {
      const req: DraftRequest = {
        rating,
        tags: selected,
        note: sanitize(note),
        dishes: selected.filter((t) => dishNames.includes(t)),
        order_id: order?.petpooja_order_id ?? null,
      };
      if (!navigator.onLine) return generateOfflineDrafts(req, config.restaurant_name, config.location);
      try {
        return await apiPost<DraftResponse>("/generate-drafts", req);
      } catch {
        toast("AI is busy — here are instant drafts instead.");
        return generateOfflineDrafts(req, config.restaurant_name, config.location);
      }
    },
    onSuccess: (d) => {
      setDrafts(d);
      setDraftKey(null);
      setText("");
      setStep("drafts");
    },
  });

  function handleRate(n: number) {
    setRating(n);
    setStep(n <= 3 ? "crm" : "tags");
  }

  function restart() {
    setStep("rating");
    setRating(0);
    setSelected([]);
    setNote("");
    setDrafts(null);
    setDraftKey(null);
    setText("");
    setCopied(false);
  }

  function selectDraft(key: OptionKey) {
    if (!drafts) return;
    setDraftKey(key);
    setText(drafts[key]);
  }

  async function copyAndOpen() {
    const value = text.trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      copyFallback(value);
    }
    setCopied(true);
    toast.success("Review copied! Paste it on Google.");
    window.open(config.google_review_url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen bg-[#1E1B18] sm:px-4 sm:py-6">
      <main
        data-testid="app-shell"
        className="relative mx-auto flex min-h-screen max-w-[480px] flex-col overflow-hidden border-x border-[#EFEAE1] bg-[#FDFBF7] shadow-2xl sm:min-h-[calc(100vh-3rem)] sm:rounded-[28px]"
      >
        <AppHeader config={config} order={order} />
        <OfflineBanner online={online} />
        <StepIndicator current={copied ? 3 : STEP_INDEX[step]} />

        <div className="relative flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {step === "rating" && <StarGate onRate={handleRate} />}
              {step === "crm" && (
                <CrmFeedbackForm
                  rating={rating}
                  orderId={order?.petpooja_order_id ?? null}
                  onBack={restart}
                  onRestart={restart}
                />
              )}
              {step === "tags" && (
                <>
                  {generate.isPending && (
                    <div
                      data-testid="generating-shimmer"
                      className="mx-5 mt-4 h-1.5 animate-shimmer rounded-full bg-[linear-gradient(90deg,#FDE68A_0%,#EA580C_50%,#FDE68A_100%)] bg-[length:200%_100%]"
                    />
                  )}
                  <TagSelector
                    categories={categories}
                    order={order}
                    selected={selected}
                    onToggle={(t) => setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))}
                    note={note}
                    onNote={setNote}
                    onGenerate={() => generate.mutate()}
                    generating={generate.isPending}
                    onBack={restart}
                  />
                </>
              )}
              {step === "drafts" && drafts && (
                <DraftPicker
                  drafts={drafts}
                  selectedKey={draftKey}
                  onSelect={selectDraft}
                  text={text}
                  onText={setText}
                  onCopyOpen={copyAndOpen}
                  onRegenerate={() => generate.mutate()}
                  regenerating={generate.isPending}
                  onRestart={restart}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="px-5 pb-6 text-center text-[11px] text-[#A8A29E]">
          No login · Works offline · Your details stay private
        </footer>
      </main>
      <Toaster richColors />
    </div>
  );
}
