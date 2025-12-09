-- Add log_cron_execution helper function
CREATE OR REPLACE FUNCTION public.log_cron_execution(job_name TEXT, status TEXT, details TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  RAISE LOG 'CRON [%]: % - %', job_name, status, COALESCE(details, 'no details');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add unique constraint on rank per reading list (to ensure unique ranking)
ALTER TABLE reading_list_items DROP CONSTRAINT IF EXISTS reading_list_items_reading_list_id_rank_key;
ALTER TABLE reading_list_items ADD CONSTRAINT reading_list_items_reading_list_id_rank_key UNIQUE(reading_list_id, rank);

-- Add new indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_content_items_saved ON content_items(is_saved) WHERE is_saved = true;
CREATE INDEX IF NOT EXISTS idx_content_items_recent ON content_items(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_list_items_content ON reading_list_items(content_item_id);
CREATE INDEX IF NOT EXISTS idx_draft_posts_reading_list ON draft_posts(reading_list_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_date ON pipeline_runs(run_date DESC);

-- Add additional seed sources (Tier 2-4 from schema)
INSERT INTO sources (name, url, source_type, crawl_frequency) VALUES
  ('MobiHealthNews', 'https://www.mobihealthnews.com/news/artificial-intelligence', 'news', 'daily'),
  ('Healthcare Dive', 'https://www.healthcaredive.com/topic/health-it/', 'news', 'daily'),
  ('Beckers Hospital Review', 'https://www.beckershospitalreview.com/healthcare-information-technology/', 'news', 'daily'),
  ('MedCity News', 'https://medcitynews.com/category/artificial-intelligence/', 'news', 'daily'),
  ('Healthcare Finance News', 'https://www.healthcarefinancenews.com/news/technology', 'news', 'daily'),
  ('PubMed AI Healthcare', 'https://pubmed.ncbi.nlm.nih.gov/?term=artificial+intelligence+healthcare', 'journal', 'daily'),
  ('medRxiv Health Informatics', 'https://www.medrxiv.org/collection/health-informatics', 'journal', 'daily'),
  ('AMA Health Care AI', 'https://www.ama-assn.org/topics/health-care-ai', 'policy', 'weekly'),
  ('JMIR AI', 'https://ai.jmir.org/', 'journal', 'weekly'),
  ('PLOS Digital Health', 'https://journals.plos.org/digitalhealth/', 'journal', 'weekly'),
  ('npj Digital Medicine', 'https://www.nature.com/npjdigitalmed/', 'journal', 'weekly')
ON CONFLICT (url) DO NOTHING;

-- Create monitoring view for today's pipeline status
CREATE OR REPLACE VIEW public.v_today_pipeline_status AS
SELECT
  pr.id,
  pr.status,
  pr.started_at,
  pr.completed_at,
  pr.items_scraped,
  pr.posts_generated,
  pr.error_message,
  EXTRACT(EPOCH FROM (COALESCE(pr.completed_at, NOW()) - pr.started_at)) AS duration_seconds
FROM pipeline_runs pr
WHERE pr.run_date = CURRENT_DATE
ORDER BY pr.started_at DESC
LIMIT 1;