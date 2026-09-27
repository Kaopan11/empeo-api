import cors from "cors";
import express from "express";
import { supabase } from "./lib/supabase";
import type { Employee } from "./types";

const app = express();
const port = 4000;

app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/employees", async (_req, res) => {
  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, email, department")
    .overrideTypes<Employee[], { merge: false }>();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
