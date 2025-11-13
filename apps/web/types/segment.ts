export interface SegmentPoint {
  segment: string;    // e.g. "Champions"
  customers: number;  // number of customers in this segment
  revenue: number;     // total revenue from this segment
  avgValue: number;    // avg revenue per customer
}
