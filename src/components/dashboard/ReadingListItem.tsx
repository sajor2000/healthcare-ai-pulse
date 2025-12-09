import { ExternalLink, Check, Circle, Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadingListItemProps {
  title: string;
  source: string;
  sourceType: string;
  summary: string;
  relevanceScore: number;
  isRead: boolean;
  isSaved: boolean;
  url: string;
  onToggleRead: () => void;
  onToggleSave: () => void;
  index: number;
}

const ReadingListItem = ({
  title,
  source,
  sourceType,
  summary,
  relevanceScore,
  isRead,
  isSaved,
  url,
  onToggleRead,
  onToggleSave,
  index,
}: ReadingListItemProps) => {
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

  const badge = getSourceTypeBadge(sourceType);

  return (
    <div 
      className={cn(
        "glass-card p-4 transition-all duration-300 hover:border-primary/30 animate-slide-up",
        isRead && "opacity-60"
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
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className={cn(
              "font-medium leading-tight",
              isRead && "line-through text-muted-foreground"
            )}>
              {title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn("score-badge", getScoreClass(relevanceScore))}>
                {relevanceScore}%
              </span>
              <button
                onClick={onToggleSave}
                className="transition-colors hover:text-primary"
                aria-label={isSaved ? "Remove from saved" : "Save for later"}
              >
                {isSaved ? (
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {summary}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
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
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Read article
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingListItem;
