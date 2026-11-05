import { MapPin, Receipt, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { AppConfig, PetpoojaOrder } from "@/lib/types";

const BANNER =
  "https://images.unsplash.com/photo-1589302168068-964664d93dc0?crop=entropy&cs=srgb&fm=jpg&q=70&w=960";

export function AppHeader({ config, order }: { config: AppConfig; order: PetpoojaOrder | null }) {
  return (
    <header data-testid="app-header" className="relative overflow-hidden bg-[#292524] text-[#FAF8F5]">
      <img
        src={BANNER}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-45"
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917] via-[#1C1917]/70 to-[#1C1917]/20" />
      <div className="relative px-5 pb-6 pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FBBF24]">
          Hyderabadi Kitchen · Since 2009
        </p>
        <h1
          data-testid="restaurant-name"
          className="mt-2 font-heading text-[30px] font-semibold leading-tight tracking-[-0.02em]"
        >
          {config.restaurant_name}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-[#D6D3D1]">
          <span data-testid="restaurant-location" className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" /> {config.location}
          </span>
          {order && (
            <span
              data-testid="order-badge"
              className="inline-flex items-center gap-1 rounded-full bg-[#FBBF24] px-2.5 py-0.5 text-xs font-semibold text-[#78350F]"
            >
              <Receipt className="size-3" /> Order {order.petpooja_order_id}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

export function OfflineBanner({ online }: { online: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {!online && (
        <motion.div
          key="offline"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div
            data-testid="offline-banner"
            role="status"
            className="flex items-center gap-2 bg-[#451A03] px-5 py-2.5 text-[13px] font-medium text-[#FEF3C7]"
          >
            <WifiOff className="size-4 shrink-0 text-[#FDE68A]" />
            You are offline. Your review draft will still work locally.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const STEPS = ["Rate", "Highlights", "Drafts", "Post"];

export function StepIndicator({ current }: { current: number }) {
  return (
    <div data-testid="step-indicator" className="flex items-center gap-1.5 px-5 pt-5">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 flex-col gap-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-[#EFEAE1]">
            <motion.div
              className="h-full rounded-full bg-[#EA580C]"
              initial={false}
              animate={{ width: i <= current ? "100%" : "0%" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 ${
              i <= current ? "text-[#C2410C]" : "text-[#A8A29E]"
            }`}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
