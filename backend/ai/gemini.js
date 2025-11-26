import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

router.post("/analyze", async (req, res) => {
  const { clusters, inventory } = req.body;

  const prompt = `
You are an AI for a flood-relief resource allocation system.
You must analyze the incoming clusters and inventory and recommend the BEST possible allocation.

Input:
CLUSTERS = ${JSON.stringify(clusters, null, 2)}
INVENTORY = ${JSON.stringify(inventory, null, 2)}

Your job:
- Calculate required food kits, medical kits, blankets, boats for each cluster.
- Prioritize clusters based on number of people + severity.
- Check inventory shortages.
- Allocate resources in an OPTIMAL and FAIR way.
- NEVER exceed available inventory.
- Return ONLY JSON format.

Output JSON format:
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
      "reason": "High population + limited access"
    }
  ],
  "shortage_warning": "...",
  "summary": "..."
}
`;

  try {
    const result = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await result.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return res.json(JSON.parse(text));
  } catch (error) {
    console.error("Gemini Error:", error);
    return res.status(500).json({ error: "Gemini failed to generate allocation" });
  }
});

export default router;
