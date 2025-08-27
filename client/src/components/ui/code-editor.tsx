import React from "react";
import { Card } from "@/components/ui/card";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  placeholder?: string;
}

export default function CodeEditor({ value, onChange, language, placeholder }: CodeEditorProps) {
  const lineNumbers = value.split('\n').map((_, index) => index + 1);

  return (
    <Card className="h-full bg-card rounded-lg border border-border overflow-hidden">
      <div className="bg-muted px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="ml-4 text-sm text-muted-foreground">
            contract.{language === 'solidity' ? 'sol' : language === 'vyper' ? 'vy' : language}
          </span>
        </div>
      </div>
      
      <div className="relative h-full min-h-[400px]">
        <div className="absolute left-0 top-0 p-4 text-muted-foreground text-sm font-mono pointer-events-none select-none z-10 bg-card border-r border-border min-w-[3rem]">
          {lineNumbers.map(num => (
            <div key={num} className="leading-6 text-right pr-2">
              {num}
            </div>
          ))}
        </div>
        
        <textarea 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full pl-16 pr-4 py-4 bg-transparent text-foreground resize-none border-0 outline-0 text-sm leading-6 font-mono"
          placeholder={placeholder}
          spellCheck={false}
          data-testid="textarea-contract-code"
          style={{ 
            fontFamily: 'var(--font-mono)',
            tabSize: 4,
          }}
        />
      </div>
    </Card>
  );
}
