-- Add priority column to sources table (1-5 scale, 3 is default/neutral)
ALTER TABLE public.sources 
ADD COLUMN priority integer DEFAULT 3 CHECK (priority >= 1 AND priority <= 5);

-- Add comment explaining the priority scale
COMMENT ON COLUMN public.sources.priority IS 'Source priority for content ranking: 1=Low, 2=Below Average, 3=Normal, 4=High, 5=Critical';