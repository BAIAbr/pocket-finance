import { useState, useRef, useCallback, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ZoomIn, ZoomOut, RotateCcw, Maximize, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageCropEditorProps {
  imageSrc: string;
  onCropComplete: (blob: Blob) => void;
  className?: string;
}

const PRESETS = [
  { label: 'Pequeno', sublabel: 'Ícone lista', size: 64 },
  { label: 'Médio', sublabel: 'Card conquista', size: 128 },
  { label: 'Grande', sublabel: 'Tela detalhe', size: 256 },
] as const;

const OUTPUT_SIZE = 256; // max output canvas size

export default function ImageCropEditor({ imageSrc, onCropComplete, className }: ImageCropEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activePreset, setActivePreset] = useState(1); // medium by default

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = OUTPUT_SIZE;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // Checkerboard for transparency
    const tileSize = 12;
    for (let y = 0; y < size; y += tileSize) {
      for (let x = 0; x < size; x += tileSize) {
        ctx.fillStyle = ((x / tileSize + y / tileSize) % 2 === 0) ? '#e5e7eb' : '#f3f4f6';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    // Calculate draw dimensions
    const scale = Math.min(size / img.width, size / img.height) * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (size - drawW) / 2 + offset.x;
    const drawY = (size - drawH) / 2 + offset.y;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }, [zoom, offset]);

  useEffect(() => {
    if (imageLoaded) {
      draw();
      // Auto-generate crop on changes
      generateCrop();
    }
  }, [imageLoaded, draw]);

  const generateCrop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onCropComplete(blob);
    }, 'image/png');
  }, [onCropComplete]);

  // Mouse/Touch drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handlePointerUp = () => {
    setDragging(false);
    generateCrop();
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleZoomChange = (val: number[]) => {
    setZoom(val[0]);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Canvas area */}
      <div className="flex flex-col items-center gap-3">
        <div
          ref={containerRef}
          className="relative rounded-xl border-2 border-dashed border-border overflow-hidden cursor-grab active:cursor-grabbing touch-none bg-muted/20"
          style={{ width: 200, height: 200 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ imageRendering: 'auto' }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">Arraste para reposicionar</p>
      </div>

      {/* Zoom control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5">
            <ZoomIn size={14} /> Zoom
          </Label>
          <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <ZoomOut size={14} className="text-muted-foreground shrink-0" />
          <Slider
            min={0.5}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={handleZoomChange}
            onValueCommit={() => generateCrop()}
            className="flex-1"
          />
          <ZoomIn size={14} className="text-muted-foreground shrink-0" />
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-xs w-full">
          <RotateCcw size={12} /> Resetar posição e zoom
        </Button>
      </div>

      {/* Size presets */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <Maximize size={14} /> Presets de tamanho
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((preset, i) => (
            <button
              key={preset.label}
              onClick={() => setActivePreset(i)}
              className={cn(
                'rounded-lg border p-2 text-center transition-all',
                activePreset === i
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex justify-center mb-1.5">
                <div
                  className="rounded-md overflow-hidden bg-muted/30 border border-border flex items-center justify-center"
                  style={{ width: Math.min(preset.size, 48), height: Math.min(preset.size, 48) }}
                >
                  {imageLoaded ? (
                    <canvas
                      ref={(el) => {
                        if (!el || !canvasRef.current) return;
                        const ctx = el.getContext('2d');
                        if (!ctx) return;
                        const s = Math.min(preset.size, 48);
                        el.width = s;
                        el.height = s;
                        ctx.drawImage(canvasRef.current, 0, 0, s, s);
                      }}
                      className="w-full h-full"
                    />
                  ) : (
                    <ImageIcon size={16} className="text-muted-foreground" />
                  )}
                </div>
              </div>
              <p className="text-[10px] font-medium">{preset.label}</p>
              <p className="text-[8px] text-muted-foreground">{preset.sublabel}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
