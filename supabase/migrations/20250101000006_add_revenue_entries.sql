-- Create revenue_entries table
CREATE TABLE IF NOT EXISTS public.revenue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    category TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_revenue_entries_company_id ON public.revenue_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_entry_date ON public.revenue_entries(entry_date);

-- Enable RLS
ALTER TABLE public.revenue_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for revenue_entries
CREATE POLICY "Users can view revenue entries for their company"
    ON public.revenue_entries
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert revenue entries for their company"
    ON public.revenue_entries
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update revenue entries for their company"
    ON public.revenue_entries
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete revenue entries for their company"
    ON public.revenue_entries
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );
