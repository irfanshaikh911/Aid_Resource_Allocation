import express from "express";
import cors from "cors";
import aiRoute from "./routes/aiRoute.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/ai", aiRoute); // MUST MATCH YOUR FRONTEND CALL

app.listen(5000, () => console.log("Backend running on port 5000"));
