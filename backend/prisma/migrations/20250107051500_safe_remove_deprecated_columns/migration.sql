-- Migration to safely remove deprecated columns after migrating data
-- Step 1: Migrate preferredlanguage data to host_family_profiles
-- Step 2: Remove the deprecated columns

-- First, migrate preferredlanguage data for HOST_FAMILY users
DO $$ 
DECLARE 
    user_record RECORD;
BEGIN
    -- Update host family profiles with preferredlanguage data from users table
    FOR user_record IN 
        SELECT u.id, u.preferredlanguage
        FROM users u
        INNER JOIN host_family_profiles hfp ON u.id = hfp."userId"
        WHERE u.preferredlanguage IS NOT NULL 
        AND u.preferredlanguage != ''
        AND (hfp."preferredLanguages" IS NULL OR hfp."preferredLanguages" = '')
    LOOP
        UPDATE host_family_profiles 
        SET "preferredLanguages" = user_record.preferredlanguage,
            "updatedAt" = NOW()
        WHERE "userId" = user_record.id;
        
        RAISE NOTICE 'Migrated preferredlanguage for user %', user_record.id;
    END LOOP;
END $$;

-- Clear the data from deprecated columns before dropping them
UPDATE users SET preferredlanguage = NULL WHERE preferredlanguage IS NOT NULL;
UPDATE users SET profilecompleted = NULL WHERE profilecompleted IS NOT NULL;

-- Now safely remove the columns
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'preferredlanguage'
    ) THEN
        ALTER TABLE "users" DROP COLUMN "preferredlanguage";
        RAISE NOTICE 'Removed preferredlanguage column from users table';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profilecompleted'
    ) THEN
        ALTER TABLE "users" DROP COLUMN "profilecompleted";
        RAISE NOTICE 'Removed profilecompleted column from users table';
    END IF;
END $$;
