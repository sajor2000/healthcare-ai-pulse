import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AbstractViewProps {
  abstract: string | null;
  previewLength?: number;
  className?: string;
}

const AbstractView = ({ abstract, previewLength = 200, className = "" }: AbstractViewProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!abstract) {
    return (
      <p className={`text-sm text-muted-foreground italic ${className}`}>
        No abstract available
      </p>
    );
  }

  const needsExpansion = abstract.length > previewLength;
  const previewText = needsExpansion 
    ? abstract.substring(0, previewLength).trim() + "..."
    : abstract;

  if (!needsExpansion) {
    return (
      <p className={`text-sm text-muted-foreground ${className}`}>
        {abstract}
      </p>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className="text-sm text-muted-foreground">
        {isOpen ? (
          <CollapsibleContent className="animate-in fade-in-0">
            {abstract}
          </CollapsibleContent>
        ) : (
          <span>{previewText}</span>
        )}
      </div>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="mt-1 h-6 px-2 text-xs text-primary hover:text-primary/80"
        >
          {isOpen ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Read more
            </>
          )}
        </Button>
      </CollapsibleTrigger>
    </Collapsible>
  );
};

export default AbstractView;
