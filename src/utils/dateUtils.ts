/**
 * Utilitários fiscais de data, CNPJ e chaves de acesso.
 */
export function formatFiscalDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  const clean = dateStr.trim();
  if (!clean) return 'N/A';

  // Se já estiver no formato DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean;
  }

  // Se estiver no formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss...
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {
    // ignore
  }

  return clean;
}

export function formatCNPJ(cnpj?: string): string {
  if (!cnpj) return 'N/A';
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length === 14) {
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (clean.length === 11) {
    return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return cnpj;
}

export function formatChaveAcesso(key?: string): string {
  if (!key) return 'N/A';
  const clean = key.replace(/\D/g, '');
  if (clean.length === 44) {
    return clean.replace(/(\d{4})/g, '$1 ').trim();
  }
  return key;
}

