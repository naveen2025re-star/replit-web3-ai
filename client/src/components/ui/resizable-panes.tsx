import React, { useState, useRef, useEffect } from "react";

interface ResizablePanesProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  initialLeftWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
}

export default function ResizablePanes({
  leftPanel,
  rightPanel,
  initialLeftWidth = 50,
  minLeftWidth = 30,
  minRightWidth = 30,
}: ResizablePanesProps) {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      const clampedWidth = Math.max(
        minLeftWidth,
        Math.min(100 - minRightWidth, newLeftWidth)
      );
      
      setLeftWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, minLeftWidth, minRightWidth]);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  return (
    <div ref={containerRef} className="flex h-full w-full">
      <div 
        style={{ width: `${leftWidth}%` }}
        className="min-w-0"
      >
        {leftPanel}
      </div>
      
      <div
        className="w-1 cursor-col-resize bg-border hover:bg-primary transition-colors duration-200 flex-shrink-0"
        onMouseDown={handleMouseDown}
        data-testid="resizer-handle"
      />
      
      <div 
        style={{ width: `${100 - leftWidth}%` }}
        className="min-w-0"
      >
        {rightPanel}
      </div>
    </div>
  );
}
