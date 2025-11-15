import { Router } from "express";

const router = Router();

const MOCK_PRODUCTS = [
  {
    id: 1,
    name: "Pro Carbon Paddle",
    sku: "P-PRO-CARBON",
    price: 129.99,
    total_sales: 184,
  },
  {
    id: 2,
    name: "Control Paddle Lite",
    sku: "P-CONTROL-LITE",
    price: 99.5,
    total_sales: 143,
  },
  {
    id: 3,
    name: "Tournament Ball Pack (12)",
    sku: "BALL-PACK-12",
    price: 34.99,
    total_sales: 310,
  },
  {
    id: 4,
    name: "Court Shoes – All Court",
    sku: "SHOES-AC",
    price: 89.0,
    total_sales: 76,
  },
  {
    id: 5,
    name: "Performance Tee",
    sku: "TEE-PERF",
    price: 29.99,
    total_sales: 210,
  },
];

router.get("/popular", (_req, res) => {
  res.json(MOCK_PRODUCTS);
});

export default router;