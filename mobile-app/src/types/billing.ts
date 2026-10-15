// Demo commerce types (fees are integer paise, INR only). No money is collected and no access is granted.

export interface CoursePrice {
  id: string;
  title: string;
  slug: string;
  marked_price_paise: number;
  discount_percentage: number;
  discount_paise: number;
  total_paise: number;
  currency: string;
}

export type OrderStatus = 'pending' | 'demo_completed' | 'cancelled';

export interface DemoOrder {
  id: string;
  user_id: string;
  course_id: string;
  course_title: string;
  buyer_name: string;
  buyer_email: string;
  marked_price_paise: number;
  discount_bps: number;
  discount_paise: number;
  total_paise: number;
  status: OrderStatus;
  created_at: string;
  expires_at: string;
  checkout_url: string;
  invoice_url?: string;
  notice?: string;
  demo: true;
}

export type DemoCheckoutAction = 'complete_demo' | 'cancel';
