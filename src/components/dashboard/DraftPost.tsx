import { useState } from "react";
import { Copy, Check, Send, Pencil, X, Archive, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type DraftPostStatus = "draft" | "approved" | "archived";

interface DraftPostProps {
  id: string;
  content: string;
  postType: string;
  status: DraftPostStatus;
  sourceUrl?: string;
  onUpdate: (id: string, content: string) => void;
  onApprove: (id: string) => void;
  onArchive: (id: string) => void;
  index: number;
}

const MAX_CHARS = 3000;
const WARNING_THRESHOLD = 2800;

const DraftPost = ({
  id,
  content,
  postType,
  status,
  sourceUrl,
  onUpdate,
  onApprove,
  onArchive,
  index,
}: DraftPostProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [copied, setCopied] = useState(false);

  const charCount = editedContent.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount >= WARNING_THRESHOLD;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedContent);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Post content has been copied. Paste it into LinkedIn!",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (isOverLimit) {
      toast({
        title: "Post too long",
        description: `LinkedIn posts must be under ${MAX_CHARS} characters.`,
        variant: "destructive",
      });
      return;
    }
    onUpdate(id, editedContent);
    setIsEditing(false);
    toast({
      title: "Draft saved",
      description: "Your changes have been saved.",
    });
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const getPostTypeBadge = (type: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      research: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
      news: { bg: "bg-blue-500/20", text: "text-blue-400" },
      insight: { bg: "bg-purple-500/20", text: "text-purple-400" },
      trend: { bg: "bg-amber-500/20", text: "text-amber-400" },
      opinion: { bg: "bg-rose-500/20", text: "text-rose-400" },
    };
    return badges[type] || badges.insight;
  };

  const badge = getPostTypeBadge(postType);

  const getStatusBadge = () => {
    switch (status) {
      case "approved":
        return <span className="text-xs font-medium text-success bg-success/20 px-2 py-0.5 rounded">Approved</span>;
      case "archived":
        return <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">Archived</span>;
      default:
        return <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">Draft</span>;
    }
  };

  return (
    <div 
      className="glass-card p-5 animate-slide-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded",
            badge.bg,
            badge.text
          )}>
            {postType}
          </span>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-1">
          {!isEditing && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onArchive(id)}
                className="h-8 w-8 hover:text-destructive"
                title="Archive"
              >
                <Archive className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className={cn(
              "min-h-[200px] bg-secondary/50 border-border focus:border-primary resize-none",
              isOverLimit && "border-destructive focus:border-destructive"
            )}
          />
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-xs font-mono",
              isOverLimit ? "text-destructive" : isNearLimit ? "text-warning" : "text-muted-foreground"
            )}>
              {charCount} / {MAX_CHARS}
              {isNearLimit && !isOverLimit && " ⚠️ Approaching limit"}
              {isOverLimit && " ❌ Over limit"}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isOverLimit}>
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3 max-h-[200px] overflow-y-auto">
            {editedContent}
          </p>
          
          {/* Character count display */}
          <div className="flex items-center justify-between mb-3">
            <span className={cn(
              "text-xs font-mono",
              charCount >= WARNING_THRESHOLD ? "text-warning" : "text-muted-foreground"
            )}>
              {charCount} / {MAX_CHARS} characters
            </span>
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                View source
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex-1"
            >
              {copied ? (
                <Check className="h-4 w-4 mr-1 text-success" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              variant={status === "approved" ? "outline" : "glow"}
              size="sm"
              onClick={() => onApprove(id)}
              disabled={status === "approved"}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-1" />
              {status === "approved" ? "Approved" : "Approve"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default DraftPost;
