# 🚀 Complete Setup Guide for Au-Pair Backend

## Prerequisites

1. Node.js 18+ installed
2. npm or yarn package manager
3. A Supabase account and project

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/login and create a new project
3. Wait for project to be ready
4. Note down your project URL and keys

### 1.2 Get Supabase Keys

From your Supabase dashboard:

- **Project URL**: Found in Settings > API
- **Anon Key**: Found in Settings > API
- **Service Role Key**: Found in Settings > API (⚠️ Keep this secret!)

### 1.3 Create Database Tables

Run this SQL in your Supabase SQL Editor to create the required tables:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('AU_PAIR', 'HOST_FAMILY', 'ADMIN');
CREATE TYPE plan_type AS ENUM ('FREE', 'STANDARD', 'PREMIUM', 'VERIFIED');
CREATE TYPE plan_role AS ENUM ('FAMILY', 'AU_PAIR');
CREATE TYPE match_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE document_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE document_type AS ENUM ('ID', 'PASSPORT', 'VISA', 'PROFILE_PHOTO');
CREATE TYPE booking_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role user_role NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "isEmailVerified" BOOLEAN DEFAULT false,
  "emailVerifyToken" TEXT,
  "resetPasswordToken" TEXT,
  "resetPasswordExpires" TIMESTAMP,
  "lastLogin" TIMESTAMP,
  "preferredlanguage" TEXT DEFAULT 'en',
  "profilecompleted" BOOLEAN DEFAULT false,
  "planType" plan_type DEFAULT 'FREE',
  "planRole" plan_role,
  "planExpiry" TIMESTAMP,
  "addOns" TEXT DEFAULT '[]',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Au pair profiles table
CREATE TABLE au_pair_profiles (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  "firstName" TEXT NOT NULL DEFAULT '',
  "lastName" TEXT NOT NULL DEFAULT '',
  "dateOfBirth" TIMESTAMP NOT NULL DEFAULT '2000-01-01',
  bio TEXT,
  languages TEXT, -- JSON string array
  skills TEXT, -- JSON string array
  experience TEXT,
  education TEXT,
  "videoUrl" TEXT,
  "preferredCountries" TEXT, -- JSON string array
  "hourlyRate" DECIMAL,
  currency TEXT DEFAULT 'USD',
  "availableFrom" TIMESTAMP,
  "availableTo" TIMESTAMP,
  "profilePhotoUrl" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Host family profiles table
CREATE TABLE host_family_profiles (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  "familyName" TEXT NOT NULL DEFAULT '',
  "contactPersonName" TEXT NOT NULL DEFAULT '',
  bio TEXT,
  location TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  "numberOfChildren" INTEGER NOT NULL DEFAULT 0,
  "childrenAges" TEXT, -- JSON string array
  requirements TEXT,
  "preferredLanguages" TEXT, -- JSON string array
  "maxBudget" DECIMAL,
  currency TEXT DEFAULT 'USD',
  "profilePhotoUrl" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "hostId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "auPairId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "matchScore" DECIMAL DEFAULT 0,
  status match_status DEFAULT 'PENDING',
  "initiatedBy" user_role,
  notes TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("hostId", "auPairId")
);

-- Messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "senderId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "receiverId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  "isRead" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  type document_type,
  status document_status DEFAULT 'PENDING',
  filename TEXT,
  "originalName" TEXT,
  url TEXT,
  "uploadedAt" TIMESTAMP DEFAULT NOW(),
  "verifiedAt" TIMESTAMP,
  "verifiedBy" TEXT,
  notes TEXT
);

-- Availability table
CREATE TABLE availability (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  date TIMESTAMP,
  "startTime" TEXT,
  "endTime" TEXT,
  timezone TEXT DEFAULT 'UTC',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "auPairId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "hostId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "receiverId" TEXT,
  "requesterId" TEXT,
  "startDate" TIMESTAMP,
  "endDate" TIMESTAMP,
  "scheduledDate" TIMESTAMP,
  "totalHours" DECIMAL,
  "hourlyRate" DECIMAL,
  "totalAmount" DECIMAL,
  currency TEXT DEFAULT 'USD',
  status booking_status DEFAULT 'PENDING',
  notes TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_matches_host ON matches("hostId");
CREATE INDEX idx_matches_aupair ON matches("auPairId");
CREATE INDEX idx_messages_sender ON messages("senderId");
CREATE INDEX idx_messages_receiver ON messages("receiverId");
```

## Step 2: Backend Configuration

### 2.1 Install Dependencies

```bash
cd backend
npm install
```

### 2.2 Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Supabase Configuration
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# JWT Configuration (Generate random strings)
JWT_ACCESS_SECRET="your_super_secret_jwt_access_key_here"
JWT_REFRESH_SECRET="your_super_secret_jwt_refresh_key_here"

# Email Configuration (Optional)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
EMAIL_FROM="Au Pair Service <noreply@aupair.com>"

# Application Configuration
NODE_ENV="development"
PORT="5000"
FRONTEND_URL="http://localhost:3000"
```

### 2.3 Generate JWT Secrets

Use Node.js to generate secure secrets:

```bash
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

## Step 3: Start the Server

### 3.1 Build and Start

```bash
npm run build
npm run dev
```

### 3.2 Verify Setup

1. Check console logs for service connections
2. Visit `http://localhost:5000/health` to check system status
3. Look for these success messages:
   - ✅ Supabase database connection successful
   - ✅ Email service connection verified
   - 🚀 Au-pair backend server running on port 5000

## Step 4: Test the API

### 4.1 Health Check

```bash
curl http://localhost:5000/health
```

### 4.2 Test Registration

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","role":"AU_PAIR"}'
```

### 4.3 Test Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Available API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Profiles

- `GET /api/profiles/completion` - Get profile completion status
- `GET /api/profiles/me` - Get user profile
- `PUT /api/profiles/me` - Update user profile

### Users & Discovery

- `GET /api/users/search` - Search for potential matches
- `GET /api/users/:userId` - Get user profile by ID
- `GET /api/users/recommendations/for-me` - Get recommended users

### Matches

- `GET /api/matches` - Get all matches
- `GET /api/matches/recent` - Get recent matches
- `POST /api/matches` - Create a match request
- `PUT /api/matches/:matchId` - Update match status

### Messages

- `GET /api/messages/conversations` - Get conversations list
- `GET /api/messages/with/:userId` - Get messages with specific user
- `POST /api/messages` - Send a message
- `PUT /api/messages/read` - Mark messages as read

### Dashboard

- `GET /api/dashboard/stats` - Get dashboard statistics

### System

- `GET /health` - System health check

## Real-time Features

The backend includes Socket.io for real-time messaging:

- Private messaging between users
- Typing indicators
- Read receipts
- Online status
- Match notifications

## Troubleshooting

### Common Issues

1. **"supabaseKey is required" error**
   - Make sure your `.env` file has the correct Supabase keys
   - Check that `.env` is in the backend directory

2. **Database connection failed**
   - Verify your Supabase project is active
   - Check your database URL and service role key
   - Make sure you've created the database tables

3. **Email service connection failed**
   - This is optional for development
   - The system will continue to work without email

4. **JWT token errors**
   - Make sure JWT_ACCESS_SECRET is set in .env
   - Generate a new random secret if needed

### Development vs Production

For production deployment:

1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure proper SMTP email service
4. Set correct `FRONTEND_URL`
5. Enable HTTPS

## Next Steps

1. Set up your frontend to connect to these APIs
2. Test user registration and login flows
3. Test the matching and messaging systems
4. Configure email service for production
5. Deploy to your hosting platform

Your au-pair backend is now fully functional with:

- ✅ User authentication and profiles
- ✅ User discovery and matching
- ✅ Real-time messaging
- ✅ Dashboard statistics
- ✅ Complete API for frontend integration

Au pairs and families can now register, find each other, and start connecting! 🎉
