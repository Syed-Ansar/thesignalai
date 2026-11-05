import { Copy, ExternalLink, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/admin/shared";
import { copyText } from "@/lib/errors";
import { themeVars } from "@/lib/theme";
import type { Restaurant } from "@/lib/types";

const STEPS = [
  { emoji: "⭐", title: "Tap a star", sub: "How was the feast?" },
  { emoji: "🍛", title: "Pick your faves", sub: "Dishes & vibe" },
  { emoji: "🎁", title: "Scratch a reward", sub: "Yours to keep" },
];

/** One printable A4 poster per restaurant. Sizes are in em so the same layout scales from preview to print. */
export function QrPosterTab({ restaurant: r }: { restaurant: Restaurant }) {
  const url = `${window.location.origin}/${r.slug}`;

  return (
    <Panel
      title="Table QR poster"
      description="Print it on A4 and place it on every table. Scanning opens the reward run straight away. No app, no login."
      testId="qr-poster-panel"
      action={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" data-testid="qr-copy-link-button" className="gap-1" onClick={() => copyText(url).then(() => toast.success("Link copied"))}>
            <Copy className="size-3.5" /> Copy link
          </Button>
          <Button size="sm" variant="outline" data-testid="qr-open-link-button" className="gap-1" onClick={() => window.open(url, "_blank", "noopener")}>
            <ExternalLink className="size-3.5" /> Open
          </Button>
          <Button size="sm" data-testid="qr-print-button" className="gap-1 bg-[#EA580C] hover:bg-[#C2410C]" onClick={() => window.print()}>
            <Printer className="size-3.5" /> Print poster
          </Button>
        </div>
      }
    >
      <p data-testid="qr-poster-url" className="-mt-2 mb-4 break-all font-mono text-xs text-[#78716C]">{url}</p>
      <div className="flex justify-center rounded-xl bg-[#EFEAE1] p-6">
        <div
          id="qr-poster"
          data-testid="qr-poster"
          style={themeVars(r.theme)}
          className="relative flex aspect-[210/297] w-full max-w-[440px] flex-col overflow-hidden rounded-md bg-[var(--g-bg)] text-[10px] text-[var(--g-ink)] shadow-[0_20px_50px_-25px_rgba(0,0,0,0.45)] print:max-w-none print:text-[19px]"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,color-mix(in_srgb,var(--g-accent)_25%,transparent)_0%,transparent_45%),radial-gradient(circle_at_0%_100%,color-mix(in_srgb,#FBBF24_22%,transparent)_0%,transparent_45%)]" />
          <div className="relative bg-[var(--g-accent)] px-[2.4em] pb-[1.6em] pt-[2.2em] text-[var(--g-on-accent)]">
            <p className="text-[1.1em] font-bold uppercase tracking-[0.2em] opacity-85">Welcome to</p>
            <p data-testid="qr-poster-name" className="mt-[0.2em] font-display text-[3.2em] font-bold leading-[1.02] tracking-[-0.03em]">{r.name}</p>
            {r.location && <p className="mt-[0.3em] text-[1.3em] font-medium opacity-90">{r.location}</p>}
          </div>

          <div className="relative flex flex-1 flex-col items-center px-[2.4em] pt-[2em] text-center">
            <p className="font-display text-[2.6em] font-bold leading-[1.05] tracking-[-0.03em]">
              Rate. Share.
              <br />
              Scratch a reward 🎁
            </p>
            <div className="mt-[1.6em] rounded-[1.6em] bg-white p-[1.2em] shadow-[0_1.2em_2.4em_-1.4em_rgba(0,0,0,0.45)] ring-[0.35em] ring-[var(--g-accent)]">
              <div className="size-[17em]">
                <QRCodeSVG data-testid="qr-poster-code" value={url} size={512} level="M" marginSize={0} fgColor="#1C1917" style={{ width: "100%", height: "100%" }} />
              </div>
            </div>
            <p className="mt-[1em] text-[1.3em] font-bold">Scan with your phone camera</p>
            {r.reward.enabled && (
              <p data-testid="qr-poster-reward" className="mt-[0.8em] rounded-full bg-[var(--g-ink)] px-[1.2em] py-[0.5em] text-[1.2em] font-semibold text-[var(--g-bg)]">
                Today's reward: {r.reward.title}
              </p>
            )}
            <div className="mt-auto grid w-full grid-cols-3 gap-[0.8em] pb-[1.4em] pt-[1.6em]">
              {STEPS.map((s, i) => (
                <div key={s.title} className="rounded-[1em] bg-[var(--g-card)] px-[0.6em] py-[0.9em] text-[var(--g-card-ink)] ring-1 ring-[var(--g-line)]">
                  <p className="text-[2em] leading-none" aria-hidden>{s.emoji}</p>
                  <p className="mt-[0.4em] text-[1.1em] font-bold">{i + 1}. {s.title}</p>
                  <p className="text-[0.95em] text-[var(--g-muted)]">{s.sub}</p>
                </div>
              ))}
            </div>
            <p className="pb-[1.6em] text-[1em] font-semibold uppercase tracking-[0.16em] text-[var(--g-muted)]">No app · No login · 30 seconds</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
