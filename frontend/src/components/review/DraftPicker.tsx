import { Copy, ExternalLink, RefreshCw, RotateCcw, WifiOff } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DraftResponse } from "@/lib/types";

const STYLES = [
  { key: "option_1", label: "Short & Direct", badge: "15-sec read" },
  { key: "option_2", label: "Descriptive & Detailed", badge: "Foodie guide" },
  { key: "option_3", label: "Warm & Casual Hinglish", badge: "Local vibe" },
] as const;

type OptionKey = (typeof STYLES)[number]["key"];

interface Props {
  drafts: DraftResponse;
  selectedKey: OptionKey | null;
  onSelect: (key: OptionKey) => void;
  text: string;
  onText: (v: string) => void;
  onCopyOpen: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
  onRestart: () => void;
}

export type { OptionKey };

export function DraftPicker({ drafts, selectedKey, onSelect, text, onText, onCopyOpen, onRegenerate, regenerating, onRestart }: Props) {
  return (
    <section data-testid="draft-picker" className="px-5 pb-36 pt-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-heading text-[26px] font-semibold leading-tight tracking-[-0.02em]">
          Pick a voice that sounds like you
        </h2>
        {drafts.source === "offline" && (
          <span
            data-testid="offline-drafts-badge"
            className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[10px] font-semibold text-[#78350F]"
          >
            <WifiOff className="size-3" /> Offline drafts
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[15px] text-[#57534E]">Tap a card, then tweak the words below.</p>

      <div className="mt-5 flex flex-col gap-3">
        {STYLES.map((s, i) => {
          const active = selectedKey === s.key;
          return (
            <motion.button
              key={s.key}
              type="button"
              data-testid={`draft-card-${i + 1}`}
              aria-pressed={active}
              onClick={() => onSelect(s.key)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.25 }}
              className={`rounded-3xl border-2 p-4 text-left transition-[border-color,background-color,box-shadow] duration-200 ${
                active
                  ? "border-[#F59E0B] bg-[#FFFBEB] shadow-[0_10px_30px_-14px_rgba(245,158,11,0.7)]"
                  : "border-[#EFEAE1] bg-white hover:border-[#FDE68A]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#1C1917]">{s.label}</span>
                <span className="rounded-full bg-[#F5F2EB] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#78716C]">
                  {s.badge}
                </span>
              </div>
              <p data-testid={`draft-text-${i + 1}`} className="mt-2 text-[14.5px] leading-relaxed text-[#44403C]">
                {drafts[s.key]}
              </p>
            </motion.button>
          );
        })}
      </div>

      <label htmlFor="final" className="mt-7 block text-sm font-semibold text-[#44403C]">
        Your review (edit freely)
      </label>
      <Textarea
        id="final"
        data-testid="final-review-textarea"
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder="Tap a draft above to start…"
        rows={6}
        className="mt-2 min-h-[140px] rounded-2xl border-[#E7E2DA] bg-white text-[15px] leading-relaxed"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          data-testid="regenerate-drafts-button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="gap-1.5 text-[#C2410C]"
        >
          <RefreshCw className={`size-3.5 ${regenerating ? "animate-spin" : ""}`} /> New ideas
        </Button>
        <Button variant="ghost" size="sm" data-testid="draft-restart-button" onClick={onRestart} className="gap-1.5 text-[#57534E]">
          <RotateCcw className="size-3.5" /> Start over
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] border-t border-[#EFEAE1] bg-[#FDFBF7]/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <Button
          data-testid="copy-open-google-button"
          disabled={!text.trim()}
          onClick={onCopyOpen}
          className="h-13 w-full gap-2 rounded-full bg-[#EA580C] py-3.5 text-[15px] font-semibold hover:bg-[#C2410C]"
        >
          <Copy className="size-4" /> Copy Review & Open Google <ExternalLink className="size-4 opacity-80" />
        </Button>
        <p className="mt-2 text-center text-xs text-[#78716C]">Long-press the Google review box and tap Paste.</p>
      </div>
    </section>
  );
}
