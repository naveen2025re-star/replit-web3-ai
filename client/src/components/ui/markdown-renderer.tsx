import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info, Lightbulb } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) {
    return null;
  }

  return (
    <div className="markdown-content prose prose-slate prose-invert max-w-none" data-testid="markdown-audit-report">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({children}) => (
            <h1 className="text-2xl font-bold text-white mb-6 pb-3 border-b border-slate-700 flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-400 mr-3" />
              {children}
            </h1>
          ),
          h2: ({children}) => (
            <h2 className="text-xl font-semibold text-white mb-4 mt-8 pb-2 border-b border-slate-700/50 flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
              {children}
            </h2>
          ),
          h3: ({children}) => (
            <h3 className="text-lg font-medium text-white mb-3 mt-6 flex items-center">
              <Info className="h-4 w-4 text-blue-400 mr-2" />
              {children}
            </h3>
          ),
          p: ({children}) => <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>,
          ul: ({children}) => <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2 ml-4">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-2 ml-4">{children}</ol>,
          li: ({children}) => <li className="mb-1">{children}</li>,
          strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
          code: ({children, className}) => {
            if (className?.includes('language-')) {
              return (
                <Card className="bg-slate-900 border-slate-700 p-4 mb-4">
                  <pre className="text-sm font-mono text-gray-300 overflow-x-auto">
                    <code className={className}>{children}</code>
                  </pre>
                </Card>
              );
            }
            return <code className="text-blue-300 bg-slate-800 px-2 py-1 rounded text-sm font-mono">{children}</code>;
          },
          pre: ({children}) => (
            <Card className="bg-slate-900 border-slate-700 p-4 mb-4">
              <pre className="text-sm font-mono text-gray-300 overflow-x-auto">{children}</pre>
            </Card>
          ),
          blockquote: ({children}) => (
            <div className="border-l-4 border-green-500 bg-green-500/10 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <Lightbulb className="h-5 w-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
                <blockquote className="text-green-100 mb-0">{children}</blockquote>
              </div>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}