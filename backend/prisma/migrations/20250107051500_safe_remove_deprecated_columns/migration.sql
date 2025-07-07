-- Migration to safely remove deprecated columns after backing up data
-- This migration assumes the data has been migrated to the proper tables already

-- First, check if the columns exist and have data, then remove them
-- This is safer than using IF EXISTS when there's actual data

-- Remove preferredlanguage column from users table
-- (This data should have been migrated to host_family_profiles.preferredLanguages)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'preferredlanguage'
    ) THEN
        -- Log that we're removing the column (this will show in logs)
        RAISE NOTICE 'Removing preferredlanguage column from users table';
        ALTER TABLE "users" DROP COLUMN "preferredlanguage";
    END IF;
END $$;

-- Remove profilecompleted column from users table
-- (This functionality should be handled by application logic now)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profilecompleted'
    ) THEN
        -- Log that we're removing the column (this will show in logs)
        RAISE NOTICE 'Removing profilecompleted column from users table';
        ALTER TABLE "users" DROP COLUMN "profilecompleted";
    END IF;
END $$;
