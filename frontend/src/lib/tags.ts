import type { Tone } from "@/lib/types";

export const DEFAULT_DISHES = ["Delicious Biryani", "Authentic Spices", "Fresh Starters", "Great Desserts"];
export const VIBES = ["Quick Service", "Polite Staff", "Clean & Hygienic", "Family Friendly", "Value for Money"];

export const CRM_ISSUES = ["Food Taste / Spice", "Order Delay", "Staff Behaviour", "Cleanliness", "Billing Issue", "Portion Size"];

export const STAR_LABELS = ["Tap a star", "Not great", "Could be better", "It was okay", "Really good!", "Absolutely loved it!"];
export const STAR_FACES = ["🍽️", "😞", "😕", "😐", "😋", "🤩"];

export const TONES: { key: Tone; label: string; emoji: string }[] = [
  { key: "foodie", label: "Foodie", emoji: "🍛" },
  { key: "crisp", label: "Quick & Crisp", emoji: "⚡" },
  { key: "desi", label: "Desi Mix", emoji: "🌶️" },
];

/** Coins earned per action (derived from flow state, so deselecting gives them back). */
export const COINS = { rate: 20, tag: 10, note: 15, draft: 30, post: 50, reward: 100 };

export const VIBE_EMOJI: Record<string, string> = {
  "Quick Service": "⚡",
  "Polite Staff": "🙏",
  "Clean & Hygienic": "✨",
  "Family Friendly": "👨‍👩‍👧",
  "Value for Money": "💰",
};

export const ISSUE_EMOJI: Record<string, string> = {
  "Food Taste / Spice": "🌶️",
  "Order Delay": "⏳",
  "Staff Behaviour": "🙋",
  Cleanliness: "🧽",
  "Billing Issue": "🧾",
  "Portion Size": "🥣",
};

const DISH_RULES: [RegExp, string][] = [
  [/biryani|pulao|rice/i, "🍛"],
  [/chicken|65|wings|tandoor|kebab|tikka/i, "🍗"],
  [/mutton|haleem|gosht|curry|gravy|salan/i, "🥘"],
  [/paneer/i, "🧀"],
  [/naan|roti|kulcha|paratha|bread/i, "🫓"],
  [/dosa|idli|vada|uttapam/i, "🥞"],
  [/fish|prawn|seafood/i, "🦐"],
  [/meetha|dessert|kheer|gulab|sweet|ice|kulfi|halwa/i, "🍮"],
  [/starter|crispy|pakoda|samosa/i, "🍢"],
  [/spice|masala/i, "🌶️"],
  [/fresh|salad|veg/i, "🥗"],
  [/chai|tea|coffee|lassi|drink|juice/i, "🥤"],
];

export function dishEmoji(name: string): string {
  return DISH_RULES.find(([re]) => re.test(name))?.[1] ?? "🍽️";
}

export function cookingLines(dishes: string[]): string[] {
  return [
    "Heating the kadai…",
    dishes[0] ? `Folding in the ${dishes[0]}…` : "Grinding fresh masala…",
    "Adding a pinch of love…",
    "Tasting for salt…",
    "Plating your post…",
  ];
}
