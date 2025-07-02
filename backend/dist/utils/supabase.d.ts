import multer from 'multer';
export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", any>;
export declare const upload: multer.Multer;
export declare const uploadToSupabase: (file: Express.Multer.File, bucket: string, filename: string) => Promise<{
    url: string | null;
    error: any;
}>;
export declare const deleteFromSupabase: (url: string) => Promise<void>;
//# sourceMappingURL=supabase.d.ts.map