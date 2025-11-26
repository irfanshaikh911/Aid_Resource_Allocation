import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// IMPORTANT: route must be /analyze
router.post("/analyze", async (req, res) => {
  const { clusters, inventory } = req.body;

  const prompt = `
You are an AI for a flood-relief resource allocation system.
Analyze clusters + inventory and generate the BEST resource allocation.

Input:
CLUSTERS = ${JSON.stringify(clusters, null, 2)}
INVENTORY = ${JSON.stringify(inventory, null, 2)}

Output STRICT JSON:
{
  "priority": [],
  "allocation": [],
  "shortage": [],
  "prediction": {},
  "summary": "..."
}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();

    // Full Gemini response → text result
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    // Some gemini responses include ```json ... ``` → clean them
    const cleaned = text.replace(/```json|```/g, "").trim();

    return res.json({ ai: JSON.parse(cleaned) });

  } catch (error) {
    console.error("Gemini Error:", error);
    return res.status(500).json({ error: "Gemini failed to generate insights" });
  }
});

export default router;
