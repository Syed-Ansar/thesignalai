import { BadgeCheck, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pill } from "@/components/review/Pill";
import { hasPii } from "@/lib/pii";
import type { PetpoojaOrder, TagCategory } from "@/lib/types";

interface Props {
  categories: TagCategory[];
  order: PetpoojaOrder | null;
  selected: string[];
  onToggle: (tag: string) => void;
  note: string;
  onNote: (v: string) => void;
  onGenerate: () => void;
  generating: boolean;
  onBack: () => void;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function TagSelector({ categories, order, selected, onToggle, note, onNote, onGenerate, generating, onBack }: Props) {
  return (
    <section data-testid="tag-selector" className="px-5 pb-32 pt-6">
      <h2 className="font-heading text-[26px] font-semibold leading-tight tracking-[-0.02em]">
        So glad you enjoyed it! What stood out?
      </h2>
      <p className="mt-1.5 text-[15px] text-[#57534E]">Tap everything you liked — we'll turn it into a review.</p>

      {order && order.order_items.length > 0 && (
        <div
          data-testid="order-dishes-section"
          className="mt-6 rounded-3xl border border-[#FDE68A] bg-[#FFFBEB] p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78350F]">From your order</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#B45309]">
              <BadgeCheck className="size-3" /> Petpooja POS
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {order.order_items.map((it) => (
              <Pill
                key={it.itemid}
                label={it.itemname}
                selected={selected.includes(it.itemname)}
                onClick={() => onToggle(it.itemname)}
                testId={`dish-tag-${slug(it.itemid)}`}
              />
            ))}
          </div>
        </div>
      )}

      {categories.map((cat) => (
        <div key={cat.id} className="mt-6" data-testid={`tag-category-${cat.id}`}>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78716C]">{cat.title}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {cat.tags.map((t) => (
              <Pill
                key={t}
                label={t}
                selected={selected.includes(t)}
                onClick={() => onToggle(t)}
                testId={`tag-${slug(t)}`}
              />
            ))}
          </div>
        </div>
      ))}

      <label htmlFor="note" className="mt-7 block text-sm font-semibold text-[#44403C]">
        Any specific dish name or note? (Optional)
      </label>
      <Textarea
        id="note"
        data-testid="review-note-input"
        value={note}
        onChange={(e) => onNote(e.target.value)}
        placeholder="e.g. Ask for the extra-spicy mirchi ka salan!"
        rows={3}
        className="mt-2 rounded-2xl border-[#E7E2DA] bg-white text-[15px]"
      />
      <p data-testid="pii-hint" className="mt-2 flex items-center gap-1.5 text-xs text-[#78716C]">
        <ShieldCheck className="size-3.5 text-[#15803D]" />
        {hasPii(note)
          ? "We'll strip phone numbers, emails & bill numbers before drafting."
          : "Phone numbers, emails & bill numbers are always removed."}
      </p>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] border-t border-[#EFEAE1] bg-[#FDFBF7]/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="flex gap-3">
          <Button variant="outline" data-testid="tags-back-button" onClick={onBack} className="h-12 rounded-full px-5">
            Back
          </Button>
          <Button
            data-testid="generate-drafts-button"
            disabled={selected.length === 0 || generating}
            onClick={onGenerate}
            className="h-12 flex-1 gap-2 rounded-full bg-[#EA580C] text-[15px] font-semibold hover:bg-[#C2410C]"
          >
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {generating ? "Writing your ideas…" : "Generate 3 Review Ideas"}
          </Button>
        </div>
        {selected.length === 0 && (
          <p className="mt-2 text-center text-xs text-[#78716C]">Pick at least one highlight to continue</p>
        )}
      </div>
    </section>
  );
}
