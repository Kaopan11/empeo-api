import cors from "cors";
import express from "express";
import { registerRoutes } from "./routes";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());
registerRoutes(app);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
