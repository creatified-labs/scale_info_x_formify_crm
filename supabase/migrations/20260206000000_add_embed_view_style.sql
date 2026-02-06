ALTER TABLE public.event_types
ADD COLUMN IF NOT EXISTS embed_view_style TEXT DEFAULT 'classic';
