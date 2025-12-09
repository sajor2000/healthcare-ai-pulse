-- Drop the restrictive policies and create permissive ones
-- Sources table
DROP POLICY IF EXISTS "Authenticated manage sources" ON public.sources;
DROP POLICY IF EXISTS "Authenticated read sources" ON public.sources;

CREATE POLICY "Allow public read sources" 
ON public.sources FOR SELECT 
USING (true);

CREATE POLICY "Allow public manage sources" 
ON public.sources FOR ALL 
USING (true)
WITH CHECK (true);

-- Content items table
DROP POLICY IF EXISTS "Authenticated read content" ON public.content_items;
DROP POLICY IF EXISTS "Authenticated update content" ON public.content_items;

CREATE POLICY "Allow public read content_items" 
ON public.content_items FOR SELECT 
USING (true);

CREATE POLICY "Allow public update content_items" 
ON public.content_items FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Reading lists table
DROP POLICY IF EXISTS "Authenticated read reading_lists" ON public.reading_lists;

CREATE POLICY "Allow public read reading_lists" 
ON public.reading_lists FOR SELECT 
USING (true);

-- Reading list items table
DROP POLICY IF EXISTS "Authenticated read reading_list_items" ON public.reading_list_items;

CREATE POLICY "Allow public read reading_list_items" 
ON public.reading_list_items FOR SELECT 
USING (true);

-- Draft posts table
DROP POLICY IF EXISTS "Authenticated full access draft_posts" ON public.draft_posts;

CREATE POLICY "Allow public access draft_posts" 
ON public.draft_posts FOR ALL 
USING (true)
WITH CHECK (true);

-- Pipeline runs table
DROP POLICY IF EXISTS "Authenticated read pipeline_runs" ON public.pipeline_runs;

CREATE POLICY "Allow public read pipeline_runs" 
ON public.pipeline_runs FOR SELECT 
USING (true);

-- Perplexity searches table
DROP POLICY IF EXISTS "Authenticated read perplexity_searches" ON public.perplexity_searches;

CREATE POLICY "Allow public read perplexity_searches" 
ON public.perplexity_searches FOR SELECT 
USING (true);