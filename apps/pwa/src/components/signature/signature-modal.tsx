import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { PenLine } from 'lucide-react';
import { Button } from '../ui/button';
import { SignaturePad, SignatureDisplay, type SignatureData } from './signature-pad';
import {
  type SignatureType,
  type WorkOrderSignature,
  getSignatureTypeLabel,
  getSignatureTypeDescription,
} from '../../hooks/use-signature';
import { cn } from '../../lib/utils';

interface SignatureModalProps {
  type: SignatureType;
  currentSignature?: WorkOrderSignature | null;
  onSign: (signature: SignatureData) => void;
  onClear?: () => void;
  userName?: string;
  disabled?: boolean;
  required?: boolean;
}

export function SignatureModal({
  type,
  currentSignature,
  onSign,
  onClear,
  userName,
  disabled = false,
  required = false,
}: SignatureModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSign = (signature: SignatureData) => {
    onSign(signature);
    setIsOpen(false);
  };

  const label = getSignatureTypeLabel(type);
  const description = getSignatureTypeDescription(type);

  const hasSignature = currentSignature !== null && currentSignature !== undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </span>
        </div>
      </div>

      {hasSignature ? (
        <SignatureDisplay
          signature={{
            dataUrl: currentSignature.signatureData,
            timestamp: new Date(currentSignature.signedAt),
          }}
          signerName={currentSignature.userName || userName}
          onClear={disabled ? undefined : onClear}
        />
      ) : (
        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
          <Dialog.Trigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full h-20 border-dashed',
                required && 'border-destructive/50',
              )}
              disabled={disabled}
            >
              <PenLine className="mr-2 h-5 w-5" />
              Tap to Sign
            </Button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg p-4">
              <SignaturePad
                title={label}
                description={description}
                onSign={handleSign}
                onCancel={() => setIsOpen(false)}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}

/**
 * Component for collecting all required signatures for work order completion
 */
interface SignatureCollectionProps {
  signatures: Record<SignatureType, WorkOrderSignature | null>;
  onSign: (type: SignatureType, signature: SignatureData) => void;
  onClear: (type: SignatureType) => void;
  requiredSignatures?: SignatureType[];
  userName?: string;
  disabled?: boolean;
}

export function SignatureCollection({
  signatures,
  onSign,
  onClear,
  requiredSignatures = ['technician'],
  userName,
  disabled = false,
}: SignatureCollectionProps) {
  const signatureTypes: SignatureType[] = ['technician', 'supervisor', 'customer'];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <PenLine className="h-4 w-4" />
        <span>Signatures</span>
      </div>

      <div className="space-y-4">
        {signatureTypes.map((type) => (
          <SignatureModal
            key={type}
            type={type}
            currentSignature={signatures[type]}
            onSign={(sig) => onSign(type, sig)}
            onClear={() => onClear(type)}
            userName={userName}
            required={requiredSignatures.includes(type)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
