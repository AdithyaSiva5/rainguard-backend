// controllers/nutridriveController.js
import { Groq } from "groq-sdk";
import pdfParse from "pdf-parse";
import 'dotenv/config';

const GROQ_KEY = process.env.GROQ_API_KEY;
if (!GROQ_KEY) console.error("🚨 GROQ_API_KEY missing from .env");

const groq = GROQ_KEY ? new Groq({ apiKey: GROQ_KEY }) : null;

// In-memory storage for demo (reset on restart)
let userData = {
  meals: [], // { time: string, analysis: {calories, protein, sugar, fiber, satFat, ultraProcessed, score} }
  checkups: [], // { bmi, cholesterol, bodyWeightKg, ... }
  driving: [] // { speed: [], brakes: number, miles: number, nightDrivesPct: number, score }
};

// Helper to calculate diet score
const calculateDietScore = (analysis, time, bodyWeightKg = 70) => { // Default weight if no checkup
  let score = 100;

  // Protein: 0.8–1g/kg → 100; below/above penalize linearly
  const idealProteinMin = 0.8 * bodyWeightKg;
  const idealProteinMax = 1 * bodyWeightKg;
  const protein = analysis.protein || 0;
  if (protein < idealProteinMin) score -= ((idealProteinMin - protein) / idealProteinMin) * 20;
  if (protein > idealProteinMax) score -= ((protein - idealProteinMax) / idealProteinMax) * 10;

  // Sugar: <25g → 100; -4pts per extra g
  const sugar = analysis.sugar || 0;
  if (sugar > 25) score -= (sugar - 25) * 4;

  // Fiber: >25g → linear to 100
  const fiber = analysis.fiber || 0;
  if (fiber < 25) score -= ((25 - fiber) / 25) * 20;

  // Sat fat: <10% of calories → penalize if over
  const satFat = analysis.satFat || 0;
  const calories = analysis.calories || 2000;
  const satFatPct = (satFat * 9 / calories) * 100; // Approx, fat cal = 9/g
  if (satFatPct > 10) score -= (satFatPct - 10) * 2;

  // Ultra-processed: heavy penalty
  if (analysis.ultraProcessed) score -= 50;

  // Late-night: >21:00 → -20
  const hour = parseInt(time.split(':')[0]);
  if (hour > 21) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
};

// Helper for overall health score (average meals + checkup factors)
const getOverallHealthScore = () => {
  if (userData.meals.length === 0) return 50;
  const avgMealScore = userData.meals.reduce((sum, m) => sum + m.score, 0) / userData.meals.length;
  let checkupBonus = 0;
  if (userData.checkups.length > 0) {
    const latest = userData.checkups[userData.checkups.length - 1];
    if (latest.bmi < 25) checkupBonus += 10;
    if (latest.cholesterol < 200) checkupBonus += 10;
  }
  return Math.round(avgMealScore + checkupBonus);
};

// Helper for driving score
const calculateDrivingScore = (data) => {
  let score = 100;

  // Speed >80mph → -pts (assume avg speed)
  const avgSpeed = data.speed.reduce((sum, s) => sum + s, 0) / data.speed.length;
  if (avgSpeed > 80) score -= (avgSpeed - 80) * 2;

  // Harsh brakes >5/day → -pts
  if (data.brakes > 5) score -= (data.brakes - 5) * 5;

  // Night drives >30% → -10
  if (data.nightDrivesPct > 30) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
};

// 1. Upload Meal (image + time)
export const uploadMeal = async (req, res) => {
  try {
    if (!groq) return res.status(500).json({ error: "Groq not initialized" });
    const image = req.files.find(f => f.mimetype.startsWith('image/'));
    const time = req.body.time;
    if (!image || !time) return res.status(400).json({ error: "Missing image or time" });

    const base64Image = image.buffer.toString('base64');
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this meal: extract calories, protein g, sugar g, fiber g, saturated fat g, is ultra-processed? (yes/no)" },
            { type: "vision_url", vision_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ],
      model: "llava-v1.5-7b-4096-preview",
      temperature: 0.5,
      max_tokens: 300
    });

    const analysisStr = completion.choices[0]?.message?.content || "{}";
    const analysis = JSON.parse(analysisStr); // Assume AI outputs JSON

    const bodyWeightKg = userData.checkups.length > 0 ? userData.checkups[userData.checkups.length - 1].bodyWeightKg : 70;
    const score = calculateDietScore(analysis, time, bodyWeightKg);
    const meal = { time, analysis, score };
    userData.meals.push(meal);

    res.json({ analysis, score, message: "Meal uploaded and scored!" });
  } catch (error) {
    console.error("Meal Upload Error:", error.message);
    res.status(500).json({ error: "Meal analysis failed" });
  }
};

// 2. Upload Checkup (PDF)
export const uploadCheckup = async (req, res) => {
  try {
    if (!groq) return res.status(500).json({ error: "Groq not initialized" });
    const pdfFile = req.files.find(f => f.mimetype === 'application/pdf');
    if (!pdfFile) return res.status(400).json({ error: "Missing PDF" });

    const pdfData = await pdfParse(pdfFile.buffer);
    const text = pdfData.text;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Extract from checkup text: BMI, cholesterol mg/dL, body weight kg" },
        { role: "user", content: text }
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.5,
      max_tokens: 200
    });

    const extractStr = completion.choices[0]?.message?.content || "{}";
    const extract = JSON.parse(extractStr); // Assume JSON output
    userData.checkups.push(extract);

    res.json({ extract, message: "Checkup uploaded and parsed!" });
  } catch (error) {
    console.error("Checkup Upload Error:", error.message);
    res.status(500).json({ error: "Checkup analysis failed" });
  }
};

// 3. Recommend Food (daily plan)
export const recommendFood = async (req, res) => {
  try {
    if (!groq) return res.status(500).json({ error: "Groq not initialized" });
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are NutriDrive AI - friendly nutrition coach. Generate a daily meal plan: Breakfast, Lunch, Dinner, Snacks. Focus on balanced macros, low sugar, high fiber." },
        { role: "user", content: "Generate daily plan" }
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.7,
      max_tokens: 400
    });

    const plan = completion.choices[0]?.message?.content || "Default plan: Oatmeal, Salad, Grilled chicken.";
    res.json({ plan });
  } catch (error) {
    console.error("Recommend Error:", error.message);
    res.status(500).json({ error: "Recommendation failed" });
  }
};

// 4. Lacking Insights
export const getLackingInsights = (req, res) => {
  if (userData.meals.length === 0) return res.json({ insights: "No data yet - upload meals!" });

  const avgSugar = userData.meals.reduce((sum, m) => sum + (m.analysis.sugar || 0), 0) / userData.meals.length;
  const avgFiber = userData.meals.reduce((sum, m) => sum + (m.analysis.fiber || 0), 0) / userData.meals.length;
  const lateNights = userData.meals.filter(m => parseInt(m.time.split(':')[0]) > 21).length;

  const insights = `You're low on fiber (${avgFiber.toFixed(1)}g vs 25g goal) – Add veggies. Late nights: ${lateNights}. You're doing great on protein though! 💪`;
  res.json({ insights });
};

// 5. Chat Agent
export const getChatResponse = async (req, res) => {
  try {
    const { message } = req.body;
    if (!groq) return res.status(500).json({ error: "Groq not initialized" });
    const healthScore = getOverallHealthScore();
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: `You are NutriDrive AI - friendly, motivational. Health score: ${healthScore}. Talk nicely on improvements.` },
        { role: "user", content: message || "How can I improve?" }
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.7,
      max_tokens: 200
    });

    const reply = completion.choices[0]?.message?.content || "Let's boost that score!";
    res.json({ reply });
  } catch (error) {
    console.error("Chat Error:", error.message);
    res.status(500).json({ error: "Chat failed" });
  }
};

// 6. Upload Driving Data
export const uploadDrivingData = (req, res) => {
  const data = req.body;
  if (!data.speed || !data.brakes || !data.miles || data.nightDrivesPct === undefined) {
    return res.status(400).json({ error: "Invalid driving data" });
  }

  const score = calculateDrivingScore(data);
  userData.driving.push({ ...data, score });

  res.json({ score, insights: `78/100 – Mild recklessness: Slow down. Safe drivers save 15% on premiums!` });
};

// 7. Risk Summary
export const getRiskSummary = (req, res) => {
  const healthScore = getOverallHealthScore();
  const drivingScore = userData.driving.length > 0 ? userData.driving[userData.driving.length - 1].score : 50;
  const overall = Math.round((healthScore + drivingScore) / 2);
  res.json({ health: healthScore, driving: drivingScore, overall, message: `Overall low risk → Premium discount?` });
};