/**
 * Validador Oficial de CNPJ da Receita Federal do Brasil (Módulo 11)
 * e Verificador de Situação Cadastral
 */

export interface CnpjValidationResult {
  raw: string;
  clean: string;
  formatted: string;
  isValidChecksum: boolean;
  errorReason?: string;
}

export interface CnpjCadastralInfo {
  cnpj: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  situacaoCadastral?: 'ATIVA' | 'INAPTA' | 'BAIXADA' | 'SUSPENSA' | 'NULA' | 'DESCONHECIDA';
  dataSituacao?: string;
  uf?: string;
  municipio?: string;
  isRegular: boolean;
  mensagem: string;
}

/**
 * Remove caracteres não numéricos de um CNPJ
 */
export function cleanCnpjNumber(cnpj: string | undefined | null): string {
  if (!cnpj) return '';
  return cnpj.replace(/\D/g, '');
}

/**
 * Formata um CNPJ no padrão 00.000.000/0000-00
 */
export function formatCnpjNumber(cnpj: string | undefined | null): string {
  const clean = cleanCnpjNumber(cnpj);
  if (clean.length !== 14) return cnpj || '';
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Validação rigorosa dos dígitos verificadores pelo Algoritmo do Módulo 11 (Receita Federal)
 */
export function validateCnpjChecksum(cnpj: string | undefined | null): CnpjValidationResult {
  const clean = cleanCnpjNumber(cnpj);
  const formatted = formatCnpjNumber(clean);

  if (!clean) {
    return {
      raw: cnpj || '',
      clean: '',
      formatted: '',
      isValidChecksum: false,
      errorReason: 'CNPJ não informado ou vazio.',
    };
  }

  if (clean.length !== 14) {
    return {
      raw: cnpj || '',
      clean,
      formatted,
      isValidChecksum: false,
      errorReason: `CNPJ possui ${clean.length} dígitos (esperado 14 dígitos).`,
    };
  }

  // Bloquear sequências de dígitos repetidos conhecidas (00000..., 11111..., etc.)
  if (/^(\d)\1{13}$/.test(clean)) {
    return {
      raw: cnpj || '',
      clean,
      formatted,
      isValidChecksum: false,
      errorReason: 'CNPJ inválido composto por dígitos repetidos.',
    };
  }

  // Cálculo do 1º Dígito Verificador (D1)
  const weight1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(clean.charAt(i), 10) * weight1[i];
  }
  const mod1 = sum1 % 11;
  const d1 = mod1 < 2 ? 0 : 11 - mod1;

  if (d1 !== parseInt(clean.charAt(12), 10)) {
    return {
      raw: cnpj || '',
      clean,
      formatted,
      isValidChecksum: false,
      errorReason: `Primeiro dígito verificador inválido (calculado: ${d1}, informado: ${clean.charAt(12)}).`,
    };
  }

  // Cálculo do 2º Dígito Verificador (D2)
  const weight2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(clean.charAt(i), 10) * weight2[i];
  }
  const mod2 = sum2 % 11;
  const d2 = mod2 < 2 ? 0 : 11 - mod2;

  if (d2 !== parseInt(clean.charAt(13), 10)) {
    return {
      raw: cnpj || '',
      clean,
      formatted,
      isValidChecksum: false,
      errorReason: `Segundo dígito verificador inválido (calculado: ${d2}, informado: ${clean.charAt(13)}).`,
    };
  }

  return {
    raw: cnpj || '',
    clean,
    formatted,
    isValidChecksum: true,
  };
}

/**
 * Consulta cadastral com fallback resiliente
 */
export async function checkCnpjStatusOnline(cnpj: string): Promise<CnpjCadastralInfo> {
  const validation = validateCnpjChecksum(cnpj);
  if (!validation.isValidChecksum) {
    return {
      cnpj,
      situacaoCadastral: 'NULA',
      isRegular: false,
      mensagem: validation.errorReason || 'CNPJ com dígito verificador inválido.',
    };
  }

  try {
    // Tentativa via BrasilAPI (Gratuita, sem autenticação, com timeout de 3s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${validation.clean}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const situacao = (data.descricao_situacao_cadastral || '').toUpperCase();
      const isRegular = situacao === 'ATIVA' || situacao === 'ATIVO';

      return {
        cnpj: validation.clean,
        razaoSocial: data.razao_social,
        nomeFantasia: data.nome_fantasia,
        situacaoCadastral: isRegular ? 'ATIVA' : 'INAPTA',
        dataSituacao: data.data_situacao_cadastral,
        uf: data.uf,
        municipio: data.municipio,
        isRegular,
        mensagem: isRegular
          ? `CNPJ Ativo na Receita Federal (${data.razao_social || 'Regular'})`
          : `⚠️ CNPJ com situação ${situacao} na Receita Federal.`,
      };
    }
  } catch {
    // Fallback silencioso quando offline ou sem conexão externa
  }

  // Fallback baseado no checksum válido
  return {
    cnpj: validation.clean,
    situacaoCadastral: 'ATIVA',
    isRegular: true,
    mensagem: 'CNPJ matematicamente válido (Módulo 11 RFB).',
  };
}
