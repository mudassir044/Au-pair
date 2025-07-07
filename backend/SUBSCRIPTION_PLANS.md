# 📦 Subscription Plans Implementation

## Overview

This implementation adds a comprehensive pricing and subscription plan system to the Au Pair ↔ Host Family platform with four plan types, role-specific durations, add-ons, and usage limits.

## 🔄 Database Schema Changes

### User Model Extensions

- `planType`: Enum ["FREE", "STANDARD", "PREMIUM", "VERIFIED"] (default: FREE)
- `planRole`: Enum ["FAMILY", "AU_PAIR"] (optional, auto-detected from user.role)
- `planExpiry`: DateTime (null for free/unlimited plans)
- `addOns`: String[] (e.g., ["boost", "early", "concierge"])

### New Enums

- `PlanType`: FREE, STANDARD, PREMIUM, VERIFIED
- `PlanRole`: FAMILY, AU_PAIR

## 🛠️ API Endpoints

### Plans Routes (`/api/plans/`)

#### `GET /api/plans/available`

Returns available plans and pricing information.

- **Auth**: Not required
- **Response**: Plans configuration and add-ons details

#### `POST /api/plans/upgrade`

Upgrades user to a paid plan.

- **Auth**: Required
- **Body**:
  ```json
  {
    "planType": "STANDARD|PREMIUM|VERIFIED",
    "role": "FAMILY|AU_PAIR",
    "addOns": ["boost", "early", "concierge"] // optional, only for PREMIUM/VERIFIED
  }
  ```
- **Features**:
  - Role and planType validation
  - Automatic duration calculation
  - Add-ons validation (only for premium plans)
  - Rate limiting (5 attempts per hour)
  - Comprehensive logging

#### `GET /api/plans/current`

Gets current user's plan information.

- **Auth**: Required
- **Response**: Plan details, expiry, add-ons, days remaining

### Admin Routes (`/api/admin/`)

#### `GET /api/admin/plans`

Lists all users with plan details and statistics.

- **Auth**: Admin required
- **Query params**: `planType`, `expired`, `page`, `limit`
- **Response**: Users with plan status, pagination, statistics

#### `PUT /api/admin/plans/:userId`

Admin-only plan modification.

- **Auth**: Admin required
- **Body**: `planType`, `planRole`, `addOns`, `daysToAdd`

#### `GET /api/admin/plans/analytics`

Plan usage analytics and revenue estimates.

- **Auth**: Admin required
- **Query params**: `range` (days)

## 🔒 Plan Limits Middleware

### `checkPlanLimits(options)`

Middleware that enforces plan limits based on user's current plan and role.

#### Usage:

```javascript
import { checkPlanLimits } from "../middleware/planLimits";

// Profile viewing limits
router.get(
  "/profiles/:userId",
  authenticate,
  checkPlanLimits({ action: "profileView" }),
  handler,
);

// Messaging limits
router.post(
  "/messages/send",
  authenticate,
  checkPlanLimits({ action: "message" }),
  handler,
);

// Contact request limits
router.post(
  "/matches/",
  authenticate,
  checkPlanLimits({ action: "contactRequest" }),
  handler,
);
```

### Plan Limits Configuration

| Plan Type | Role    | Profile Views | Messages/Day | Contact Requests |
| --------- | ------- | ------------- | ------------ | ---------------- |
| FREE      | FAMILY  | 10            | 5            | 3                |
| FREE      | AU_PAIR | 15            | 5            | 5                |
| STANDARD  | FAMILY  | 50            | 25           | 15               |
| STANDARD  | AU_PAIR | 75            | 25           | 20               |
| PREMIUM   | FAMILY  | Unlimited     | Unlimited    | Unlimited        |
| PREMIUM   | AU_PAIR | Unlimited     | Unlimited    | Unlimited        |
| VERIFIED  | FAMILY  | Unlimited     | Unlimited    | Unlimited        |
| VERIFIED  | AU_PAIR | Unlimited     | Unlimited    | Unlimited        |

## ⏰ Plan Durations

| Plan Type | Family Duration | Au Pair Duration |
| --------- | --------------- | ---------------- |
| STANDARD  | 7 days          | 30 days          |
| PREMIUM   | 7 days          | 30 days          |
| VERIFIED  | 365 days        | 365 days         |

## 🎯 Add-Ons (Premium/Verified only)

- **boost**: Profile Boost - Increase visibility by 5x ($9.99)
- **early**: Early Access - Get early access to new matches ($4.99)
- **concierge**: Concierge Service - Personal assistance ($19.99)

## 🔧 Implementation Features

### Security & Rate Limiting

- Rate limiting on upgrade attempts (5 per hour)
- Comprehensive input validation
- SQL injection protection via Prisma
- Authentication required for all sensitive operations

### Error Handling

- Detailed error messages with specific codes
- Development vs production error exposure
- Comprehensive logging for debugging

### Plan Expiry Handling

- Automatic downgrade to FREE when expired
- Grace period considerations
- Real-time expiry checking

### Usage Tracking

- Daily usage counters for limits
- Real-time usage validation
- Analytics for admin insights

## 📋 Database Migration

To apply the schema changes:

```bash
cd backend
npx prisma migrate dev --name add-subscription-plans
npx prisma generate
```

## 🧪 Testing

### Available Test Endpoints

1. **Public**: `GET /api/plans/available` - Test plan configuration
2. **Authenticated**: `POST /api/plans/upgrade` - Test plan upgrades
3. **Admin**: `GET /api/admin/plans` - Test admin functionality

### Plan Limits Testing

Try these actions with different plan types:

- View profiles (`GET /api/profiles/:userId`)
- Send messages (`POST /api/messages/send`)
- Create matches (`POST /api/matches/`)

## 🚀 Deployment Notes

1. **Environment Variables**: Ensure `DATABASE_URL` is configured for migrations
2. **Database Migration**: Run migrations in production after deployment
3. **Rate Limiting**: Consider Redis for distributed rate limiting in production
4. **Payment Integration**: This implementation provides the foundation for payment processor integration
5. **Analytics**: Usage data is tracked for business intelligence

## 🔮 Future Enhancements

1. **Payment Integration**: Stripe/PayPal integration for actual payments
2. **Usage Analytics**: Detailed usage tracking and reporting
3. **Plan Recommendations**: AI-driven plan upgrade suggestions
4. **Promotional Codes**: Discount and promo code system
5. **Enterprise Plans**: Custom plans for agencies
6. **Trial Periods**: Free trial implementations

## 📞 Support

The implementation includes comprehensive logging and error handling. Monitor these logs for:

- Plan upgrade attempts and failures
- Rate limiting violations
- Plan expiry events
- Usage limit violations

All endpoints follow RESTful conventions and return appropriate HTTP status codes for proper frontend integration.
