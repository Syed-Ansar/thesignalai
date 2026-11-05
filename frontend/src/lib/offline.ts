import { apiPost } from "@/lib/api";
import type { CrmFeedback, CrmFeedbackCreate, DraftRequest, DraftResponse } from "@/lib/types";

// ---------- localStorage cache ----------
const PREFIX = "mana-review:";

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function cacheSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — ignore */
  }
}

export function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- CRM offline queue ----------
const QUEUE_KEY = "crm-queue";
const SYNC_TAG = "crm-sync";

export function getQueue(): CrmFeedbackCreate[] {
  return cacheGet<CrmFeedbackCreate[]>(QUEUE_KEY) ?? [];
}

export function enqueueFeedback(item: CrmFeedbackCreate): void {
  cacheSet(QUEUE_KEY, [...getQueue(), item]);
  // Ask the service worker for a background sync where supported (Chromium); the
  // window 'online' listener covers every other browser.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        const sync = (reg as ServiceWorkerRegistration & { sync?: { register: (t: string) => Promise<void> } })
          .sync;
        return sync?.register(SYNC_TAG);
      })
      .catch(() => undefined);
  }
}

let flushing = false;
export async function flushQueue(): Promise<number> {
  if (flushing || !navigator.onLine) return 0;
  const queue = getQueue();
  if (!queue.length) return 0;
  flushing = true;
  let sent = 0;
  const remaining: CrmFeedbackCreate[] = [];
  try {
    for (const item of queue) {
      try {
        await apiPost<CrmFeedback>("/crm-feedback", item);
        sent++;
      } catch {
        remaining.push(item);
      }
    }
    cacheSet(QUEUE_KEY, remaining);
  } finally {
    flushing = false;
  }
  return sent;
}

// ---------- Service worker ----------
export function registerServiceWorker(onSyncRequest: () => void): void {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
  navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
    if ((event.data as { type?: string } | null)?.type === SYNC_TAG) onSyncRequest();
  });
}

// ---------- Offline draft synthesizer ----------
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const PHRASES: Record<string, string[]> = {
  "Delicious Biryani": ["the biryani was full of flavour", "the biryani was properly dum-cooked and tasty"],
  "Authentic Spices": ["the spices felt authentic, not toned down", "masalas were balanced and authentic"],
  "Fresh Ingredients": ["everything tasted fresh", "you can tell the ingredients are fresh"],
  "Crispy Starters": ["starters came out hot and crispy", "the starters had a perfect crunch"],
  "Great Desserts": ["the dessert was a lovely finish", "save space for dessert"],
  "Quick Service": ["food came out quickly", "service was fast even when it was busy"],
  "Polite & Helpful Staff": ["the staff were polite and helpful", "staff checked on us without hovering"],
  "Clean & Hygienic": ["the place is clean and hygienic", "tables and washrooms were spotless"],
  "Family Friendly": ["it's great for families", "comfortable for a family outing with kids"],
  "Nice Ambiance": ["the ambiance is relaxed and pleasant", "nice, calm vibe inside"],
  "Value for Money": ["very good value for money", "prices are fair for the quality"],
  "Generous Portions": ["portions are generous", "quantity was more than enough"],
};

const HINGLISH: Record<string, string> = {
  "Delicious Biryani": "biryani ekdum zabardast thi",
  "Authentic Spices": "masale bilkul authentic the",
  "Fresh Ingredients": "sab kuch fresh laga",
  "Crispy Starters": "starters mast crispy the",
  "Great Desserts": "dessert toh must-try hai",
  "Quick Service": "service bahut fast thi",
  "Polite & Helpful Staff": "staff bahut polite aur helpful tha",
  "Clean & Hygienic": "jagah ekdum saaf-suthri hai",
  "Family Friendly": "family ke saath aane ke liye perfect",
  "Nice Ambiance": "ambiance bhi kaafi accha hai",
  "Value for Money": "full paisa vasool",
  "Generous Portions": "quantity bhi badiya thi",
};

const phraseFor = (tag: string) => (PHRASES[tag] ? pick(PHRASES[tag]) : `loved the ${tag.toLowerCase()}`);
const hinglishFor = (tag: string) => HINGLISH[tag] ?? `${tag} bahut accha tha`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function generateOfflineDrafts(req: DraftRequest, restaurant: string, location: string): DraftResponse {
  const dishSet = new Set(req.dishes);
  const tags = shuffle(req.tags.filter((t) => !dishSet.has(t)));
  const dishes = req.dishes;
  const dishText = dishes.length ? joinList(dishes) : "";
  const note = req.note.trim();
  const place = `${restaurant}, ${location}`;
  const top = tags.slice(0, 2).map(phraseFor);

  const short = pick([
    `${dishText ? `${cap(dishText)} hit the spot` : "Solid meal"} — ${joinList(top) || "really enjoyed it"}. Will be back!`,
    `${cap(joinList(top) || "great food")}${dishText ? `, and the ${dishText} was a highlight` : ""}. ${req.rating}/5 from me.`,
    `Came hungry, left happy. ${cap(joinList(top) || "everything was good")}.`,
  ]);

  const detailedParts = shuffle(tags).map(phraseFor).map(cap);
  const detailed = [
    pick([
      `Had ${dishText ? `the ${dishText}` : "a proper meal"} at ${place} and it was worth it.`,
      `Our table went for ${dishText || "a mix of their signature dishes"} at ${place}.`,
      `Stopped by ${place} for a family meal${dishText ? ` — ordered ${dishText}` : ""}.`,
    ]),
    ...detailedParts.slice(0, 4).map((p) => `${p}.`),
    note ? `${cap(note.replace(/[.!]+$/, ""))}.` : "",
    pick(["Would happily recommend it.", "Already planning the next visit.", "Recommended if you're nearby."]),
  ]
    .filter(Boolean)
    .join(" ");

  const hParts = tags.slice(0, 3).map(hinglishFor);
  const hinglish = [
    pick([
      `Yaar, ${dishText ? `${dishText} try kiya aur` : "khana"} ekdum dil khush ho gaya!`,
      `${restaurant} mein aaj ka khana kamaal tha.`,
      `Kya baat hai ${restaurant}!`,
    ]),
    hParts.length ? `${cap(joinList(hParts))}.` : "",
    pick(["Definitely aayenge phir se 😊", "Shankarpally side ho toh zaroor try karo.", "Highly recommend, boss!"]),
  ]
    .filter(Boolean)
    .join(" ");

  return { option_1: short, option_2: detailed, option_3: hinglish, source: "offline" };
}
