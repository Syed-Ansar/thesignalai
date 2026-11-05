import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Link2, Loader2, XCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { apiGet } from "@/lib/api";
import type { Restaurant, SlugCheck } from "@/lib/types";

const clean = (v: string) => v.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-").replace(/^-/, "").slice(0, 40);

interface Props {
  restaurant: Restaurant;
  value: string;
  onChange: (v: string) => void;
  /** false while checking or when the name can't be used, so the form can block saving */
  onValidity: (ok: boolean) => void;
}

/** Guest link name with an instant (debounced) availability check and suggestions. */
export function SlugField({ restaurant, value, onChange, onValidity }: Props) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), 300);
    return () => window.clearTimeout(t);
  }, [value]);

  const typed = value.replace(/-$/, "");
  const unchanged = typed === restaurant.slug;
  const check = useQuery({
    queryKey: ["slug-check", restaurant.id, debounced],
    queryFn: () => apiGet<SlugCheck>(`/admin/slug-check?slug=${encodeURIComponent(debounced)}&restaurant_id=${encodeURIComponent(restaurant.id)}`),
    enabled: !unchanged && debounced.length > 0,
    staleTime: 10_000,
  });

  const settled = debounced === value && !check.isFetching;
  const result = settled ? check.data : undefined;
  const ok = unchanged || (!!result && result.available);
  useEffect(() => onValidity(ok), [ok, onValidity]);

  const host = window.location.host;
  const state: "idle" | "checking" | "ok" | "bad" = unchanged ? "idle" : !value ? "bad" : !settled ? "checking" : result?.available ? "ok" : "bad";
  const border = state === "ok" ? "border-[#16A34A] focus-within:ring-[#16A34A]/15" : state === "bad" ? "border-[#DC2626] focus-within:ring-[#DC2626]/15" : "border-[#E7E2DA] focus-within:border-[#EA580C] focus-within:ring-[#EA580C]/15";

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label htmlFor="r-slug">Guest link</Label>
      <div className={`flex h-10 items-center overflow-hidden rounded-lg border bg-white text-sm transition-[border-color,box-shadow] duration-150 focus-within:ring-2 ${border}`}>
        <span className="flex h-full shrink-0 items-center gap-1.5 border-r border-[#E7E2DA] bg-[#FAF8F4] px-3 text-[#78716C]">
          <Link2 className="size-3.5" />
          <span className="max-w-[180px] truncate">{host}/</span>
        </span>
        <input
          id="r-slug"
          data-testid="setup-slug-input"
          value={value}
          onChange={(e) => onChange(clean(e.target.value))}
          onBlur={() => onChange(value.replace(/-+$/, ""))}
          placeholder="mana"
          spellCheck={false}
          autoCapitalize="off"
          className="h-full min-w-0 flex-1 bg-transparent px-3 font-medium text-[#1C1917] outline-none"
          required
        />
        <span className="grid w-9 shrink-0 place-items-center" aria-hidden>
          {state === "checking" && <Loader2 className="size-4 animate-spin text-[#A8A29E]" />}
          {state === "ok" && <CheckCircle2 className="size-4 text-[#16A34A]" />}
          {state === "bad" && <XCircle className="size-4 text-[#DC2626]" />}
        </span>
      </div>

      <p data-testid="slug-status" aria-live="polite" className={`text-[12px] font-medium ${state === "ok" ? "text-[#15803D]" : state === "bad" ? "text-[#B91C1C]" : "text-[#A8A29E]"}`}>
        {state === "idle" && (restaurant.slug_aliases.length ? `Your current link. Old links (${restaurant.slug_aliases.map((a) => `/${a}`).join(", ")}) still redirect here.` : "Your current link. Short and memorable works best on table posters.")}
        {state === "checking" && "Checking…"}
        {state === "ok" && `/${result?.slug} is available. Your old link /${restaurant.slug} will keep working.`}
        {state === "bad" && (value ? (result?.reason ?? "Not available") : "Pick a link name")}
      </p>

      {state === "bad" && !!result?.suggestions.length && (
        <div className="flex flex-wrap items-center gap-1.5" data-testid="slug-suggestions">
          <span className="text-[11px] text-[#78716C]">Try:</span>
          {result.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              data-testid={`slug-suggestion-${s}`}
              onClick={() => onChange(s)}
              className="rounded-full border border-[#E7E2DA] bg-white px-2.5 py-1 text-[12px] font-medium text-[#1C1917] transition-[border-color,background-color] duration-150 hover:border-[#EA580C] hover:bg-[#FFF7ED]"
            >
              /{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
