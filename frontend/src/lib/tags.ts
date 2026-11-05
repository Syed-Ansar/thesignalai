import type { AppConfig, TagCategory } from "@/lib/types";
import { cacheGet, cacheSet } from "@/lib/offline";

const DEFAULT_TAGS: TagCategory[] = [
  {
    id: "food",
    title: "Food Specialties",
    tags: ["Delicious Biryani", "Authentic Spices", "Fresh Ingredients", "Crispy Starters", "Great Desserts"],
  },
  {
    id: "service",
    title: "Service & Ambiance",
    tags: ["Quick Service", "Polite & Helpful Staff", "Clean & Hygienic", "Family Friendly", "Nice Ambiance"],
  },
  { id: "value", title: "Value", tags: ["Value for Money", "Generous Portions"] },
];

// Tag model is cached locally so the picker hydrates identically offline.
export function loadTagModel(): TagCategory[] {
  const cached = cacheGet<TagCategory[]>("tag-model-v1");
  if (cached && cached.length) return cached;
  cacheSet("tag-model-v1", DEFAULT_TAGS);
  return DEFAULT_TAGS;
}

export const DEFAULT_CONFIG: AppConfig = {
  restaurant_name: "Mana Restaurant",
  location: "Shankarpally",
  google_place_id: "YOUR_GOOGLE_PLACE_ID",
  google_review_url: "https://search.google.com/local/writereview?placeid=YOUR_GOOGLE_PLACE_ID",
};

export const CRM_ISSUES = [
  "Food Taste / Spice",
  "Order Delay",
  "Staff Attentiveness",
  "Cleanliness",
  "Billing Issue",
  "Portion Size",
];

export const STAR_LABELS = ["", "Poor", "Fair", "Average", "Very Good", "Exceptional!"];
