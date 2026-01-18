-- Add separate view style columns for embed and booking page
-- This allows users to set different layouts for embedded forms vs direct booking links

-- Embed view style (for when form is embedded on external websites)
ALTER TABLE public.event_types
ADD COLUMN IF NOT EXISTS embed_view_style TEXT DEFAULT 'classic';

ALTER TABLE public.event_types
ADD CONSTRAINT embed_view_style_check 
CHECK (embed_view_style IN ('classic', 'wizard', 'progressive'));

COMMENT ON COLUMN public.event_types.embed_view_style IS 'View style for embedded booking forms: classic (3-column), wizard (step-by-step), or progressive (vertical with reveal)';

-- Booking page view style (for direct booking page links)
ALTER TABLE public.event_types
ADD COLUMN IF NOT EXISTS booking_page_view_style TEXT DEFAULT 'classic';

ALTER TABLE public.event_types
ADD CONSTRAINT booking_page_view_style_check 
CHECK (booking_page_view_style IN ('classic', 'wizard', 'progressive'));

COMMENT ON COLUMN public.event_types.booking_page_view_style IS 'View style for the main booking page: classic (3-column), wizard (step-by-step), or progressive (vertical with reveal)';
