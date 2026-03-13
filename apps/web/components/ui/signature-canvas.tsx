'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Eraser, RotateCcw } from 'lucide-react';

interface SignatureCanvasProps {
  value?: string;
  onChange?: (dataUrl: string | null) => void;
  color?: string;
  lineWidth?: number;
  disabled?: boolean;
  className?: string;
  height?: number;
}

export function SignatureCanvas({
  value,
  onChange,
  color = '#000000',
  lineWidth = 2,
  disabled = false,
  className,
  height = 150,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Load existing signature if provided
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasSignature(true);
      };
      img.src = value;
    }
  }, []);

  // Update stroke style when color/width changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [color, lineWidth]);

  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    
    const pos = getPos(e);
    lastPosRef.current = pos;
    setIsDrawing(true);
  }, [disabled, getPos]);

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPosRef.current = pos;
    setHasSignature(true);
  }, [isDrawing, disabled, getPos]);

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      
      // Save signature
      const canvas = canvasRef.current;
      if (canvas && onChange) {
        const dataUrl = canvas.toDataURL('image/png');
        onChange(dataUrl);
      }
    }
  }, [isDrawing, onChange]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    setHasSignature(false);
    onChange?.(null);
  }, [onChange]);

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        style={{ height: `${height}px` }}
        className={cn(
          "w-full rounded-xl border-2 border-dashed cursor-crosshair touch-none",
          disabled ? "bg-muted/50 cursor-not-allowed" : "bg-white border-border hover:border-primary/50",
          isDrawing && "border-primary"
        )}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      
      {/* Placeholder text */}
      {!hasSignature && !isDrawing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-sm text-muted-foreground">وقّع هنا</span>
        </div>
      )}

      {/* Clear button */}
      {hasSignature && !disabled && (
        <button
          type="button"
          onClick={clearSignature}
          className="absolute top-2 left-2 p-1.5 rounded-lg bg-background/80 hover:bg-background border border-border shadow-sm transition-colors"
          title="مسح التوقيع"
        >
          <RotateCcw className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      {/* Color indicator */}
      <div 
        className="absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white shadow-sm"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
