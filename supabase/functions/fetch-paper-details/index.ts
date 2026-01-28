import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaperDetails {
  title: string
  authors: string
  abstract: string | null
  doi: string | null
  pmid: string | null
  arxiv_id: string | null
  journal_name: string | null
  pub_date: string | null
  citation_count: number
  pdf_url: string | null
  mesh_terms: string[]
  publication_type: string
}

interface OpenAlexWork {
  id: string
  title: string
  cited_by_count: number
  open_access?: {
    oa_url?: string
  }
  authorships?: Array<{
    author: {
      display_name: string
    }
  }>
  primary_location?: {
    source?: {
      display_name: string
    }
  }
}

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const OPENALEX_BASE = 'https://api.openalex.org'
const REQUEST_TIMEOUT = 15000

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

async function fetchFromOpenAlex(doi: string | null, pmid: string | null): Promise<{ citationCount: number; pdfUrl: string | null }> {
  let identifier = ''
  if (doi) {
    identifier = `doi:${doi}`
  } else if (pmid) {
    identifier = `pmid:${pmid}`
  } else {
    return { citationCount: 0, pdfUrl: null }
  }

  try {
    const url = `${OPENALEX_BASE}/works/${identifier}?mailto=healthcare-ai-daily@example.com`
    const response = await fetchWithTimeout(url, REQUEST_TIMEOUT)
    
    if (!response.ok) {
      console.log(`OpenAlex lookup failed for ${identifier}: ${response.status}`)
      return { citationCount: 0, pdfUrl: null }
    }

    const data = await response.json() as OpenAlexWork
    return {
      citationCount: data.cited_by_count || 0,
      pdfUrl: data.open_access?.oa_url || null
    }
  } catch (error) {
    console.warn('OpenAlex fetch error:', error)
    return { citationCount: 0, pdfUrl: null }
  }
}

async function fetchPubMedAbstract(pmid: string, apiKey: string): Promise<{ abstract: string | null; meshTerms: string[] }> {
  try {
    const apiKeyParam = apiKey ? `&api_key=${apiKey}` : ''
    const url = `${PUBMED_BASE}/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=xml${apiKeyParam}`
    const response = await fetchWithTimeout(url, REQUEST_TIMEOUT)
    const xml = await response.text()

    // Parse abstract
    const abstractMatch = xml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)
    let abstract: string | null = null
    if (abstractMatch) {
      const parts = abstractMatch.map(part => {
        const labelMatch = part.match(/Label="([^"]+)"/)
        const textMatch = part.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/)
        const text = textMatch?.[1]?.replace(/<[^>]+>/g, '').trim() || ''
        if (labelMatch && labelMatch[1]) {
          return `${labelMatch[1]}: ${text}`
        }
        return text
      })
      abstract = parts.join(' ')
    }

    // Parse MeSH terms
    const meshMatches = xml.match(/<DescriptorName[^>]*>([\s\S]*?)<\/DescriptorName>/g) || []
    const meshTerms = meshMatches
      .map(match => match.replace(/<[^>]+>/g, '').trim())
      .filter((term, index, arr) => term && arr.indexOf(term) === index)
      .slice(0, 15)

    return { abstract, meshTerms }
  } catch (error) {
    console.warn('PubMed abstract fetch error:', error)
    return { abstract: null, meshTerms: [] }
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
    const { content_item_id, pmid, doi, arxiv_id } = await req.json()
    
    if (!content_item_id && !pmid && !doi && !arxiv_id) {
      return new Response(
        JSON.stringify({ error: 'Must provide content_item_id, pmid, doi, or arxiv_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Fetching paper details for:', { content_item_id, pmid, doi, arxiv_id })

    // If content_item_id provided, fetch existing data first
    let existingItem = null
    if (content_item_id) {
      const { data } = await supabase
        .from('content_items')
        .select('*')
        .eq('id', content_item_id)
        .single()
      existingItem = data
    }

    const searchPmid = pmid || existingItem?.pmid
    const searchDoi = doi || existingItem?.doi
    const searchArxivId = arxiv_id || existingItem?.arxiv_id

    const NCBI_API_KEY = Deno.env.get('NCBI_API_KEY') || ''

    // Fetch citation count and open access PDF from OpenAlex
    const openAlexData = await fetchFromOpenAlex(searchDoi, searchPmid)

    // Fetch abstract and MeSH terms from PubMed if we have a PMID
    let pubmedData = { abstract: existingItem?.abstract || null, meshTerms: existingItem?.mesh_terms || [] }
    if (searchPmid && (!existingItem?.abstract || existingItem.abstract === null)) {
      pubmedData = await fetchPubMedAbstract(searchPmid, NCBI_API_KEY)
    }

    // Determine PDF URL (prefer OpenAlex open access, then existing)
    const pdfUrl = openAlexData.pdfUrl || existingItem?.pdf_url || null

    // Build response
    const paperDetails: PaperDetails = {
      title: existingItem?.title || '',
      authors: existingItem?.authors || '',
      abstract: pubmedData.abstract || existingItem?.abstract || null,
      doi: searchDoi || null,
      pmid: searchPmid || null,
      arxiv_id: searchArxivId || null,
      journal_name: existingItem?.journal_name || null,
      pub_date: existingItem?.pub_date || null,
      citation_count: openAlexData.citationCount,
      pdf_url: pdfUrl,
      mesh_terms: pubmedData.meshTerms.length > 0 ? pubmedData.meshTerms : (existingItem?.mesh_terms || []),
      publication_type: existingItem?.publication_type || 'unknown'
    }

    // Update the content_item with new data if we have a content_item_id
    if (content_item_id && (openAlexData.citationCount > 0 || pubmedData.abstract || pdfUrl)) {
      await supabase
        .from('content_items')
        .update({
          citation_count: openAlexData.citationCount,
          abstract: pubmedData.abstract || existingItem?.abstract,
          pdf_url: pdfUrl,
          mesh_terms: pubmedData.meshTerms.length > 0 ? pubmedData.meshTerms : existingItem?.mesh_terms
        })
        .eq('id', content_item_id)
    }

    console.log('Paper details fetched successfully:', {
      title: paperDetails.title.substring(0, 50),
      citationCount: paperDetails.citation_count,
      hasAbstract: !!paperDetails.abstract,
      hasPdf: !!paperDetails.pdf_url
    })

    return new Response(
      JSON.stringify({ success: true, data: paperDetails }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('fetch-paper-details error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
