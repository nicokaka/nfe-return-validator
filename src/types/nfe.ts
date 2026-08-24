export type NFeType = 'NFO' | 'NFD' | 'UNKNOWN';

export interface NFeParticipant {
  cnpj: string;
  xNome: string;
  xFant?: string;
  ie?: string;
  uf?: string;
  xMun?: string;
  fone?: string;
  email?: string;
}

export interface NFeBatch {
  nLote: string;
  qLote: number;
  dFab?: string;
  dVal?: string;
}

export interface NFeTaxICMS {
  cst: string;
  orig: string;
  modBC?: string;
  vBC: number;
  pICMS: number;
  vICMS: number;
}

export interface NFeTaxIPI {
  cst?: string;
  vBC: number;
  pIPI: number;
  vIPI: number;
}

export interface NFeItemMed {
  cProdANVISA: string;
  xMotivoIsencao?: string;
  vPMC?: number;
}

export interface NFeTaxPIS {
  cst: string;
  vBC: number;
  pPIS: number;
  vPIS: number;
}

export interface NFeTaxCOFINS {
  cst: string;
  vBC: number;
  pCOFINS: number;
  vCOFINS: number;
}

export interface NFeTaxICMSST {
  vBCST: number;
  pICMSST: number;
  vICMSST: number;
}

export type NcmCategory = 'MEDICAMENTO' | 'VITAMINA' | 'SUPLEMENTO' | 'COSMETICO_CORRELATO' | 'OUTROS';

export interface NcmProfile {
  ncm: string;
  cleanNcm: string;
  category: NcmCategory;
  categoryLabel: string;
  icon: string;
  requiresMedTag: boolean;
  requiresRastroTag: boolean;
  pisCofinsRegime: 'MONOFASICO_ALÍQUOTA_ZERO' | 'TRIBUTACAO_NORMAL' | 'ISENTO_VARIAVEL';
  expectedPisCst: string[];
  anvisaRegulated: boolean;
  description: string;
}

export interface DiscountAudit {
  actualDiscount: number;
  expectedDiscount: number;
  diffDiscount: number;
  discountPerUnitNfd: number;
  discountPerUnitNfo: number;
  discountPercentageNfd: number;
  discountPercentageNfo: number;
  isProportional: boolean;
  isExceededProductValue: boolean;
}

export interface NFeItem {
  nItem: number;
  cProd: string;
  cEAN: string;
  cEANTrib: string;
  xProd: string;
  ncm: string;
  cfop: string;
  uCom: string;
  qCom: number;
  vUnCom: number;
  vProd: number;
  vDesc: number;
  xPed?: string;
  nItemPed?: string;
  batches: NFeBatch[];
  icms?: NFeTaxICMS;
  ipi?: NFeTaxIPI;
  pis?: NFeTaxPIS;
  cofins?: NFeTaxCOFINS;
  icmsST?: NFeTaxICMSST;
  med?: NFeItemMed;
  infAdProd?: string;
}

export interface NFeTotals {
  vBC: number;
  vICMS: number;
  vProd: number;
  vDesc: number;
  vIPI: number;
  vPIS: number;
  vCOFINS: number;
  vNF: number;
}

export interface PharmaceuticalSummary {
  totalMedicamentos: number;
  totalVitaminas: number;
  totalSuplementos: number;
  totalCosmeticosCorrelatos: number;
  totalOutros: number;
  totalMonofasicos: number;
  totalComLote: number;
  totalComAnvisa: number;
  totalDescontoNfd: number;
  totalDescontoNfoProporcional: number;
  temDivergenciaDesconto: boolean;
}

export interface NFeDocument {
  id: string; // infNfe Id
  rawXml: string;
  fileName: string;
  nfeType: NFeType;
  chNFe: string;
  nNF: string;
  serie: string;
  dhEmi: string;
  natOp: string;
  finNFe: number; // 1 = Normal, 4 = Devolução
  tpNF?: number; // 0 = Entrada, 1 = Saída
  indPres?: number; // 1 = Presencial, 2 = Internet, 3 = Teleatendimento, etc.
  nProt?: string;
  dhRecbto?: string;
  cStat?: number;
  xMotivoSEFAZ?: string;
  refNFeList: string[]; // List of refNFe keys in NFref
  emit: NFeParticipant;
  dest: NFeParticipant;
  items: NFeItem[];
  totals: NFeTotals;
  infCpl?: string;
  parsedMotivoDevolucao?: string;
  parsedNfoRefNumber?: string;
}

export type IssueSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface ValidationIssue {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  field?: string;
}

export type ReturnType = 'TOTAL' | 'PARTIAL' | 'EXCESS';

export interface PiramideMotivo {
  code: string;
  description: string;
  almoxarifado: string;
  isAutomatic: boolean;
  destinationType: 'AUTOMATIC' | 'PHYSICAL_INSPECTION';
}

export interface PiramideWarehouse {
  code: string;
  name: string;
  description: string;
}

export interface PiramideResolution {
  motivoCode: string;
  motivoDesc: string;
  almoxarifado: string;
  isAutomatic: boolean;
  destinationType: 'AUTOMATIC' | 'PHYSICAL_INSPECTION';
  notes?: string;
}

export interface NDOSuggestion {
  ndoCode: string;
  ndoDescription: string;
  cfop: string;
  operationType: 'DEV_VENDA' | 'DEV_BONIFICACAO' | 'DEV_ST' | 'OUTROS';
  isInterstate: boolean;
  explanation: string;
}

export interface ItemComparison {
  nfdItem: NFeItem;
  nfoItem?: NFeItem;
  matchType: 'EAN_EXACT' | 'EAN_TRIB' | 'DESCRIPTION_SIMILARITY' | 'MANUAL' | 'NONE';
  matchConfidence: number; // 0 to 1
  qFaturada?: number;
  qDevolvida?: number;
  percentageReturned?: number;
  returnType?: ReturnType;
  piramideResolution?: PiramideResolution;
  ncmProfile?: NcmProfile;
  discountAudit?: DiscountAudit;
  issues: ValidationIssue[];
  isMatchOk: boolean;
}

export interface HeaderValidation {
  isRefKeyMatching: boolean;
  isParticipantsMatching: boolean;
  isSefazAuthorized: boolean;
  issues: ValidationIssue[];
}

export interface ReconciliationResult {
  nfd: NFeDocument;
  nfo: NFeDocument;
  headerValidation: HeaderValidation;
  itemComparisons: ItemComparison[];
  unmatchedNfoItems: NFeItem[];
  unmatchedNfdItems: NFeItem[];
  ndoSuggestion?: NDOSuggestion;
  piramideResolution?: PiramideResolution;
  pharmaceuticalSummary?: PharmaceuticalSummary;
  summary: {
    totalItemsNfd: number;
    totalMatched: number;
    totalQuantityNfd?: number;
    totalQuantityNfo?: number;
    overallReturnType?: ReturnType;
    totalCriticalErrors: number;
    totalWarnings: number;
    overallStatus: 'APPROVED' | 'HAS_WARNINGS' | 'REJECTED';
    motivoDevolucao?: string;
  };
}

export interface PairedResult {
  id: string;
  nfd: NFeDocument;
  nfoList: NFeDocument[];
  pairMethod: 'REF_KEY' | 'CNPJ_NNF' | 'UNPAIRED';
  reconciliation: ReconciliationResult | null;
}

export interface BatchSummary {
  totalFiles: number;
  totalNfo: number;
  totalNfd: number;
  totalPaired: number;
  totalUnpaired: number;
  totalApproved: number;
  totalWithWarnings: number;
  totalRejected: number;
  totalValueNfd: number;
}

export interface BatchReconciliationResult {
  pairs: PairedResult[];
  unpairedNfos: NFeDocument[];
  unpairedNfds: NFeDocument[];
  summary: BatchSummary;
  processedAt: string;
}

