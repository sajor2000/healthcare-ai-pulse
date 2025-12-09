import { Trash2, ExternalLink, Newspaper, BookOpen, FileText, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SourceCardProps {
  id: string;
  name: string;
  url: string;
  sourceType: string;
  isActive: boolean;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  index: number;
}

const SourceCard = ({
  id,
  name,
  url,
  sourceType,
  isActive,
  onToggle,
  onDelete,
  index,
}: SourceCardProps) => {
  const getTypeIcon = () => {
    switch (sourceType) {
      case "news":
        return <Newspaper className="h-4 w-4" />;
      case "blog":
        return <BookOpen className="h-4 w-4" />;
      case "journal":
        return <FileText className="h-4 w-4" />;
      case "policy":
        return <Building2 className="h-4 w-4" />;
      default:
        return <Newspaper className="h-4 w-4" />;
    }
  };

  return (
    <div 
      className={cn(
        "glass-card p-4 transition-all duration-300 animate-slide-up",
        !isActive && "opacity-50"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            {getTypeIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{name}</h3>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary truncate"
            >
              {url}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-4">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {sourceType}
          </span>
          <Switch
            checked={isActive}
            onCheckedChange={(checked) => onToggle(id, checked)}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(id)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SourceCard;
