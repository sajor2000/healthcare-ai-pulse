import { useState } from "react";
import { ExternalLink, FileText, Copy, Check, BookOpen, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import CitationBadge from "./CitationBadge";
import AbstractView from "./AbstractView";
import { supabase } from "@/integrations/supabase/client";

interface PaperDetailCardProps {
  contentItemId: string;
  title: string;
  authors?: string | null;
  abstract?: string | null;
  doi?: string | null;
  pmid?: string | null;
  arxivId?: string | null;
  journalName?: string | null;
  pubDate?: string | null;
  citationCount?: number;
  pdfUrl?: string | null;
  meshTerms?: string[];
  publicationType?: string;
  url: string;
  trigger?: React.ReactNode;
}

const PaperDetailCard = ({
  contentItemId,
  title,
  authors,
  abstract,
  doi,
  pmid,
  arxivId,
  journalName,
  pubDate,
  citationCount = 0,
  pdfUrl,
  meshTerms = [],
  publicationType = "unknown",
  url,
  trigger,
}: PaperDetailCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [enrichedData, setEnrichedData] = useState<{
    abstract?: string | null;
    citationCount?: number;
    pdfUrl?: string | null;
    meshTerms?: string[];
  } | null>(null);

  const fetchPaperDetails = async () => {
    if (enrichedData) return; // Already fetched
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-paper-details', {
        body: { content_item_id: contentItemId, pmid, doi, arxiv_id: arxivId }
      });

      if (error) throw error;

      if (data?.data) {
        setEnrichedData({
          abstract: data.data.abstract,
          citationCount: data.data.citation_count,
          pdfUrl: data.data.pdf_url,
          meshTerms: data.data.mesh_terms,
        });
      }
    } catch (error) {
      console.error('Failed to fetch paper details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchPaperDetails();
    }
  };

  const displayAbstract = enrichedData?.abstract || abstract;
  const displayCitations = enrichedData?.citationCount ?? citationCount;
  const displayPdfUrl = enrichedData?.pdfUrl || pdfUrl;
  const displayMeshTerms = enrichedData?.meshTerms?.length ? enrichedData.meshTerms : meshTerms;

  const formatCitationAMA = () => {
    const authorList = authors?.split(', ').slice(0, 6).join(', ') || 'Unknown authors';
    const year = pubDate ? new Date(pubDate).getFullYear() : 'n.d.';
    const journal = journalName || 'Unknown journal';
    const doiStr = doi ? ` doi:${doi}` : '';
    return `${authorList}. ${title}. ${journal}. ${year}.${doiStr}`;
  };

  const formatCitationAPA = () => {
    const authorList = authors?.split(', ').slice(0, 3).join(', ') || 'Unknown authors';
    const year = pubDate ? new Date(pubDate).getFullYear() : 'n.d.';
    const journal = journalName || 'Unknown journal';
    const doiStr = doi ? ` https://doi.org/${doi}` : '';
    return `${authorList} (${year}). ${title}. ${journal}.${doiStr}`;
  };

  const copyCitation = async (format: 'ama' | 'apa') => {
    const citation = format === 'ama' ? formatCitationAMA() : formatCitationAPA();
    await navigator.clipboard.writeText(citation);
    setCopiedCitation(format);
    toast({
      title: "Citation copied",
      description: `${format.toUpperCase()} format copied to clipboard`,
    });
    setTimeout(() => setCopiedCitation(null), 2000);
  };

  const copyDOI = async () => {
    if (!doi) return;
    await navigator.clipboard.writeText(`https://doi.org/${doi}`);
    toast({
      title: "DOI copied",
      description: "DOI link copied to clipboard",
    });
  };

  const getPublicationTypeBadge = () => {
    switch (publicationType) {
      case 'peer-reviewed':
        return <Badge variant="default" className="bg-emerald-600">Peer-Reviewed</Badge>;
      case 'preprint':
        return <Badge variant="secondary">Preprint</Badge>;
      default:
        return <Badge variant="outline">{publicationType}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <BookOpen className="h-4 w-4 mr-2" />
            View Paper
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-2 flex-wrap">
            {getPublicationTypeBadge()}
            <CitationBadge count={displayCitations} />
          </div>
          <DialogTitle className="text-xl leading-tight mt-2">{title}</DialogTitle>
          {authors && (
            <p className="text-sm text-muted-foreground">{authors}</p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Metadata row */}
          <div className="flex flex-wrap gap-2 text-sm">
            {journalName && (
              <Badge variant="outline" className="font-normal">
                📰 {journalName}
              </Badge>
            )}
            {pubDate && (
              <Badge variant="outline" className="font-normal">
                📅 {new Date(pubDate).toLocaleDateString()}
              </Badge>
            )}
            {doi && (
              <Badge 
                variant="outline" 
                className="font-normal cursor-pointer hover:bg-secondary"
                onClick={copyDOI}
              >
                🔗 DOI: {doi}
              </Badge>
            )}
            {pmid && (
              <Badge variant="outline" className="font-normal">
                PMID: {pmid}
              </Badge>
            )}
            {arxivId && (
              <Badge variant="outline" className="font-normal">
                arXiv: {arxivId}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Abstract */}
          <div>
            <h4 className="font-medium mb-2">Abstract</h4>
            {isLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Loading abstract...</p>
            ) : (
              <AbstractView abstract={displayAbstract} previewLength={500} />
            )}
          </div>

          {/* MeSH Terms */}
          {displayMeshTerms.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  MeSH Terms
                </h4>
                <div className="flex flex-wrap gap-1">
                  {displayMeshTerms.map((term, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            <h4 className="font-medium">Actions</h4>
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Source
                </a>
              </Button>
              
              {displayPdfUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={displayPdfUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    View PDF
                  </a>
                </Button>
              )}
              
              {pmid && (
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    PubMed
                  </a>
                </Button>
              )}
            </div>

            {/* Citation buttons */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => copyCitation('ama')}
              >
                {copiedCitation === 'ama' ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy AMA Citation
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => copyCitation('apa')}
              >
                {copiedCitation === 'apa' ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy APA Citation
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaperDetailCard;
