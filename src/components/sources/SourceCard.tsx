import { Trash2, ExternalLink, Newspaper, BookOpen, FileText, Building2, Briefcase, Mic, MessageCircle } from "lucide-react";
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

const sourceTypeConfig: Record<string, { icon: typeof Newspaper; label: string; color: string }> = {
  news: { icon: Newspaper, label: "News", color: "text-blue-400 bg-blue-500/10" },
  blog: { icon: BookOpen, label: "Blog", color: "text-purple-400 bg-purple-500/10" },
  journal: { icon: FileText, label: "Research", color: "text-emerald-400 bg-emerald-500/10" },
  policy: { icon: Building2, label: "Policy", color: "text-orange-400 bg-orange-500/10" },
  company: { icon: Briefcase, label: "Company", color: "text-cyan-400 bg-cyan-500/10" },
  podcast: { icon: Mic, label: "Podcast", color: "text-pink-400 bg-pink-500/10" },
  social: { icon: MessageCircle, label: "Social", color: "text-yellow-400 bg-yellow-500/10" },
};

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
  const config = sourceTypeConfig[sourceType] || sourceTypeConfig.news;
  const TypeIcon = config.icon;

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
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            config.color
          )}>
            <TypeIcon className="h-4 w-4" />
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
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full capitalize",
            config.color
          )}>
            {config.label}
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
