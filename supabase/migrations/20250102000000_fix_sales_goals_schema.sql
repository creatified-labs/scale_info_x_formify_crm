-- Fix sales_goals table schema to match application expectations
-- The table was created with goal_date but the app expects period_type, period_key, etc.

-- Drop the old table and recreate with correct schema
DROP TABLE IF EXISTS public.sales_goals CASCADE;

CREATE TABLE public.sales_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL, -- 'revenue', 'clients', 'calls'
    period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly', 'deadline'
    target_amount DECIMAL(10, 2) NOT NULL,
    period_key TEXT, -- YYYY-MM-DD for daily, YYYY-WW for weekly, YYYY-MM for monthly, YYYY for yearly
    deadline TEXT, -- YYYY-MM-DD for specific deadline goals
    description TEXT,
    category TEXT,
    category_name TEXT,
    category_color TEXT,
    category_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_sales_goals_company_id ON public.sales_goals(company_id);
CREATE INDEX idx_sales_goals_period_type ON public.sales_goals(period_type);
CREATE INDEX idx_sales_goals_period_key ON public.sales_goals(period_key);

-- Enable RLS
ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view sales goals for their company"
    ON public.sales_goals
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert sales goals for their company"
    ON public.sales_goals
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update sales goals for their company"
    ON public.sales_goals
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete sales goals for their company"
    ON public.sales_goals
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Service role bypass policy
CREATE POLICY "Service role can manage all sales goals"
    ON public.sales_goals
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role')
    WITH CHECK (auth.jwt()->>'role' = 'service_role');
