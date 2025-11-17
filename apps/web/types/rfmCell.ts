export type RfmHeatmapCell = {
  rScore: number;      // 1–5 (5 = most recent)
  fScore: number;      // 1–5 (5 = most frequent)
  count: number;       // customers in this cell
  totalMonetary: number;
  avgMonetary: number;
};