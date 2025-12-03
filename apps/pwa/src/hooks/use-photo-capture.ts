import { useState, useRef, useCallback } from 'react';

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  capturedAt: string;
}

interface UsePhotoCaptureOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 for JPEG quality
}

export function usePhotoCapture(options: UsePhotoCaptureOptions = {}) {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options;
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    setIsCapturing(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer rear camera
          width: { ideal: maxWidth },
          height: { ideal: maxHeight },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setIsCapturing(false);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera permissions.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Failed to access camera');
      }
    }
  }, [maxWidth, maxHeight]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  }, []);

  const capturePhoto = useCallback((): CapturedPhoto | null => {
    if (!videoRef.current) {
      setError('Camera not initialized');
      return null;
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');

    // Calculate dimensions maintaining aspect ratio
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Failed to create canvas context');
      return null;
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    // Calculate approximate size
    const base64Length = dataUrl.length - 'data:image/jpeg;base64,'.length;
    const size = Math.round((base64Length * 3) / 4); // Base64 to bytes approximation

    const photo: CapturedPhoto = {
      id: crypto.randomUUID(),
      dataUrl,
      filename: `photo-${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      size,
      width,
      height,
      capturedAt: new Date().toISOString(),
    };

    setPhotos(prev => [...prev, photo]);
    return photo;
  }, [maxWidth, maxHeight, quality]);

  const captureFromFile = useCallback(
    async (file: File): Promise<CapturedPhoto | null> => {
      return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
          setError('Please select an image file');
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');

            // Calculate dimensions
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              setError('Failed to create canvas context');
              resolve(null);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            const base64Length = dataUrl.length - 'data:image/jpeg;base64,'.length;
            const size = Math.round((base64Length * 3) / 4);

            const photo: CapturedPhoto = {
              id: crypto.randomUUID(),
              dataUrl,
              filename: file.name.replace(/\.[^/.]+$/, '.jpg'),
              mimeType: 'image/jpeg',
              size,
              width,
              height,
              capturedAt: new Date().toISOString(),
            };

            setPhotos(prev => [...prev, photo]);
            resolve(photo);
          };
          img.onerror = () => {
            setError('Failed to load image');
            resolve(null);
          };
          img.src = e.target?.result as string;
        };
        reader.onerror = () => {
          setError('Failed to read file');
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    },
    [maxWidth, maxHeight, quality]
  );

  const removePhoto = useCallback((photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  }, []);

  const clearPhotos = useCallback(() => {
    setPhotos([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    videoRef,
    isCapturing,
    error,
    photos,
    startCamera,
    stopCamera,
    capturePhoto,
    captureFromFile,
    removePhoto,
    clearPhotos,
    clearError,
  };
}
