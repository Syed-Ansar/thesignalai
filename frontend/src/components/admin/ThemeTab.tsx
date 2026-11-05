import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, toPublic, useSaveRestaurant } from "@/components/admin/shared";
import { PhonePreview } from "@/components/admin/PhonePreview";
import { DEFAULT_THEME, FONTS, SHAPES, SPACING } from "@/lib/theme";
import type { FontKey, Restaurant, ShapeKey, SpacingKey, Theme } from "@/lib/types";

function Segmented<T extends string>({ options, value, onChange, testId }: { options: Record<T, { label: string }>; value: T; onChange: (v: T) => void; testId: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {(Object.keys(options) as T[]).map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          data-testid={`${testId}-${k}`}
          onClick={() => onChange(k)}
          className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-[background-color,border-color,color] duration-150 ${
            value === k ? "border-[#1C1917] bg-[#1C1917] text-white" : "border-[#E7E2DA] bg-white text-[#44403C] hover:border-[#A8A29E]"
          }`}
        >
          {options[k].label}
        </button>
      ))}
    </div>
  );
}

function ColorField({ label, value, onChange, testId }: { label: string; value: string; onChange: (v: string) => void; testId: string }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-[#E7E2DA] bg-white px-3 py-2">
      <input data-testid={`${testId}-picker`} type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="size-8 cursor-pointer rounded border-0 bg-transparent p-0" />
      <span className="flex-1 text-sm font-medium text-[#1C1917]">{label}</span>
      <input
        data-testid={`${testId}-input`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={7}
        className="w-[84px] rounded-md border border-[#E7E2DA] px-2 py-1 font-mono text-xs uppercase outline-none focus:border-[#EA580C]"
      />
    </label>
  );
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function ThemeTab({ restaurant }: { restaurant: Restaurant }) {
  const [theme, setTheme] = useState<Theme>(restaurant.theme);
  const save = useSaveRestaurant(restaurant.id, "Theme published to the guest link");
  const set = <K extends keyof Theme>(k: K, v: Theme[K]) => setTheme((t) => ({ ...t, [k]: v }));
  const valid = HEX.test(theme.accent) && HEX.test(theme.background) && HEX.test(theme.card);
  const dirty = JSON.stringify(theme) !== JSON.stringify(restaurant.theme);
  const previewTheme = valid ? theme : restaurant.theme;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_auto]">
      <div className="space-y-5">
        <Panel title="Colours" testId="theme-colors-panel">
          <div className="grid gap-3 sm:grid-cols-3">
            <ColorField label="Accent" value={theme.accent} onChange={(v) => set("accent", v)} testId="theme-accent" />
            <ColorField label="Background" value={theme.background} onChange={(v) => set("background", v)} testId="theme-background" />
            <ColorField label="Card" value={theme.card} onChange={(v) => set("card", v)} testId="theme-card" />
          </div>
          {!valid && <p className="mt-2 text-xs text-[#B91C1C]">Use 6-digit hex colours like #EA580C.</p>}
        </Panel>
        <Panel title="Font" testId="theme-font-panel">
          <Segmented<FontKey> options={FONTS} value={theme.font} onChange={(v) => set("font", v)} testId="theme-font" />
        </Panel>
        <Panel title="Spacing" testId="theme-spacing-panel">
          <Segmented<SpacingKey> options={SPACING} value={theme.spacing} onChange={(v) => set("spacing", v)} testId="theme-spacing" />
        </Panel>
        <Panel title="Button shape" testId="theme-shape-panel">
          <Segmented<ShapeKey> options={SHAPES} value={theme.shape} onChange={(v) => set("shape", v)} testId="theme-shape" />
        </Panel>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" data-testid="theme-reset-button" onClick={() => setTheme(DEFAULT_THEME)} className="h-10">Reset to default</Button>
          <Button variant="outline" data-testid="theme-discard-button" disabled={!dirty} onClick={() => setTheme(restaurant.theme)} className="h-10">Discard changes</Button>
          <Button data-testid="theme-save-button" disabled={!valid || !dirty || save.isPending} onClick={() => save.mutate({ theme })} className="h-10 bg-[#EA580C] px-6 hover:bg-[#C2410C]">
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save & publish"}
          </Button>
        </div>
      </div>
      <div className="xl:sticky xl:top-24 xl:self-start">
        <PhonePreview restaurant={toPublic(restaurant, previewTheme)} />
      </div>
    </div>
  );
}
