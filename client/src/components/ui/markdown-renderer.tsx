import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info, Lightbulb } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) {
    return null;
  }

  // Simple markdown parsing for the audit report
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentSection: string | null = null;
    let currentList: string[] = [];
    let currentCodeBlock: string[] = [];
    let inCodeBlock = false;

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={elements.length} className="list-disc list-inside text-muted-foreground mb-3 space-y-1">
            {currentList.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: formatInlineElements(item) }} />
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    const flushCodeBlock = () => {
      if (currentCodeBlock.length > 0) {
        elements.push(
          <Card key={elements.length} className="bg-muted p-4 rounded-lg mb-4">
            <pre className="text-sm font-mono text-accent-foreground overflow-x-auto">
              <code>{currentCodeBlock.join('\n')}</code>
            </pre>
          </Card>
        );
        currentCodeBlock = [];
      }
    };

    const formatInlineElements = (text: string) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
        .replace(/`([^`]+)`/g, '<code class="bg-muted px-2 py-1 rounded text-sm font-mono text-accent-foreground">$1</code>');
    };

    const getSeverityIcon = (text: string) => {
      const lowerText = text.toLowerCase();
      if (lowerText.includes('high') || lowerText.includes('critical')) {
        return <AlertTriangle className="h-5 w-5 text-destructive mr-2" />;
      } else if (lowerText.includes('medium') || lowerText.includes('moderate')) {
        return <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />;
      } else if (lowerText.includes('low') || lowerText.includes('minor')) {
        return <Info className="h-5 w-5 text-blue-500 mr-2" />;
      } else if (lowerText.includes('info') || lowerText.includes('best') || lowerText.includes('recommendation')) {
        return <Lightbulb className="h-5 w-5 text-chart-1 mr-2" />;
      }
      return null;
    };

    const getSeverityBorderClass = (text: string) => {
      const lowerText = text.toLowerCase();
      if (lowerText.includes('high') || lowerText.includes('critical')) {
        return 'border-l-4 border-red-500 bg-red-500/10';
      } else if (lowerText.includes('medium') || lowerText.includes('moderate')) {
        return 'border-l-4 border-yellow-500 bg-yellow-500/10';
      } else if (lowerText.includes('low') || lowerText.includes('minor')) {
        return 'border-l-4 border-blue-500 bg-blue-500/10';
      } else if (lowerText.includes('info') || lowerText.includes('best') || lowerText.includes('recommendation')) {
        return 'border-l-4 border-green-500 bg-green-500/10';
      }
      return '';
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          flushList();
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        currentCodeBlock.push(line);
        return;
      }

      // Handle headers
      if (trimmedLine.startsWith('# ')) {
        flushList();
        const headerText = trimmedLine.slice(2);
        const icon = getSeverityIcon(headerText);
        const borderClass = getSeverityBorderClass(headerText);
        
        elements.push(
          <Card key={elements.length} className={`p-6 mb-6 ${borderClass}`}>
            <h1 className="text-2xl font-bold text-foreground mb-4 flex items-center">
              {icon}
              {headerText}
            </h1>
          </Card>
        );
        currentSection = headerText;
      } else if (trimmedLine.startsWith('## ')) {
        flushList();
        const headerText = trimmedLine.slice(3);
        const icon = getSeverityIcon(headerText);
        const borderClass = getSeverityBorderClass(headerText);
        
        elements.push(
          <div key={elements.length} className={`rounded-lg p-6 mb-6 ${borderClass || 'bg-background border border-border'}`}>
            <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center">
              {icon}
              {headerText}
            </h2>
          </div>
        );
      } else if (trimmedLine.startsWith('### ')) {
        flushList();
        const headerText = trimmedLine.slice(4);
        elements.push(
          <div key={elements.length} className="bg-background/50 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-medium text-foreground mb-2">{headerText}</h3>
          </div>
        );
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        currentList.push(trimmedLine.slice(2));
      } else if (trimmedLine) {
        flushList();
        
        // Handle special formatting
        if (trimmedLine.includes('Location:') || trimmedLine.includes('Recommendation:')) {
          elements.push(
            <p key={elements.length} className="text-muted-foreground mb-3 leading-relaxed" 
               dangerouslySetInnerHTML={{ __html: formatInlineElements(trimmedLine) }} />
          );
        } else {
          elements.push(
            <p key={elements.length} className="text-muted-foreground mb-3 leading-relaxed" 
               dangerouslySetInnerHTML={{ __html: formatInlineElements(trimmedLine) }} />
          );
        }
      } else {
        flushList();
      }
    });

    flushList();
    flushCodeBlock();

    return elements;
  };

  return (
    <div className="markdown-content space-y-4" data-testid="markdown-audit-report">
      {parseMarkdown(content)}
    </div>
  );
}
