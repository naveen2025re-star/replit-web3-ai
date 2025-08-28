import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Share, Globe, Lock, Users, Eye } from "lucide-react";

interface ShareAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditId: string;
  currentTitle?: string;
  currentDescription?: string;
  currentTags?: string[];
  isCurrentlyPublic?: boolean;
}

const predefinedTags = [
  "DeFi", "NFT", "Token", "DAO", "Staking", "Governance", "Oracle", "Bridge",
  "Solidity", "Vyper", "Rust", "Move", "Cairo",
  "Ethereum", "Polygon", "Arbitrum", "Optimism", "BSC", "Avalanche",
  "Security", "Gas Optimization", "Logic Error", "Reentrancy", "Overflow",
  "High Risk", "Medium Risk", "Low Risk", "Informational"
];

export function ShareAuditDialog({
  open,
  onOpenChange,
  auditId,
  currentTitle = "",
  currentDescription = "",
  currentTags = [],
  isCurrentlyPublic = false,
}: ShareAuditDialogProps) {
  const [isPublic, setIsPublic] = useState(isCurrentlyPublic);
  const [title, setTitle] = useState(currentTitle);
  const [description, setDescription] = useState(currentDescription);
  const [tags, setTags] = useState<string[]>(currentTags);
  const [customTag, setCustomTag] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateVisibilityMutation = useMutation({
    mutationFn: async (data: {
      isPublic: boolean;
      publicTitle?: string;
      publicDescription?: string;
      tags?: string[];
    }) => {
      return apiRequest(`/api/audits/${auditId}/visibility`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: isPublic ? "Audit Made Public" : "Audit Made Private",
        description: isPublic 
          ? "Your audit is now visible in the community section."
          : "Your audit is now private and only visible to you.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/community/audits"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update audit visibility. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to update visibility:", error);
    },
  });

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addCustomTag = () => {
    if (customTag.trim()) {
      addTag(customTag.trim());
      setCustomTag("");
    }
  };

  const handleSubmit = () => {
    if (isPublic && !title.trim()) {
      toast({
        title: "Title Required",
        description: "Please provide a title for your public audit.",
        variant: "destructive",
      });
      return;
    }

    updateVisibilityMutation.mutate({
      isPublic,
      publicTitle: isPublic ? title.trim() : undefined,
      publicDescription: isPublic ? description.trim() : undefined,
      tags: isPublic ? tags : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="h-5 w-5" />
            Share Audit with Community
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Make your audit public to help others learn from your security analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Public/Private Toggle */}
          <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-5 w-5 text-green-400" />
              ) : (
                <Lock className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <div className="font-medium">
                  {isPublic ? "Public Audit" : "Private Audit"}
                </div>
                <div className="text-sm text-gray-400">
                  {isPublic 
                    ? "Visible to all community members"
                    : "Only visible to you"
                  }
                </div>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              data-testid="switch-public-private"
            />
          </div>

          {/* Public Audit Settings */}
          {isPublic && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., DeFi Token Security Audit"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                  data-testid="input-audit-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what makes this audit interesting or noteworthy..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 min-h-[100px]"
                  data-testid="textarea-audit-description"
                />
              </div>

              <div className="space-y-2">
                <Label>Tags ({tags.length}/10)</Label>
                
                {/* Selected Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-blue-900/50 text-blue-300 hover:bg-blue-900/70 cursor-pointer"
                        onClick={() => removeTag(tag)}
                        data-testid={`tag-selected-${tag.toLowerCase()}`}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Predefined Tags */}
                <div className="space-y-3">
                  <div className="text-sm text-gray-400">Popular tags:</div>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {predefinedTags
                      .filter(tag => !tags.includes(tag))
                      .map((tag) => (
                        <Button
                          key={tag}
                          variant="outline"
                          size="sm"
                          onClick={() => addTag(tag)}
                          disabled={tags.length >= 10}
                          className="text-xs border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                          data-testid={`tag-available-${tag.toLowerCase()}`}
                        >
                          + {tag}
                        </Button>
                      ))}
                  </div>
                </div>

                {/* Custom Tag Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom tag..."
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                    disabled={tags.length >= 10}
                    data-testid="input-custom-tag"
                  />
                  <Button
                    onClick={addCustomTag}
                    disabled={!customTag.trim() || tags.length >= 10}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-add-custom-tag"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Community Benefits */}
              <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">Community Benefits</span>
                </div>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• Help other developers learn from your security analysis</li>
                  <li>• Build reputation in the Web3 security community</li>
                  <li>• Contribute to the collective knowledge of smart contract security</li>
                  <li>• Get recognition for discovering unique vulnerabilities</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateVisibilityMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-save-visibility"
          >
            {updateVisibilityMutation.isPending
              ? "Saving..."
              : isPublic
              ? "Make Public"
              : "Make Private"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}