/**
 * Serviço de Validação e Consulta de Status SEFAZ da NF-e
 */

export interface NFeKeyValidationResult {
  chNFe: string;
  isValidLength: boolean;
  isValidChecksum: boolean;
  ufCode: string;
  yearMonth: string;
  cnpj: string;
  model: string;
  serie: string;
  nNF: string;
  tpEmis: string;
  cNF: string;
  cDV: string;
  errorReason?: string;
}

/**
 * Valida a chave de acesso de 44 dígitos e o seu dígito verificador (DV - Módulo 11)
 */
export function validateNFeKey(chNFeRaw: string | undefined | null): NFeKeyValidationResult {
  const chNFe = (chNFeRaw || '').replace(/\D/g, '');

  if (chNFe.length !== 44) {
    return {
      chNFe,
      isValidLength: false,
      isValidChecksum: false,
      ufCode: '',
      yearMonth: '',
      cnpj: '',
      model: '',
      serie: '',
      nNF: '',
      tpEmis: '',
      cNF: '',
      cDV: '',
      errorReason: `Chave de acesso possui ${chNFe.length} dígitos (esperado 44 dígitos).`,
    };
  }

  // Decomposição dos campos da chave de 44 dígitos
  const ufCode = chNFe.slice(0, 2);
  const yearMonth = chNFe.slice(2, 6);
  const cnpj = chNFe.slice(6, 20);
  const model = chNFe.slice(20, 22);
  const serie = chNFe.slice(22, 25);
  const nNF = chNFe.slice(25, 34);
  const tpEmis = chNFe.slice(34, 35);
  const cNF = chNFe.slice(35, 43);
  const cDV = chNFe.slice(43, 44);

  // Cálculo do Módulo 11 dos primeiros 43 dígitos
  const base43 = chNFe.slice(0, 43);
  let weight = 2;
  let sum = 0;
  for (let i = base43.length - 1; i >= 0; i--) {
    sum += parseInt(base43.charAt(i), 10) * weight;
    weight++;
    if (weight > 9) weight = 2;
  }
  const mod = sum % 11;
  const expectedDV = mod === 0 || mod === 1 ? 0 : 11 - mod;

  const isValidChecksum = expectedDV === parseInt(cDV, 10);

  return {
    chNFe,
    isValidLength: true,
    isValidChecksum,
    ufCode,
    yearMonth,
    cnpj,
    model,
    serie,
    nNF,
    tpEmis,
    cNF,
    cDV,
    errorReason: isValidChecksum
      ? undefined
      : `Dígito verificador da chave inválido (calculado: ${expectedDV}, informado: ${cDV}).`,
  };
}

/**
 * Retorna o link oficial do Portal Nacional da NF-e para consulta pública
 */
export function getPortalNFeConsultUrl(): string {
  return 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g=';
}

/**
 * Retorna o link de consulta do Cadastro Centralizado de Contribuintes (CCC / SVRS)
 * (Nota: a SVRS pode solicitar autenticação Gov.br)
 */
export function getCccSefazUrl(): string {
  return 'https://dfe-portal.svrs.rs.gov.br/NFE/CCC';
}

/**
 * Retorna o link oficial do Sintegra Nacional
 */
export function getSintegraUrl(): string {
  return 'http://www.sintegra.gov.br/';
}

/**
 * Retorna o link direto do Sintegra por Unidade Federativa (SEFAZ Estadual)
 */
export function getSintegraStateUrl(uf?: string): string {
  const cleanUf = (uf || '').toUpperCase().trim();
  const sintegraMap: Record<string, string> = {
    PA: 'https://app.sefa.pa.gov.br/sintegra/',
    PB: 'https://www.sefaz.pb.gov.br/sintegra',
    PE: 'https://efisco.sefaz.pe.gov.br/',
    AL: 'https://www.sefaz.al.gov.br/',
    MG: 'https://www.fazenda.mg.gov.br/',
    BA: 'http://www.sefaz.ba.gov.br/',
    CE: 'https://www.sefaz.ce.gov.br/',
    SP: 'https://www.cadesp.fazenda.sp.gov.br/',
    RJ: 'http://www.fazenda.rj.gov.br/',
    RN: 'https://uvt.set.rn.gov.br/',
    MA: 'https://sistemas1.sefaz.ma.gov.br/sintegra/',
    PI: 'https://www.sefaz.pi.gov.br/',
    SE: 'https://www.sefaz.se.gov.br/',
    AM: 'https://online.sefaz.am.gov.br/sintegra/',
    PR: 'https://receita.pr.gov.br/',
    SC: 'https://sat.sef.sc.gov.br/',
    RS: 'https://dfe-portal.svrs.rs.gov.br/NFE/CCC',
    GO: 'https://www.sefaz.go.gov.br/',
    MT: 'https://www.sefaz.mt.gov.br/',
    MS: 'https://www.sefaz.ms.gov.br/',
    DF: 'https://ww1.receita.fazenda.df.gov.br/',
    ES: 'https://internet.sefaz.es.gov.br/',
    RO: 'https://portalcontribuinte.sefin.ro.gov.br/',
    AC: 'https://sefaz.ac.gov.br/',
    AP: 'https://www.sefaz.ap.gov.br/',
    RR: 'https://www.sefaz.rr.gov.br/',
    TO: 'https://sintegra.sefaz.to.gov.br/',
  };

  return sintegraMap[cleanUf] || 'http://www.sintegra.gov.br/';
}

/**
 * Retorna o link oficial de Consulta de CNPJ da Receita Federal (Redesim / Comprovante de Inscrição)
 */
export function getReceitaCnpjConsultUrl(): string {
  return 'https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp';
}
