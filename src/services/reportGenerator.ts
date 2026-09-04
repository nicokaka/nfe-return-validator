import { ReconciliationResult } from '../types/nfe';

export function generateDiscrepancyReport(result: ReconciliationResult): string {
  const { nfd, nfo, headerValidation, itemComparisons, summary, ndoSuggestion, piramideResolution } = result;

  const dateStr = new Date().toLocaleDateString('pt-BR');
  const criticalIssues = [
    ...headerValidation.issues.filter(i => i.severity === 'CRITICAL'),
    ...itemComparisons.flatMap(c => c.issues.filter(i => i.severity === 'CRITICAL')),
  ];
  const warningIssues = [
    ...headerValidation.issues.filter(i => i.severity === 'WARNING'),
    ...itemComparisons.flatMap(c => c.issues.filter(i => i.severity === 'WARNING')),
  ];

  let lines: string[] = [];

  lines.push('================================================================');
  lines.push('          LAUDO DE DIVERGÊNCIA FISCAL - PRÉ-COLETA             ');
  lines.push('================================================================');
  lines.push(`Data do Diagnóstico: ${dateStr}`);
  lines.push(`Cliente/Emitente: ${nfd.emit.xNome} (CNPJ: ${nfd.emit.cnpj})`);
  lines.push(`Destinatário: ${nfd.dest.xNome} (CNPJ: ${nfd.dest.cnpj})`);
  lines.push(`Nota Fiscal de Devolução (NFD): Nº ${nfd.nNF} (Chave: ${nfd.chNFe})`);
  lines.push(`Nota Fiscal de Origem (NFO): Nº ${nfo.nNF} (Chave: ${nfo.chNFe})`);
  if (ndoSuggestion) {
    lines.push(`NDO Sugerida (Pirâmide): ${ndoSuggestion.cfop} - ${ndoSuggestion.ndoDescription}`);
  }
  if (piramideResolution) {
    lines.push(`Motivo Pirâmide: ${piramideResolution.motivoCode} - ${piramideResolution.motivoDesc}`);
    lines.push(`Almoxarifado Sugerido: ${piramideResolution.almoxarifado} (${piramideResolution.isAutomatic ? 'Automático' : 'Avaliação Física na Doca'})`);
  } else if (summary.motivoDevolucao) {
    lines.push(`Motivo Declarado pelo Cliente: ${summary.motivoDevolucao}`);
  }
  lines.push('----------------------------------------------------------------');
  lines.push(`DIAGNÓSTICO GERAL: ${summary.overallStatus === 'REJECTED' ? '❌ BLOQUEADO - CORREÇÃO NECESSÁRIA ANTES DA COLETA' : '⚠️ DIVERGÊNCIAS DETECTADAS'}`);
  lines.push(`Erros Críticos: ${summary.totalCriticalErrors} | Alertas: ${summary.totalWarnings}`);
  lines.push('================================================================\n');

  if (criticalIssues.length > 0) {
    lines.push('DIVERGÊNCIAS CRÍTICAS (EXIGEM CORREÇÃO OU REEMISSÃO):');
    lines.push('----------------------------------------------------------------');
    criticalIssues.forEach((issue, idx) => {
      lines.push(`${idx + 1}. [${issue.title}]`);
      lines.push(`   ${issue.description}`);
    });
    lines.push('');
  }

  if (warningIssues.length > 0) {
    lines.push('ALERTAS DE CONCORDÂNCIA (RECOMENDADA VERIFICAÇÃO):');
    lines.push('----------------------------------------------------------------');
    warningIssues.forEach((issue, idx) => {
      lines.push(`${idx + 1}. [${issue.title}]`);
      lines.push(`   ${issue.description}`);
    });
    lines.push('');
  }

  lines.push('RESUMO DOS ITENS ANALISADOS:');
  lines.push('----------------------------------------------------------------');
  itemComparisons.forEach((c, idx) => {
    const statusIcon = c.issues.some(i => i.severity === 'CRITICAL') ? '❌' : c.issues.length > 0 ? '⚠️' : '✅';
    const nfdItem = c.nfdItem;
    const nfoItem = c.nfoItem;
    const qtyInfo = nfoItem
      ? `${nfdItem.qCom} ${nfdItem.uCom} (de ${nfoItem.qCom} ${nfoItem.uCom} faturados - ${c.returnType === 'TOTAL' ? 'Total' : c.returnType === 'PARTIAL' ? 'Parcial' : 'Excedente'})`
      : `${nfdItem.qCom} ${nfdItem.uCom}`;

    lines.push(`${idx + 1}. ${statusIcon} ${nfdItem.xProd}`);
    const ncmDesc = c.ncmProfile ? `${c.ncmProfile.categoryLabel} [NCM ${nfdItem.ncm}]` : `NCM ${nfdItem.ncm}`;
    lines.push(`   • Classificação: ${ncmDesc}${nfdItem.med?.cProdANVISA ? ` | ANVISA: ${nfdItem.med.cProdANVISA}` : ''}`);
    lines.push(`   • EAN: ${nfdItem.cEAN || 'Sem GTIN'} | Qtd: ${qtyInfo} | Preço Un: R$ ${nfdItem.vUnCom.toFixed(4)}`);
    if (c.discountAudit) {
      lines.push(`   • Desconto: Informado R$ ${c.discountAudit.actualDiscount.toFixed(2)} | Esperado Proporcional R$ ${c.discountAudit.expectedDiscount.toFixed(2)} (${c.discountAudit.isProportional ? '✅ Conforme' : '⚠️ Divergente'})`);
    }
    if (c.pisCofinsCreditAudit?.isMonofasicoRecovery) {
      lines.push(`   • Crédito PIS/COFINS INFAN (CST 50): PIS R$ ${c.pisCofinsCreditAudit.vPisCredit.toFixed(2)} | COFINS R$ ${c.pisCofinsCreditAudit.vCofinsCredit.toFixed(2)}`);
    }
    if (c.ibsCbsAudit && ((c.ibsCbsAudit.vCbs || 0) > 0 || (c.ibsCbsAudit.vIbs || 0) > 0)) {
      lines.push(`   • Reforma Tributária: CBS R$ ${(c.ibsCbsAudit.vCbs || 0).toFixed(2)} | IBS R$ ${(c.ibsCbsAudit.vIbs || 0).toFixed(2)}`);
    }
    if (c.piramideResolution) {
      lines.push(`   • Destino Pirâmide: Almoxarifado [${c.piramideResolution.almoxarifado}] (${c.piramideResolution.motivoDesc})`);
    }
    if (nfdItem.batches.length > 0) {
      lines.push(`   • Lote(s) NFD: ${nfdItem.batches.map(b => b.nLote).join(', ')}`);
    } else {
      lines.push(`   • Lote(s) NFD: ${c.ncmProfile?.category === 'VITAMINA' || c.ncmProfile?.category === 'SUPLEMENTO' ? 'ℹ️ NÃO INFORMADO (Dispensado pela NT 2021.004)' : '❌ NÃO INFORMADO NA NOTA'}`);
    }

    if (nfoItem) {
      lines.push(`   • Origem na NFO: Item #${nfoItem.nItem} (cProd: ${nfoItem.cProd}) - Lote(s) Origem: ${nfoItem.batches.map(b => b.nLote).join(', ') || 'Nenhum'}`);
    } else {
      lines.push(`   • Origem na NFO: ❌ NÃO LOCALIZADO NA NOTA DE ORIGEM`);
    }
  });

  lines.push('\n================================================================');
  lines.push('INSTRUÇÕES PARA O CLIENTE:');
  lines.push('Favor providenciar a Carta de Correção Eletrônica (CC-e) ou a');
  lines.push('reemissão da Nota Fiscal de Devolução sanando os pontos citados');
  lines.push('acima antes da liberação do veículo de coleta.');
  lines.push('================================================================');

  return lines.join('\n');
}
