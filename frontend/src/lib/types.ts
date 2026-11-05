// Hand-written mirrors of backend/models/studio.py — keep in sync.

export type FontKey = "inter" | "plus-jakarta" | "poppins" | "system";
export type SpacingKey = "compact" | "comfortable" | "spacious";
export type ShapeKey = "pill" | "rounded" | "square";

export interface Theme {
  accent: string;
  background: string;
  card: string;
  font: FontKey;
  spacing: SpacingKey;
  shape: ShapeKey;
}

export interface RewardConfig {
  enabled: boolean;
  title: string;
  details: string;
  sorry_title: string;
  valid_days: number;
  weekly_prize: string;
}

/** Guest-facing reward (weekly_prize is owner-only and never sent to guests). */
export type PublicReward = Omit<RewardConfig, "weekly_prize">;

export interface MenuItem {
  id: string;
  name: string;
}

export interface Restaurant {
  id: string;
  slug: string;
  slug_aliases: string[];
  name: string;
  location: string;
  google_place_id: string;
  whatsapp_number: string;
  otp_enabled: boolean;
  menu: MenuItem[];
  existing_reviews: string;
  theme: Theme;
  reward: RewardConfig;
  created_at: string;
}

export interface RestaurantCreate {
  name: string;
  location: string;
  slug?: string | null;
}

export type RestaurantUpdate = Partial<
  Pick<
    Restaurant,
    "name" | "slug" | "location" | "google_place_id" | "whatsapp_number" | "otp_enabled" | "existing_reviews" | "theme" | "reward"
  >
>;

export interface PublicRestaurant {
  id: string;
  slug: string;
  name: string;
  location: string;
  menu: string[];
  theme: Theme;
  otp_enabled: boolean;
  otp_available: boolean;
  whatsapp_enabled: boolean;
  sms_demo: boolean;
  whatsapp_delivery: boolean;
  google_review_url: string;
  reward: PublicReward;
}

export interface Me {
  id: string;
  email: string;
  platform_role: string | null;
  restaurant_ids: string[];
}

export interface OwnerOut {
  id: string;
  email: string;
  created_at: string;
}

export interface VisitOut {
  id: string;
}

export type Tone = "foodie" | "crisp" | "desi";

export interface DraftRequest {
  rating: number;
  dishes: string[];
  vibes: string[];
  note: string;
  tone: Tone;
}

export interface DraftResponse {
  text: string;
  tone: Tone;
  tone_label: string;
  source: string; // "ai" | "offline" | "manual" (manual/offline are client-side only)
  rewrites: number;
}

export type ContactMethod = "sms_verified" | "whatsapp_pending" | "unverified";

export interface ReviewLogCreate {
  rating: number;
  dishes: string[];
  vibes: string[];
  ai_draft: string;
  final_text: string;
  draft_style: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  verification_id: string | null;
  client_id: string | null;
}

export interface ReviewLog {
  id: string;
  restaurant_id: string;
  rating: number;
  dishes: string[];
  vibes: string[];
  ai_draft: string;
  final_text: string;
  draft_style: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_method: ContactMethod | null;
  client_id: string | null;
  created_at: string;
}

export type FeedbackStatus = "new" | "resolved";

export interface CrmFeedbackCreate {
  rating: number;
  message: string;
  issues: string[];
  client_id: string | null;
  created_offline: boolean;
}

export interface CrmFeedback extends CrmFeedbackCreate {
  id: string;
  restaurant_id: string;
  status: FeedbackStatus;
  contact_name: string | null;
  contact_phone: string | null;
  created_at: string;
}

export interface DishCount {
  name: string;
  count: number;
}

export interface Analytics {
  total_reviews: number;
  total_visits: number;
  conversion_rate: number;
  top_dishes: DishCount[];
  open_feedback: number;
}

export interface OtpSendOut {
  sent: boolean;
  available: boolean;
  phone: string;
  demo_code: string | null; // only from the demo (mock) SMS adapter
}

export interface OtpCheckOut {
  verified: boolean;
  verification_id: string | null;
}

export interface WhatsappOut {
  link: string;
  code: string;
  verification_id: string;
}

export type RewardSource = "review" | "feedback" | "leaderboard";
export type GuestSource = "review" | "feedback";
export type WhatsappStatus = "sent" | "failed" | "not_configured";

export interface RewardClaimIn {
  name: string;
  phone: string;
  verification_id: string | null;
  source: GuestSource;
  ref_client_id: string | null;
  coins: number;
}

export interface RewardClaim {
  id: string;
  restaurant_id: string;
  code: string;
  title: string;
  details: string;
  source: RewardSource;
  contact_name: string | null;
  contact_phone: string;
  contact_method: ContactMethod;
  ref_client_id: string | null;
  expires_at: string;
  redeemed_at: string | null;
  week_start: string | null;
  whatsapp_status: WhatsappStatus | null;
  whatsapp_error: string | null;
  created_at: string;
}

export interface LeaderEntry {
  rank: number;
  name: string | null;
  phone: string;
  coins: number;
  runs: number;
}

export interface Leaderboard {
  week_start: string;
  week_end: string;
  weeks_ago: number;
  prize_title: string;
  entries: LeaderEntry[];
  award: RewardClaim | null;
}

export interface AwardIn {
  weeks_ago: number;
}

export interface SlugCheck {
  slug: string;
  available: boolean;
  current: boolean;
  reason: string | null;
  suggestions: string[];
}
