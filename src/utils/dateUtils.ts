/**
 * Utilitário de data fiscal para evitar problemas de fuso horário UTC (ex: 2028-06-30 virando 29/06/2028).
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
  const datePart = clean.split('T')[0];
  const parts = datePart.split('-');

  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  // Fallback seguro
  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
  } catch {
    // ignore
  }

  return clean;
}
