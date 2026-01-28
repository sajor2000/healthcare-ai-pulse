
# Scientific Publications Integration Plan

## Overview

This plan adds robust support for incorporating full papers and citations from medical and AI journals. The enhancement includes database schema updates, a new edge function for fetching abstracts and citations from PubMed, improved UI to display academic metadata, and a citation manager component.

---

## Current State Analysis

The application currently fetches scientific publications from:
- **PubMed** - Basic metadata only (title, authors, journal, date)
- **arXiv** - Title, abstract, and author data
- **Exa AI** - Neural search across academic domains

**Gaps identified:**
1. No storage for DOI, PMID, or citation identifiers
2. No abstract field (only summary, which gets overwritten)
3. No citation/reference tracking
4. No way to view full paper PDFs or fetch abstracts
5. PubMed fetch doesn't retrieve abstracts (only summary metadata)

---

## Implementation Plan

### Phase 1: Database Schema Enhancement

Add new columns to `content_items` table to store academic metadata:

```sql
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS doi TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS pmid TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS arxiv_id TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS abstract TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS citation_count INTEGER DEFAULT 0;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS journal_name TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS publication_type TEXT; -- 'peer-reviewed', 'preprint', 'news', 'blog'
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS mesh_terms TEXT[]; -- Medical Subject Headings for PubMed
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Create index for DOI lookups (commonly used for deduplication)
CREATE INDEX IF NOT EXISTS idx_content_items_doi ON content_items(doi);
CREATE INDEX IF NOT EXISTS idx_content_items_pmid ON content_items(pmid);
```

### Phase 2: Enhanced PubMed Edge Function

Update `supabase/functions/fetch-pubmed/index.ts` to:
1. Fetch full abstracts using E-fetch API endpoint
2. Extract PMID, DOI, and MeSH terms
3. Calculate citation counts (via PubMed Central)
4. Store publication type classification

**Key changes:**
- Add `efetch` call after `esummary` to get abstract text
- Parse DOI from article IDs
- Extract MeSH terms for better categorization
- Store journal name separately for filtering

### Phase 3: New Citation Lookup Edge Function

Create `supabase/functions/fetch-paper-details/index.ts`:

**Purpose:** On-demand fetching of full paper details when user clicks "View Full Abstract" or "Get Citations"

**Features:**
1. Accept PMID, DOI, or arXiv ID as input
2. Fetch complete abstract and metadata
3. Query OpenAlex or Semantic Scholar for citation counts
4. Return structured paper data with PDF link if available

### Phase 4: Add Source Dialog Enhancement

Update `src/components/sources/AddSourceDialog.tsx`:

**Add "Academic Journal" source type with special fields:**
- Journal ISSN or PubMed Journal ID
- Default search terms for the journal
- Impact factor (optional display)

### Phase 5: Paper Detail Component

Create `src/components/papers/PaperDetailCard.tsx`:

**Features:**
- Expandable abstract view
- Citation information badge
- MeSH terms/keywords display
- "Open in PubMed" / "View PDF" buttons
- Copy citation button (AMA, APA formats)
- Add to reading list action

### Phase 6: Reading List Item Enhancement

Update reading list item display to show:
- Publication type badge (Peer-Reviewed, Preprint, News)
- Citation count when available
- DOI badge with copy functionality
- Journal name with impact indicator

### Phase 7: Settings Page - Journal Preferences

Add a "Scientific Journals" section to Settings:
- Toggle for including preprints vs only peer-reviewed
- Minimum citation count filter
- Preferred journals list
- MeSH term filters for focused content

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/fetch-paper-details/index.ts` | On-demand paper details fetcher |
| `src/components/papers/PaperDetailCard.tsx` | Full paper view component |
| `src/components/papers/CitationBadge.tsx` | Citation count display |
| `src/components/papers/AbstractView.tsx` | Expandable abstract component |

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/fetch-pubmed/index.ts` | Add efetch for abstracts, DOI extraction, MeSH terms |
| `supabase/functions/fetch-arxiv/index.ts` | Add arxiv_id storage, PDF link extraction |
| `src/components/sources/AddSourceDialog.tsx` | Add journal-specific options |
| `src/components/dashboard/ReadingListItem.tsx` | Display academic metadata |
| `src/pages/Settings.tsx` | Add scientific journal preferences |

### API Endpoints Used

1. **PubMed E-utilities:**
   - `efetch.fcgi` - Full article retrieval with abstract
   - `elink.fcgi` - Citation links

2. **OpenAlex API (free):**
   - Citation counts and metadata
   - No API key required for basic use

3. **Unpaywall API (optional):**
   - Open access PDF detection
   - Free with email registration

---

## Database Migration

```sql
-- Add academic metadata columns
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
```

---

## UI/UX Enhancements

### Reading List Item Updates

**Before:**
- Title
- Source badge
- Summary preview
- Relevance score

**After:**
- Title with publication type icon
- Source badge + Journal name
- Abstract preview (expandable)
- Relevance score + Citation count
- DOI/PMID quick-copy badge
- "View Full Paper" button

### New Paper Detail Modal

When clicking "View Full Paper":
- Full abstract text
- Complete author list with affiliations (when available)
- MeSH terms as clickable tags
- Citation count with trend indicator
- Related papers suggestions
- Copy citation in multiple formats
- Direct links to PubMed, PDF, journal

---

## Scoring Impact

Update `score-content` function to boost peer-reviewed content:
- Peer-reviewed article: +25 points
- Preprint: +15 points
- Has DOI: +5 points
- Citation count > 10: +10 points
- High-impact journal: +10 points

---

## Implementation Order

1. **Database migration** - Add new columns
2. **Enhance fetch-pubmed** - Extract abstracts, DOI, MeSH terms
3. **Enhance fetch-arxiv** - Store arxiv_id, PDF links
4. **Create fetch-paper-details** - On-demand paper lookup
5. **Update UI components** - Display academic metadata
6. **Add citation formatting** - Copy citation functionality
7. **Update scoring** - Boost academic content
8. **Settings integration** - Journal preferences

---

## Expected Outcomes

1. **Richer content metadata** - Full abstracts, DOIs, citation counts
2. **Better content quality** - Peer-reviewed articles prioritized
3. **Improved LinkedIn posts** - More credible citations with DOI references
4. **Academic filtering** - Filter by journal, publication type, citations
5. **Easy citation** - Copy formatted citations for posts
