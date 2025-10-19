const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const globalErrorHandler = require('./middleware/errorHandler');

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

app.use('/uploads', express.static('uploads'));

// Global Middlewares

// Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());
// Data sanitization against XSS
app.use(xss());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:8080',
      'https://tabitha-home.netlify.app',
      'https://tabitha-home.vercel.app',
      'https://tabitha-frontend-rho.vercel.app',
      // include the preview domain seen in your logs so deployed preview can call API
      'https://tabitha-frontend-al866bbnj-damilare-israels-projects.vercel.app'
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
    // Allow matching host patterns for preview deployments (vercel/netlify)
    const allowedPatterns = [/\.vercel\.app$/, /\.netlify\.app$/];

    const isAllowedByList = allowedOrigins.includes(origin);
    const isAllowedByPattern = allowedPatterns.some((p) => p.test(origin));

    if (isAllowedByList || isAllowedByPattern) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
};

// Use CORS with the configured options and also handle preflight requests explicitly
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/children', require('./routes/children'));
app.use('/api/v1/staff', require('./routes/staff'));
app.use('/api/v1/reports', require('./routes/reports'));
app.use('/api/v1/uploads', require('./routes/uploads'));
app.use('/api/v1/dashboard', require('./routes/dashboard'));


app.get('/', (req, res) => {
  res.send('Welcome to the Tabitha Home API 🚀');
});

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Tabitha Home API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Handle unhandled routes
app.all('*', (req, res, next) => {
  const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  err.status = 'fail';
  err.statusCode = 404;
  err.isOperational = true;
  next(err);
});

// Global error handling middleware
app.use(globalErrorHandler);

module.exports = app;
