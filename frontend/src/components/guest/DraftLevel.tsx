import { Dices, ExternalLink, ShieldCheck, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ArcadeButton, Dock, LevelHead, SPRING_SNAPPY } from "@/components/guest/GuestKit";
import { hasPii } from "@/lib/pii";
import { TONES } from "@/lib/tags";
import type { DraftResponse, Tone } from "@/lib/types";

interface Props {
  draft: DraftResponse;
  text: string;
  onText: (v: string) => void;
  onTone: (t: Tone) => void;
  onRemix: () => void;
  remixing: boolean;
  onShare: () => void;
  rewardOn: boolean;
}

export function DraftLevel({ draft, text, onText, onTone, onRemix, remixing, onShare, rewardOn }: Props) {
  const manual = draft.source === "manual";
  return (
    <section data-testid="draft-level" className="flex flex-1 flex-col px-[var(--g-pad)] pt-6">
      <LevelHead
        kicker="Level 4 · Ready to serve"
        title={manual ? "Say it your way ✍️" : "Your post is plated 🍽️"}
        sub={manual ? "A few honest lines are perfect. Then share it on Google." : "It's in your voice, so tweak anything you like. Then share it on Google."}
      />

      <div className="mt-6 grid grid-cols-3 gap-1 rounded-[var(--g-btn-r)] bg-[var(--g-line)] p-1" role="group" aria-label="Writing flavour">
        {TONES.map((t) => {
          const on = !manual && draft.tone === t.key;
          return (
            <button
              key={t.key}
              type="button"
              data-testid={`tone-chip-${t.key}`}
              aria-pressed={on}
              disabled={remixing}
              onClick={() => !on && onTone(t.key)}
              className={`flex min-h-[46px] flex-col items-center justify-center rounded-[calc(var(--g-btn-r)-2px)] px-1 text-[12px] font-bold leading-tight transition-[background-color,color,box-shadow] duration-150 ${
                on ? "bg-[var(--g-accent)] text-[var(--g-on-accent)] shadow-[0_3px_0_0_color-mix(in_srgb,var(--g-accent)_62%,#000)]" : "text-[var(--g-ink)] hover:bg-[var(--g-card)]"
              }`}
            >
              <span aria-hidden className="text-[15px]">{t.emoji}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      <motion.div
        layout
        transition={SPRING_SNAPPY}
        data-testid="draft-card"
        className="relative mt-4 overflow-hidden rounded-[var(--g-card-r)] bg-[var(--g-card)] text-[var(--g-card-ink)] shadow-[0_26px_50px_-30px_rgba(0,0,0,0.4)] ring-2 ring-[color-mix(in_srgb,var(--g-accent)_35%,var(--g-line))]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--g-line)] px-4 py-2.5">
          <span data-testid="draft-tone-label" className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--g-muted)]">
            {manual ? "Your words" : `${draft.tone_label} flavour`}
          </span>
          {draft.source === "offline" && (
            <span data-testid="offline-draft-badge" className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#78350F]">
              <WifiOff className="size-3" /> Made on your phone
            </span>
          )}
        </div>
        <textarea
          data-testid="draft-textarea"
          aria-label="Your Google review"
          value={text}
          onChange={(e) => onText(e.target.value)}
          rows={7}
          placeholder="e.g. The biryani was spot on and the staff were lovely…"
          className="block w-full resize-none bg-transparent px-4 py-3.5 text-[16px] leading-relaxed outline-none"
        />
        <div className="flex items-center justify-between gap-2 px-4 pb-3">
          <span data-testid="draft-char-count" className="text-[12px] tabular-nums text-[var(--g-muted)]">
            {text.trim().length} characters
          </span>
          {!manual && (
            <button
              type="button"
              data-testid="remix-button"
              onClick={onRemix}
              disabled={remixing}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[var(--g-ink)] px-3.5 text-[13px] font-bold text-[var(--g-bg)] transition-[transform,opacity] duration-150 active:scale-95 disabled:opacity-50"
            >
              <Dices className={`size-4 ${remixing ? "animate-spin" : ""}`} /> Remix
            </button>
          )}
        </div>
        <AnimatePresence>
          {remixing && (
            <motion.div
              data-testid="remix-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--g-card)_80%,transparent)] backdrop-blur-[2px]"
            >
              <span className="inline-flex items-center gap-2 font-display text-[16px] font-bold">
                <span className="animate-wiggle text-[28px]" aria-hidden>
                  🌶️
                </span>
                Re-spicing…
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <p data-testid="pii-hint" className="mt-2.5 flex items-center gap-1.5 text-[12px] text-[var(--g-muted)]">
        <ShieldCheck className="size-3.5 text-[#15803D]" />
        {hasPii(text) ? "Heads up: remove phone numbers, emails or bill numbers before posting." : "No personal details included."}
      </p>

      <Dock>
        <ArcadeButton data-testid="copy-share-google-button" disabled={!text.trim() || remixing} onClick={onShare}>
          Copy &amp; share on Google <ExternalLink className="size-4" />
        </ArcadeButton>
        <p className="mt-2.5 text-center text-[12px] font-semibold text-[var(--g-muted)]">
          +50 coins{rewardOn ? " and a mystery scratch card 🎁" : ""}
        </p>
      </Dock>
    </section>
  );
}
