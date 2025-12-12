// rainguard-backend/routes/weatherRoutes.js
import express from "express";
import { getWeather, checkParametricTrigger, getAgentResponse } from "../controllers/weatherController.js";

const router = express.Router();

router.get("/current", getWeather);                    // GET /api/weather/current?lat=12.97&lon=77.59
router.post("/trigger", checkParametricTrigger);       // POST body: { lat, lon, coverageAmount, rainThresholdMm }
router.post("/agent", getAgentResponse);               // POST body: { message, weatherData, userPolicy }

export default router;