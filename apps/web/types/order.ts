export interface RecentOrder {
  id: number;
  date: string; // ISO string
  status: string;
  total: number;
  customer: string;
}
