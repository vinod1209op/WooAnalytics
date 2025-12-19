import { app } from "./app";

const PORT = process.env.PORT || 3001;

// For local/server usage, start listening. On Vercel, the default export is used as the handler.
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`API running on port ${PORT}`));
}

export default app;
