import { NFeBatch, NFeDocument, NFeItem, NFeParticipant, NFeTaxICMS, NFeTaxIPI, NFeTotals } from '../types/nfe';

function getTagText(parent: Element | Document, tagNames: string[]): string {
  for (const tagName of tagNames) {
    const el = parent.getElementsByTagName(tagName)[0];
    if (el && el.textContent !== null) {
      return el.textContent.trim();
    }
  }
  return '';
}

function parseFloatSafe(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseParticipant(partEl: Element | null): NFeParticipant {
  if (!partEl) {
    return { cnpj: '', xNome: '' };
  }

  const cnpj = getTagText(partEl, ['CNPJ', 'CPF']);
  const xNome = getTagText(partEl, ['xNome']);
  const xFant = getTagText(partEl, ['xFant']);
  const ie = getTagText(partEl, ['IE']);
  const uf = getTagText(partEl, ['UF']);
  const xMun = getTagText(partEl, ['xMun']);
  const fone = getTagText(partEl, ['fone']);
  const email = getTagText(partEl, ['email']);

  return { cnpj, xNome, xFant, ie, uf, xMun, fone, email };
}

function parseBatches(prodEl: Element): NFeBatch[] {
  const batches: NFeBatch[] = [];
  const rastroEls = Array.from(prodEl.getElementsByTagName('rastro'));

  for (const rastro of rastroEls) {
    const nLote = getTagText(rastro, ['nLote']);
    const qLote = parseFloatSafe(getTagText(rastro, ['qLote']));
    const dFab = getTagText(rastro, ['dFab']);
    const dVal = getTagText(rastro, ['dVal']);

    if (nLote) {
      batches.push({ nLote, qLote, dFab, dVal });
    }
  }

  return batches;
}

function parseICMS(impostoEl: Element): NFeTaxICMS | undefined {
  const icmsContainer = impostoEl.getElementsByTagName('ICMS')[0];
  if (!icmsContainer) return undefined;

  // ICMS can have child like ICMS00, ICMS10, ICMS20, ICMS40, ICMS60, ICMS90, ICMSSN102, etc.
  const childNodes = Array.from(icmsContainer.children);
  if (childNodes.length === 0) return undefined;

  const child = childNodes[0];
  const orig = getTagText(child, ['orig']);
  const cst = getTagText(child, ['CST', 'CSOSN']);
  const modBC = getTagText(child, ['modBC']);
  const vBC = parseFloatSafe(getTagText(child, ['vBC']));
  const pICMS = parseFloatSafe(getTagText(child, ['pICMS']));
  const vICMS = parseFloatSafe(getTagText(child, ['vICMS']));

  return { orig, cst, modBC, vBC, pICMS, vICMS };
}

function parseIPI(impostoEl: Element): NFeTaxIPI | undefined {
  const ipiContainer = impostoEl.getElementsByTagName('IPI')[0];
  if (!ipiContainer) return undefined;

  const ipiTrib = ipiContainer.getElementsByTagName('IPITrib')[0] || ipiContainer.getElementsByTagName('IPINT')[0];
  if (!ipiTrib) return undefined;

  const cst = getTagText(ipiTrib, ['CST']);
  const vBC = parseFloatSafe(getTagText(ipiTrib, ['vBC']));
  const pIPI = parseFloatSafe(getTagText(ipiTrib, ['pIPI']));
  const vIPI = parseFloatSafe(getTagText(ipiTrib, ['vIPI']));

  return { cst, vBC, pIPI, vIPI };
}

function parseItem(detEl: Element, index: number): NFeItem {
  const nItemAttr = detEl.getAttribute('nItem');
  const nItem = nItemAttr ? parseInt(nItemAttr, 10) : index + 1;

  const prodEl = detEl.getElementsByTagName('prod')[0] || detEl;
  const impostoEl = detEl.getElementsByTagName('imposto')[0] || detEl;

  const cProd = getTagText(prodEl, ['cProd']);
  const cEAN = getTagText(prodEl, ['cEAN']);
  const cEANTrib = getTagText(prodEl, ['cEANTrib']);
  const xProd = getTagText(prodEl, ['xProd']);
  const ncm = getTagText(prodEl, ['NCM']);
  const cfop = getTagText(prodEl, ['CFOP']);
  const uCom = getTagText(prodEl, ['uCom']);
  const qCom = parseFloatSafe(getTagText(prodEl, ['qCom']));
  const vUnCom = parseFloatSafe(getTagText(prodEl, ['vUnCom']));
  const vProd = parseFloatSafe(getTagText(prodEl, ['vProd']));
  const vDesc = parseFloatSafe(getTagText(prodEl, ['vDesc']));
  const xPed = getTagText(prodEl, ['xPed']);
  const nItemPed = getTagText(prodEl, ['nItemPed']);
  const infAdProd = getTagText(detEl, ['infAdProd']);

  const batches = parseBatches(prodEl);
  const icms = parseICMS(impostoEl);
  const ipi = parseIPI(impostoEl);

  return {
    nItem,
    cProd,
    cEAN,
    cEANTrib,
    xProd,
    ncm,
    cfop,
    uCom,
    qCom,
    vUnCom,
    vProd,
    vDesc,
    xPed,
    nItemPed,
    batches,
    icms,
    ipi,
    infAdProd,
  };
}

function parseTotals(totalEl: Element | null): NFeTotals {
  if (!totalEl) {
    return { vBC: 0, vICMS: 0, vProd: 0, vDesc: 0, vIPI: 0, vPIS: 0, vCOFINS: 0, vNF: 0 };
  }

  const icmsTot = totalEl.getElementsByTagName('ICMSTot')[0] || totalEl;

  return {
    vBC: parseFloatSafe(getTagText(icmsTot, ['vBC'])),
    vICMS: parseFloatSafe(getTagText(icmsTot, ['vICMS'])),
    vProd: parseFloatSafe(getTagText(icmsTot, ['vProd'])),
    vDesc: parseFloatSafe(getTagText(icmsTot, ['vDesc'])),
    vIPI: parseFloatSafe(getTagText(icmsTot, ['vIPI'])),
    vPIS: parseFloatSafe(getTagText(icmsTot, ['vPIS'])),
    vCOFINS: parseFloatSafe(getTagText(icmsTot, ['vCOFINS'])),
    vNF: parseFloatSafe(getTagText(icmsTot, ['vNF'])),
  };
}

function extractMotivoDevolucao(infCpl: string): string | undefined {
  if (!infCpl) return undefined;
  const match = infCpl.match(/MOTIVO:\s*(.+?)(?:\/\/|;|\n|$)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return undefined;
}

function extractNfoRefNumber(infCpl: string): string | undefined {
  if (!infCpl) return undefined;
  const match = infCpl.match(/NFO:\s*(\d+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return undefined;
}

export function parseNFeXml(xmlContent: string, fileName: string = 'NFe.xml'): NFeDocument {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'application/xml');

  const parserError = doc.getElementsByTagName('parsererror')[0];
  if (parserError) {
    throw new Error(`Erro ao ler o arquivo XML: ${parserError.textContent}`);
  }

  const infNFe = doc.getElementsByTagName('infNFe')[0];
  if (!infNFe) {
    throw new Error('Formato NFe inválido: tag <infNFe> não encontrada.');
  }

  const id = infNFe.getAttribute('Id') || '';
  const ide = doc.getElementsByTagName('ide')[0] || infNFe;

  const nNF = getTagText(ide, ['nNF']);
  const serie = getTagText(ide, ['serie']);
  const dhEmi = getTagText(ide, ['dhEmi', 'dEmi']);
  const natOp = getTagText(ide, ['natOp']);
  const finNFe = parseInt(getTagText(ide, ['finNFe']) || '1', 10);

  // Extract chNFe
  let chNFe = id.replace(/^NFe/i, '');
  const infProt = doc.getElementsByTagName('infProt')[0];
  let nProt: string | undefined;
  let dhRecbto: string | undefined;
  let cStat: number | undefined;
  let xMotivoSEFAZ: string | undefined;

  if (infProt) {
    const chNFeProt = getTagText(infProt, ['chNFe']);
    if (chNFeProt) chNFe = chNFeProt;
    nProt = getTagText(infProt, ['nProt']);
    dhRecbto = getTagText(infProt, ['dhRecbto']);
    cStat = parseInt(getTagText(infProt, ['cStat']) || '0', 10);
    xMotivoSEFAZ = getTagText(infProt, ['xMotivo']);
  }

  // Extract refNFe list from NFref
  const refNFeList: string[] = [];
  const nfRefEls = Array.from(doc.getElementsByTagName('NFref'));
  for (const ref of nfRefEls) {
    const refKey = getTagText(ref, ['refNFe']);
    if (refKey) {
      refNFeList.push(refKey);
    }
  }

  const emit = parseParticipant(doc.getElementsByTagName('emit')[0] || null);
  const dest = parseParticipant(doc.getElementsByTagName('dest')[0] || null);

  // Extract items
  const detEls = Array.from(doc.getElementsByTagName('det'));
  const items: NFeItem[] = detEls.map((det, idx) => parseItem(det, idx));

  // Totals
  const totals = parseTotals(doc.getElementsByTagName('total')[0] || null);

  // Additional Info
  const infAdic = doc.getElementsByTagName('infAdic')[0];
  const infCpl = infAdic ? getTagText(infAdic, ['infCpl']) : undefined;
  const parsedMotivoDevolucao = infCpl ? extractMotivoDevolucao(infCpl) : undefined;
  const parsedNfoRefNumber = infCpl ? extractNfoRefNumber(infCpl) : undefined;

  // Determine NFe Type: finNFe == 4 or natOp has DEV or CFOP has x202/x411
  let nfeType: 'NFO' | 'NFD' | 'UNKNOWN' = 'UNKNOWN';
  const isDevNatOp = /DEV|DEVOLUC/i.test(natOp);
  const isDevCfop = items.some(item => /^[1-7](20[1-9]|411)/.test(item.cfop));

  if (finNFe === 4 || isDevNatOp || isDevCfop) {
    nfeType = 'NFD';
  } else if (finNFe === 1) {
    nfeType = 'NFO';
  }

  return {
    id,
    rawXml: xmlContent,
    fileName,
    nfeType,
    chNFe,
    nNF,
    serie,
    dhEmi,
    natOp,
    finNFe,
    nProt,
    dhRecbto,
    cStat,
    xMotivoSEFAZ,
    refNFeList,
    emit,
    dest,
    items,
    totals,
    infCpl,
    parsedMotivoDevolucao,
    parsedNfoRefNumber,
  };
}
