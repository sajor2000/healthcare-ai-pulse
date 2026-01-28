-- Add academic metadata columns to content_items
ALTER TABLE content_items 
ADD COLUMN IF NOT EXISTS doi TEXT,
ADD COLUMN IF NOT EXISTS pmid TEXT,
ADD COLUMN IF NOT EXISTS arxiv_id TEXT,
ADD COLUMN IF NOT EXISTS abstract TEXT,
ADD COLUMN IF NOT EXISTS citation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS journal_name TEXT,
ADD COLUMN IF NOT EXISTS publication_type TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS mesh_terms TEXT[],
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_content_items_doi ON content_items(doi) WHERE doi IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_items_pmid ON content_items(pmid) WHERE pmid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_items_arxiv_id ON content_items(arxiv_id) WHERE arxiv_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_items_publication_type ON content_items(publication_type);