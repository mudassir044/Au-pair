import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
interface PlanCheckOptions {
    action: "profileView" | "message" | "contactRequest";
    targetUserId?: string;
}
export declare const checkPlanLimits: (options: PlanCheckOptions) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare function checkUserPlanAccess(userId: string, action: string): Promise<{
    allowed: boolean;
    reason?: string;
    planInfo?: any;
}>;
export {};
//# sourceMappingURL=planLimits.d.ts.map