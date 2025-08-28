import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Globe, Lock, Users, Eye, Info, Shield } from "lucide-react";

interface AuditVisibilityOptions {
  isPublic: boolean;
  title?: string;
  description?: string;
  tags?: string[];
}

interface AuditVisibilitySelectorProps {
  value: AuditVisibilityOptions;
  onChange: (options: AuditVisibilityOptions) => void;
  disabled?: boolean;
}

export function AuditVisibilitySelector({ value, onChange, disabled }: AuditVisibilitySelectorProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  const handleVisibilityChange = (isPublic: boolean) => {
    onChange({ ...value, isPublic });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Audit Visibility</label>
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
              <Info className="h-3 w-3 mr-1" />
              Learn more
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                Audit Visibility Options
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <Globe className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-green-800 dark:text-green-200">Public Audits</div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      Visible in the community section, helping others learn from your security analysis
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                  <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-200">Private Audits</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Only accessible to you, keeping your contract analysis confidential
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
                <strong>Note:</strong> You can change visibility settings after the audit is completed using the share options.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card 
          className={`p-4 cursor-pointer transition-all duration-200 border-2 ${
            !value.isPublic 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-border hover:border-border/80 hover:bg-muted/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && handleVisibilityChange(false)}
          data-testid="card-private-audit"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              !value.isPublic ? 'bg-blue-500' : 'bg-muted'
            }`}>
              <Lock className={`h-5 w-5 ${!value.isPublic ? 'text-white' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Private</span>
                {!value.isPublic && (
                  <Badge variant="default" className="text-xs bg-blue-500 text-white">Selected</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Only you can access this audit
              </div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer transition-all duration-200 border-2 ${
            value.isPublic 
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
              : 'border-border hover:border-border/80 hover:bg-muted/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && handleVisibilityChange(true)}
          data-testid="card-public-audit"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              value.isPublic ? 'bg-green-500' : 'bg-muted'
            }`}>
              <Globe className={`h-5 w-5 ${value.isPublic ? 'text-white' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Public</span>
                {value.isPublic && (
                  <Badge variant="default" className="text-xs bg-green-500 text-white">Selected</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Share with the community
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
        <Eye className="h-3 w-3" />
        <span>
          {value.isPublic 
            ? "This audit will appear in the community section for others to learn from"
            : "This audit will remain private and only accessible to you"
          }
        </span>
      </div>
    </div>
  );
}