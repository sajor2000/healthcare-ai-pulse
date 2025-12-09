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
    console.log('Starting arXiv fetch...')
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

      const paperData: ArxivResult = {
        title,
        url: arxivUrl,
        summary: summary.substring(0, 500),
        pub_date: published,
        authors: authors || 'Unknown'
      }

      results.push(paperData)

      await supabase.from('content_items').upsert({
        source_id: arxivSource?.id,
        title: paperData.title,
        url: paperData.url,
        summary: paperData.summary,
        authors: paperData.authors,
        pub_date: paperData.pub_date
      }, { onConflict: 'url', ignoreDuplicates: true })
    }

    console.log(`arXiv fetch completed: ${results.length} papers`)

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
