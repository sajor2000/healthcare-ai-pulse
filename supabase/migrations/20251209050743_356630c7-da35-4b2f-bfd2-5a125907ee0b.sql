-- Add key_points column for AI-generated summaries
ALTER TABLE public.content_items 
ADD COLUMN IF NOT EXISTS key_points text[] DEFAULT NULL;