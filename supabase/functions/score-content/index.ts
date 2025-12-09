import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContentItem {
  id: string
  title: string
  summary: string | null
  full_text: string | null
}

interface ScoringRule {
  keywords: string[]
  points: number
}

const SCORING_RULES: Record<string, ScoringRule> = {
  high_value: {
    keywords: ['FDA approval', 'clinical trial', 'peer-reviewed', 'hospital deployment',
               'health equity', 'patient outcomes', 'regulatory', 'HIPAA'],
    points: 20
  },
  medium_value: {
    keywords: ['AI', 'machine learning', 'deep learning', 'LLM', 'GPT', 'clinical decision',
               'diagnostic', 'EHR', 'EMR', 'telehealth', 'remote monitoring'],
    points: 10
  },
  low_value: {
    keywords: ['healthcare', 'health', 'medical', 'patient', 'physician', 'hospital',
               'startup', 'funding', 'research'],
    points: 5
  },
  penalties: {
    keywords: ['sponsored', 'advertisement', 'press release', 'opinion'],
    points: -10
  }
}

function calculateRelevanceScore(title: string, summary: string, fullText: string): number {
  const content = `${title} ${summary} ${fullText}`.toLowerCase()
  let score = 50  // Base score

  for (const [_, rule] of Object.entries(SCORING_RULES)) {
    for (const keyword of rule.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        score += rule.points
      }
    }
  }

  return Math.max(0, Math.min(100, score))
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
    console.log('Starting content scoring...')
    
    const { data: items, error } = await supabase
      .from('content_items')
      .select('id, title, summary, full_text')
      .eq('relevance_score', 0)
      .gte('scraped_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(100)

    if (error) throw error

    let scored = 0

    for (const item of (items as ContentItem[]) || []) {
      const score = calculateRelevanceScore(
        item.title || '',
        item.summary || '',
        item.full_text || ''
      )

      const { error: updateError } = await supabase
        .from('content_items')
        .update({ relevance_score: score })
        .eq('id', item.id)

      if (!updateError) scored++
    }

    console.log(`Content scoring completed: ${scored} items scored`)

    return new Response(
      JSON.stringify({
        success: true,
        items_scored: scored,
        total_found: items?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      function: 'score-content',
      error: errorMessage
    }))
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
