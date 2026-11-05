import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, MessageSquareText, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ArcadeButton, Dock, LevelHead, SPRING_POP, TextButton } from "@/components/guest/GuestKit";
import { ScratchCard } from "@/components/guest/ScratchCard";
import { apiPost } from "@/lib/api";
import { errorDetail } from "@/lib/errors";
import type { OtpCheckOut, OtpSendOut, PublicRestaurant, RewardClaim, RewardClaimIn, RewardSource } from "@/lib/types";

interface Props {
  restaurant: PublicRestaurant;
  base: string;
  source: RewardSource;
  refClientId: string | null;
  preview: boolean;
  online: boolean;
  googleUrl: string | null;
  onRevealed: () => void;
  onDone: () => void;
}

type Stage = "details" | "code" | "scratch";

const inputCls =
  "h-[56px] w-full rounded-[var(--g-btn-r)] border-2 border-[var(--g-line)] bg-[var(--g-card)] px-4 text-[17px] font-medium text-[var(--g-card-ink)] outline-none transition-[border-color] duration-150 placeholder:text-[var(--g-muted)]/70 focus:border-[var(--g-accent)]";

function previewClaim(r: PublicRestaurant, source: RewardSource, name: string, phone: string): RewardClaim {
  const now = new Date();
  return {
    id: "preview",
    restaurant_id: r.id,
    code: "PREVIEW-123",
    title: source === "feedback" ? r.reward.sorry_title : r.reward.title,
    details: r.reward.details,
    source,
    contact_name: name || null,
    contact_phone: phone,
    contact_method: "unverified",
    ref_client_id: null,
    expires_at: new Date(now.getTime() + r.reward.valid_days * 86400000).toISOString(),
    redeemed_at: null,
    created_at: now.toISOString(),
  };
}

export function RewardLevel({ restaurant: r, base, source, refClientId, preview, online, googleUrl, onRevealed, onDone }: Props) {
  const needsCode = r.otp_available && !preview;
  const [stage, setStage] = useState<Stage>("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [claim, setClaim] = useState<RewardClaim | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const digits = phone.replace(/\D/g, "");
  const phoneOk = digits.length >= 10 && digits.length <= 12;
  const sorry = source === "feedback";

  const claimM = useMutation({
    mutationFn: (verificationId: string | null) => {
      if (preview) return Promise.resolve(previewClaim(r, source, name, phone));
      const body: RewardClaimIn = { name: name.trim(), phone, verification_id: verificationId, source, ref_client_id: refClientId };
      return apiPost<RewardClaim>(`${base}/rewards/claim`, body);
    },
    onSuccess: (c) => {
      setClaim(c);
      setStage("scratch");
    },
    onError: (e) => setErr(errorDetail(e, "Couldn't unlock your reward. Please try again.")),
  });

  const send = useMutation({
    mutationFn: () => apiPost<OtpSendOut>(`${base}/otp/send`, { phone }),
    onSuccess: (res) => {
      if (res.sent) {
        setDemoCode(res.demo_code);
        setCode("");
        setStage("code");
      } else claimM.mutate(null);
    },
    onError: (e) => setErr(errorDetail(e, "Couldn't text the code. Please try again.")),
  });

  const check = useMutation({
    mutationFn: (c: string) => apiPost<OtpCheckOut>(`${base}/otp/check`, { phone, code: c }),
    onSuccess: (res) => {
      if (res.verified && res.verification_id) claimM.mutate(res.verification_id);
      else setErr("That code didn't match. Check the SMS and try again.");
    },
    onError: (e) => setErr(errorDetail(e, "Couldn't check the code. Please try again.")),
  });

  // WebOTP: Android Chrome can read the SMS automatically.
  useEffect(() => {
    if (stage !== "code" || demoCode || !("OTPCredential" in window)) return;
    const ac = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: ac.signal } as CredentialRequestOptions)
      .then((cred) => {
        const c = (cred as unknown as { code?: string } | null)?.code;
        if (c) setCode(c);
      })
      .catch(() => undefined);
    return () => ac.abort();
  }, [stage, demoCode]);

  function start() {
    setErr(null);
    if (needsCode) send.mutate();
    else claimM.mutate(null);
  }

  function reveal() {
    if (revealed) return;
    setRevealed(true);
    onRevealed();
  }

  const busy = send.isPending || check.isPending || claimM.isPending;
  const offlineBlock = !online && !preview && stage !== "scratch";

  return (
    <section data-testid="reward-level" className="flex flex-1 flex-col px-[var(--g-pad)] pt-6">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={stage} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="flex flex-1 flex-col">
          {stage === "details" && (
            <>
              <LevelHead
                kicker={sorry ? "Final level · Sorry gift" : "Final level · Bonus"}
                title={sorry ? "A little sorry gift, from us 💛" : "Your mystery reward is waiting 🎁"}
                sub={needsCode ? "Pop in your number and we'll text a quick code to lock the reward to you. No spam." : "Pop in your number so the restaurant can match the reward to you. No spam."}
              />
              <div data-testid="reward-teaser" className="relative mt-6 flex items-center gap-4 overflow-hidden rounded-[var(--g-card-r)] bg-[var(--g-ink)] p-4 text-[var(--g-bg)]">
                <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-[var(--g-accent)] opacity-40 blur-2xl" />
                <span className="animate-wiggle text-[46px] leading-none" aria-hidden>
                  🎁
                </span>
                <div className="relative">
                  <p className="font-display text-[17px] font-bold">Mystery scratch card</p>
                  <p className="text-[13px] opacity-75">Locked to your number · valid {r.reward.valid_days} days</p>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3">
                <input data-testid="reward-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name (optional)" autoComplete="given-name" className={inputCls} />
                <div className="flex gap-2">
                  <span className="grid h-[56px] shrink-0 place-items-center rounded-[var(--g-btn-r)] border-2 border-[var(--g-line)] bg-[var(--g-card)] px-3.5 text-[16px] font-bold text-[var(--g-card-ink)]">+91</span>
                  <input
                    data-testid="reward-phone-input"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setErr(null);
                    }}
                    placeholder="10-digit mobile"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    className={inputCls}
                  />
                </div>
              </div>
            </>
          )}

          {stage === "code" && (
            <>
              <LevelHead kicker="Final level · Almost there" title="Check your messages 📱" sub={`We texted a 6-digit code to +91 ${digits.slice(-10)}.`} />
              {demoCode && (
                <button
                  type="button"
                  data-testid="reward-demo-code-button"
                  onClick={() => setCode(demoCode)}
                  className="mt-5 inline-flex items-center gap-2 self-start rounded-full border-2 border-dashed border-[var(--g-accent)] bg-[color-mix(in_srgb,var(--g-accent)_10%,var(--g-card))] px-3.5 py-2 text-left text-[13px] font-semibold text-[var(--g-card-ink)] transition-transform duration-150 active:scale-95"
                >
                  <MessageSquareText className="size-4 shrink-0" />
                  <span>
                    Demo SMS (no real text sent): <span data-testid="reward-demo-code" className="font-display font-bold tracking-[0.2em]">{demoCode}</span> · tap to fill
                  </span>
                </button>
              )}
              <input
                data-testid="reward-otp-input"
                aria-label="6-digit code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setErr(null);
                }}
                placeholder="••••••"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                className={`${inputCls} mt-5 h-[68px] text-center font-display text-[30px] font-bold tracking-[0.5em]`}
              />
              <TextButton data-testid="reward-change-number-button" onClick={() => setStage("details")} className="mt-2 self-center">
                Wrong number? Change it
              </TextButton>
            </>
          )}

          {stage === "scratch" && claim && (
            <>
              <LevelHead
                kicker={revealed ? "Reward unlocked" : "Final level · Scratch!"}
                title={revealed ? "You unlocked it! 🎉" : "Scratch your card ✨"}
                sub={revealed ? "Show this code to your server. We've saved it to your number too." : "Rub the silver foil with your finger to reveal your reward."}
              />
              <div className="mt-6">
                <ScratchCard revealed={revealed} onReveal={reveal}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">{sorry ? "Our apology gift" : "Your reward"}</p>
                  <p data-testid="reward-title" className="mt-1.5 font-display text-[26px] font-bold leading-tight tracking-[-0.02em]">
                    {claim.title}
                  </p>
                  <p data-testid="reward-claim-code" className="mt-3 rounded-xl border-2 border-dashed border-[#B45309]/50 bg-white/50 px-4 py-1.5 font-display text-[22px] font-bold tracking-[0.12em]">
                    {claim.code}
                  </p>
                  <p data-testid="reward-expiry" className="mt-2 text-[12px] font-semibold opacity-80">
                    Valid till {format(new Date(claim.expires_at), "d MMM yyyy")}
                  </p>
                </ScratchCard>
              </div>
              {revealed ? (
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_POP} data-testid="reward-details" className="mt-4 text-center text-[14px] text-[var(--g-muted)]">
                  {claim.details}
                </motion.p>
              ) : (
                <TextButton data-testid="scratch-reveal-button" onClick={reveal} className="mt-3 self-center">
                  Can't scratch? Reveal it instantly
                </TextButton>
              )}
            </>
          )}

          {offlineBlock && (
            <p data-testid="reward-offline-note" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#FEF3C7] px-3.5 py-2.5 text-[13px] font-medium text-[#78350F]">
              <WifiOff className="size-4 shrink-0" /> You're offline. Reconnect to grab your reward. Everything else is saved.
            </p>
          )}
          {err && (
            <p data-testid="reward-error" role="alert" className="mt-4 rounded-2xl bg-[#FEE2E2] px-3.5 py-2.5 text-[13px] font-semibold text-[#991B1B]">
              {err}
            </p>
          )}

          <Dock>
            {stage === "details" && (
              <>
                <ArcadeButton data-testid="reward-unlock-button" disabled={!phoneOk || busy || offlineBlock} onClick={start}>
                  {busy ? <Loader2 className="size-5 animate-spin" /> : needsCode ? "Text me the code" : "Unlock my reward"}
                </ArcadeButton>
                <div className="mt-1 flex flex-wrap items-center justify-center">
                  <TextButton data-testid="reward-skip-button" onClick={onDone}>
                    Maybe later
                  </TextButton>
                  {googleUrl && (
                    <a data-testid="reopen-google-link" href={googleUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center px-3 text-[14px] font-semibold text-[var(--g-muted)] underline underline-offset-4">
                      Google didn't open?
                    </a>
                  )}
                </div>
              </>
            )}
            {stage === "code" && (
              <ArcadeButton data-testid="reward-verify-button" disabled={code.length < 6 || busy || offlineBlock} onClick={() => { setErr(null); check.mutate(code); }}>
                {busy ? <Loader2 className="size-5 animate-spin" /> : "Verify & unlock"}
              </ArcadeButton>
            )}
            {stage === "scratch" && revealed && (
              <ArcadeButton data-testid="reward-done-button" onClick={onDone}>
                Collect &amp; finish
              </ArcadeButton>
            )}
          </Dock>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
