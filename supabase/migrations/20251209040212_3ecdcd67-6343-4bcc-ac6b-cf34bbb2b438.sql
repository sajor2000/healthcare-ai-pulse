-- Sources table
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('news', 'blog', 'journal', 'policy')),
  is_active BOOLEAN DEFAULT true,
  last_crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Content items
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  summary TEXT,
  full_text TEXT,
  authors TEXT,
  pub_date DATE,
  relevance_score INTEGER DEFAULT 0,
  is_read BOOLEAN DEFAULT false,
  is_saved BOOLEAN DEFAULT false,
  scraped_at TIMESTAMPTZ DEFAULT now()
);

-- Daily reading lists
CREATE TABLE reading_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_date DATE UNIQUE NOT NULL DEFAULT current_date,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reading_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_list_id UUID REFERENCES reading_lists(id) ON DELETE CASCADE,
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  rank INTEGER,
  UNIQUE(reading_list_id, content_item_id)
);

-- Draft posts
CREATE TABLE draft_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_list_id UUID REFERENCES reading_lists(id) ON DELETE SET NULL,
  content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  draft_text TEXT NOT NULL,
  edited_text TEXT,
  post_type TEXT CHECK (post_type IN ('research', 'news', 'insight', 'trend', 'opinion')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Perplexity search results
CREATE TABLE perplexity_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  response JSONB,
  citations JSONB,
  searched_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_content_items_pub_date ON content_items(pub_date DESC);
CREATE INDEX idx_content_items_relevance ON content_items(relevance_score DESC);
CREATE INDEX idx_content_items_source ON content_items(source_id);
CREATE INDEX idx_content_items_unread ON content_items(is_read) WHERE is_read = false;
CREATE INDEX idx_draft_posts_status ON draft_posts(status);
CREATE INDEX idx_reading_list_items_list ON reading_list_items(reading_list_id);

-- Enable Row Level Security
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE perplexity_searches ENABLE ROW LEVEL SECURITY;

-- Authenticated user policies (single-user app, allow all for authenticated)
CREATE POLICY "Authenticated users can read sources" ON sources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage sources" ON sources
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read content_items" ON content_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update content_items" ON content_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read reading_lists" ON reading_lists
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read reading_list_items" ON reading_list_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage draft_posts" ON draft_posts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read perplexity_searches" ON perplexity_searches
  FOR SELECT TO authenticated USING (true);