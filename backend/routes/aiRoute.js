import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

router.post("/analyze", async (req, res) => {
  const { clusters, inventory } = req.body;

  const prompt = `
You are an AI for a flood-relief resource allocation system.
Analyze the clusters and inventory and generate the optimal resource allocation.

INPUT:
CLUSTERS = ${JSON.stringify(clusters, null, 2)}
INVENTORY = ${JSON.stringify(inventory, null, 2)}

OUTPUT RULES:
- Return ONLY JSON
- No extra text
- Don't exceed inventory limits
- Provide the following keys:
{
  "allocation": [
    {
      "cluster": "C1",
      "people": 50,
      "send_food_kits": 40,
      "send_medical_kits": 12,
      "send_blankets": 55,
      "send_boats": 2,
      "priority": "High",
      "reason": "High density and limited access"
    }
  ],
  "shortage_warning": "text",
  "summary": "text"
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
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return res.json(JSON.parse(aiText));
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return res.status(500).json({ error: "Gemini AI failed" });
  }
});

export default router;
