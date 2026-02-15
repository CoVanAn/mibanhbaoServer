# 🚀 Quick Start Guide

## Installation

```bash
# Install dependencies
npm install
```

## Environment Setup

Create `.env` file:

```env
# Server
PORT=4000
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/mibahnbao"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Session Secret
SESSION_SECRET="your-super-secret-session-key-change-in-production"

# Client URLs (for CORS)
CLIENT_URL="http://localhost:3000"
ADMIN_URL="http://localhost:5173"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="http://localhost:4000/auth/google/callback"

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

## Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database
npx prisma db seed
```

## Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:4000`

## Verify Installation

Open your browser and go to:

- **Health Check**: http://localhost:4000/health
- **API Root**: http://localhost:4000/

You should see:

```json
{
  "status": "healthy",
  "timestamp": "2026-02-12T...",
  "uptime": 1.234
}
```

## Available Scripts

```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm test             # Run tests (when configured)
```

## API Endpoints

### Public Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `GET /api/product/list` - List all products
- `GET /api/product/:id` - Get product details
- `GET /api/category/list` - List all categories

### Protected Endpoints (require authentication)

- `POST /api/product/add` - Create product (Admin only)
- `PUT /api/product/:id` - Update product (Admin only)
- `DELETE /api/product/:id` - Delete product (Admin only)
- `GET /api/cart` - Get user cart
- `POST /api/cart/add` - Add item to cart
- `GET /api/user/profile` - Get user profile

### Authentication

- `POST /api/user/register` - Register new user
- `POST /api/user/login` - Login
- `GET /auth/google` - Google OAuth login

## Project Structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed project structure.

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
```

## Troubleshooting

### Port already in use

```bash
# Change PORT in .env file or
PORT=5000 npm run dev
```

### Database connection error

- Check DATABASE_URL in .env
- Ensure PostgreSQL is running
- Run `npx prisma migrate dev`

### Module not found errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. ✅ Server is running
2. 📖 Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the structure
3. 🔄 Follow [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) to refactor existing code
4. 🧪 Write tests (see [tests/README.md](./tests/README.md))
5. 📚 Add API documentation (Swagger)

## Support

For issues or questions, check:

- Project documentation
- Prisma docs: https://www.prisma.io/docs
- Express docs: https://expressjs.com/

---

Happy coding! 🎉
