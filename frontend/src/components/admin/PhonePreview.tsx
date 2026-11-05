import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { GuestFlow } from "@/components/guest/GuestFlow";
import type { PublicRestaurant } from "@/lib/types";

/** Phone mockup running the real guest flow in preview mode (no writes, no redirect). */
export function PhonePreview({ restaurant }: { restaurant: PublicRestaurant }) {
  const [run, setRun] = useState(0);
  return (
    <div data-testid="phone-preview" className="flex flex-col items-center gap-3">
      <div className="flex w-[340px] items-center justify-between text-xs text-[#78716C]">
        <span className="font-semibold uppercase tracking-[0.14em]">Live preview</span>
        <button type="button" data-testid="preview-restart-button" onClick={() => setRun((n) => n + 1)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors duration-150 hover:bg-[#EFEAE1]">
          <RotateCcw className="size-3" /> Restart
        </button>
      </div>
      {/* translateZ(0) makes position:fixed children (celebration) anchor to the phone, not the window */}
      <div className="h-[680px] w-[340px] overflow-hidden rounded-[44px] border-[10px] border-[#1C1917] bg-[#1C1917] shadow-[0_30px_60px_-30px_rgba(28,25,23,0.6)]" style={{ transform: "translateZ(0)" }}>
        <div className="h-full overflow-y-auto rounded-[34px]" style={{ background: restaurant.theme.background }}>
          <GuestFlow key={run} restaurant={restaurant} online preview />
        </div>
      </div>
    </div>
  );
}
