# SoRe Backend

Backend API built with Node.js, TypeScript, Fastify, and PostgreSQL.

## Tech Stack

- Node.js + TypeScript
- Fastify web framework
- PostgreSQL database
- Yarn package manager

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd SoRe-backend
```

2. Install dependencies
```bash
yarn install
```

3. Set up environment variables
```bash
cp .env.example .env
```

Edit the .env file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sore_db
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3000
```

4. Start development server
```bash
yarn dev
```

## Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn clean` - Remove build files

## Project Structure

```
src/
  config/         - Database configuration
  controllers/    - Request handlers
  services/       - Business logic
  models/         - Data models
  routes/         - API routes
  middleware/     - Custom middleware
  types/          - TypeScript types
  utils/          - Helper functions
  app.ts          - Fastify app setup
  server.ts       - Server entry point
```

## Features

- CORS support
- Security headers (Helmet)
- Rate limiting
- PostgreSQL connection pool
- TypeScript with strict mode
- Hot reload in development
- Structured logging

## API Endpoints

### Health Check
```
GET /health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```


## Development

- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
- Use kebab-case for file names
- Add TypeScript types for all functions
- Use parameterized queries for database operations

## License

MIT