import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { config } from './config/database';
import { authRoutes } from './routes/authRoutes';
import { socialRoutes } from './routes/socialRoutes';
import { kolRoutes } from './routes/kolRoutes';
import { bookingRoutes } from './routes/booking';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty'
    } : undefined
  }
});

// Register Swagger
app.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'SoRe Backend API',
      description: 'Somnia Reputation Hub - X (Twitter) Social Activity Tracking API',
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@somnia-reputation-hub.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'X (Twitter) OAuth integration endpoints'
      },
      {
        name: 'Social Metrics',
        description: 'Social activity tracking and reputation scoring'
      },
      {
        name: 'Health',
        description: 'Health check endpoints'
      }
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        XStatus: {
          type: 'object',
          properties: {
            connected: { type: 'boolean' },
            username: { type: 'string', nullable: true },
            socialStats: {
              type: 'object',
              nullable: true,
              properties: {
                followers: { type: 'number' },
                totalPosts: { type: 'number' },
                totalLikes: { type: 'number' }
              }
            }
          }
        },
        SocialStats: {
          type: 'object',
          properties: {
            walletAddress: { type: 'string' },
            username: { type: 'string' },
            socialStats: {
              type: 'object',
              nullable: true,
              properties: {
                followers: { type: 'number' },
                totalPosts: { type: 'number' },
                totalLikes: { type: 'number' },
                lastUpdated: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        LeaderboardEntry: {
          type: 'object',
          properties: {
            rank: { type: 'number' },
            walletAddress: { type: 'string' },
            username: { type: 'string' },
            followers: { type: 'number' },
            totalPosts: { type: 'number' },
            totalLikes: { type: 'number' },
            pricePerSlot: { type: 'number' }
          }
        },
        ReputationData: {
          type: 'object',
          properties: {
            walletAddress: { type: 'string' },
            username: { type: 'string' },
            reputationScore: { type: 'number' },
            level: { type: 'string', enum: ['Bronze', 'Silver', 'Gold', 'Diamond'] },
            breakdown: {
              type: 'object',
              properties: {
                onChainScore: { type: 'number' },
                socialScore: { type: 'number' },
                holdingsScore: { type: 'number' },
                totalScore: { type: 'number' }
              }
            }
          }
        },
        RateLimitStatus: {
          type: 'object',
          properties: {
            canMakeRequest: { type: 'boolean' },
            remainingRequests: { type: 'number' },
            resetTime: { type: 'string', format: 'date-time' },
            resetTimeFormatted: { type: 'string' },
            recommendation: { type: 'string' }
          }
        }
      }
    }
  }
});

// Register Swagger UI
app.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  },
  uiHooks: {
    onRequest: function (request, reply, next) { next() },
    preHandler: function (request, reply, next) { next() }
  },
  staticCSP: true,
  transformStaticCSP: (header) => header
});

app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
});

app.register(cors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return cb(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://ce5cc6930102.ngrok-free.app', // Your current frontend ngrok URL
      // Allow any ngrok domain
      /^https:\/\/[a-z0-9]+\.ngrok-free\.app$/,
      /^https:\/\/[a-z0-9]+\.ngrok\.io$/,
      // Allow localhost.run domains
      /^https:\/\/[a-z0-9-]+\.localhost\.run$/,
    ];
    
    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      // For regex patterns
      return allowedOrigin.test(origin);
    });
    
    if (isAllowed) {
      cb(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
});

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// Register cookie support (required for session)
app.register(cookie);

// Register session support
app.register(session, {
  secret: process.env.SESSION_SECRET || 'a-secret-with-minimum-length-of-32-characters',
  cookie: { 
    secure: true, // Set to true for HTTPS (ngrok)
    sameSite: 'none', // Allow cross-site cookies for ngrok
    domain: '.ngrok-free.app', // Share cookies across ngrok subdomains
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
});

// Register routes
app.register(authRoutes, { prefix: '/auth' });
app.register(socialRoutes, { prefix: '/social' });
app.register(kolRoutes, { prefix: '/api' });
app.register(bookingRoutes, { prefix: '/api' });

app.get('/health', {
  schema: {
    tags: ['Health'],
    summary: 'Health check',
    description: 'Returns the health status of the API server',
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
}, async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

export { app };