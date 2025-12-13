// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import weatherRoutes from "./routes/weatherRoutes.js";
import motorRoutes from "./routes/motorRoutes.js";
import multer from "multer";
import nutridriveRoutes from "./routes/nutridriveRoutes.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/weathershield", weatherRoutes);
app.use('/api/motor', motorRoutes);

// Multer for file uploads (store in memory for simplicity)
const upload = multer({ storage: multer.memoryStorage() });
app.use(upload.any());

app.use("/api/nutridrive", nutridriveRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`NutriDrive AI Server: Ready to optimize habits on port ${PORT}`));