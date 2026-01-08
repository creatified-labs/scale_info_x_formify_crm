-- Fix event_types.company_id constraint issues
-- This migration ensures all event types have valid company references

DO $$ 
DECLARE
    orphaned_count INTEGER;
BEGIN
    -- Count event types with invalid company_id references
    SELECT COUNT(*) INTO orphaned_count
    FROM public.event_types et
    WHERE et.company_id IS NOT NULL 
    AND et.company_id NOT IN (SELECT id FROM public.companies);
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Found % event types with invalid company_id references', orphaned_count;
        
        -- For each event type with invalid company_id, try to fix it
        -- First, try to get company_id from the user's profile
        UPDATE public.event_types et
        SET company_id = p.company_id
        FROM public.profiles p
        WHERE et.user_id = p.id
        AND et.company_id IS NOT NULL
        AND et.company_id NOT IN (SELECT id FROM public.companies)
        AND p.company_id IS NOT NULL
        AND p.company_id IN (SELECT id FROM public.companies);
        
        -- For remaining event types without valid company_id, create a company for each user
        INSERT INTO public.companies (id, name, created_at, updated_at)
        SELECT 
            gen_random_uuid(),
            COALESCE(u.email, 'Company ' || u.id::text),
            NOW(),
            NOW()
        FROM public.event_types et
        JOIN auth.users u ON et.user_id = u.id
        WHERE et.company_id IS NOT NULL
        AND et.company_id NOT IN (SELECT id FROM public.companies)
        AND et.user_id NOT IN (
            SELECT p.id FROM public.profiles p 
            WHERE p.company_id IS NOT NULL 
            AND p.company_id IN (SELECT id FROM public.companies)
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- Update profiles with the new company_id
        WITH new_companies AS (
            SELECT DISTINCT et.user_id, c.id as company_id
            FROM public.event_types et
            JOIN auth.users u ON et.user_id = u.id
            JOIN public.companies c ON c.name = COALESCE(u.email, 'Company ' || u.id::text)
            WHERE et.company_id IS NOT NULL
            AND et.company_id NOT IN (SELECT id FROM public.companies)
        )
        UPDATE public.profiles p
        SET company_id = nc.company_id
        FROM new_companies nc
        WHERE p.id = nc.user_id;
        
        -- Finally, update event types with the correct company_id from profiles
        UPDATE public.event_types et
        SET company_id = p.company_id
        FROM public.profiles p
        WHERE et.user_id = p.id
        AND et.company_id IS NOT NULL
        AND et.company_id NOT IN (SELECT id FROM public.companies)
        AND p.company_id IS NOT NULL;
        
        RAISE NOTICE 'Fixed event types with invalid company_id references';
    ELSE
        RAISE NOTICE 'No event types with invalid company_id found';
    END IF;
    
    -- Handle event types with NULL company_id
    SELECT COUNT(*) INTO orphaned_count
    FROM public.event_types
    WHERE company_id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Found % event types with NULL company_id', orphaned_count;
        
        -- Set company_id from user's profile where available
        UPDATE public.event_types et
        SET company_id = p.company_id
        FROM public.profiles p
        WHERE et.user_id = p.id
        AND et.company_id IS NULL
        AND p.company_id IS NOT NULL;
        
        -- For remaining NULL company_ids, create companies
        WITH users_needing_companies AS (
            SELECT DISTINCT et.user_id, u.email
            FROM public.event_types et
            JOIN auth.users u ON et.user_id = u.id
            WHERE et.company_id IS NULL
            AND et.user_id NOT IN (
                SELECT id FROM public.profiles WHERE company_id IS NOT NULL
            )
        ),
        inserted_companies AS (
            INSERT INTO public.companies (id, name, created_at, updated_at)
            SELECT 
                gen_random_uuid(),
                COALESCE(email, 'Company ' || user_id::text),
                NOW(),
                NOW()
            FROM users_needing_companies
            RETURNING id, name
        )
        UPDATE public.profiles p
        SET company_id = ic.id
        FROM inserted_companies ic
        JOIN auth.users u ON COALESCE(u.email, 'Company ' || u.id::text) = ic.name
        WHERE p.id = u.id;
        
        -- Update event types with company_id from profiles
        UPDATE public.event_types et
        SET company_id = p.company_id
        FROM public.profiles p
        WHERE et.user_id = p.id
        AND et.company_id IS NULL
        AND p.company_id IS NOT NULL;
        
        RAISE NOTICE 'Fixed event types with NULL company_id';
    END IF;
    
    -- Make company_id NOT NULL after fixing all data
    -- This ensures future inserts/updates must have a valid company_id
    ALTER TABLE public.event_types 
    ALTER COLUMN company_id SET NOT NULL;
    
    RAISE NOTICE 'Migration completed: All event types now have valid company_id references';
END $$;
