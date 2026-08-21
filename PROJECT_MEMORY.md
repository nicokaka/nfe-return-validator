# 🧠 PROJECT MEMORY & KNOWLEDGE BASE
> **Projeto:** Validador Fiscal & Conciliador de Devoluções de NF-e (NFO x NFD)  
> **Status:** Ativo | Alta Performance | Padrão Senior de Elite  
> **Última Atualização:** 2026-08-20  

---

## 📌 1. DIRETRIZES DE ATUAÇÃO (DEV SENIOR DE ELITE)

Este documento centraliza todas as memórias, regras de negócio, arquitetura técnica e padrões de governança do projeto. Toda e qualquer ação no código deve seguir rigorosamente os seguintes pilares:

### 1.1. Engenharia de Software & Arquitetura
* **Backend & Lógica de Domínio:** Código desacoplado, funções puras para motores de cálculo e validação fiscal, tipagem estrita com TypeScript, tratamento defensivo de erros (`try/catch` estruturado, logs contextuais, validações de fronteira).
* **Frontend & UX:** Interfaces modernas, responsivas, alta usabilidade para operadores fiscais e conferentes de logística. Zero tolerância para interfaces lentas ou mal diagramadas. Uso consistente do sistema de design, micro-interações claras, feedback de status instantâneo e acessibilidade.
* **Banco de Dados & MySQL:**
  * Schemas normalizados (3FN) quando transacional, com indexação estratégica em chaves primárias e de busca frequente (`chNFe`, `nNF`, `cnpjEmit`, `cnpjDest`, `dEmi`, `status`).
  * Integridade referencial com chaves estrangeiras, `ON DELETE RESTRICT` em tabelas fiscais de auditoria.
  * Transações ACID explícitas (`START TRANSACTION` / `COMMIT` / `ROLLBACK`) em operações de conciliação e lançamento em lote.
  * Consultas otimizadas evitando `SELECT *`, uso de queries preparadas (PreparedStatement) contra SQL Injection.

### 1.2. Especialidade Fiscal Nacional (Brasil / SEFAZ)
* **Padrão NF-e v4.00 (MOC - Manual de Orientação do Contribuinte):**
  * Estrutura XML completa: `<ide>`, `<emit>`, `<dest>`, `<det>`, `<prod>`, `<imposto>` (`<ICMS>`, `<IPI>`, `<PIS>`, `<COFINS>`), `<rastro>`, `<total>`, `<infAdic>`.
  * **Regras de Devolução (finNFe = 4):**
    * Obrigatoriedade da tag `<NFref><refNFe>` referenciando a chave de 44 dígitos da NF de Origem (NFO).
    * Cruzamento de Emissor da NFD sendo idêntico ao Destinatário da NFO e vice-versa.
    * CFOPs específicos de devolução (1.201, 1.202, 1.411, 2.201, 2.202, 2.411, 5.201, 5.202, 6.201, 6.202, etc.).
    * Simetria tributária: O valor unitário (`vUnCom`), alíquota de ICMS (`pICMS`), alíquota de IPI (`pIPI`) e redução de base de cálculo devem refletir com precisão a operação de saída faturada.
    * Validação de lotes farmacêuticos/produtos controlados via tag `<rastro>` (`nLote`, `qLote`, `dFab`, `dVal`).
  * Atualização permanente sobre notas técnicas da SEFAZ, Reforma Tributária (IBS/CBS futuramente), DIFAL e substituição tributária (ICMS-ST).

### 1.3. Especialidade em Logística, WMS & Logística Reversa
* **Fluxo Operacional de Recebimento de Devolução:**
  1. **Triagem de Portaria & Chegada Física:** Entrada da carga e conferência da chave da NFD.
  2. **Validação Sistêmica Pré-Descarga:** Execução do validador (NFD x NFO). Se houver discrepância crítica (preço unitário acima do faturado, lote não faturado, falta de chave referenciada), o caminhão/mercadoria é retido ou recusado com canhoto assinado e manifesto.
  3. **Conferência Física & Rastreabilidade (Lote e Validade):** Comparação entre o que está no XML da NFD, no XML da NFO e a mercadoria física (conferência cega/assistida).
  4. **Entrada no WMS / ERP:** Se aprovado, geração de espelho de entrada e conciliação de saldo em estoque (estoque disponível ou quarentena/avariado dependendo do motivo da devolução).

---

## 🏛️ 2. MAPA DE ARQUITETURA DO PROJETO

### 2.1. Visão Geral dos Módulos
```
gleciaAlhandra1/
├── electron/
│   └── main.cjs                     # Entrypoint Desktop Electron
├── src/
│   ├── components/
│   │   ├── BatchDashboard.tsx       # Visão geral de conciliações em lote
│   │   ├── DataBridgeCopilot.tsx    # Copiloto tático do ERP Pirâmide (1-clique)
│   │   ├── DiscrepancyReportModal.tsx # Modal de visualização de divergências
│   │   ├── DualFileUploadZone.tsx   # Zona Drag & Drop para XMLs NFO e NFD
│   │   ├── ExecutiveSummary.tsx     # Resumo executivo com métricas fiscais
│   │   ├── Icons.tsx                # Ícones padronizados (Lucide)
│   │   ├── InstructionsModal.tsx    # Manual de instrução de uso
│   │   ├── ItemsTable.tsx           # Tabela comparativa de itens (NFD x NFO + Qtd + Almox)
│   │   └── ThemeToggle.tsx          # Alternador de tema Claro / Escuro
│   ├── data/
│   │   ├── piramideData.ts          # Base mestre de 51 motivos e 12 almoxarifados do Pirâmide
│   │   └── sampleXmls.ts            # Amostras de XML para testes locais
│   ├── hooks/
│   │   ├── useClipboard.ts          # Utilitário de cópia para área de transferência
│   │   └── useReconciliation.ts     # Hook central de estado e orquestração do lote
│   ├── services/
│   │   ├── batchPairingEngine.ts    # Motor de pareamento automático 1:1 e 1:N
│   │   ├── ndoTaxEngine.ts          # Motor de sugestão de NDO, Bonificação e CBS/IBS
│   │   ├── nfeParser.ts             # Parser universal de XML (Browser & Node/xmldom)
│   │   ├── piramideService.ts       # Motor preditivo de Motivos x Almoxarifados
│   │   ├── reconciliationEngine.test.ts # Suíte exaustiva de testes unitários (32 testes)
│   │   ├── reconciliationEngine.ts  # Motor de regras fiscais e validações profundas
│   │   └── reportGenerator.ts       # Exportação de relatórios (Laudo pré-coleta e CSV)
│   ├── types/
│   │   └── nfe.ts                   # Modelos de tipos (Document, Item, Piramide, NDO, Batch)
│   ├── utils/
│   │   └── textSimilarity.ts        # Algoritmos de Levenshtein e Dice Coefficient
│   ├── testRunner.ts                # Runner CLI para execução automatizada de testes
│   ├── App.tsx                      # Componente raiz da aplicação
│   ├── App.css                      # Estilos principais da aplicação
│   └── index.css                    # Design system, tokens e resets
├── PROJECT_MEMORY.md                # [ESTE ARQUIVO] Base de conhecimento permanente
└── package.json                     # Scripts e dependências
```

---

## 🔍 3. REGRAS DO MOTOR DE CONCILIAÇÃO FISCAL (RECONCILIATION ENGINE)

| Código | Categoria | Severidade | Descrição da Regra |
| :--- | :--- | :--- | :--- |
| **H1** | Cabeçalho | `CRITICAL` | Nota de Origem (NFO) autorizada na SEFAZ (`cStat == 100`). Alerta se cancelada (101/135). |
| **H2** | Cabeçalho | `CRITICAL` | Nota de Devolução (NFD) autorizada na SEFAZ (`cStat == 100`). Alerta se cancelada. |
| **H3** | Cabeçalho | `CRITICAL` | Chave de Origem vinculada na tag `<refNFe>` da NFD ou informada nas informações complementares (`<infCpl>`). |
| **H4_H5**| Cabeçalho | `CRITICAL` | Inversão simétrica dos CNPJs: `NFD.emit == NFO.dest` e `NFD.dest == NFO.emit`. |
| **H6** | Cabeçalho | `WARNING` | Finalidade da NFD deve ser Devolução (`finNFe = 4`). |
| **H8** | Cabeçalho | `WARNING` | Data de emissão da NFD deve ser igual ou posterior à emissão da NFO. |
| **BONIF_MISMATCH** | Cabeçalho/Tributo | `WARNING` | Operação de devolução como bonificação (CFOP 1.910/2.910) divergindo de venda na origem. |
| **CBS_IBS** | Tributo | `INFO` | Detecção de incidência ou menção de CBS/IBS (Reforma Tributária). |
| **I1** | Item | `CRITICAL` | Preço Unitário (`vUnCom`) da NFD não pode divergir do faturado na NFO. |
| **I2** | Item | `CRITICAL` | Quantidade devolvida (`qCom`) não pode exceder a quantidade faturada na NFO. |
| **I3** | Item | `CRITICAL` | Valor total do item (`vProd`) deve coincidir com `qCom * vUnCom`. |
| **I4** | Item | `WARNING` | Desconto proporcional (`vDesc`) por unidade deve manter simetria com a venda original. |
| **I5** | Item / Lote | `CRITICAL` | Se a NFO possuía tag `<rastro>`, a NFD obrigatoriamente deve informar o lote. |
| **I6** | Item / Lote | `CRITICAL` | Lote informado na NFD (`nLote`) deve constar nos lotes faturados da NFO. |
| **I16** | Item / Lote | `WARNING` | Validade do lote (`dVal`) não deve estar expirada na data da devolução. |
| **I7** | Item | `WARNING` | CFOP da NFD deve ser do grupo de devolução (`x201`, `x202`, `x411`, etc.). |
| **I8** | Item / ICMS | `WARNING` | CST / CSOSN de ICMS compatível com a operação de devolução. |
| **I9** | Item / ICMS | `CRITICAL` | Alíquota de ICMS (`pICMS`) da NFD idêntica à da NFO. |
| **I12** | Item / IPI | `CRITICAL` | Alíquota de IPI (`pIPI`) da NFD idêntica à da NFO (quando tributado). |
| **I14** | Item / IPI | `INFO` | CST de IPI na devolução (normalmente 49/99 para entrada ou espelho). |
| **I15** | Item | `INFO` | Notificação sobre divergência de grafia na unidade de medida comercial (`uCom`). |

---

## 📦 4. FLUXO DE PAREAMENTO AUTOMÁTICO (BATCH ENGINE)

1. **Separação de Documentos:** Classificação de arquivos XML em `NFO` (Saídas) e `NFD` (Entradas de Devolução).
2. **Estratégia de Pareamento:**
   * **Nível 1 (Chave de Acesso):** Busca direta pelo valor em `<refNFe>` da NFD igual ao `<chNFe>` da NFO.
   * **Nível 2 (Informações Complementares):** Extração via Regex de número de nota ou chave contida em `<infCpl>`.
   * **Nível 3 (CNPJ Cruzado + Número de NF):** Cruzamento de CNPJs participantes + número referenciado.
   * **Nível 4 (Suporte a 1:N):** Quando uma única NFD devolve itens de múltiplas notas fiscais de origem.

---

## 📝 5. LOG DE DECISÕES & HISTÓRICO EVOLUTIVO

| Data | Autor | Ação Realizada / Decisão Arquitetural |
| :--- | :--- | :--- |
| **2026-08-20** | Senior Elite Dev | Criação da base de memória `PROJECT_MEMORY.md` com diretrizes técnicas e operacionais. |
| **2026-08-20** | Senior Elite Dev | Mapeamento integral da reunião operacional com Glécia e ingestão dos dados da planilha `Informação Nicollas.xlsx` (51 motivos x 12 almoxarifados). |
| **2026-08-20** | Senior Elite Dev | Implementação completa dos 4 requisitos da homologação Pirâmide: (1) `piramideData.ts` e `piramideService.ts` com motor preditivo de motivos e almoxarifados, (2) `ndoTaxEngine.ts` com sugestão de NDO e validação de Bonificação/CBS/IBS, (3) Auditoria visual de quantidades devolvidas x faturadas (`TOTAL`, `PARTIAL`, `EXCESS`) no `ItemsTable.tsx`, (4) Painel turbinado do `DataBridgeCopilot.tsx` com 1-clique para cabeçalho, NDO, centavos e itens, (5) Suíte exaustiva de testes unitários com 32/32 testes aprovados (`npm test`) e build de produção validado (`npm run build`). |
| **2026-08-21** | Senior Elite Dev | Auditoria visual rigorosa das capturas de tela e refatoração de elite: (1) Correção do texto truncado `Copi` ➔ `Copiar` com `white-space: nowrap` e `flex-shrink: 0`, (2) Correção do bug de timezone UTC que retroagia a data de validade `30/06/2028` para `29/06/2028` com o novo helper `formatFiscalDate`, (3) Correção da NDO sugerida para indicar o CFOP de entrada no ERP (`2.202`) e não a saída do cliente (`6.202`), (4) Correção do filtro de itens `Conformes (1)` que excluía itens com `INFO`, (5) Layout simétrico 2x2 no Direcionamento Logístico e uniformização dos cards de valores na Seção 3. |



---

## 🏢 6. INTEGRAÇÃO ERP PIRÂMIDE (REGRAS DA OPERAÇÃO GLÉCIA)

### 6.1. Requisitos Identificados na Homologação
1. **Vínculo Automático (Motivo de Devolução ➔ Almoxarifado Destino):**
   * Preenchimento preditivo automático quando o motivo for determinístico (ex: 30 "Produto vazando" -> `GQ`, 11 "AVARIA" -> `AVARIA`, 03 "Vencido" -> `VC`, 10 "EXTRAVIO" -> `EXPEDI`).
   * Sinalização de avaliação física/visual obrigatória para motivos subjetivos (ex: 26 "PEDIDO CANCELADO", 01 "Divergência Comercial").
2. **Visualização Direta da Quantidade Devolvida x Faturada:**
   * Comparação lado a lado com cálculo de devolução total/parcial e destaque visual de excessos.
3. **DataBridge Copilot Especializado para Pirâmide (Copy-Paste de 1-Clique):**
   * Botões dedicados para Série, Número, Data de Emissão (DD/MM/AAAA), Chave SEFAZ, Protocolo, Base de Cálculo, Impostos e Valor Total.
   * Cópia facilitada do Código de Motivo + Sigla do Almoxarifado para preenchimento ágil.
4. **Validação de NDO e Tributação CBS/IBS (Reforma Tributária / Bonificação):**
   * Sugestão de NDO com base na UF de origem/destino e CFOP.
   * Suporte preventivo a notas de bonificação e detecção de incidência/estorno de tributos.

### 6.2. Tabela Mestra: Motivo de Devolução ➔ Almoxarifado Destino (ERP Pirâmide)

| Código | Descrição do Motivo | Almoxarifado Sugerido | Tipo de Direcionamento |
| :--- | :--- | :--- | :--- |
| **01** | Divergência Comercial | *Avaliação Física Requerida* | Manual / Depende da condição |
| **02** | Divergência Fiscal | *Avaliação Física Requerida* | Manual / Depende da condição |
| **03** | Vencido | `VC` | Automático (Vencidos) |
| **04** | Avaria | `AVARIA` | Automático (Avaria) |
| **05** | Defeito Técnico | `GQ` | Automático (Garantia da Qualidade) |
| **06** | Erro de Expedição | *Avaliação Física Requerida* | Manual / Depende da condição |
| **07** | Erro de Faturamento | *Avaliação Física Requerida* | Manual / Depende da condição |
| **08** | Divergência no Transporte | *Avaliação Física Requerida* | Manual / Depende da condição |
| **09** | Amostra Grátis | *Avaliação Física Requerida* | Manual / Depende da condição |
| **10** | EXTRAVIO | `EXPEDI` | Automático (Expedição) |
| **11** | AVARIA | `AVARIA` | Automático (Avaria) |
| **12** | ERRO DE EXPEDIÇÃO | *Avaliação Física Requerida* | Manual / Depende da condição |
| **13** | ERRO DE FATURAMENTO | *Avaliação Física Requerida* | Manual / Depende da condição |
| **14** | DIVERGENCIA NO TRANSPORTE | *Avaliação Física Requerida* | Manual / Depende da condição |
| **15** | EXTRAVIO | `EXPEDI` | Automático (Expedição) |
| **16** | AMOSTRA GRÁTIS | *Avaliação Física Requerida* | Manual / Depende da condição |
| **19** | NF RECUSADA | *Avaliação Física Requerida* | Manual / Depende da condição |
| **23** | Acordo Comercial | *Avaliação Física Requerida* | Manual / Depende da condição |
| **24** | RECALL | `RECALL` | Automático (Recall) |
| **25** | DEMISSÃO | *Avaliação Física Requerida* | Manual / Depende da condição |
| **26** | PEDIDO CANCELADO | *Avaliação Física Requerida* | Manual / Depende da condição |
| **27** | ERRO NO SISTEMA | *Avaliação Física Requerida* | Manual / Depende da condição |
| **28** | ERRO NO XML | *Avaliação Física Requerida* | Manual / Depende da condição |
| **29** | Próximo ao vencimento | `CQ` | Automático (Controle de Qualidade) |
| **30** | Produto vazando | `GQ` | Automático (Garantia da Qualidade) |
| **31** | Cartonagem colada | `GQ` | Automático (Garantia da Qualidade) |
| **32** | Impressão do lote manchado | `GQ` | Automático (Garantia da Qualidade) |
| **33** | Cartucho amassado | `AVARIA` | Automático (Avaria) |
| **34** | S/Impressão Lote validade | `GQ` | Automático (Garantia da Qualidade) |
| **35** | Cartucho vazio | `GQ` | Automático (Garantia da Qualidade) |
| **36** | Tampa Aberta | `GQ` | Automático (Garantia da Qualidade) |
| **37** | Troca de volumes Transportadora | *Avaliação Física Requerida* | Manual / Depende da condição |
| **38** | Erro de Etiquetagem Expedição | *Avaliação Física Requerida* | Manual / Depende da condição |
| **39** | Falta de volume | `EXTRV` | Automático (Extravio) |
| **40** | MUDANÇA DE ENDEREÇO | *Avaliação Física Requerida* | Manual / Depende da condição |
| **41** | Erro de conferência/Cliente | *Avaliação Física Requerida* | Manual / Depende da condição |
| **42** | Desvio de Qualidade | `GQ` | Automático (Garantia da Qualidade) |
| **43** | Descontinuados | *Avaliação Física Requerida* | Manual / Depende da condição |
| **44** | Nota Fiscal Vencida | *Avaliação Física Requerida* | Manual / Depende da condição |
| **45** | Atender o SAC | *Avaliação Física Requerida* | Manual / Depende da condição |
| **46** | Pedidos em duplicidade | *Avaliação Física Requerida* | Manual / Depende da condição |
| **47** | Falta interna (caixa lacrada) | `GQ` | Automático (Garantia da Qualidade) |
| **48** | CQ Estabilidade | *Avaliação Física Requerida* | Manual / Depende da condição |
| **49** | Falta Parcial | `EXTRV` | Automático (Extravio) |
| **50** | Inversão de lote | *Avaliação Física Requerida* | Manual / Depende da condição |
| **51** | Atraso no transporte | *Avaliação Física Requerida* | Manual / Depende da condição |

### 6.3. Almoxarifados Oficiais do Sistema Pirâmide
* `ALMOX` - Almoxarifado Central / Estoque Regular
* `AVARIA` - Estoque de Produtos Danificados / Avariados
* `AVCD` - Avaria de Centro de Distribuição
* `CQ` - Controle de Qualidade
* `EXPEDI` - Expedição
* `EXTRV` - Extravio / Faltas
* `GQ` - Garantia da Qualidade
* `PENHOR` - Estoque em Penhor
* `QRTN` - Quarentena
* `RECALL` - Lotes em Processo de Recall
* `SERV` - Almoxarifado de Serviços
* `VC` - Produtos Vencidos

