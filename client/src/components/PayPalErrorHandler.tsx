import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Mail, ExternalLink } from "lucide-react";

interface PayPalErrorHandlerProps {
  onRetry: () => void;
  packageName?: string;
  amount?: string;
}

export function PayPalErrorHandler({ onRetry, packageName, amount }: PayPalErrorHandlerProps) {
  const handleContactSupport = () => {
    const subject = `PayPal Sandbox Issue - ${packageName || 'Credit'} Purchase`;
    const body = `Hi Support Team,

I'm experiencing the common PayPal sandbox error: "Things don't appear to be working at the moment."

Purchase Details:
- Package: ${packageName || 'Unknown'}
- Amount: $${amount || 'Unknown'}
- Error: PayPal sandbox integration issue

Could you please help me complete this purchase manually or provide alternative payment options?

Thank you!`;

    window.open(`mailto:support@auditor.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  return (
    <div className="space-y-4 p-4 border-2 border-amber-200 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-950/20">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <div>
          <h4 className="font-semibold text-amber-800 dark:text-amber-200">
            PayPal Sandbox Issue Detected
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            "Things don't appear to be working at the moment" is a common PayPal sandbox error.
          </p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900/50 p-3 rounded border border-amber-200 dark:border-amber-700">
        <h5 className="font-medium text-sm mb-2 text-amber-800 dark:text-amber-200">Quick Solutions:</h5>
        <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
          <li>• Clear your browser cookies and try again</li>
          <li>• Try opening in an incognito/private browser window</li>
          <li>• Wait a few minutes - sandbox issues often resolve automatically</li>
        </ul>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={onRetry}
          variant="outline" 
          size="sm"
          className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/50"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry PayPal
        </Button>
        
        <Button 
          onClick={handleContactSupport}
          variant="outline" 
          size="sm"
          className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/50"
        >
          <Mail className="h-4 w-4 mr-1" />
          Contact Support
        </Button>
      </div>
      
      <p className="text-xs text-center text-amber-600 dark:text-amber-400">
        Support can manually add credits to your account within minutes
      </p>
    </div>
  );
}