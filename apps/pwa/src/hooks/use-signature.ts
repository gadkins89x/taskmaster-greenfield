import { useState, useCallback } from 'react';
import type { SignatureData } from '../components/signature/signature-pad';

export type SignatureType = 'technician' | 'supervisor' | 'customer';

export interface WorkOrderSignature {
  id?: string;
  type: SignatureType;
  signatureData: string;
  signedAt: Date;
  userId?: string;
  userName?: string;
}

interface UseSignatureOptions {
  /** Initial signatures */
  initialSignatures?: WorkOrderSignature[];
  /** Callback when signatures change */
  onSignaturesChange?: (signatures: WorkOrderSignature[]) => void;
}

interface UseSignatureReturn {
  /** Current signatures by type */
  signatures: Record<SignatureType, WorkOrderSignature | null>;
  /** All signatures as an array */
  signatureList: WorkOrderSignature[];
  /** Add a new signature */
  addSignature: (type: SignatureType, signature: SignatureData, userName?: string) => void;
  /** Remove a signature */
  removeSignature: (type: SignatureType) => void;
  /** Check if a signature type exists */
  hasSignature: (type: SignatureType) => boolean;
  /** Check if all required signatures are present */
  hasAllSignatures: (required: SignatureType[]) => boolean;
  /** Clear all signatures */
  clearAll: () => void;
  /** Get signature data for API submission */
  getSubmissionData: () => Array<{
    type: SignatureType;
    signatureData: string;
    signedAt: string;
  }>;
}

/**
 * Hook for managing work order signatures
 */
export function useSignature(options: UseSignatureOptions = {}): UseSignatureReturn {
  const { initialSignatures = [], onSignaturesChange } = options;

  // Initialize signatures from initial data
  const initializeSignatures = (): Record<SignatureType, WorkOrderSignature | null> => {
    const result: Record<SignatureType, WorkOrderSignature | null> = {
      technician: null,
      supervisor: null,
      customer: null,
    };

    for (const sig of initialSignatures) {
      if (sig.type in result) {
        result[sig.type] = sig;
      }
    }

    return result;
  };

  const [signatures, setSignatures] = useState<Record<SignatureType, WorkOrderSignature | null>>(
    initializeSignatures,
  );

  const notifyChange = useCallback(
    (newSignatures: Record<SignatureType, WorkOrderSignature | null>) => {
      if (onSignaturesChange) {
        const list = Object.values(newSignatures).filter(
          (s): s is WorkOrderSignature => s !== null,
        );
        onSignaturesChange(list);
      }
    },
    [onSignaturesChange],
  );

  const addSignature = useCallback(
    (type: SignatureType, signature: SignatureData, userName?: string) => {
      setSignatures((prev) => {
        const newSignature: WorkOrderSignature = {
          type,
          signatureData: signature.dataUrl,
          signedAt: signature.timestamp,
          userName,
        };
        const newSignatures = { ...prev, [type]: newSignature };
        notifyChange(newSignatures);
        return newSignatures;
      });
    },
    [notifyChange],
  );

  const removeSignature = useCallback(
    (type: SignatureType) => {
      setSignatures((prev) => {
        const newSignatures = { ...prev, [type]: null };
        notifyChange(newSignatures);
        return newSignatures;
      });
    },
    [notifyChange],
  );

  const hasSignature = useCallback(
    (type: SignatureType): boolean => {
      return signatures[type] !== null;
    },
    [signatures],
  );

  const hasAllSignatures = useCallback(
    (required: SignatureType[]): boolean => {
      return required.every((type) => signatures[type] !== null);
    },
    [signatures],
  );

  const clearAll = useCallback(() => {
    const cleared: Record<SignatureType, WorkOrderSignature | null> = {
      technician: null,
      supervisor: null,
      customer: null,
    };
    setSignatures(cleared);
    notifyChange(cleared);
  }, [notifyChange]);

  const signatureList = Object.values(signatures).filter(
    (s): s is WorkOrderSignature => s !== null,
  );

  const getSubmissionData = useCallback(() => {
    return signatureList.map((sig) => ({
      type: sig.type,
      signatureData: sig.signatureData,
      signedAt: sig.signedAt.toISOString(),
    }));
  }, [signatureList]);

  return {
    signatures,
    signatureList,
    addSignature,
    removeSignature,
    hasSignature,
    hasAllSignatures,
    clearAll,
    getSubmissionData,
  };
}

/**
 * Get display label for signature type
 */
export function getSignatureTypeLabel(type: SignatureType): string {
  const labels: Record<SignatureType, string> = {
    technician: 'Technician Signature',
    supervisor: 'Supervisor Signature',
    customer: 'Customer Signature',
  };
  return labels[type];
}

/**
 * Get description for signature type
 */
export function getSignatureTypeDescription(type: SignatureType): string {
  const descriptions: Record<SignatureType, string> = {
    technician: 'I confirm that I have completed this work order',
    supervisor: 'I approve this work order completion',
    customer: 'I acknowledge receipt of the completed work',
  };
  return descriptions[type];
}
