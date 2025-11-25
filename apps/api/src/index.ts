import express, { Request, Response } from 'express';
import cors from "cors";
import morgan from "morgan";

import storesRouter from './routes/stores';
import kpisRouter from "./routes/kpis";
import salesRouter from "./routes/sales";
import metaRouter from "./routes/meta";
import productsRouter from "./routes/products";
import segmentsRouter from "./routes/segments";
import rfmRouter from "./routes/rfm";
import categoriesRouter from "./routes/categories";
import ordersRouter from "./routes/orders";
import analyticsRouter from "./routes/analytics";
import { request } from 'node:http';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// health
app.get("/health", (req: Request, res: Response ) => {
  res.json({ status: "ok" });
});

// mount your clean routes
app.use('/stores', storesRouter);
app.use("/kpis", kpisRouter);
app.use("/sales", salesRouter);
app.use("/meta", metaRouter);
app.use("/products", productsRouter);
app.use("/segments", segmentsRouter);
app.use("/rfm", rfmRouter);
app.use("/categories", categoriesRouter);
app.use("/orders", ordersRouter);
app.use("/analytics", analyticsRouter);

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
