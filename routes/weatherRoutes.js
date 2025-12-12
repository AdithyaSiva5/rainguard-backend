import express from "express";
import { getForecast, getRiskAnalysis, getRecommendations, getWeather, checkParametricTrigger, getAgentResponse } from "../controllers/weatherController.js";
const router = express.Router();

// Core WeatherShield endpoints
router.get("/forecast", getForecast); // GET /api/weathershield/forecast?lat=28.5&lon=-81.4
router.get("/risk", getRiskAnalysis); // GET /api/weathershield/risk?lat=28.5&lon=-81.4&days=7
router.post("/recommendations", getRecommendations); // POST { riskData, region }

// Legacy RainGuard (keep for fallback)
router.get("/current", getWeather);
router.post("/trigger", checkParametricTrigger);
router.post("/agent", getAgentResponse);

export default router;