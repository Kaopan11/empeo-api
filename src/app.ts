import cors from "cors";
import express from "express";

const app = express();
const port = 4000;

app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
