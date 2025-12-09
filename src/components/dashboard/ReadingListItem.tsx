import { ExternalLink, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadingListItemProps {
  title: string;
  source: string;
  summary: string;
  relevanceScore: number;
  isRead: boolean;
  url: string;
  onToggleRead: () => void;
  index: number;
}

const ReadingListItem = ({
  title,
  source,
  summary,
  relevanceScore,
  isRead,
  url,
  onToggleRead,
  index,
}: ReadingListItemProps) => {
  const getScoreClass = (score: number) => {
    if (score >= 80) return "score-high";
    if (score >= 50) return "score-medium";
    return "score-low";
  };

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
            <span className={cn("score-badge flex-shrink-0", getScoreClass(relevanceScore))}>
              {relevanceScore}%
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {summary}
          </p>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {source}
            </span>
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
