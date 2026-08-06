import { useState, useCallback } from 'react';

export function useClipboard(timeoutMs: number = 2000) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = useCallback(
    (text: string, key: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text).then(
        () => {
          setCopiedKey(key);
          setTimeout(() => {
            setCopiedKey(prev => (prev === key ? null : prev));
          }, timeoutMs);
        },
        err => {
          console.error('Erro ao copiar para a área de transferência:', err);
        }
      );
    },
    [timeoutMs]
  );

  return { copiedKey, copyToClipboard };
}
