import express from "express";
import cors from "cors";
import morgan from "morgan";

import kpisRouter from "./routes/kpis";
import salesRouter from "./routes/sales";
import metaRouter from "./routes/meta";
import productsRouter from "./routes/products";
import segmentsRouter from "./routes/segments";
import rfmRouter from "./routes/rfm";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// health
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// mount your clean routes
app.use("/api/kpis", kpisRouter);
app.use("/api/sales", salesRouter);
app.use("/api/meta", metaRouter);
app.use("/api/products", productsRouter);
app.use("/api/segments", segmentsRouter);
app.use("/api/rfm", rfmRouter);

app.listen(PORT, () => console.log(`API running on port ${PORT}`));