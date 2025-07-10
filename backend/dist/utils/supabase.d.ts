import multer from "multer";
export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", any>;
export declare const isDemoMode: boolean;
export declare function checkDatabaseConnection(): Promise<boolean>;
export declare const upload: multer.Multer;
export declare const uploadToSupabase: (file: any, userId: string, bucket: string) => Promise<string>;
export declare const deleteFromSupabase: (url: string) => Promise<void>;
//# sourceMappingURL=supabase.d.ts.map