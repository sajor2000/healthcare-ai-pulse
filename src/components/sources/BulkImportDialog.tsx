import { useState } from "react";
import { Upload, Loader2, Link, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ParsedSource {
  name: string;
  url: string;
  sourceType: string;
}

interface BulkImportDialogProps {
  onImport: (sources: ParsedSource[]) => Promise<void>;
}

const extractDomainName = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    // Remove www. prefix
    const domain = hostname.replace(/^www\./, '');
    // Extract main domain name and capitalize
    const parts = domain.split('.');
    if (parts.length >= 2) {
      // Get the main domain (e.g., "techcrunch" from "techcrunch.com")
      const mainDomain = parts[parts.length - 2];
      // Capitalize first letter of each word
      return mainDomain
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return domain;
  } catch {
    return url;
  }
};

const parseUrls = (text: string): string[] => {
  // Split by newlines, commas, or spaces and filter valid URLs
  const lines = text.split(/[\n,\s]+/).filter(Boolean);
  const urls: string[] = [];
  
  for (const line of lines) {
    let url = line.trim();
    // Skip empty lines
    if (!url) continue;
    
    // Add https:// if no protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Validate URL
    try {
      new URL(url);
      urls.push(url);
    } catch {
      // Skip invalid URLs
    }
  }
  
  return [...new Set(urls)]; // Remove duplicates
};

const BulkImportDialog = ({ onImport }: BulkImportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [urlText, setUrlText] = useState("");
  const [sourceType, setSourceType] = useState("news");
  const [importing, setImporting] = useState(false);
  const [parsedUrls, setParsedUrls] = useState<string[]>([]);

  const handleTextChange = (text: string) => {
    setUrlText(text);
    setParsedUrls(parseUrls(text));
  };

  const handleImport = async () => {
    if (parsedUrls.length === 0) return;

    setImporting(true);
    try {
      const sources: ParsedSource[] = parsedUrls.map(url => ({
        name: extractDomainName(url),
        url,
        sourceType,
      }));

      await onImport(sources);
      setUrlText("");
      setParsedUrls([]);
      setSourceType("news");
      setOpen(false);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Bulk Import Sources</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Paste a list of URLs (one per line, comma-separated, or space-separated) to quickly add multiple sources.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="urls">URLs</Label>
            <Textarea
              id="urls"
              value={urlText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={`https://techcrunch.com/category/ai
https://www.healthcareitnews.com
https://medcitynews.com
nature.com/npjdigitalmed
arstechnica.com/ai`}
              className="bg-secondary border-border resize-none h-40 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Supports URLs with or without https://, separated by newlines, commas, or spaces
            </p>
          </div>

          {parsedUrls.length > 0 && (
            <Alert className="bg-secondary/50">
              <Link className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">{parsedUrls.length} valid URL{parsedUrls.length !== 1 ? 's' : ''}</span> detected
                <div className="mt-2 max-h-24 overflow-y-auto text-xs space-y-1">
                  {parsedUrls.slice(0, 5).map((url, i) => (
                    <div key={i} className="text-muted-foreground truncate">
                      • {extractDomainName(url)} ({new URL(url).hostname})
                    </div>
                  ))}
                  {parsedUrls.length > 5 && (
                    <div className="text-muted-foreground">
                      ...and {parsedUrls.length - 5} more
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {urlText && parsedUrls.length === 0 && (
            <Alert variant="destructive" className="bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No valid URLs detected. Please check the format.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="bulk-type">Default Source Type</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="news">📰 News Site</SelectItem>
                <SelectItem value="blog">✍️ Blog / Newsletter</SelectItem>
                <SelectItem value="journal">🔬 Research Journal</SelectItem>
                <SelectItem value="policy">🏛️ Policy / Government</SelectItem>
                <SelectItem value="company">🏢 Company Blog</SelectItem>
                <SelectItem value="podcast">🎙️ Podcast / Media</SelectItem>
                <SelectItem value="social">💬 Social / Community</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This type will be applied to all imported sources. You can edit individual sources later.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={parsedUrls.length === 0 || importing}
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                Import {parsedUrls.length} Source{parsedUrls.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportDialog;
