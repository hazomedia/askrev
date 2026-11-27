'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Check,
  Move,
  Upload,
  AlertTriangle,
  Sliders,
} from 'lucide-react';

interface PhotoCropModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
  onConfirm: (file: File) => Promise<void> | void;
  isUploading?: boolean;
  errorMessage?: string | null;
  onSelectNewFile?: () => void;
}

export function PhotoCropModal({
  isOpen,
  imageUrl,
  onClose,
  onConfirm,
  isUploading = false,
  errorMessage = null,
  onSelectNewFile,
}: PhotoCropModalProps) {
  // Transform States
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);

  // Interaction States
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pinchDistance, setPinchDistance] = useState<number | null>(null);
  const [initialPinchZoom, setInitialPinchZoom] = useState<number>(1.0);

  // Image & Viewport Sizing
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isProcessingCanvas, setIsProcessingCanvas] = useState<boolean>(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Fixed 4:5 Target Frame Dimensions in Viewport (240px x 300px on desktop, 200px x 250px on narrow mobile)
  const [frameDimensions, setFrameDimensions] = useState<{ width: number; height: number }>({
    width: 240,
    height: 300,
  });

  // Reset transforms whenever a new image is loaded
  useEffect(() => {
    if (!imageUrl) return;

    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setLocalError(null);
    setImgNaturalSize(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      setLocalError(
        'Unable to load photograph for editing. If adjusting an existing remote photo, browser cross-origin policy may require you to select the original file from your device.'
      );
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Adjust frame dimensions responsively
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 380) {
          setFrameDimensions({ width: 200, height: 250 });
        } else {
          setFrameDimensions({ width: 240, height: 300 });
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute Base Scale (Cover fit at zoom = 1)
  const computeBaseDimensions = useCallback(() => {
    if (!imgNaturalSize) return { baseW: frameDimensions.width, baseH: frameDimensions.height };
    const scale = Math.max(
      frameDimensions.width / imgNaturalSize.width,
      frameDimensions.height / imgNaturalSize.height
    );
    return {
      baseW: imgNaturalSize.width * scale,
      baseH: imgNaturalSize.height * scale,
    };
  }, [imgNaturalSize, frameDimensions]);

  const { baseW, baseH } = computeBaseDimensions();

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Drag & Pinch-to-Zoom Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setPinchDistance(dist);
      setInitialPinchZoom(zoom);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && pinchDistance) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / pinchDistance;
      const newZoom = Math.min(Math.max(ratio * initialPinchZoom, 0.4), 3.5);
      setZoom(Number(newZoom.toFixed(2)));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setPinchDistance(null);
  };

  // Reset Adjustments
  const handleReset = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setLocalError(null);
  };

  // Canvas Generation: 600 x 750 pixels (exact 4:5 portrait)
  const handleSaveCroppedPhoto = async () => {
    if (!imageUrl) return;

    setIsProcessingCanvas(true);
    setLocalError(null);

    try {
      const canvas = document.createElement('canvas');
      const TARGET_WIDTH = 600;
      const TARGET_HEIGHT = 750;
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context could not be created.');
      }

      // Neutral background fill to prevent transparent/black bars if zoomed out
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Load image source with CORS
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () =>
          reject(
            new Error(
              'Security restriction: Unable to export remote image due to browser cross-origin policy. Please use Change Photo to select the file from your computer or phone.'
            )
          );
        img.src = imageUrl;
      });

      // Calculate exact scaling factor from preview frame to canvas (600 / frameWidth)
      const scaleMultiplier = TARGET_WIDTH / frameDimensions.width;

      // Coordinate mapping: canvas center
      ctx.save();
      ctx.translate(
        TARGET_WIDTH / 2 + pan.x * scaleMultiplier,
        TARGET_HEIGHT / 2 + pan.y * scaleMultiplier
      );
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      const canvasBaseW = baseW * scaleMultiplier;
      const canvasBaseH = baseH * scaleMultiplier;

      ctx.drawImage(img, -canvasBaseW / 2, -canvasBaseH / 2, canvasBaseW, canvasBaseH);
      ctx.restore();

      // Export to high-quality JPEG blob
      const blob = await new Promise<Blob | null>((resolve) => {
        try {
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
        } catch (err) {
          resolve(null);
        }
      });

      if (!blob) {
        throw new Error(
          'Security restriction: Canvas export blocked by browser cross-origin policy. Please use Change Photo to select your original photograph file from your device.'
        );
      }

      const croppedFile = new File([blob], 'profile-photo.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      await onConfirm(croppedFile);
    } catch (err: any) {
      setLocalError(
        err.message ||
          'Failed to process image. If adjusting an existing photo, please use Change Photo to select the original file from your device.'
      );
    } finally {
      setIsProcessingCanvas(false);
    }
  };

  if (!isOpen || !imageUrl) return null;

  const displayError = localError || errorMessage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-[#0C2348] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#165DAD]" />
              <span>Crop & Adjust Photograph</span>
            </h3>
            <p className="text-xs text-slate-500">Official 4:5 portrait frame (600 × 750 px) for Sales Executive ID</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading || isProcessingCanvas}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {displayError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span>{displayError}</span>
              {onSelectNewFile && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setLocalError(null);
                      onSelectNewFile();
                    }}
                    className="mt-1 text-xs font-bold text-[#165DAD] underline hover:text-[#12498a] flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select original photo file from device</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Crop Frame & Interactive Viewport */}
        <div className="flex flex-col items-center justify-center">
          <div
            ref={viewportRef}
            style={{
              width: `${frameDimensions.width}px`,
              height: `${frameDimensions.height}px`,
            }}
            className="relative rounded-2xl overflow-hidden border-2 border-[#165DAD] shadow-lg bg-slate-900 cursor-grab active:cursor-grabbing select-none touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* The Scaled and Transformed Image */}
            {imageUrl && (
              <img
                ref={imageElementRef}
                src={imageUrl}
                alt="Adjust Photograph"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: `${baseW}px`,
                  height: `${baseH}px`,
                  maxWidth: 'none',
                  transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: 'center center',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Rule-of-Thirds Portrait Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div />
            </div>

            {/* Frame Aspect Badge */}
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white font-mono text-[10px] pointer-events-none">
              4:5 Portrait
            </div>
          </div>

          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5 font-medium">
            <Move className="w-3.5 h-3.5 text-slate-400" />
            <span>Drag photo to position face • Pinch or use slider to zoom</span>
          </div>
        </div>

        {/* Zoom Slider Control */}
        <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1">
              <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
              <span>Zoom Level</span>
            </span>
            <span className="font-mono text-[#165DAD] font-bold">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
              className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.4"
              max="3.5"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#165DAD]"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.1).toFixed(2))))}
              className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Rotation & Reset Actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1"
              title="Rotate 90 degrees counter-clockwise"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rotate Left</span>
            </button>
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1"
              title="Rotate 90 degrees clockwise"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate Right</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition flex items-center gap-1"
            title="Reset zoom, position, and rotation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {onSelectNewFile ? (
            <button
              type="button"
              onClick={onSelectNewFile}
              disabled={isUploading || isProcessingCanvas}
              className="text-xs font-semibold text-[#165DAD] hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Choose Another File</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading || isProcessingCanvas}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveCroppedPhoto}
              disabled={isUploading || isProcessingCanvas}
              className="px-5 py-2 text-xs font-bold text-white bg-[#165DAD] hover:bg-[#12498a] rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading || isProcessingCanvas ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Photo...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Photo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
