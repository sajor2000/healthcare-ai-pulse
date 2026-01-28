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
  source_id: string | null
}

interface Source {
  id: string
  priority: number | null
}

interface ScoringRule {
  keywords: string[]
  points: number
}

// PRD v4.2: 6-tier scoring system with comprehensive keywords
const SCORING_RULES: Record<string, ScoringRule> = {
  peer_reviewed: {
    keywords: [
      'NEJM', 'New England Journal', 'Lancet', 'JAMA', 'Nature Medicine',
      'Nature Digital', 'BMJ', 'peer-reviewed', 'peer reviewed',
      'randomized controlled trial', 'RCT', 'meta-analysis', 'systematic review',
      'double-blind', 'placebo-controlled', 'cohort study', 'PLOS', 'Cell',
      'Science', 'clinical trial'
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
      'FDA clearance', 'FDA approval', 'FDA approved', 'FDA cleared', 'FDA 510k',
      'CE mark', 'AUC', 'sensitivity', 'specificity', 'sepsis', 'ICU',
      'clinical trial', 'validation study', 'clinical validation', 'real-world evidence',
      'prospective study', 'retrospective analysis', 'patient outcomes',
      'critical care', 'mortality prediction', 'health equity', 'algorithmic bias',
      'ROI', 'return on investment', 'success story', 'case study'
    ],
    points: 15
  },
  tech_blogs: {
    keywords: [
      'MIT Technology Review', 'Wired', 'VentureBeat', 'Import AI',
      'TechCrunch', 'Ars Technica', 'The Batch', 'deeplearning.ai',
      'The Verge', 'AI newsletter', 'LLM', 'GPT-4', 'Claude',
      'Epic', 'Cosmos', 'OpenAI', 'Anthropic', 'Google DeepMind'
    ],
    points: 10
  },
  basic_healthcare: {
    keywords: [
      'AI', 'hospital', 'physician', 'telehealth', 'digital health'
    ],
    points: 5
  },
  penalties: {
    keywords: [
      'sponsored', 'advertisement', 'press release', 'paid content',
      'promotional', 'sponsored content', 'partner content', 'advertorial',
      'affiliate'
    ],
    points: -15
  }
}

// Source priority bonus: maps priority (1-5) to bonus points
// Priority 3 is neutral (0 bonus), higher adds points, lower subtracts
const PRIORITY_BONUS: Record<number, number> = {
  1: -10,  // Low priority: penalty
  2: -5,   // Below average: small penalty
  3: 0,    // Normal: no change
  4: 10,   // High priority: bonus
  5: 20,   // Critical: significant bonus
}

function calculateRelevanceScore(
  title: string, 
  summary: string, 
  fullText: string,
  sourcePriority: number = 3
): number {
  const content = `${title} ${summary} ${fullText}`.toLowerCase()
  let score = 50  // Base score

  // Apply keyword-based scoring
  for (const [_, rule] of Object.entries(SCORING_RULES)) {
    for (const keyword of rule.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        score += rule.points
      }
    }
  }

  // Apply source priority bonus/penalty
  const priorityBonus = PRIORITY_BONUS[sourcePriority] ?? 0
  score += priorityBonus

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
    console.log('Starting content scoring with source priority...')
    
    // Fetch content items that need scoring
    const { data: items, error } = await supabase
      .from('content_items')
      .select('id, title, summary, full_text, source_id')
      .eq('relevance_score', 0)
      .gte('scraped_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(100)

    if (error) throw error

    // Fetch all sources with their priorities
    const { data: sourcesData, error: sourcesError } = await supabase
      .from('sources')
      .select('id, priority')

    if (sourcesError) {
      console.warn('Could not fetch source priorities, using defaults:', sourcesError.message)
    }

    // Create a map of source_id to priority
    const sourcePriorityMap = new Map<string, number>()
    if (sourcesData) {
      for (const source of sourcesData as Source[]) {
        sourcePriorityMap.set(source.id, source.priority ?? 3)
      }
    }

    let scored = 0

    for (const item of (items as ContentItem[]) || []) {
      // Get the source priority for this content item
      const sourcePriority = item.source_id 
        ? (sourcePriorityMap.get(item.source_id) ?? 3)
        : 3

      const score = calculateRelevanceScore(
        item.title || '',
        item.summary || '',
        item.full_text || '',
        sourcePriority
      )

      const { error: updateError } = await supabase
        .from('content_items')
        .update({ relevance_score: score })
        .eq('id', item.id)

      if (!updateError) {
        scored++
        if (sourcePriority !== 3) {
          console.log(`Scored item "${item.title?.substring(0, 50)}..." with priority ${sourcePriority} bonus: ${score}`)
        }
      }
    }

    console.log(`Content scoring completed: ${scored} items scored (with source priority factors)`)

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
