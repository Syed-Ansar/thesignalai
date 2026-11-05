import { Check } from "lucide-react";

interface PillProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  testId: string;
}

export function Pill({ label, selected, onClick, testId }: PillProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[14px] font-medium transition-[background-color,color,border-color,transform,box-shadow] duration-150 active:scale-95 ${
        selected
          ? "border-[#C2410C] bg-[#EA580C] text-white shadow-[0_6px_16px_-8px_rgba(234,88,12,0.8)]"
          : "border-[#E7E2DA] bg-[#F5F2EB] text-[#44403C] hover:border-[#F59E0B] hover:bg-[#FFFBEB]"
      }`}
    >
      {selected && <Check className="size-3.5" strokeWidth={3} />}
      {label}
    </button>
  );
}
