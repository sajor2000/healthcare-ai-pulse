import { useState } from "react";
import { Copy, Check, Send, Pencil, X } from "lucide-react";
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
  onUpdate: (id: string, content: string) => void;
  onApprove: (id: string) => void;
  index: number;
}

const DraftPost = ({
  id,
  content,
  postType,
  status,
  onUpdate,
  onApprove,
  index,
}: DraftPostProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedContent);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Post content has been copied.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
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
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {postType}
          </span>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[150px] bg-secondary/50 border-border focus:border-primary resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4">
            {editedContent}
          </p>
          
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
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant={status === "approved" ? "success" : "glow"}
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
