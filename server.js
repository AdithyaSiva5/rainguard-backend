// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import motorRoutes from "./routes/motorRoutes.js";
import multer from "multer";
import nutridriveRoutes from "./routes/nutridriveRoutes.js";
import predictedDisaster from "./routes/predictedDisasters.js";

dotenv.config();
const app = express();
app.use(cors({}));
app.use(express.json());
app.use('/api/motor', motorRoutes);

// Multer for file uploads (store in memory for simplicity)
const upload = multer({ storage: multer.memoryStorage() });
app.use(upload.any());

app.use("/api/nutridrive", nutridriveRoutes);
app.use('/api/disaster', predictedDisaster)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NutriDrive AI Server: Ready to optimize habits on port ${PORT}`));