// routes/nutridriveRoutes.js
import express from "express";
import {
  uploadMeal,
  uploadCheckup,
  recommendFood,
  getLackingInsights,
  getChatResponse,
  uploadDrivingData,
  getRiskSummary,
  uploadDrivingJson
} from "../controllers/nutridriveController.js";

const router = express.Router();

// Diet APIs
router.post("/upload-meal", uploadMeal); // POST with file 'image' and body 'time'
router.post("/upload-checkup", uploadCheckup); // POST with file 'pdf'
router.get("/recommend-food", recommendFood);
router.get("/lacking-insights", getLackingInsights);
router.post("/chat", getChatResponse);

// Driving APIs
router.post("/upload-driving-data", uploadDrivingData);
router.post("/upload-driving-json", uploadDrivingJson);
// Summary
router.get("/risk-summary", getRiskSummary);

export default router;