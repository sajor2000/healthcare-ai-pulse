import { ExternalLink, Check, Circle, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Calendar, Archive, Sparkles, Newspaper, BookOpen, FileText, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ReadingListItemProps {
  title: string;
  source: string;
  sourceType: string;
  summary: string;
  keyPoints?: string[];
  relevanceScore: number;
  isRead: boolean;
  isSaved: boolean;
  url: string;
  pubDate?: string;
  onToggleRead: () => void;
  onToggleSave: () => void;
  onSkip?: () => void;
  index: number;
}

const ReadingListItem = ({
  title,
  source,
  sourceType,
  summary,
  keyPoints,
  relevanceScore,
  isRead,
  isSaved,
  url,
  pubDate,
  onToggleRead,
  onToggleSave,
  onSkip,
  index,
}: ReadingListItemProps) => {
  const [expanded, setExpanded] = useState(false);

  const getScoreClass = (score: number) => {
    if (score >= 80) return "score-high";
    if (score >= 50) return "score-medium";
    return "score-low";
  };

  const getSourceTypeConfig = (type: string) => {
    const configs: Record<string, { bg: string; border: string; text: string; label: string; icon: typeof Newspaper }> = {
      news: { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400", label: "News", icon: Newspaper },
      blog: { bg: "bg-purple-500/15", border: "border-purple-500/30", text: "text-purple-400", label: "Blog", icon: FileText },
      journal: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400", label: "Research", icon: BookOpen },
      policy: { bg: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-400", label: "Policy", icon: Building2 },
    };
    return configs[type] || configs.news;
  };

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return date;
    }
  };

  const typeConfig = getSourceTypeConfig(sourceType);
  const TypeIcon = typeConfig.icon;
  const hasKeyPoints = keyPoints && keyPoints.length > 0;

  return (
    <div 
      className={cn(
        "glass-card p-4 transition-all duration-300 hover:border-primary/30 animate-slide-up",
        isRead && "opacity-50 bg-muted/20"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Article Type Banner */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-t-lg -mx-4 -mt-4 mb-3 border-b",
        typeConfig.bg,
        typeConfig.border
      )}>
        <TypeIcon className={cn("h-4 w-4", typeConfig.text)} />
        <span className={cn("text-xs font-semibold uppercase tracking-wide", typeConfig.text)}>
          {typeConfig.label}
        </span>
        <span className="text-xs text-muted-foreground">•</span>
        <span className="text-xs text-muted-foreground truncate">{source}</span>
        {pubDate && (
          <>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(pubDate)}
            </span>
          </>
        )}
        <div className="ml-auto">
          <span className={cn("score-badge text-xs", getScoreClass(relevanceScore))}>
            {relevanceScore}%
          </span>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <button
          onClick={onToggleRead}
          className="mt-1 flex-shrink-0 transition-colors hover:text-primary"
          aria-label={isRead ? "Mark as unread" : "Mark as read"}
        >
          {isRead ? (
            <Check className="h-5 w-5 text-success" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          {/* Title - More prominent */}
          <h3 className={cn(
            "font-semibold leading-tight text-lg mb-2",
            isRead && "line-through text-muted-foreground"
          )}>
            {title}
          </h3>
          
          {/* AI Summary Section - Always Visible */}
          <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Summary</span>
            </div>
            <p className={cn(
              "text-sm text-foreground leading-relaxed",
              !expanded && "line-clamp-3"
            )}>
              {summary || "Summary being generated..."}
            </p>
          </div>

          {/* Key Points Section - Expanded */}
          {hasKeyPoints && expanded && (
            <div className="mb-3 p-3 rounded-lg bg-accent/30 border border-accent/50">
              <p className="text-xs font-semibold text-accent-foreground uppercase tracking-wide mb-2">
                Key Takeaways
              </p>
              <ul className="space-y-2">
                {keyPoints.map((point, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5 flex-shrink-0">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick preview of first key point when collapsed */}
          {hasKeyPoints && !expanded && (
            <div className="mb-3 flex items-start gap-2 text-sm text-muted-foreground italic">
              <span className="text-primary">→</span>
              <span className="line-clamp-1">{keyPoints[0]}</span>
            </div>
          )}
          
          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              {(hasKeyPoints || summary?.length > 200) && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors px-2 py-1 rounded hover:bg-primary/10"
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      {hasKeyPoints ? "Key points" : "More"}
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleSave}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  isSaved ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
                aria-label={isSaved ? "Remove from saved" : "Save for later"}
                title={isSaved ? "Saved" : "Save for later"}
              >
                {isSaved ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </button>
              
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Skip this article"
                  title="Skip / Not interested"
                >
                  <Archive className="h-4 w-4" />
                </button>
              )}
              
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline px-2 py-1 rounded hover:bg-primary/10 transition-colors"
              >
                Read
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingListItem;