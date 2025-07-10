import express from 'express';
import { supabase } from '../utils/supabase';
import { verifyEmailConnection } from '../utils/email';

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'unknown',
      uptime: process.uptime(),
      timestamp: Date.now(),
      services: {
        database: { status: 'unknown' as string, error?: string },
        email: { status: 'unknown' as string, error?: string }
      }
    };

    // Check database connection
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      health.services.database.status = error ? 'error' : 'ok';
      if (error) health.services.database.error = error.message;
    } catch (dbError: any) {
      health.services.database.status = 'error';
      health.services.database.error = dbError.message;
    }

    // Check email service
    try {
      const emailConnected = await verifyEmailConnection();
      health.services.email.status = emailConnected ? 'ok' : 'error';
    } catch (emailError: any) {
      health.services.email.status = 'error';
      health.services.email.error = emailError.message;
    }

    // Determine overall status
    const allOk = Object.values(health.services).every(service => service.status === 'ok');
    health.status = allOk ? 'ok' : 'degraded';
    const httpStatus = allOk ? 200 : 503;

    return res.status(httpStatus).json(health);

  } catch (error: any) {
    console.error('❌ Health check error:', error);
    return res.status(500).json({ 
      status: 'error', 
      error: error.message,
      timestamp: Date.now()
    });
  }
});

export default router;