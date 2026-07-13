import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import AppError from './utils/AppError.js';

import authRouter from './routes/auth.routes.js';
import studentRouter from './routes/student.routes.js';
import clubRouter from './routes/club.routes.js';
import eventRouter from './routes/event.routes.js';
import announcementRouter from './routes/announcement.routes.js';
import registrationRouter from './routes/registration.routes.js';
import concurrencyLabRouter from './routes/concurrency-lab.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import queryOptimizerRouter from './routes/query-optimizer.routes.js';
import reportsRouter from './routes/reports.routes.js';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/students', studentRouter);
app.use('/api/clubs', clubRouter);
app.use('/api/events', eventRouter);
app.use('/api/announcements', announcementRouter);
app.use('/api/registrations', registrationRouter);
app.use('/api/concurrency-lab', concurrencyLabRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/admin', queryOptimizerRouter);
app.use('/api/reports', reportsRouter);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Catch-all route handler for 404
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler (4 arguments)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  res.status(statusCode).json({
    status,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export default app;
