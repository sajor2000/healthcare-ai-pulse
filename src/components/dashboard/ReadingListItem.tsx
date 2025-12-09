import { ExternalLink, Check, Circle, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Calendar, Archive, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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

  const getSourceTypeBadge = (type: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      news: { bg: "bg-blue-500/20", text: "text-blue-400", label: "News" },
      blog: { bg: "bg-purple-500/20", text: "text-purple-400", label: "Blog" },
      journal: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Research" },
      policy: { bg: "bg-orange-500/20", text: "text-orange-400", label: "Policy" },
    };
    return badges[type] || badges.news;
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

  const badge = getSourceTypeBadge(sourceType);
  const hasKeyPoints = keyPoints && keyPoints.length > 0;

  return (
    <div 
      className={cn(
        "glass-card p-4 transition-all duration-300 hover:border-primary/30 animate-slide-up",
        isRead && "opacity-50 bg-muted/20"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
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
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <h3 className={cn(
                "font-medium leading-tight text-base",
                isRead && "line-through text-muted-foreground"
              )}>
                {title}
              </h3>
              {/* Meta info */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded",
                  badge.bg,
                  badge.text
                )}>
                  {badge.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {source}
                </span>
                {pubDate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(pubDate)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn("score-badge", getScoreClass(relevanceScore))}>
                {relevanceScore}%
              </span>
            </div>
          </div>
          
          {/* Summary - Always show more */}
          <div className="mb-3">
            <p className={cn(
              "text-sm text-foreground/80 leading-relaxed",
              !expanded && "line-clamp-3"
            )}>
              {summary}
            </p>
          </div>

          {/* Key Points Section - Prominent display */}
          {hasKeyPoints && (
            <div className={cn(
              "mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20",
              !expanded && "hidden"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold text-primary">AI Key Takeaways</p>
              </div>
              <ul className="space-y-2">
                {keyPoints.map((point, i) => (
                  <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">→</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick preview of first key point when collapsed */}
          {hasKeyPoints && !expanded && (
            <div className="mb-3 flex items-start gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary/60 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1 italic">{keyPoints[0]}</span>
            </div>
          )}
          
          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors px-2 py-1 rounded hover:bg-primary/10"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    {hasKeyPoints ? "Show key points" : "Expand"}
                  </>
                )}
              </button>
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