// Hand-written mirrors of backend/models/review.py — keep in sync.

export interface AppConfig {
  restaurant_name: string;
  location: string;
  google_place_id: string;
  google_review_url: string;
}

export interface PetpoojaOrderItem {
  itemid: string;
  itemname: string;
  category: string;
}

export interface PetpoojaOrder {
  petpooja_order_id: string;
  restaurant_name: string;
  location: string;
  order_items: PetpoojaOrderItem[];
}

export interface CrmFeedbackCreate {
  rating: number;
  message: string;
  issues: string[];
  order_id: string | null;
  client_id: string | null;
  created_offline: boolean;
}

export interface CrmFeedback extends CrmFeedbackCreate {
  id: string;
  status: string;
  created_at: string;
}

export interface DraftRequest {
  rating: number;
  tags: string[];
  note: string;
  dishes: string[];
  order_id: string | null;
}

export interface DraftResponse {
  option_1: string;
  option_2: string;
  option_3: string;
  source: string; // "ai" | "offline"
}

export interface TagCategory {
  id: string;
  title: string;
  tags: string[];
}
