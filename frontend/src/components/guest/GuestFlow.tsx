import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ArcadeButton, Chip, Confetti, Dock, GhostButton, Hud, LevelHead, OfflineBanner, RateStars, SPRING_LEVEL, SPRING_POP, Tile, type Pop } from "@/components/guest/GuestKit";
import { CookingScreen, ErrorScreen } from "@/components/guest/StateScreens";
import { DraftLevel } from "@/components/guest/DraftLevel";
import { FeedbackForm } from "@/components/guest/FeedbackForm";
import { RewardLevel } from "@/components/guest/RewardLevel";
import { apiPost } from "@/lib/api";
import { copyText } from "@/lib/errors";
import { generateOfflineDraft, newClientId, postOrQueue } from "@/lib/offline";
import { hasPii, sanitize } from "@/lib/pii";
import { COINS, DEFAULT_DISHES, VIBES, VIBE_EMOJI, dishEmoji } from "@/lib/tags";
import { themeVars } from "@/lib/theme";
import type { DraftRequest, DraftResponse, PublicRestaurant, ReviewLogCreate, Tone } from "@/lib/types";

type Level = "rate" | "dishes" | "vibes" | "cooking" | "cook-error" | "draft" | "feedback" | "reward" | "done";
const ORDER: Level[] = ["rate", "dishes", "vibes", "cooking", "cook-error", "draft", "feedback", "reward", "done"];
const HAPPY_RAIL = ["Rate", "Faves", "Vibe", "Share", "Reward"];
const SAD_RAIL = ["Rate", "Tell us", "Gift"];
const HAPPY_IDX: Record<Level, number> = { rate: 0, dishes: 1, vibes: 2, cooking: 2, "cook-error": 2, draft: 3, feedback: 1, reward: 4, done: 4 };
const SAD_IDX: Record<Level, number> = { ...HAPPY_IDX, feedback: 1, reward: 2, done: 2 };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const variants = {
  enter: (d: number) => ({ x: d * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d * -48, opacity: 0 }),
};

interface Props {
  restaurant: PublicRestaurant;
  online: boolean;
  /** Admin phone mockup: no visits/logs/feedback/rewards are written and Google never opens. */
  preview?: boolean;
}

export function GuestFlow({ restaurant: r, online, preview = false }: Props) {
  const base = `/public/restaurants/${encodeURIComponent(r.slug)}`;
  const [level, setLevel] = useState<Level>("rate");
  const [dir, setDir] = useState(1);
  const [rating, setRating] = useState(0);
  const [dishes, setDishes] = useState<string[]>([]);
  const [vibes, setVibes] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [text, setText] = useState("");
  const [posted, setPosted] = useState(false);
  const [refId, setRefId] = useState<string | null>(null);
  const [rewarded, setRewarded] = useState(false);
  const [burst, setBurst] = useState(0);
  const [pops, setPops] = useState<Pop[]>([]);

  const happy = rating === 0 || rating >= 4;
  const rewardOn = r.reward.enabled;
  const dishOptions = r.menu.length ? r.menu : DEFAULT_DISHES;
  const picks = dishes.length + vibes.length;

  const coins =
    (rating ? COINS.rate : 0) +
    picks * COINS.tag +
    (note.trim().length >= 10 ? COINS.note : 0) +
    (draft ? COINS.draft : 0) +
    (posted ? COINS.post : 0) +
    (rewarded ? COINS.reward : 0);

  // Floating "+N" pops whenever the coin total goes up.
  const prevCoins = useRef(coins);
  useEffect(() => {
    const gained = coins - prevCoins.current;
    prevCoins.current = coins;
    if (gained <= 0) return;
    const id = Date.now() + Math.random();
    setPops((p) => [...p, { id, amount: gained }]);
    window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 950);
  }, [coins]);

  function go(next: Level) {
    setDir(ORDER.indexOf(next) >= ORDER.indexOf(level) ? 1 : -1);
    setLevel(next);
  }

  const toggle = (set: typeof setDishes) => (v: string) => set((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));

  const generate = useMutation({
    mutationFn: async ({ tone, first }: { tone: Tone; first: boolean }): Promise<DraftResponse> => {
      const req: DraftRequest = { rating, dishes, vibes, note: sanitize(note), tone };
      const work = navigator.onLine ? apiPost<DraftResponse>(`${base}/drafts`, req) : Promise.resolve(generateOfflineDraft(req, r.name, r.location));
      const [d] = await Promise.all([work, sleep(first ? 1800 : 350)]);
      return d;
    },
    onSuccess: (d) => {
      setDraft(d);
      setText(d.text);
      go("draft");
    },
    onError: (_err, vars) => {
      if (vars.first) go("cook-error");
      else toast.error("Couldn't remix right now. Your current post is safe.");
    },
  });

  function cook() {
    go("cooking");
    generate.mutate({ tone: draft?.tone ?? "foodie", first: true });
  }

  function quickDraft() {
    const d = generateOfflineDraft({ rating, dishes, vibes, note: sanitize(note), tone: "foodie" }, r.name, r.location);
    setDraft(d);
    setText(d.text);
    go("draft");
  }

  function writeOwn() {
    setDraft({ text: "", tone: "foodie", tone_label: "Your words", source: "manual", rewrites: 0 });
    setText("");
    go("draft");
  }

  function rate(n: number) {
    setRating(n);
    if (!preview) postOrQueue(`${base}/visits`, { rating: n }).catch(() => undefined);
    go(n <= 3 ? "feedback" : "dishes");
  }

  function share() {
    const value = text.trim();
    if (!value || !draft) return;
    void copyText(value);
    if (!preview) {
      const w = window.open(r.google_review_url, "_blank");
      if (w) w.opener = null;
      const cid = newClientId();
      setRefId(cid);
      const log: ReviewLogCreate = {
        rating,
        dishes,
        vibes,
        ai_draft: draft.source === "manual" ? "" : draft.text,
        final_text: value,
        draft_style: draft.tone_label,
        contact_name: null,
        contact_phone: null,
        verification_id: null,
        client_id: cid,
      };
      postOrQueue(`${base}/reviews`, log).catch(() => undefined);
    }
    setPosted(true);
    toast.success("Review copied! Paste it on Google.", {
      description: rewardOn ? "Then pop back here, your reward is waiting 🎁" : "Thanks for sharing the love!",
    });
    go(rewardOn ? "reward" : "done");
  }

  function restart() {
    setDir(-1);
    setLevel("rate");
    setRating(0);
    setDishes([]);
    setVibes([]);
    setNote("");
    setDraft(null);
    setText("");
    setPosted(false);
    setRefId(null);
    setRewarded(false);
  }

  const back: Partial<Record<Level, () => void>> = {
    dishes: () => {
      setRating(0);
      go("rate");
    },
    vibes: () => go("dishes"),
    draft: () => go("vibes"),
    "cook-error": () => go("vibes"),
    feedback: () => {
      setRating(0);
      go("rate");
    },
  };

  return (
    <div
      data-testid="guest-flow"
      style={themeVars(r.theme)}
      className="relative flex min-h-full flex-1 flex-col overflow-x-clip bg-[var(--g-bg)] text-[var(--g-ink)]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_105%_-5%,color-mix(in_srgb,var(--g-accent)_22%,transparent)_0%,transparent_42%),radial-gradient(circle_at_-10%_70%,color-mix(in_srgb,#FBBF24_16%,transparent)_0%,transparent_40%)]" />
      <Hud
        name={r.name}
        location={r.location}
        coins={coins}
        pops={pops}
        rail={happy ? HAPPY_RAIL : SAD_RAIL}
        current={(happy ? HAPPY_IDX : SAD_IDX)[level]}
        onBack={generate.isPending ? undefined : back[level]}
      />
      <OfflineBanner online={online} />

      <div className="relative flex flex-1 flex-col">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div key={level} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={SPRING_LEVEL} className="flex flex-1 flex-col">
            {level === "rate" && (
              <section data-testid="rate-step" className="flex flex-1 flex-col px-[var(--g-pad)] pb-8 pt-6">
                <LevelHead kicker="Level 1 · +20 coins" title={<>How was the feast today?</>} sub="Tap a star to start your reward run. No login, about 30 seconds." />
                <div className="mt-7">
                  <RateStars onRate={rate} />
                </div>
                {rewardOn && (
                  <div data-testid="rate-reward-teaser" className="mt-5 flex items-center gap-3 rounded-[var(--g-card-r)] border-2 border-dashed border-[var(--g-line)] px-4 py-3">
                    <span className="animate-bounce-soft text-[28px] leading-none" aria-hidden>
                      🎁
                    </span>
                    <p className="text-[13px] font-medium leading-snug text-[var(--g-muted)]">
                      <span className="font-bold text-[var(--g-ink)]">Finish the run, scratch a reward.</span> Every guest gets a mystery card at the end.
                    </p>
                  </div>
                )}
              </section>
            )}

            {level === "dishes" && (
              <section data-testid="dishes-step" className="flex flex-1 flex-col px-[var(--g-pad)] pt-6">
                <LevelHead kicker="Level 2 · +10 each" title="What hit the spot?" sub="Tap the champions of your table." />
                <div className="mt-6 grid grid-cols-2 gap-[calc(var(--g-gap)+4px)]">
                  {dishOptions.map((d, i) => (
                    <motion.div key={d} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_POP, delay: i * 0.04 }}>
                      <Tile label={d} emoji={dishEmoji(d)} selected={dishes.includes(d)} onClick={() => toggle(setDishes)(d)} testId={`dish-chip-${slug(d)}`} />
                    </motion.div>
                  ))}
                </div>
                <Dock>
                  <ArcadeButton data-testid="dishes-next-button" onClick={() => go("vibes")}>
                    {dishes.length ? `Lock in ${dishes.length} ${dishes.length === 1 ? "dish" : "dishes"} →` : "Skip to the vibe →"}
                  </ArcadeButton>
                </Dock>
              </section>
            )}

            {level === "vibes" && (
              <section data-testid="vibes-step" className="flex flex-1 flex-col px-[var(--g-pad)] pt-6">
                <LevelHead kicker="Level 3 · Set the vibe" title="What made it special?" sub="Tap all that fit. Add a shout-out for bonus coins." />
                <div className="mt-6 flex flex-wrap gap-[calc(var(--g-gap)+2px)]">
                  {VIBES.map((v) => (
                    <Chip key={v} label={v} emoji={VIBE_EMOJI[v]} selected={vibes.includes(v)} onClick={() => toggle(setVibes)(v)} testId={`vibe-chip-${slug(v)}`} />
                  ))}
                </div>
                <label htmlFor="guest-note" className="mt-7 flex items-center justify-between text-[13px] font-bold">
                  Shout-out for the kitchen <span className="font-semibold text-[var(--g-muted)]">optional · +15</span>
                </label>
                <textarea
                  id="guest-note"
                  data-testid="guest-note-input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Ask for the extra-spicy salan!"
                  className="mt-2 w-full resize-none rounded-[var(--g-card-r)] border-2 border-[var(--g-line)] bg-[var(--g-card)] p-4 text-[16px] text-[var(--g-card-ink)] outline-none transition-[border-color] duration-150 focus:border-[var(--g-accent)]"
                />
                <p data-testid="pii-note-hint" className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--g-muted)]">
                  <ShieldCheck className="size-3.5 text-[#15803D]" />
                  {hasPii(note) ? "We'll strip phone numbers, emails & bill numbers first." : "Phone numbers, emails & bill numbers are always removed."}
                </p>
                <Dock>
                  <ArcadeButton data-testid="cook-post-button" disabled={!picks} onClick={cook}>
                    Cook my post ✨
                  </ArcadeButton>
                  {!picks && <p className="mt-2.5 text-center text-[12px] font-semibold text-[var(--g-muted)]">Pick at least one dish or vibe first</p>}
                </Dock>
              </section>
            )}

            {level === "cooking" && <CookingScreen dishes={dishes} />}

            {level === "cook-error" && (
              <ErrorScreen
                testId="cook-error-screen"
                emoji="💨"
                title="The kitchen got a bit smoky"
                body="Our AI chef couldn't finish that one. Your picks are saved, so pick how you'd like to continue."
                actions={[
                  { label: "Try cooking again 🔄", onClick: cook, testId: "cook-retry-button", primary: true },
                  { label: "Use a quick draft ⚡", onClick: quickDraft, testId: "cook-quick-draft-button" },
                  { label: "Write my own ✏️", onClick: writeOwn, testId: "cook-write-own-button" },
                ]}
              />
            )}

            {level === "draft" && draft && (
              <DraftLevel
                draft={draft}
                text={text}
                onText={setText}
                onTone={(tone) => generate.mutate({ tone, first: false })}
                onRemix={() => generate.mutate({ tone: draft.tone, first: false })}
                remixing={generate.isPending}
                onShare={share}
                rewardOn={rewardOn}
              />
            )}

            {level === "feedback" && (
              <FeedbackForm base={base} rating={rating} preview={preview} rewardOn={rewardOn} onSent={setRefId} onNext={() => go(rewardOn ? "reward" : "done")} />
            )}

            {level === "reward" && (
              <RewardLevel
                restaurant={r}
                base={base}
                source={happy ? "review" : "feedback"}
                refClientId={refId}
                preview={preview}
                online={online}
                googleUrl={happy && !preview ? r.google_review_url : null}
                onRevealed={() => {
                  setRewarded(true);
                  setBurst((b) => b + 1);
                }}
                onDone={() => go("done")}
              />
            )}

            {level === "done" && (
              <section data-testid="done-step" className="flex flex-1 flex-col items-center px-[var(--g-pad)] pt-12 text-center">
                <motion.div initial={{ scale: 0.3, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={SPRING_POP} className="animate-bounce-soft text-[84px] leading-none" aria-hidden>
                  🏆
                </motion.div>
                <h2 data-testid="done-title" className="mt-5 font-display text-[30px] font-bold leading-tight tracking-[-0.03em]">
                  That's a wrap!
                </h2>
                <p className="mt-2 max-w-[320px] text-[15px] text-[var(--g-muted)]">
                  {happy ? `Thanks for sharing the love with ${r.name}. See you at the table again!` : "Thanks for being honest. The manager is already on it."}
                </p>
                <div data-testid="done-coins" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--g-ink)] px-5 py-2.5 font-display text-[18px] font-bold text-[var(--g-bg)]">
                  <span aria-hidden>★</span> {coins} coins earned
                </div>
                <Dock>
                  <GhostButton data-testid="done-restart-button" onClick={restart} className="w-full">
                    Back to start
                  </GhostButton>
                </Dock>
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {burst > 0 && <Confetti key={burst} />}
    </div>
  );
}
