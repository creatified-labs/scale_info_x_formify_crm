-- Fix sales_pitch table converted_by constraint
-- Make converted_by nullable to prevent foreign key constraint violations

-- First, check if the table exists and alter the constraint
DO $$ 
BEGIN
    -- Check if the sales_pitch table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales_pitch') THEN
        -- Drop the existing foreign key constraint if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'sales_pitch_converted_by_fkey' 
            AND table_name = 'sales_pitch'
        ) THEN
            ALTER TABLE public.sales_pitch DROP CONSTRAINT sales_pitch_converted_by_fkey;
        END IF;
        
        -- Make the converted_by column nullable if it isn't already
        ALTER TABLE public.sales_pitch ALTER COLUMN converted_by DROP NOT NULL;
        
        -- Re-add the foreign key constraint with proper handling
        -- This assumes converted_by references the profiles table
        ALTER TABLE public.sales_pitch 
        ADD CONSTRAINT sales_pitch_converted_by_fkey 
        FOREIGN KEY (converted_by) 
        REFERENCES auth.users(id) 
        ON DELETE SET NULL;
        
        -- Update any existing invalid references to NULL
        UPDATE public.sales_pitch 
        SET converted_by = NULL 
        WHERE converted_by IS NOT NULL 
        AND converted_by NOT IN (SELECT id FROM auth.users);
        
        RAISE NOTICE 'Fixed sales_pitch.converted_by constraint';
    ELSE
        RAISE NOTICE 'sales_pitch table does not exist, skipping migration';
    END IF;
END $$;
