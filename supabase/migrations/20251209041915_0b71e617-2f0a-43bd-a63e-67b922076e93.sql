-- Drop existing tables (in order due to foreign keys)
DROP TABLE IF EXISTS reading_list_items CASCADE;
DROP TABLE IF EXISTS draft_posts CASCADE;
DROP TABLE IF EXISTS reading_lists CASCADE;
DROP TABLE IF EXISTS content_items CASCADE;
DROP TABLE IF EXISTS perplexity_searches CASCADE;
DROP TABLE IF EXISTS sources CASCADE;

-- Drop existing functions if any
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLES
-- ============================================

-- Sources table (news sites, blogs, journals to crawl)
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL CHECK (source_type IN ('news', 'blog', 'journal', 'policy')),
  crawl_frequency TEXT DEFAULT 'daily' CHECK (crawl_frequency IN ('hourly', 'daily', 'weekly')),
  is_active BOOLEAN DEFAULT true,
  last_crawled_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content items (articles, papers scraped from sources)
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  summary TEXT,
  full_text TEXT,
  authors TEXT,
  pub_date DATE,
  relevance_score INTEGER DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 100),
  is_read BOOLEAN DEFAULT false,
  is_saved BOOLEAN DEFAULT false,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily reading lists
CREATE TABLE reading_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  items_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for reading list items
CREATE TABLE reading_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_list_id UUID NOT NULL REFERENCES reading_lists(id) ON DELETE CASCADE,
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank > 0),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reading_list_id, content_item_id)
);

-- Draft LinkedIn posts
CREATE TABLE draft_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_list_id UUID REFERENCES reading_lists(id) ON DELETE SET NULL,
  content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  draft_text TEXT NOT NULL,
  edited_text TEXT,
  post_type TEXT NOT NULL CHECK (post_type IN ('research', 'news', 'insight', 'trend', 'opinion')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perplexity search results (for audit trail)
CREATE TABLE perplexity_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  response JSONB,
  citations JSONB,
  urls_discovered INTEGER DEFAULT 0,
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline run logs (for monitoring)
CREATE TABLE pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  steps_completed JSONB DEFAULT '[]'::JSONB,
  error_message TEXT,
  items_scraped INTEGER DEFAULT 0,
  posts_generated INTEGER DEFAULT 0
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_sources_active ON sources(is_active) WHERE is_active = true;
CREATE INDEX idx_sources_type ON sources(source_type);
CREATE INDEX idx_content_items_pub_date ON content_items(pub_date DESC NULLS LAST);
CREATE INDEX idx_content_items_relevance ON content_items(relevance_score DESC);
CREATE INDEX idx_content_items_source ON content_items(source_id);
CREATE INDEX idx_content_items_unread ON content_items(is_read) WHERE is_read = false;
CREATE INDEX idx_content_items_saved ON content_items(is_saved) WHERE is_saved = true;
CREATE INDEX idx_content_items_recent ON content_items(scraped_at DESC);
CREATE INDEX idx_reading_lists_date ON reading_lists(list_date DESC);
CREATE INDEX idx_reading_list_items_list ON reading_list_items(reading_list_id);
CREATE INDEX idx_reading_list_items_content ON reading_list_items(content_item_id);
CREATE INDEX idx_draft_posts_status ON draft_posts(status);
CREATE INDEX idx_draft_posts_date ON draft_posts(created_at DESC);
CREATE INDEX idx_draft_posts_reading_list ON draft_posts(reading_list_id);
CREATE INDEX idx_pipeline_runs_date ON pipeline_runs(run_date DESC);
CREATE INDEX idx_pipeline_runs_status ON pipeline_runs(status);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_sources_updated_at
  BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_items_updated_at
  BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reading_lists_updated_at
  BEFORE UPDATE ON reading_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_draft_posts_updated_at
  BEFORE UPDATE ON draft_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE perplexity_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Authenticated user policies
CREATE POLICY "Authenticated read sources" ON sources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated manage sources" ON sources
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read content" ON content_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated update content" ON content_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read reading_lists" ON reading_lists
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read reading_list_items" ON reading_list_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated full access draft_posts" ON draft_posts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read perplexity_searches" ON perplexity_searches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read pipeline_runs" ON pipeline_runs
  FOR SELECT TO authenticated USING (true);