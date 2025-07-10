import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import * as Express from "express";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for backend operations to bypass RLS
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Database connection check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);
    if (error) throw error;
    console.log("📊 Supabase database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Supabase database connection failed:", error);
    return false;
  }
}

// Configure multer for file uploads
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
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
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

export const uploadToSupabase = async (
  file: any,
  userId: string,
  bucket: string,
): Promise<string> => {
  try {
    const filename = `${userId}/${Date.now()}_${file.originalname}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);

    return urlData.publicUrl;
  } catch (error) {
    throw error;
  }
};

export const deleteFromSupabase = async (url: string): Promise<void> => {
  try {
    // Extract file path from URL
    const urlParts = url.split("/storage/v1/object/public/uploads/");
    if (urlParts.length < 2) {
      throw new Error("Invalid file URL");
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage.from("uploads").remove([filePath]);

    if (error) {
      console.error("Supabase delete error:", error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  } catch (error) {
    console.error("File delete error:", error);
    throw error;
  }
};
