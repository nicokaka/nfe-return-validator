/**
 * Cadastro e Regras Tributárias das 4 Divisões Corporativas
 * Fonte: DIRETRIZES_FISCAIS_GERENCIA.md & docs/polliana/produtos ean cest base.xlsx
 */

export type CompanyKey = 'INFAN' | 'QUESALON_PB' | 'QUESALON_EXTREMA' | 'QUEDES' | 'UNKNOWN';

export interface CompanyProfile {
  key: CompanyKey;
  tradeName: string;
  corporateName: string;
  uf: string;
  cnpjBase?: string;
  isIndustry: boolean;
  internalIcmsRate: number; // ex: 0.205 para INFAN, 0.20 para QUESALON PB, 0.18 / 0.12 para EXTREMA
  interstateIcmsRateDefault: number; // 0.12
  hasBaseReduction: boolean;
  notes: string;
}

export const COMPANIES: Record<CompanyKey, CompanyProfile> = {
  INFAN: {
    key: 'INFAN',
    tradeName: 'Indústria INFAN',
    corporateName: 'INFAN INDÚSTRIA QUÍMICA FARMACÊUTICA NACIONAL S/A',
    uf: 'PB',
    cnpjBase: '08939548000103',
    isIndustry: true,
    internalIcmsRate: 0.205, // 20.50%
    interstateIcmsRateDefault: 0.12, // 12.00%
    hasBaseReduction: true,
    notes: 'Possui redução de base de cálculo de ICMS: NCM 3004 (9.90% de redução / base 90.1%) e Cosméticos selecionados (10.49% de redução / base 89.51%). Verificada pelo CFOP da NFO.',
  },
  QUESALON_PB: {
    key: 'QUESALON_PB',
    tradeName: 'QUESALON Matriz (PB)',
    corporateName: 'QUESALON DISTRIBUIDORA DE PRODUTOS FARMACÊUTICOS LTDA',
    uf: 'PB',
    cnpjBase: '04792134000143',
    isIndustry: false,
    internalIcmsRate: 0.20, // 20.00%
    interstateIcmsRateDefault: 0.12, // 12.00%
    hasBaseReduction: false,
    notes: 'Base Cheia para todos os NCMs. Alíquota interna de 20.00% e interestadual de 12.00% para todo o Brasil.',
  },
  QUESALON_EXTREMA: {
    key: 'QUESALON_EXTREMA',
    tradeName: 'QUESALON Extrema (MG)',
    corporateName: 'QUESALON DISTRIBUIDORA DE PRODUTOS FARMACEUTICOS LTDA (FILIAL MG)',
    uf: 'MG',
    cnpjBase: '04792134000496',
    isIndustry: false,
    internalIcmsRate: 0.18, // 18.00% ou 12.00% pelo Termo de Acordo
    interstateIcmsRateDefault: 0.12, // 12% para Sul/Sudeste (exceto ES) e 7% para demais
    hasBaseReduction: false,
    notes: 'Termo de Acordo MG: interna 12% ou 18%. Interestadual: 12% para Sul/Sudeste (exceto ES); 7% para ES, Centro-Oeste, Norte e Nordeste.',
  },
  QUEDES: {
    key: 'QUEDES',
    tradeName: 'QUEDES (AL)',
    corporateName: 'QUEDES DISTRIBUIDORA DE MEDICAMENTOS LTDA',
    uf: 'AL',
    isIndustry: false,
    internalIcmsRate: 0.0, // Não realiza vendas internas
    interstateIcmsRateDefault: 0.12, // 12.00%
    hasBaseReduction: false,
    notes: 'Linha exclusiva de medicamentos. Apenas operações interestaduais a 12.00%.',
  },
  UNKNOWN: {
    key: 'UNKNOWN',
    tradeName: 'Empresa do Grupo',
    corporateName: 'EMPRESA NÃO IDENTIFICADA',
    uf: 'PB',
    isIndustry: false,
    internalIcmsRate: 0.20,
    interstateIcmsRateDefault: 0.12,
    hasBaseReduction: false,
    notes: 'Alíquotas gerais padrão.',
  },
};

/**
 * Identifica a empresa do grupo pelo CNPJ do emitente da NFO ou Nome/UF
 */
export function identifyCompany(cnpjRaw: string, ufRaw?: string, xNomeRaw?: string): CompanyProfile {
  const cleanCnpj = (cnpjRaw || '').replace(/\D/g, '');
  const uf = (ufRaw || '').trim().toUpperCase();
  const xNome = (xNomeRaw || '').toUpperCase();

  // 1. QUESALON Extrema MG
  if (cleanCnpj.startsWith('047921340004') || (cleanCnpj.includes('04792134') && uf === 'MG') || xNome.includes('EXTREMA')) {
    return COMPANIES.QUESALON_EXTREMA;
  }

  // 2. QUESALON PB Matriz
  if (cleanCnpj.startsWith('047921340001') || (cleanCnpj.includes('04792134') && (uf === 'PB' || !uf)) || xNome.includes('QUESALON')) {
    return COMPANIES.QUESALON_PB;
  }

  // 3. INFAN Indústria (CNPJ Matriz: 08.939.548/0001-03)
  if (xNome.includes('INFAN') || cleanCnpj.includes('08939548') || cleanCnpj.includes('08825857')) {
    return COMPANIES.INFAN;
  }

  // 4. QUEDES
  if (xNome.includes('QUEDES') || uf === 'AL') {
    return COMPANIES.QUEDES;
  }

  // Fallback por UF
  if (uf === 'MG') return COMPANIES.QUESALON_EXTREMA;
  if (uf === 'PB') return COMPANIES.QUESALON_PB;

  return COMPANIES.UNKNOWN;
}

/**
 * Retorna os estados do Sul e Sudeste (exceto Espírito Santo)
 */
export const SOUTH_SOUTHEAST_EXCEPT_ES = ['SP', 'RJ', 'MG', 'PR', 'SC', 'RS'];

/**
 * Calcula a alíquota esperada de ICMS e percentual de redução de base de cálculo
 * Conforme regras da Gerência Fiscal Hebron (Polliana - Sheet 3 / produtos ean cest base.xlsx)
 */
export function calculateExpectedIcms(
  company: CompanyProfile,
  destUfRaw: string,
  ncmRaw: string,
  nfoIcmsRatePracticed?: number,
  nfoCfopRaw?: string
): {
  expectedRate: number;
  reductionPercentage: number; // ex: 9.90 ou 10.49
  baseMultiplier: number; // ex: 0.901 ou 0.8951 ou 1.0
  isInternal: boolean;
  explanation: string;
} {
  const destUf = (destUfRaw || '').trim().toUpperCase();
  const cleanNfoCfop = (nfoCfopRaw || '').replace(/\D/g, '');
  const isCfopInternal = cleanNfoCfop.startsWith('5');
  const isInternal = cleanNfoCfop !== ''
    ? isCfopInternal
    : (destUf !== '' && company.uf !== '' && destUf === company.uf);
  const cleanNcm = (ncmRaw || '').replace(/\D/g, '');
  const prefix4 = cleanNcm.slice(0, 4);

  // 1. INFAN: Regras específicas baseadas no CFOP da Nota de Origem e NCM (Fonte: Sheet 3 / Polliana)
  if (company.key === 'INFAN') {
    // A. Suframa (CFOPs 6109 / 6110): Alíquota 0% (Isenção / Desoneração)
    if (cleanNfoCfop === '6109' || cleanNfoCfop === '6110') {
      return {
        expectedRate: 0.0,
        reductionPercentage: 0,
        baseMultiplier: 0.0,
        isInternal: false,
        explanation: `INFAN Suframa (CFOP ${cleanNfoCfop}): Operação com desoneração de ICMS (Alíquota 0%).`,
      };
    }

    // Alíquota de Saída: 20.50% (Interna PB) vs 12.00% (Interestadual)
    const rate = isInternal ? 0.205 : 0.12;
    const opLabel = isInternal ? 'Interna (PB)' : `Interestadual (${destUf || 'Inter'})`;

    // B. NCM 3004: Medicamentos possuem Redução de Base de ICMS de 9,90% (Base = 90,10%)
    if (prefix4 === '3004') {
      return {
        expectedRate: rate,
        reductionPercentage: 9.90,
        baseMultiplier: 0.901,
        isInternal,
        explanation: `INFAN ${opLabel} (CFOP ${cleanNfoCfop || 'Venda'}): Alíquota ${(rate * 100).toFixed(2)}% com Redução de Base de 9,90% (Base = 90,10%) para Medicamento (NCM 3004).`,
      };
    }

    // C. Cosméticos e Higiene (3401.20.10, 3304.99.10, 3307.90.00, 3401.30.00): Redução de 10,49% (Base = 89,51%)
    // Exceto sabão comum NCM 34011900 que é Base Cheia
    if (
      !cleanNcm.startsWith('34011900') &&
      (cleanNcm.startsWith('34012010') ||
       cleanNcm.startsWith('33049910') ||
       cleanNcm.startsWith('33079000') ||
       cleanNcm.startsWith('34013000') ||
       ['3401', '3304', '3307'].includes(prefix4))
    ) {
      return {
        expectedRate: rate,
        reductionPercentage: 10.49,
        baseMultiplier: 0.8951,
        isInternal,
        explanation: `INFAN ${opLabel} (CFOP ${cleanNfoCfop || 'Venda'}): Alíquota ${(rate * 100).toFixed(2)}% com Redução de Base de 10,49% (Base = 89,51%) para Cosméticos/Higiene.`,
      };
    }

    // D. Demais NCMs (2936, 2106, 2309, 30024991, 34011900, 33069000): BASE CHEIA
    return {
      expectedRate: rate,
      reductionPercentage: 0,
      baseMultiplier: 1.0,
      isInternal,
      explanation: `INFAN ${opLabel} (CFOP ${cleanNfoCfop || 'Venda'}): Alíquota ${(rate * 100).toFixed(2)}% com Base Cheia (sem redução).`,
    };
  }

  // 2. QUESALON PB: Base Cheia para todos os NCMs
  if (company.key === 'QUESALON_PB') {
    if (cleanNfoCfop === '6110') {
      return {
        expectedRate: 0.0,
        reductionPercentage: 0,
        baseMultiplier: 0.0,
        isInternal: false,
        explanation: 'QUESALON PB Suframa (CFOP 6110): Alíquota 0% com desoneração.',
      };
    }
    return {
      expectedRate: isInternal ? 0.20 : 0.12,
      reductionPercentage: 0,
      baseMultiplier: 1.0,
      isInternal,
      explanation: `QUESALON PB ${isInternal ? 'Interna' : 'Interestadual'}: Alíquota padrão ${isInternal ? '20,00%' : '12,00%'} com Base Cheia.`,
    };
  }

  // 3. QUESALON EXTREMA (MG)
  if (company.key === 'QUESALON_EXTREMA') {
    if (cleanNfoCfop === '6110') {
      return {
        expectedRate: 0.0,
        reductionPercentage: 0,
        baseMultiplier: 0.0,
        isInternal: false,
        explanation: 'QUESALON Extrema Suframa (CFOP 6110): Alíquota 0% com desoneração.',
      };
    }
    if (isInternal) {
      const rate = nfoIcmsRatePracticed !== undefined && (Math.abs(nfoIcmsRatePracticed - 12) < 0.5 || Math.abs(nfoIcmsRatePracticed - 0.12) < 0.005)
        ? 0.12
        : 0.18;
      return {
        expectedRate: rate,
        reductionPercentage: 0,
        baseMultiplier: 1.0,
        isInternal: true,
        explanation: `QUESALON Extrema Interna (MG): Alíquota ${(rate * 100).toFixed(0)}% (Termo de Acordo MG) com Base Cheia.`,
      };
    }
    // Interestadual: Sul/Sudeste exceto ES -> 12% | Demais -> 7%
    if (SOUTH_SOUTHEAST_EXCEPT_ES.includes(destUf)) {
      return {
        expectedRate: 0.12,
        reductionPercentage: 0,
        baseMultiplier: 1.0,
        isInternal: false,
        explanation: `QUESALON Extrema Interestadual (MG ➔ ${destUf} Sul/Sudeste): Alíquota 12,00%.`,
      };
    }
    return {
      expectedRate: 0.07,
      reductionPercentage: 0,
      baseMultiplier: 1.0,
      isInternal: false,
      explanation: `QUESALON Extrema Interestadual (MG ➔ ${destUf} ES/CO/N/NE): Alíquota 7,00%.`,
    };
  }

  // 4. QUEDES (AL)
  if (company.key === 'QUEDES') {
    if (cleanNfoCfop === '6110') {
      return {
        expectedRate: 0.0,
        reductionPercentage: 0,
        baseMultiplier: 0.0,
        isInternal: false,
        explanation: 'QUEDES Suframa (CFOP 6110): Alíquota 0% com desoneração.',
      };
    }
    return {
      expectedRate: 0.12,
      reductionPercentage: 0,
      baseMultiplier: 1.0,
      isInternal: false,
      explanation: 'QUEDES Interestadual (AL): Alíquota 12,00% com Base Cheia.',
    };
  }

  // Fallback genérico
  const rate = isInternal ? (company.internalIcmsRate || 0.20) : (company.interstateIcmsRateDefault || 0.12);
  return {
    expectedRate: rate,
    reductionPercentage: 0,
    baseMultiplier: 1.0,
    isInternal,
    explanation: `${company.tradeName} (${company.uf}): Alíquota ${(rate * 100).toFixed(1)}%.`,
  };
}
