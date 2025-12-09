-- Fix the security definer view by using SECURITY INVOKER (or dropping and recreating without security definer)
DROP VIEW IF EXISTS public.v_today_pipeline_status;

CREATE VIEW public.v_today_pipeline_status 
WITH (security_invoker = true) AS
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