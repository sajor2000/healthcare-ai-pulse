import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Keywords for relevance scoring
const HIGH_RELEVANCE_KEYWORDS = [
  'fda', 'approval', 'clinical trial', 'diagnosis', 'treatment',
  'patient care', 'healthcare ai', 'medical imaging', 'radiology',
  'pathology', 'ehr', 'electronic health', 'clinical decision',
  'physician', 'hospital', 'health system', 'deep learning',
  'machine learning', 'large language model', 'llm', 'gpt',
  'diagnostic', 'therapeutic', 'regulatory', 'hipaa', 'phi'
]

const MEDIUM_RELEVANCE_KEYWORDS = [
  'artificial intelligence', 'ai', 'digital health', 'telehealth',
  'healthcare', 'medical', 'health tech', 'startup', 'funding',
  'research', 'study', 'algorithm', 'data', 'innovation'
]

function calculateRelevanceScore(title: string, summary: string | null): number {
  const text = `${title} ${summary || ''}`.toLowerCase()
  
  let score = 30 // Base score
  
  // High relevance keywords (+10 each, max +40)
  let highKeywordMatches = 0
  for (const keyword of HIGH_RELEVANCE_KEYWORDS) {
    if (text.includes(keyword)) {
      highKeywordMatches++
      if (highKeywordMatches <= 4) {
        score += 10
      }
    }
  }
  
  // Medium relevance keywords (+5 each, max +20)
  let mediumKeywordMatches = 0
  for (const keyword of MEDIUM_RELEVANCE_KEYWORDS) {
    if (text.includes(keyword)) {
      mediumKeywordMatches++
      if (mediumKeywordMatches <= 4) {
        score += 5
      }
    }
  }
  
  // Boost for specific terms
  if (text.includes('breakthrough') || text.includes('first') || text.includes('new')) {
    score += 5
  }
  
  // Penalize low-quality indicators
  if (text.includes('sponsored') || text.includes('advertisement')) {
    score -= 20
  }
  
  // Cap at 100
  return Math.min(100, Math.max(0, score))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Get unscored content items (score = 0)
    const { data: items, error: fetchError } = await supabase
      .from('content_items')
      .select('*')
      .eq('relevance_score', 0)
      .limit(100)

    if (fetchError) {
      throw fetchError
    }

    console.log(`Scoring ${items?.length || 0} content items`)

    let scored = 0
    for (const item of items || []) {
      const score = calculateRelevanceScore(item.title, item.summary)
      
      const { error: updateError } = await supabase
        .from('content_items')
        .update({ relevance_score: score })
        .eq('id', item.id)
      
      if (!updateError) {
        scored++
        console.log(`Scored "${item.title.substring(0, 50)}..." = ${score}`)
      }
    }

    console.log(`Scored ${scored} items`)

    return new Response(
      JSON.stringify({ success: true, items_scored: scored }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Score content error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
