
# Au Pair Connect - Backend API

A comprehensive backend API for connecting au pairs with host families worldwide, built with Express.js, TypeScript, Prisma, and Socket.io.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **User Profiles**: Separate profiles for au pairs and host families
- **Smart Matching**: Algorithm-based matching system
- **Real-time Messaging**: Socket.io powered chat system
- **Document Management**: File upload and verification system
- **Booking System**: Interview and consultation scheduling
- **Calendar Integration**: Availability management
- **Admin Panel**: User and document verification tools

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: SQLite (development), PostgreSQL (production)
- **ORM**: Prisma
- **Authentication**: JWT tokens
- **Real-time**: Socket.io
- **File Storage**: Supabase Storage
- **Email**: Nodemailer

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn

## 🔧 Installation & Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🌍 Environment Variables

Create a `.env` file in the backend directory:

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-url.com
DATABASE_URL="file:./dev.db"
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `GET /api/auth/me` - Get current user

### Users & Profiles
- `GET /api/users` - Get users (with filters)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `GET /api/profiles/au-pair/:id` - Get au pair profile
- `POST /api/profiles/au-pair` - Create au pair profile
- `PUT /api/profiles/au-pair/:id` - Update au pair profile
- `GET /api/profiles/host-family/:id` - Get host family profile
- `POST /api/profiles/host-family` - Create host family profile
- `PUT /api/profiles/host-family/:id` - Update host family profile

### Matching & Messages
- `GET /api/matches` - Get user matches
- `POST /api/matches` - Create match request
- `PUT /api/matches/:id` - Update match status
- `GET /api/messages` - Get conversations
- `GET /api/messages/:userId` - Get messages with user
- `POST /api/messages` - Send message

### Documents & Bookings
- `GET /api/documents` - Get user documents
- `POST /api/documents/upload` - Upload document
- `PUT /api/documents/:id/verify` - Verify document (admin)
- `GET /api/bookings` - Get bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id` - Update booking status

### Calendar & Admin
- `GET /api/calendar/availability` - Get availability
- `POST /api/calendar/availability` - Set availability
- `GET /api/admin/users` - Get all users (admin)
- `GET /api/admin/documents/pending` - Get pending documents (admin)

## 🔌 WebSocket Events

### Client to Server
- `send_message` - Send a message
- `mark_messages_read` - Mark messages as read

### Server to Client
- `message_sent` - Message sent confirmation
- `new_message` - Receive new message
- `messages_marked_read` - Messages marked as read
- `error` - Error notification

## 🚀 Deployment

This backend is optimized for deployment on Replit with the following configuration:

```bash
# Production deployment command
npm install && npx prisma generate && npx prisma db push && npm run build && npm start
```

The server runs on port 5000 and binds to `0.0.0.0` for external access.

## 🔒 Security Features

- Helmet.js for security headers
- CORS configuration
- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Role-based access control

## 📊 Database Schema

The database includes the following main entities:
- Users (authentication and basic info)
- Au Pair Profiles
- Host Family Profiles
- Matches
- Messages
- Documents
- Bookings
- Availability

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Database operations
npx prisma studio  # Open Prisma Studio
npx prisma migrate dev  # Run migrations
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
