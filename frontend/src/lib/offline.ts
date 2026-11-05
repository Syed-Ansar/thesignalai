import { ApiError, apiPost } from "@/lib/api";
import type { DraftRequest, DraftResponse, Tone } from "@/lib/types";

// ---------- localStorage cache (offline storage adapter: swap for IndexedDB here) ----------
const PREFIX = "review-studio:";

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
    /* storage full / private mode */
  }
}

export function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- Offline POST queue (feedback, visits, review logs) ----------
interface QueuedPost {
  id: string;
  path: string;
  body: unknown;
}
const QUEUE_KEY = "post-queue";
const SYNC_TAG = "crm-sync";

export function getQueue(): QueuedPost[] {
  return cacheGet<QueuedPost[]>(QUEUE_KEY) ?? [];
}

function enqueue(path: string, body: unknown): void {
  cacheSet(QUEUE_KEY, [...getQueue(), { id: newClientId(), path, body }]);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        const sync = (reg as ServiceWorkerRegistration & { sync?: { register: (t: string) => Promise<void> } }).sync;
        return sync?.register(SYNC_TAG);
      })
      .catch(() => undefined);
  }
}

/** POST now if online; otherwise (or on network/5xx failure) keep it on the phone for later sync. */
export async function postOrQueue(path: string, body: unknown): Promise<"sent" | "queued"> {
  if (!navigator.onLine) {
    enqueue(path, body);
    return "queued";
  }
  try {
    await apiPost(path, body);
    return "sent";
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) throw err;
    enqueue(path, body);
    return "queued";
  }
}

let flushing = false;
export async function flushQueue(): Promise<number> {
  if (flushing || !navigator.onLine) return 0;
  const queue = getQueue();
  if (!queue.length) return 0;
  flushing = true;
  let sent = 0;
  const remaining: QueuedPost[] = [];
  try {
    for (const item of queue) {
      try {
        await apiPost(item.path, item.body);
        sent++;
      } catch (err) {
        if (!(err instanceof ApiError && err.status < 500)) remaining.push(item); // drop permanently-invalid items
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

// ---------- Offline draft synthesizer (fallback template array) ----------
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const PHRASES: Record<string, string[]> = {
  "Delicious Biryani": ["the biryani was full of flavour", "the biryani was properly dum-cooked"],
  "Authentic Spices": ["the spices felt authentic, not toned down", "masalas were balanced and authentic"],
  "Fresh Starters": ["starters came out hot and fresh", "the starters had a perfect crunch"],
  "Great Desserts": ["dessert was a lovely finish", "save space for dessert"],
  "Quick Service": ["food came out quickly", "service was fast even when it was busy"],
  "Polite Staff": ["the staff were polite and helpful", "staff checked on us without hovering"],
  "Clean & Hygienic": ["the place is clean and hygienic", "tables were spotless"],
  "Family Friendly": ["it's great for families", "comfortable for a family outing with kids"],
  "Value for Money": ["very good value for money", "prices are fair for the quality"],
};

const HINGLISH: Record<string, string> = {
  "Delicious Biryani": "biryani ekdum zabardast thi",
  "Authentic Spices": "masale bilkul authentic the",
  "Fresh Starters": "starters mast fresh the",
  "Great Desserts": "dessert toh must-try hai",
  "Quick Service": "service bahut fast thi",
  "Polite Staff": "staff bahut polite tha",
  "Clean & Hygienic": "jagah ekdum saaf-suthri hai",
  "Family Friendly": "family ke saath aane ke liye perfect",
  "Value for Money": "full paisa vasool",
};

const phraseFor = (t: string) => (PHRASES[t] ? pick(PHRASES[t]) : `the ${t} was excellent`);
const hinglishFor = (t: string) => HINGLISH[t] ?? `${t} bahut accha tha`;

const TONE_LABEL: Record<Tone, string> = { foodie: "Foodie", crisp: "Quick & Crisp", desi: "Desi Mix" };

export function generateOfflineDraft(req: DraftRequest, restaurant: string, location: string): DraftResponse {
  const realDishes = req.dishes.filter((d) => !PHRASES[d]);
  const tags = shuffle([...req.dishes.filter((d) => PHRASES[d]), ...req.vibes]);
  const dishText = joinList(realDishes);
  const note = req.note.trim();
  const place = location ? `${restaurant}, ${location}` : restaurant;
  const top = tags.slice(0, 2).map(phraseFor);

  const short = pick([
    `${dishText ? `${cap(dishText)} hit the spot` : "Solid meal"} — ${joinList(top) || "really enjoyed it"}. Will be back!`,
    `${cap(joinList(top) || "great food")}${dishText ? `, and the ${dishText} was a highlight` : ""}. ${req.rating}/5 from me.`,
    `Came hungry, left happy. ${cap(joinList(top) || `the ${dishText} was spot on`)}.`,
  ]);

  const detailed = [
    pick([
      `Had ${dishText ? `the ${dishText}` : "a proper meal"} at ${place} and it was worth it.`,
      `Our table went for ${dishText || "a mix of their signature dishes"} at ${place}.`,
      `Stopped by ${place} for a family meal${dishText ? ` and ordered ${dishText}` : ""}.`,
    ]),
    ...tags.slice(0, 4).map((t) => `${cap(phraseFor(t))}.`),
    note ? `${cap(note.replace(/[.!]+$/, ""))}.` : "",
    pick(["Would happily recommend it.", "Already planning the next visit.", "Recommended if you're nearby."]),
  ]
    .filter(Boolean)
    .join(" ");

  const hParts = tags.slice(0, 3).map(hinglishFor);
  const hinglish = [
    pick([
      `Yaar, ${dishText ? `${dishText} try kiya aur` : "khana khaake"} dil khush ho gaya!`,
      `${restaurant} mein aaj ka khana kamaal tha.`,
      `Kya baat hai ${restaurant}!`,
    ]),
    hParts.length ? `${cap(joinList(hParts))}.` : "",
    pick(["Definitely aayenge phir se 😊", "Zaroor try karo.", "Highly recommend, boss!"]),
  ]
    .filter(Boolean)
    .join(" ");

  const text = req.tone === "crisp" ? short : req.tone === "desi" ? hinglish : detailed;
  return { text, tone: req.tone, tone_label: TONE_LABEL[req.tone], source: "offline", rewrites: 0 };
}
