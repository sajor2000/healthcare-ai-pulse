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

// PRD v4.2: 5-tier scoring system with updated point values
const SCORING_RULES: Record<string, ScoringRule> = {
  peer_reviewed: {
    keywords: [
      'NEJM', 'New England Journal', 'Lancet', 'JAMA', 'Nature Medicine',
      'Nature Digital', 'BMJ', 'peer-reviewed', 'peer reviewed',
      'randomized controlled trial', 'RCT', 'meta-analysis', 'systematic review',
      'double-blind', 'placebo-controlled', 'cohort study', 'PLOS', 'Cell'
    ],
    points: 25
  },
  academic: {
    keywords: [
      'arXiv', 'medRxiv', 'bioRxiv', 'Stanford', 'MIT', 'Harvard',
      'Mayo Clinic', 'Johns Hopkins', 'Cleveland Clinic', 'preprint',
      'university research', 'academic medical center', 'research institute'
    ],
    points: 20
  },
  clinical_validation: {
    keywords: [
      'FDA clearance', 'FDA approval', 'FDA 510k', 'CE mark', 'AUC',
      'sensitivity', 'specificity', 'sepsis', 'ICU', 'clinical trial',
      'validation study', 'clinical validation', 'real-world evidence',
      'prospective study', 'retrospective analysis', 'patient outcomes'
    ],
    points: 15
  },
  tech_blogs: {
    keywords: [
      'MIT Technology Review', 'Wired', 'VentureBeat', 'Import AI',
      'TechCrunch', 'Ars Technica', 'The Batch', 'deeplearning.ai',
      'The Verge', 'AI newsletter'
    ],
    points: 10
  },
  penalties: {
    keywords: [
      'sponsored', 'advertisement', 'press release', 'paid content',
      'promotional', 'sponsored content', 'partner content', 'advertorial'
    ],
    points: -15
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
