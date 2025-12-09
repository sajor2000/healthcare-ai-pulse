import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// PRD v4.2: 19 specialized search queries
const QUERIES = [
  // Healthcare AI LLM/ML/Deep Learning
  "healthcare AI LLM large language model clinical applications news",
  "machine learning deep learning hospital inpatient care deployment",
  "GPT-4 Claude medical diagnosis clinical decision support",

  // Critical Care / ICU / Inpatient
  "artificial intelligence critical illness sepsis prediction ICU mortality",
  "machine learning ICU early warning score clinical deterioration",
  "deep learning critical care ventilator weaning prediction",

  // Outpatient / Ambulatory
  "AI outpatient ambulatory care diagnosis screening primary care",
  "machine learning remote patient monitoring telehealth",

  // Big Tech AI Strategy
  "OpenAI healthcare medical AI strategy GPT clinical enterprise",
  "Anthropic Claude healthcare medical applications enterprise",
  "Microsoft Azure health AI Nuance DAX copilot ambient documentation",

  // Health Equity & Fairness
  "health equity AI algorithm bias clinical decision racial disparities",
  "ML fairness healthcare algorithmic bias FDA regulation guidance",

  // Epic & EHR
  "Epic EHR AI integration machine learning clinical workflows Cosmos",

  // ROI & Success Stories
  "healthcare AI ROI return on investment case study implementation",
  "AI success stories hospital health system deployment outcomes",
  "healthcare AI value realization cost savings efficiency gains"
]

// Domain filter prioritizing peer-reviewed journals, academic sources, top AI tech blogs
const DOMAIN_FILTER = [
  // Peer-reviewed journals (PRIORITY)
  'nature.com',
  'nejm.org',
  'thelancet.com',
  'jamanetwork.com',
  'bmj.com',
  'cell.com',
  'plos.org',
  'jmir.org',
  'science.org',

  // Academic institutions
  'arxiv.org',
  'medrxiv.org',
  'biorxiv.org',
  'hai.stanford.edu',
  'mit.edu',
  'harvard.edu',

  // Top-tier AI tech blogs & newsletters
  'techcrunch.com',
  'wired.com',
  'technologyreview.com',
  'theverge.com',
  'arstechnica.com',
  'venturebeat.com',

  // AI-specific newsletters/blogs
  'bensbites.com',
  'thesequence.substack.com',
  'importai.substack.com',
  'jack-clark.net',
  'deeplearning.ai',

  // Healthcare IT news
  'healthcareitnews.com',
  'statnews.com',
  'mobihealthnews.com',
  'hitconsultant.net',
  'beckershospitalreview.com'
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY')
  if (!PERPLEXITY_API_KEY) {
    console.error('PERPLEXITY_API_KEY not configured')
    return new Response(
      JSON.stringify({ error: 'PERPLEXITY_API_KEY not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const results = []
    let totalCitationsFound = 0

    for (const query of QUERIES) {
      console.log(`Searching: ${query}`)
      
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a healthcare AI news researcher. Find the most recent and relevant news articles, research papers, and industry reports. Focus on peer-reviewed journals, academic sources, and credible healthcare IT publications. Return specific article URLs when possible.'
            },
            { role: 'user', content: query }
          ],
          search_recency_filter: 'week',
          search_domain_filter: DOMAIN_FILTER,
          max_tokens: 1024,
          temperature: 0.2
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Perplexity API error: ${response.status} - ${errorText}`)
        continue
      }

      const data = await response.json()
      console.log(`Perplexity response for "${query}":`, JSON.stringify(data).substring(0, 500))

      // Extract citations from response
      const citations = data.citations || []
      totalCitationsFound += citations.length

      // Store search results with URL count
      await supabase.from('perplexity_searches').insert({
        query,
        response: data,
        citations: citations,
        urls_discovered: citations.length
      })

      // Insert discovered URLs as content items
      for (const citation of citations) {
        if (citation) {
          const url = typeof citation === 'string' ? citation : citation.url
          const title = typeof citation === 'object' ? citation.title : 'Discovered Article'
          const snippet = typeof citation === 'object' ? citation.snippet : null
          
          if (url) {
            const { error } = await supabase.from('content_items').upsert({
              title: title || 'Untitled',
              url: url,
              summary: snippet,
              pub_date: new Date().toISOString().split('T')[0]
            }, { onConflict: 'url', ignoreDuplicates: true })
            
            if (error) {
              console.log(`Skipping duplicate URL: ${url}`)
            } else {
              console.log(`Added content item: ${title}`)
            }
          }
        }
      }

      results.push({ query, citations_found: citations.length })

      // Rate limit between queries (1.5s to be safe)
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    console.log('Perplexity searches completed:', {
      queries_processed: QUERIES.length,
      total_citations: totalCitationsFound,
      results
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        queries_processed: QUERIES.length, 
        total_citations_found: totalCitationsFound,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Perplexity search error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
