"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromSupabase = exports.uploadToSupabase = exports.upload = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const multer_1 = __importDefault(require("multer"));
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
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
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type'));
        }
    }
});
const uploadToSupabase = async (file, bucket, filename) => {
    try {
        const { data, error } = await exports.supabase.storage
            .from(bucket)
            .upload(filename, file.buffer, {
            contentType: file.mimetype,
            upsert: true
        });
        if (error) {
            return { url: null, error };
        }
        const { data: urlData } = exports.supabase.storage
            .from(bucket)
            .getPublicUrl(filename);
        return { url: urlData.publicUrl, error: null };
    }
    catch (error) {
        return { url: null, error };
    }
};
exports.uploadToSupabase = uploadToSupabase;
const deleteFromSupabase = async (url) => {
    try {
        // Extract file path from URL
        const urlParts = url.split('/storage/v1/object/public/uploads/');
        if (urlParts.length < 2) {
            throw new Error('Invalid file URL');
        }
        const filePath = urlParts[1];
        const { error } = await exports.supabase.storage
            .from('uploads')
            .remove([filePath]);
        if (error) {
            console.error('Supabase delete error:', error);
            throw new Error(`Delete failed: ${error.message}`);
        }
    }
    catch (error) {
        console.error('File delete error:', error);
        throw error;
    }
};
exports.deleteFromSupabase = deleteFromSupabase;
//# sourceMappingURL=supabase.js.map