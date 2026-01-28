import { Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CitationBadgeProps {
  count: number;
  className?: string;
}

const CitationBadge = ({ count, className = "" }: CitationBadgeProps) => {
  if (count <= 0) return null;

  const getVariant = () => {
    if (count >= 100) return "default";
    if (count >= 50) return "secondary";
    return "outline";
  };

  const getLabel = () => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={getVariant()} className={`gap-1 ${className}`}>
            <Quote className="h-3 w-3" />
            {getLabel()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{count} citations</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CitationBadge;
