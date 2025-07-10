import { Request, Response, NextFunction } from "express";
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
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const authorize: (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
//# sourceMappingURL=auth.d.ts.map