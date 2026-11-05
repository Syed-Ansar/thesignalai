import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  revealed: boolean;
  onReveal: () => void;
}

const BRUSH = 46;
const REVEAL_AT = 0.5;

/** Canvas foil over the reward; rub it away (pointer/touch). Auto-reveals once ~half is cleared. */
export function ScratchCard({ children, revealed, onReveal }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef(0);

  useEffect(() => {
    const c = canvas.current;
    const w = wrap.current;
    if (!c || !w) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = w.getBoundingClientRect();
    c.width = Math.round(width * dpr);
    c.height = Math.round(height * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, "#C9C5C0");
    g.addColorStop(0.35, "#F2F0ED");
    g.addColorStop(0.5, "#D8D4CF");
    g.addColorStop(0.7, "#F5F3F0");
    g.addColorStop(1, "#A8A29E");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${(0.25 + Math.random() * 0.6).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 0.5 + Math.random() * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "#44403C";
    ctx.font = "700 20px 'Space Grotesk Variable', system-ui, sans-serif";
    ctx.fillText("SCRATCH HERE", width / 2, height / 2 - 2);
    ctx.font = "500 13px 'Space Grotesk Variable', system-ui, sans-serif";
    ctx.fillStyle = "#57534E";
    ctx.fillText("rub with your finger ✦", width / 2, height / 2 + 22);
  }, []);

  function cleared(): number {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return 0;
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let clear = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * 24) {
      total++;
      if (data[i] === 0) clear++;
    }
    return total ? clear / total : 0;
  }

  function at(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function scratch(e: PointerEvent<HTMLCanvasElement>) {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || revealed) return;
    const p = at(e);
    const from = last.current ?? { x: p.x - 0.1, y: p.y };
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = BRUSH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    moves.current += 1;
    if (moves.current % 6 === 0 && cleared() >= REVEAL_AT) onReveal();
  }

  return (
    <div
      ref={wrap}
      data-testid="scratch-card"
      className="relative h-[210px] overflow-hidden rounded-[var(--g-card-r)] bg-[radial-gradient(circle_at_30%_20%,#FEF3C7,#FDE68A_55%,#FBBF24)] text-[#78350F] shadow-[0_24px_50px_-26px_rgba(120,53,15,0.6)] ring-2 ring-[#F59E0B]/50"
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">{children}</div>
      <canvas
        ref={canvas}
        data-testid="scratch-canvas"
        aria-label="Interactive scratch-off reward card"
        className={`absolute inset-0 h-full w-full touch-none transition-opacity duration-500 ${revealed ? "pointer-events-none opacity-0" : "cursor-grab opacity-100"}`}
        onPointerDown={(e) => {
          drawing.current = true;
          last.current = null;
          e.currentTarget.setPointerCapture(e.pointerId);
          scratch(e);
        }}
        onPointerMove={(e) => drawing.current && scratch(e)}
        onPointerUp={() => {
          drawing.current = false;
          last.current = null;
        }}
        onPointerCancel={() => {
          drawing.current = false;
          last.current = null;
        }}
      />
    </div>
  );
}
