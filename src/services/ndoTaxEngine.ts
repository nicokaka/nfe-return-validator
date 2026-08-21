import { NDOSuggestion, NFeDocument, ValidationIssue } from '../types/nfe';

export function suggestNDO(nfd: NFeDocument, nfo?: NFeDocument): NDOSuggestion {
  const ufNfdEmit = nfd.emit.uf || '';
  const ufNfdDest = nfd.dest.uf || '';
  const isInterstate = ufNfdEmit !== '' && ufNfdDest !== '' && ufNfdEmit.toUpperCase() !== ufNfdDest.toUpperCase();

  // Check if any item is Bonificação or has specific CFOP in NFD or NFO
  const cfops = nfd.items.map(i => i.cfop.replace(/\D/g, ''));
  const isNfoBonif = nfo ? (
    nfo.items.some(i => ['1910', '2910', '5910', '6910'].includes(i.cfop.replace(/\D/g, ''))) ||
    /BONIFICA/i.test(nfo.natOp)
  ) : false;

  const isBonificacao = isNfoBonif ||
    cfops.some(c => ['1910', '2910', '5910', '6910'].includes(c)) ||
    /BONIFICA/i.test(nfd.natOp) ||
    nfd.items.some(i => /BONIFICA/i.test(i.xProd));


  const isST = cfops.some(c => ['1411', '2411', '1410', '2410', '5411', '6411'].includes(c)) ||
    /SUBST|ST/i.test(nfd.natOp);

  const mainCfop = cfops[0] || (isInterstate ? '6202' : '5202');

  // Entry CFOP mapping for ERP Pirâmide
  const entryCfop = isBonificacao
    ? (isInterstate ? '2.910' : '1.910')
    : isST
    ? (isInterstate ? '2.411' : '1.411')
    : (isInterstate ? '2.202' : '1.202');

  const customerCfopStr = mainCfop ? `${mainCfop[0]}.${mainCfop.slice(1)}` : (isInterstate ? '6.202' : '5.202');


  if (isBonificacao) {
    const ndoCode = isInterstate ? 'DEV-BONIF-INTER' : 'DEV-BONIF-ESTADUAL';
    const ndoDescription = isInterstate
      ? 'Devolução de Bonificação Interestadual (NDO 2.910)'
      : 'Devolução de Bonificação Estadual (NDO 1.910)';
    return {
      ndoCode,
      ndoDescription,
      cfop: entryCfop,
      operationType: 'DEV_BONIFICACAO',
      isInterstate,
      explanation: `Operação de Bonificação (${ufNfdEmit || 'Origem'} ➔ ${ufNfdDest || 'Destino'}) | CFOP Cliente: ${customerCfopStr} ➔ Entrada Pirâmide: ${entryCfop}`,
    };
  }

  if (isST) {
    const ndoCode = isInterstate ? 'DEV-ST-INTER' : 'DEV-ST-ESTADUAL';
    const ndoDescription = isInterstate
      ? 'Devolução de Mercadoria ICMS-ST Interestadual (NDO 2.411)'
      : 'Devolução de Mercadoria ICMS-ST Estadual (NDO 1.411)';
    return {
      ndoCode,
      ndoDescription,
      cfop: entryCfop,
      operationType: 'DEV_ST',
      isInterstate,
      explanation: `Operação com ICMS-ST (${ufNfdEmit || 'Origem'} ➔ ${ufNfdDest || 'Destino'}) | CFOP Cliente: ${customerCfopStr} ➔ Entrada Pirâmide: ${entryCfop}`,
    };
  }

  // Default: Normal return of sales
  const ndoCode = isInterstate ? 'DEV-VDA-INTER' : 'DEV-VDA-ESTADUAL';
  const ndoDescription = isInterstate
    ? 'Devolução de Venda de Produção/Revenda Interestadual (NDO 2.202/2.201)'
    : 'Devolução de Venda de Produção/Revenda Estadual (NDO 1.202/1.201)';
  return {
    ndoCode,
    ndoDescription,
    cfop: entryCfop,
    operationType: 'DEV_VENDA',
    isInterstate,
    explanation: `Operação Interestadual (${ufNfdEmit || 'PA'} ➔ ${ufNfdDest || 'PB'}) | CFOP Cliente: ${customerCfopStr} ➔ Entrada Pirâmide: ${entryCfop}`,
  };
}


export function validateTaxReformAndBonificacao(nfd: NFeDocument, nfo?: NFeDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for Bonificação consistency
  const isNfdBonificacao = nfd.items.some(i => ['1910', '2910', '5910', '6910'].includes(i.cfop.replace(/\D/g, ''))) ||
    /BONIFICA/i.test(nfd.natOp);

  const isNfoBonificacao = nfo ? (
    nfo.items.some(i => ['1910', '2910', '5910', '6910'].includes(i.cfop.replace(/\D/g, ''))) ||
    /BONIFICA/i.test(nfo.natOp)
  ) : false;

  if (isNfdBonificacao && nfo && !isNfoBonificacao) {
    issues.push({
      id: 'TAX_BONIF_MISMATCH',
      code: 'BONIFICACAO_ORIGIN_MISMATCH',
      title: 'Divergência de Natureza: Bonificação na Devolução x Venda na Origem',
      description: 'A NFD foi emitida como devolução de Bonificação (CFOP 1.910/2.910), mas a NFO original era de venda comercial. Verifique a tributação no Pirâmide.',
      severity: 'WARNING',
      field: 'natOp',
    });
  }

  // Check for CBS / IBS Reform tags in rawXml or additional info
  const rawXml = nfd.rawXml || '';
  const hasCbsIbsTag = /<(?:IBS|CBS|gIBS|gCBS|vCBS|vIBS)/i.test(rawXml);
  const mentionsReform = /CBS|IBS|REFORMA TRIBUT[AÁ]RIA/i.test(nfd.infCpl || '');

  if (hasCbsIbsTag || mentionsReform) {
    issues.push({
      id: 'TAX_REFORM_CBS_IBS',
      code: 'TAX_REFORM_DETECTED',
      title: 'Nota com Incidência de CBS/IBS (Reforma Tributária)',
      description: 'Esta NF-e possui tags ou informações referentes à nova sistemática da Reforma Tributária (CBS/IBS). Certifique-se de escriturar a NDO de compensação adequada no Pirâmide.',
      severity: 'INFO',
      field: 'imposto',
    });
  }

  return issues;
}
