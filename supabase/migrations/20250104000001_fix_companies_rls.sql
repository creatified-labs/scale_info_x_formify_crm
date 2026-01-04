-- Add RLS policies for companies table to allow service role operations

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;

-- Allow service role to do everything (used by Edge Functions)
CREATE POLICY "Service role can manage companies" ON public.companies
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Allow users to view their own company
CREATE POLICY "Users can view their company" ON public.companies
    FOR SELECT
    USING (
        id IN (
            SELECT company_id 
            FROM public.users 
            WHERE id = auth.uid()
        )
    );
