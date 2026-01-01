-- Create call_logs table
CREATE TABLE IF NOT EXISTS public.call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    call_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER,
    caller_name TEXT,
    caller_email TEXT,
    caller_phone TEXT,
    call_type TEXT,
    notes TEXT,
    outcome TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sales_goals table
CREATE TABLE IF NOT EXISTS public.sales_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    goal_date DATE NOT NULL,
    target_amount DECIMAL(10, 2) NOT NULL,
    actual_amount DECIMAL(10, 2) DEFAULT 0,
    category TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_call_logs_company_id ON public.call_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_date ON public.call_logs(call_date);
CREATE INDEX IF NOT EXISTS idx_sales_goals_company_id ON public.sales_goals(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_goals_goal_date ON public.sales_goals(goal_date);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_logs
CREATE POLICY "Users can view call logs for their company"
    ON public.call_logs
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert call logs for their company"
    ON public.call_logs
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update call logs for their company"
    ON public.call_logs
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete call logs for their company"
    ON public.call_logs
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for sales_goals
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
