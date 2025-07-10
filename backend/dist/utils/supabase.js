"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromSupabase = exports.uploadToSupabase = exports.upload = exports.dbClient = exports.supabase = void 0;
exports.checkDatabaseConnection = checkDatabaseConnection;
const supabase_js_1 = require("@supabase/supabase-js");
const multer_1 = __importDefault(require("multer"));
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("⚠️  WARNING: Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file");
    console.warn("⚠️  The application will not function properly without these environment variables");
}
// Use service role key for backend operations to bypass RLS
exports.supabase = supabaseUrl && supabaseServiceKey
    ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey)
    : null;
// Import mock for demo mode
const mockSupabase_1 = require("./mockSupabase");
// Export the client to use (real or mock)
exports.dbClient = exports.supabase || mockSupabase_1.mockSupabase;
// Database connection check
async function checkDatabaseConnection() {
    try {
        if (!exports.supabase) {
            console.log("📊 Using demo database (mock Supabase)");
            return true;
        }
        const { data, error } = await exports.supabase
            .from("users")
            .select("count")
            .limit(1);
        if (error)
            throw error;
        console.log("📊 Supabase database connection successful");
        return true;
    }
    catch (error) {
        console.error("❌ Supabase database connection failed:", error);
        console.log("📊 Falling back to demo database (mock Supabase)");
        return true;
    }
}
// Configure multer for file uploads
const storage = multer_1.default.memoryStorage();
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common image and document formats
        const allowedMimes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("Invalid file type"));
        }
    },
});
const uploadToSupabase = async (file, userId, bucket) => {
    try {
        const filename = `${userId}/${Date.now()}_${file.originalname}`;
        const { data, error } = await exports.supabase.storage
            .from(bucket)
            .upload(filename, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
        });
        if (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }
        const { data: urlData } = exports.supabase.storage
            .from(bucket)
            .getPublicUrl(filename);
        return urlData.publicUrl;
    }
    catch (error) {
        throw error;
    }
};
exports.uploadToSupabase = uploadToSupabase;
const deleteFromSupabase = async (url) => {
    try {
        // Extract file path from URL
        const urlParts = url.split("/storage/v1/object/public/uploads/");
        if (urlParts.length < 2) {
            throw new Error("Invalid file URL");
        }
        const filePath = urlParts[1];
        const { error } = await exports.supabase.storage.from("uploads").remove([filePath]);
        if (error) {
            console.error("Supabase delete error:", error);
            throw new Error(`Delete failed: ${error.message}`);
        }
    }
    catch (error) {
        console.error("File delete error:", error);
        throw error;
    }
};
exports.deleteFromSupabase = deleteFromSupabase;
//# sourceMappingURL=supabase.js.map