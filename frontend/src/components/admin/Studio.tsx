import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Gift, KeyRound, QrCode, Trophy, LogOut, MessageSquareWarning, Palette, Plus, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReviewsTab } from "@/components/admin/ReviewsTab";
import { SetupTab } from "@/components/admin/SetupTab";
import { ThemeTab } from "@/components/admin/ThemeTab";
import { FeedbackTab } from "@/components/admin/FeedbackTab";
import { RewardsTab } from "@/components/admin/RewardsTab";
import { LeaderboardTab } from "@/components/admin/LeaderboardTab";
import { QrPosterTab } from "@/components/admin/QrPosterTab";
import { ChangePasswordDialog, CreateRestaurantDialog } from "@/components/admin/Dialogs";
import { apiGet } from "@/lib/api";
import { cacheGet, cacheSet } from "@/lib/offline";
import { endSession } from "@/lib/session";
import type { Me, Restaurant } from "@/lib/types";

type Tab = "reviews" | "setup" | "theme" | "feedback" | "rewards" | "leaderboard" | "qr";
const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "reviews", label: "Review Logs & Analytics", icon: BarChart3 },
  { id: "setup", label: "Restaurant Setup & Menu", icon: Settings2 },
  { id: "theme", label: "Theme Studio", icon: Palette },
  { id: "feedback", label: "CRM Feedback", icon: MessageSquareWarning },
  { id: "rewards", label: "Rewards", icon: Gift },
  { id: "leaderboard", label: "Weekly Leaderboard", icon: Trophy },
  { id: "qr", label: "QR Poster", icon: QrCode },
];

export function Studio({ me }: { me: Me }) {
  const isSuper = me.platform_role === "superadmin";
  const [tab, setTab] = useState<Tab>("reviews");
  const [rid, setRid] = useState<string | null>(cacheGet<string>("admin-rid"));
  const [creating, setCreating] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const restaurants = useQuery({ queryKey: ["restaurants"], queryFn: () => apiGet<Restaurant[]>("/admin/restaurants") });
  const list = restaurants.isError ? [] : restaurants.data ?? [];
  const current = list.find((r) => r.id === rid) ?? list[0];

  function pick(id: string) {
    setRid(id);
    cacheSet("admin-rid", id);
  }

  return (
    <div className="min-h-screen bg-[#F4F2EE] text-[#1C1917]">
      <header className="sticky top-0 z-30 print:hidden border-b border-[#E7E2DA] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-[#EA580C]" /> Review Studio
          </span>
          <span className="hidden h-5 w-px bg-[#E7E2DA] sm:block" />
          {current && (
            <Select value={current.id} onValueChange={pick}>
              <SelectTrigger data-testid="restaurant-switcher" className="min-w-[200px]">
                <SelectValue>{(v) => list.find((r) => r.id === v)?.name ?? ""}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {list.map((r) => (
                  <SelectItem key={r.id} value={r.id} data-testid={`restaurant-option-${r.slug}`}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isSuper && (
            <Button size="sm" variant="outline" data-testid="create-restaurant-button" onClick={() => setCreating(true)} className="gap-1">
              <Plus className="size-3.5" /> Create new restaurant
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1">
            <span data-testid="current-user-email" className="hidden text-xs text-[#78716C] md:inline">
              {me.email}{isSuper && <span className="ml-1.5 rounded bg-[#1C1917] px-1.5 py-0.5 text-[10px] font-semibold text-white">SUPER-ADMIN</span>}
            </span>
            <Button size="sm" variant="ghost" data-testid="change-password-button" onClick={() => setChangingPw(true)} className="gap-1"><KeyRound className="size-3.5" /><span className="hidden sm:inline">Password</span></Button>
            <Button size="sm" variant="ghost" data-testid="sign-out-button" onClick={() => endSession("/admin")} className="gap-1"><LogOut className="size-3.5" /><span className="hidden sm:inline">Sign out</span></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 lg:grid-cols-[230px_1fr] lg:px-6">
        <nav aria-label="Studio sections" className="print:hidden -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              data-testid={`tab-${id}`}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
              className={`inline-flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-[background-color,color] duration-150 ${
                tab === id ? "bg-[#1C1917] text-white" : "text-[#57534E] hover:bg-white"
              }`}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </nav>

        <main data-testid="studio-main" className="min-w-0">
          {restaurants.isPending ? (
            <div className="h-40 animate-pulse rounded-2xl bg-white" />
          ) : !current ? (
            <div data-testid="no-restaurants" className="rounded-2xl border border-[#E7E2DA] bg-white p-10 text-center text-sm text-[#78716C]">
              {restaurants.isError ? "Couldn't load restaurants. Refresh to try again." : "No restaurants are assigned to you yet. Ask your platform admin."}
            </div>
          ) : (
            <div key={current.id}>
              <div className="mb-5">
                <h1 data-testid="studio-restaurant-name" className="font-heading text-[28px] font-semibold tracking-[-0.02em]">{current.name}</h1>
                <p className="text-sm text-[#78716C]">{current.location || "No location set"} · /{current.slug}</p>
              </div>
              {tab === "reviews" && <ReviewsTab restaurant={current} />}
              {tab === "setup" && <SetupTab restaurant={current} isSuper={isSuper} />}
              {tab === "theme" && <ThemeTab restaurant={current} />}
              {tab === "feedback" && <FeedbackTab restaurant={current} />}
              {tab === "rewards" && <RewardsTab restaurant={current} />}
              {tab === "leaderboard" && <LeaderboardTab restaurant={current} />}
              {tab === "qr" && <QrPosterTab restaurant={current} />}
            </div>
          )}
        </main>
      </div>

      <CreateRestaurantDialog open={creating} onOpenChange={setCreating} onCreated={(r) => { pick(r.id); setTab("setup"); }} />
      <ChangePasswordDialog open={changingPw} onOpenChange={setChangingPw} />
    </div>
  );
}
