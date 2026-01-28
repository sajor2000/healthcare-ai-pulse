import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ArxivResult {
  title: string
  url: string
  summary: string
  pub_date: string
  authors: string
  arxiv_id: string
  abstract: string
  pdf_url: string
  publication_type: string
}

const ARXIV_API = 'http://export.arxiv.org/api/query'
const REQUEST_TIMEOUT = 30000

async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

function extractArxivId(url: string): string {
  // Extract arxiv ID from URL like http://arxiv.org/abs/2301.12345v1
  const match = url.match(/arxiv\.org\/abs\/([^\s]+)/)
  return match ? match[1].replace(/v\d+$/, '') : ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: 'Missing Supabase credentials' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  try {
    console.log('Starting enhanced arXiv fetch with abstracts and PDF links...')
    // PRD v4.2: Expanded query with ICU, critical care, hospital, fairness
    const query = encodeURIComponent('cat:cs.AI AND (all:healthcare OR all:medical OR all:clinical OR all:ICU OR all:critical care OR all:hospital OR all:fairness)')
    const url = `${ARXIV_API}?search_query=${query}&start=0&max_results=20&sortBy=submittedDate&sortOrder=descending`

    const res = await fetchWithTimeout(url, REQUEST_TIMEOUT)
    const xml = await res.text()

    const { data: arxivSource } = await supabase
      .from('sources')
      .select('id')
      .eq('name', 'arXiv cs.AI')
      .single()

    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || []
    const results: ArxivResult[] = []

    for (const entry of entries) {
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/)
      const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/)
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/)
      const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/)
      const authorMatches = entry.match(/<author>\s*<name>([\s\S]*?)<\/name>/g) || []
      
      // Extract PDF link
      const pdfLinkMatch = entry.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/)
      
      const title = titleMatch?.[1]?.replace(/\s+/g, ' ').trim() || ''
      const arxivUrl = idMatch?.[1]?.trim() || ''
      const summary = summaryMatch?.[1]?.replace(/\s+/g, ' ').trim() || ''
      const published = publishedMatch?.[1]?.split('T')[0] || new Date().toISOString().split('T')[0]
      const authors = authorMatches
        .map(a => a.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim())
        .filter((name): name is string => typeof name === 'string' && name.length > 0)
        .join(', ')

      if (!title || !arxivUrl) {
        continue
      }

      const arxivId = extractArxivId(arxivUrl)
      const pdfUrl = pdfLinkMatch?.[1] || `https://arxiv.org/pdf/${arxivId}.pdf`

      const paperData: ArxivResult = {
        title,
        url: arxivUrl,
        summary: summary.substring(0, 500),
        pub_date: published,
        authors: authors || 'Unknown',
        arxiv_id: arxivId,
        abstract: summary, // arXiv summary is the abstract
        pdf_url: pdfUrl,
        publication_type: 'preprint'
      }

      results.push(paperData)

      await supabase.from('content_items').upsert({
        source_id: arxivSource?.id,
        title: paperData.title,
        url: paperData.url,
        summary: paperData.summary,
        authors: paperData.authors,
        pub_date: paperData.pub_date,
        arxiv_id: paperData.arxiv_id,
        abstract: paperData.abstract,
        pdf_url: paperData.pdf_url,
        publication_type: paperData.publication_type
      }, { onConflict: 'url', ignoreDuplicates: true })
    }

    console.log(`Enhanced arXiv fetch completed: ${results.length} papers with abstracts and PDF links`)

    return new Response(
      JSON.stringify({ success: true, papers: results.length, data: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      function: 'fetch-arxiv',
      error: errorMessage
    }))
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
