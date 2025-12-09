import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// PRD v4.2: 14 Exa AI research queries
const RESEARCH_QUERIES = [
  // Big Tech AI Strategy
  'OpenAI Anthropic Microsoft healthcare AI strategy 2024 2025',
  'Google DeepMind Med-PaLM medical AI research',

  // Critical Care & ICU
  'machine learning ICU critical care sepsis prediction validation',
  'early warning score AI hospital clinical deterioration',

  // Health Equity & Fairness
  'health equity algorithmic bias clinical AI FDA guidance',
  'ML fairness clinical prediction racial disparities healthcare',

  // Epic & EHR
  'Epic EHR AI ambient documentation Cosmos machine learning',
  'EHR vendor AI strategy Epic Cerner Oracle comparison',

  // ROI & Success Stories
  'healthcare AI ROI return on investment implementation',
  'AI success stories healthcare hospital case study deployment',
  'healthcare AI value realization cost savings outcomes',

  // Clinical Validation
  'large language model clinical decision support deployment',
  'deep learning diagnostic accuracy FDA cleared peer reviewed'
]

const REQUEST_TIMEOUT = 30000

interface ExaResult {
  title: string
  url: string
  publishedDate?: string
  author?: string
  text?: string
  highlights?: string[]
}

interface ExaSearchResponse {
  results: ExaResult[]
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
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

  const EXA_API_KEY = Deno.env.get('EXA_API_KEY')
  if (!EXA_API_KEY) {
    console.error('EXA_API_KEY not configured')
    return new Response(
      JSON.stringify({ error: 'EXA_API_KEY not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
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
    console.log('Starting Exa AI research fetch...')
    let totalResults = 0
    const queryResults: { query: string; results_found: number }[] = []

    for (const query of RESEARCH_QUERIES) {
      console.log(`Exa search: ${query}`)

      try {
        const response = await fetchWithTimeout(
          'https://api.exa.ai/search',
          {
            method: 'POST',
            headers: {
              'x-api-key': EXA_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              query,
              type: 'neural',
              useAutoprompt: true,
              numResults: 10,
              contents: {
                text: { maxCharacters: 1000 },
                highlights: true
              },
              startPublishedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              includeDomains: [
                'nature.com', 'nejm.org', 'thelancet.com', 'jamanetwork.com',
                'bmj.com', 'arxiv.org', 'medrxiv.org', 'biorxiv.org',
                'techcrunch.com', 'wired.com', 'technologyreview.com',
                'venturebeat.com', 'statnews.com', 'healthcareitnews.com',
                'hai.stanford.edu', 'mit.edu', 'harvard.edu'
              ]
            })
          },
          REQUEST_TIMEOUT
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Exa API error: ${response.status} - ${errorText}`)
          continue
        }

        const data = await response.json() as ExaSearchResponse
        const results = data.results || []
        totalResults += results.length

        console.log(`Found ${results.length} results for: ${query}`)

        // Insert results as content items
        for (const result of results) {
          if (result.url && result.title) {
            const summary = result.highlights?.join(' ') || result.text?.substring(0, 500) || null

            const { error } = await supabase.from('content_items').upsert({
              title: result.title,
              url: result.url,
              summary,
              authors: result.author || null,
              pub_date: result.publishedDate?.split('T')[0] || new Date().toISOString().split('T')[0]
            }, { onConflict: 'url', ignoreDuplicates: true })

            if (error) {
              console.log(`Skipping duplicate URL: ${result.url}`)
            } else {
              console.log(`Added: ${result.title}`)
            }
          }
        }

        queryResults.push({ query, results_found: results.length })

        // Rate limit between queries (500ms)
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (queryError) {
        console.error(`Failed query "${query}":`, queryError)
        queryResults.push({ query, results_found: 0 })
        continue
      }
    }

    console.log(`Exa AI fetch completed: ${totalResults} total results from ${RESEARCH_QUERIES.length} queries`)

    return new Response(
      JSON.stringify({
        success: true,
        queries_processed: RESEARCH_QUERIES.length,
        total_results: totalResults,
        query_results: queryResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      function: 'fetch-exa',
      error: errorMessage
    }))
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})