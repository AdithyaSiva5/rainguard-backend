import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import weatherRoutes from "./routes/weatherRoutes.js";
import motorRoutes from "./routes/motorRoutes.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/weathershield", weatherRoutes);
app.use('/api/motor', motorRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`WeatherShield AI Server: Locked and loaded on port ${PORT}`));