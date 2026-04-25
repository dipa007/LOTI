import express from 'express';
import cors from 'cors';
import otpRoutes from './routes/otp.routes.js';
import deviceRoutes from './routes/device.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import { ApiError } from './utils/ApiError.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

app.use('/otp', otpRoutes);
app.use('/device', deviceRoutes);
app.use('/sms', deviceRoutes); 
app.use('/dashboard', dashboardRoutes);

app.use(express.static(path.join(__dirname, 'frontend', 'dist')));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: err.success,
            message: err.message,
            errors: err.errors,
            data: err.data
        });
    }

    // Fallback for unhandled/native errors
    console.error("[Unhandled Error]: ", err);
    return res.status(500).json({
        success: false,
        message: err.message || "Internal Server Error",
        errors: [],
        data: null
    });
})

export default app;