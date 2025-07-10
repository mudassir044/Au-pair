import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../utils/supabase";

declare global {
  namespace Express {
    interface Multer {
      File: any;
    }
  }
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
  planInfo?: {
    planType: string;
    planRole: string;
    isExpired: boolean;
    limits: any;
    currentUsage: any;
  };
  file?: any;
  body: any;
  params: any;
  query: any;
  headers: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication token required" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;

    // Check if user exists and is active
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, role, isActive")
      .eq("id", decoded.userId)
      .single();

    if (error || !user || !user.isActive) {
      return res.status(401).json({ message: "User not found or inactive" });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("❌ Authentication error:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions." });
    }

    next();
  };
};
