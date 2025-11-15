import { Router } from "express";

const router = Router();


const MOCK_CATEGORIES = [
  "Paddles",
  "Balls",
  "Apparel",
  "Shoes",
  "Accessories",
];

const MOCK_COUPONS = [
  "WELCOME10",
  "SUMMER-SALE",
  "BF-2024",
  "LOYALTY-VIP",
];

router.get("/categories", (_req, res) => {
  res.json(MOCK_CATEGORIES);
});

router.get("/coupons", (_req, res) => {
  res.json(MOCK_COUPONS);
});

export default router;