export type RfmRow = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  last_order_date: string; 
  recency_days: number;
  frequency: number;
  monetary: number;
};