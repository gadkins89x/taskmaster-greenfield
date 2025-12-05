import { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, Check, X, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { cn } from '../../lib/utils';

export interface SignatureData {
  dataUrl: string;
  timestamp: Date;
}

interface SignaturePadProps {
  onSign: (signature: SignatureData) => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  disabled?: boolean;
}

export function SignaturePad({
  onSign,
  onCancel,
  title = 'Signature',
  description = 'Please sign below',
  width = 400,
  height = 200,
  strokeColor = '#000000',
  strokeWidth = 2,
  backgroundColor = '#ffffff',
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width, height });

  // Resize canvas to fit container
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const aspectRatio = height / width;
        const newWidth = Math.min(containerWidth - 32, width); // Account for padding
        const newHeight = newWidth * aspectRatio;
        setCanvasSize({ width: newWidth, height: newHeight });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [width, height]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for crisp lines
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    ctx.scale(dpr, dpr);

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Set drawing styles
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [canvasSize, strokeColor, strokeWidth, backgroundColor]);

  // Get position from event (mouse or touch)
  const getPosition = useCallback(
    (e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();

      if ('touches' in e) {
        if (e.touches.length === 0) return null;
        const touch = e.touches[0];
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      } else {
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }
    },
    [],
  );

  // Start drawing
  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;

      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      const pos = getPosition(e.nativeEvent);
      if (!pos) return;

      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    },
    [disabled, getPosition],
  );

  // Continue drawing
  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled) return;

      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      const pos = getPosition(e.nativeEvent);
      if (!pos) return;

      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasSignature(true);
    },
    [isDrawing, disabled, getPosition],
  );

  // Stop drawing
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Clear signature
  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    setHasSignature(false);
  }, [canvasSize, backgroundColor]);

  // Submit signature
  const submitSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSign({
      dataUrl,
      timestamp: new Date(),
    });
  }, [hasSignature, onSign]);

  return (
    <Card ref={containerRef} className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Canvas Container */}
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg overflow-hidden',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair',
            hasSignature ? 'border-primary' : 'border-muted-foreground/25',
          )}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="touch-none"
          />

          {/* Signature line */}
          <div className="absolute bottom-8 left-8 right-8 border-b border-muted-foreground/50" />
          <span className="absolute bottom-2 left-8 text-xs text-muted-foreground">
            Sign here
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={disabled}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          <Button
            variant="outline"
            onClick={clearSignature}
            disabled={disabled || !hasSignature}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear
          </Button>
          <Button
            onClick={submitSignature}
            disabled={disabled || !hasSignature}
          >
            <Check className="mr-2 h-4 w-4" />
            Accept
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact signature display component for showing existing signatures
 */
interface SignatureDisplayProps {
  signature: SignatureData;
  label?: string;
  signerName?: string;
  onClear?: () => void;
  className?: string;
}

export function SignatureDisplay({
  signature,
  label,
  signerName,
  onClear,
  className,
}: SignatureDisplayProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          {onClear && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <Eraser className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      <div className="relative border rounded-lg p-2 bg-white">
        <img
          src={signature.dataUrl}
          alt="Signature"
          className="max-h-24 mx-auto"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t">
          {signerName && <span>{signerName}</span>}
          <span>
            {signature.timestamp.toLocaleDateString()}{' '}
            {signature.timestamp.toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
