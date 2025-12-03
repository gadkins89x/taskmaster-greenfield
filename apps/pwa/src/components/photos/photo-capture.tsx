import { useRef, useEffect } from 'react';
import {
  Camera,
  X,
  ImagePlus,
  Trash2,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { usePhotoCapture, type CapturedPhoto } from '../../hooks/use-photo-capture';
import { cn } from '../../lib/utils';

interface PhotoCaptureProps {
  onPhotosChange: (photos: CapturedPhoto[]) => void;
  photos?: CapturedPhoto[];
  maxPhotos?: number;
  categories?: string[];
  disabled?: boolean;
}

export function PhotoCapture({
  onPhotosChange,
  photos: initialPhotos = [],
  maxPhotos = 10,
  categories = ['before', 'during', 'after', 'damage', 'repair'],
  disabled = false,
}: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    videoRef,
    isCapturing,
    error,
    photos,
    startCamera,
    stopCamera,
    capturePhoto,
    captureFromFile,
    removePhoto,
    clearError,
  } = usePhotoCapture();

  // Initialize with existing photos
  useEffect(() => {
    if (initialPhotos.length > 0 && photos.length === 0) {
      // Photos are managed externally
    }
  }, [initialPhotos, photos.length]);

  // Notify parent of photo changes
  useEffect(() => {
    onPhotosChange(photos);
  }, [photos, onPhotosChange]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of files) {
      if (photos.length >= maxPhotos) break;
      await captureFromFile(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCapture = () => {
    if (photos.length >= maxPhotos) return;
    capturePhoto();
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive flex-1">{error}</p>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Camera View */}
      {isCapturing && (
        <Card className="overflow-hidden">
          <CardContent className="p-0 relative">
            <video
              ref={videoRef}
              className="w-full aspect-video object-cover bg-black"
              playsInline
              muted
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              <Button
                size="lg"
                onClick={handleCapture}
                disabled={!canAddMore || disabled}
                className="rounded-full h-14 w-14"
              >
                <Camera className="h-6 w-6" />
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={stopCamera}
                className="rounded-full h-14 w-14"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {!isCapturing && canAddMore && !disabled && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={startCamera}>
            <Camera className="mr-2 h-4 w-4" />
            Take Photo
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((photo) => (
            <PhotoThumbnail
              key={photo.id}
              photo={photo}
              onRemove={() => removePhoto(photo.id)}
              categories={categories}
              disabled={disabled}
            />
          ))}
          {canAddMore && !isCapturing && !disabled && (
            <button
              type="button"
              onClick={startCamera}
              className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ImagePlus className="h-8 w-8" />
              <span className="text-xs">Add Photo</span>
            </button>
          )}
        </div>
      )}

      {/* Photo Count */}
      {photos.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          {photos.length} of {maxPhotos} photos
        </p>
      )}
    </div>
  );
}

interface PhotoThumbnailProps {
  photo: CapturedPhoto;
  onRemove: () => void;
  categories: string[];
  disabled: boolean;
}

function PhotoThumbnail({
  photo,
  onRemove,
  disabled,
}: PhotoThumbnailProps) {
  return (
    <div className="relative group">
      <img
        src={photo.dataUrl}
        alt={photo.filename}
        className="w-full aspect-square object-cover rounded-lg"
      />
      <div className={cn(
        'absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center',
        'opacity-0 group-hover:opacity-100 transition-opacity',
        disabled && 'hidden'
      )}>
        <Button
          variant="destructive"
          size="icon"
          onClick={onRemove}
          className="h-10 w-10"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
      <Badge
        variant="secondary"
        className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5"
      >
        {Math.round(photo.size / 1024)}KB
      </Badge>
    </div>
  );
}
