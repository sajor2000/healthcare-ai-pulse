import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PubMedAuthor {
  name: string
}

interface ArticleId {
  idtype: string
  value: string
}

interface PubMedPaper {
  title?: string
  authors?: PubMedAuthor[]
  pubdate?: string
  source?: string
  articleids?: ArticleId[]
}

interface PubMedSearchResult {
  esearchresult?: {
    idlist?: string[]
  }
}

interface PubMedSummaryResult {
  result?: Record<string, PubMedPaper>
}

interface PaperData {
  title: string
  url: string
  authors: string
  pub_date: string
  journal: string
  pmid: string
  doi: string | null
  abstract: string | null
  mesh_terms: string[]
  publication_type: string
  pdf_url: string | null
}

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const REQUEST_TIMEOUT = 30000

// PRD v4.2: 17 comprehensive search terms
const SEARCH_TERMS = [
  // LLM & NLP in Medicine
  'large language model clinical decision support',
  'GPT-4 medical diagnosis accuracy',
  'natural language processing electronic health records',

  // Critical Care AI
  'machine learning critical care mortality prediction',
  'deep learning sepsis early detection ICU',
  'artificial intelligence mechanical ventilation weaning',
  'predictive analytics intensive care unit',

  // Inpatient/Outpatient
  'machine learning hospital readmission prediction',
  'AI clinical deterioration early warning',
  'deep learning outpatient diagnosis screening',

  // Fairness & Equity
  'algorithmic fairness healthcare machine learning',
  'racial bias clinical prediction models',
  'health equity artificial intelligence disparities',

  // Clinical Validation
  'machine learning clinical validation prospective',
  'AI FDA clearance medical device'
]

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

function rateLimit(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function formatPubDate(date: string | undefined): string {
  if (!date) return new Date().toISOString().split('T')[0]
  return date.split(' ')[0] || new Date().toISOString().split('T')[0]
}

function extractDOI(articleIds: ArticleId[] | undefined): string | null {
  if (!articleIds) return null
  const doiEntry = articleIds.find(id => id.idtype === 'doi')
  return doiEntry?.value || null
}

function parseAbstractFromXML(xml: string, pmid: string): string | null {
  // Extract abstract text from efetch XML response
  const abstractMatch = xml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)
  if (!abstractMatch) return null
  
  // Combine all abstract sections
  const abstractParts = abstractMatch.map(part => {
    const labelMatch = part.match(/Label="([^"]+)"/)
    const textMatch = part.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/)
    const text = textMatch?.[1]?.replace(/<[^>]+>/g, '').trim() || ''
    if (labelMatch && labelMatch[1]) {
      return `${labelMatch[1]}: ${text}`
    }
    return text
  })
  
  return abstractParts.join(' ').substring(0, 2000) // Limit abstract length
}

function parseMeshTermsFromXML(xml: string): string[] {
  const meshMatches = xml.match(/<DescriptorName[^>]*>([\s\S]*?)<\/DescriptorName>/g) || []
  return meshMatches
    .map(match => match.replace(/<[^>]+>/g, '').trim())
    .filter((term, index, arr) => term && arr.indexOf(term) === index)
    .slice(0, 10) // Limit to 10 MeSH terms
}

function parsePdfUrlFromXML(xml: string): string | null {
  // Look for PMC link which often has free full text
  const pmcMatch = xml.match(/<ArticleId IdType="pmc">([^<]+)<\/ArticleId>/)
  if (pmcMatch && pmcMatch[1]) {
    return `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcMatch[1]}/pdf/`
  }
  return null
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

  const NCBI_API_KEY = Deno.env.get('NCBI_API_KEY') || ''
  const apiKeyParam = NCBI_API_KEY ? `&api_key=${NCBI_API_KEY}` : ''

  try {
    console.log('Starting enhanced PubMed fetch with abstracts and metadata...')
    const results: PaperData[] = []

    const { data: pubmedSource } = await supabase
      .from('sources')
      .select('id')
      .eq('name', 'PubMed AI Healthcare')
      .single()

    for (const term of SEARCH_TERMS) {
      try {
        // Step 1: Search for paper IDs
        const searchUrl = `${PUBMED_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmax=10&sort=date&retmode=json&datetype=edat&reldate=7${apiKeyParam}`
        const searchRes = await fetchWithTimeout(searchUrl, REQUEST_TIMEOUT)
        const searchData = await searchRes.json() as PubMedSearchResult

        const ids: string[] = searchData.esearchresult?.idlist || []
        console.log(`Found ${ids.length} papers for term: ${term}`)

        if (ids.length > 0) {
          // Step 2: Get summary metadata (includes DOI, authors, journal)
          const summaryUrl = `${PUBMED_BASE}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json${apiKeyParam}`
          const summaryRes = await fetchWithTimeout(summaryUrl, REQUEST_TIMEOUT)
          const summaryData = await summaryRes.json() as PubMedSummaryResult

          // Step 3: Fetch full abstracts and MeSH terms via efetch
          const efetchUrl = `${PUBMED_BASE}/efetch.fcgi?db=pubmed&id=${ids.join(',')}&rettype=abstract&retmode=xml${apiKeyParam}`
          const efetchRes = await fetchWithTimeout(efetchUrl, REQUEST_TIMEOUT)
          const efetchXml = await efetchRes.text()

          // Parse abstracts for each paper from the XML
          const paperAbstracts: Map<string, { abstract: string | null; meshTerms: string[]; pdfUrl: string | null }> = new Map()
          
          for (const id of ids) {
            // Extract individual article section from XML
            const articleRegex = new RegExp(`<PubmedArticle>[\\s\\S]*?<PMID[^>]*>${id}</PMID>[\\s\\S]*?</PubmedArticle>`, 'i')
            const articleMatch = efetchXml.match(articleRegex)
            const articleXml = articleMatch ? articleMatch[0] : ''
            
            paperAbstracts.set(id, {
              abstract: parseAbstractFromXML(articleXml, id),
              meshTerms: parseMeshTermsFromXML(articleXml),
              pdfUrl: parsePdfUrlFromXML(articleXml)
            })
          }

          for (const id of ids) {
            const paper = summaryData.result?.[id]
            if (paper && paper.title) {
              const abstractData = paperAbstracts.get(id)
              const doi = extractDOI(paper.articleids)
              
              const paperData: PaperData = {
                title: paper.title,
                url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
                authors: paper.authors?.map((a: PubMedAuthor) => a.name).join(', ') || 'Unknown',
                pub_date: formatPubDate(paper.pubdate),
                journal: paper.source || 'PubMed',
                pmid: id,
                doi: doi,
                abstract: abstractData?.abstract || null,
                mesh_terms: abstractData?.meshTerms || [],
                publication_type: 'peer-reviewed',
                pdf_url: abstractData?.pdfUrl || null
              }

              results.push(paperData)

              // Upsert with all new fields
              await supabase.from('content_items').upsert({
                source_id: pubmedSource?.id,
                title: paperData.title,
                url: paperData.url,
                summary: `Authors: ${paperData.authors}. Published in ${paperData.journal}.`,
                authors: paperData.authors,
                pub_date: paperData.pub_date,
                pmid: paperData.pmid,
                doi: paperData.doi,
                abstract: paperData.abstract,
                journal_name: paperData.journal,
                mesh_terms: paperData.mesh_terms,
                publication_type: paperData.publication_type,
                pdf_url: paperData.pdf_url
              }, { onConflict: 'url', ignoreDuplicates: true })
            }
          }
        }
      } catch (termError) {
        console.warn(`Failed to fetch term "${term}":`, termError)
        continue
      }

      await rateLimit(400) // NCBI rate limit
    }

    console.log(`Enhanced PubMed fetch completed: ${results.length} papers with abstracts`)

    return new Response(
      JSON.stringify({ success: true, papers: results.length, data: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      function: 'fetch-pubmed',
      error: errorMessage
    }))
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
