-- Add company_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE;

-- Create index for faster queries on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);

-- Add company_id column to event_types table
ALTER TABLE public.event_types 
ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE;

-- Create index for faster queries on event_types
CREATE INDEX IF NOT EXISTS idx_event_types_company_id ON public.event_types(company_id);

-- Update existing event_types to have company_id from their user's profile
UPDATE public.event_types et
SET company_id = p.company_id
FROM public.profiles p
WHERE et.user_id = p.id
AND et.company_id IS NULL
AND p.company_id IS NOT NULL;
