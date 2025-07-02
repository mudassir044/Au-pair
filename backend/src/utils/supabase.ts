import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import * as Express from 'express';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

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
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

export const uploadToSupabase = async (
  file: any,
  userId: string,
  bucket: string
): Promise<string> => {
  try {
    const filename = `${userId}/${Date.now()}_${file.originalname}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: true
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
    const urlParts = url.split('/storage/v1/object/public/uploads/');
    if (urlParts.length < 2) {
      throw new Error('Invalid file URL');
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('uploads')
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  } catch (error) {
    console.error('File delete error:', error);
    throw error;
  }
};