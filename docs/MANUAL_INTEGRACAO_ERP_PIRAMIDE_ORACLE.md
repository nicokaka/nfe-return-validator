# 🏛️ MANUAL TÉCNICO & OPERACIONAL: INTEGRAÇÃO ERP PIRÂMIDE (ORACLE PROCENGE)
> **Sistema:** Validador Fiscal de Devoluções (NFO x NFD) integrado ao ERP Pirâmide  
> **Empresa:** Hebron Farmacêutica (INFAN S/A, QUESALON PB, QUESALON Extrema MG, QUEDES AL)  
> **Status:** 100% Homologado no Banco de Testes (.61) | Carga, Consulta e Rollback Testados  
> **Última Atualização:** 13/10/2026  

---

## 📌 1. OBJETIVO DO SISTEMA E GARGALO ELIMINADO

Na rotina fiscal anterior, o lançamento de notas de devolução de clientes dependia de conferência manual e digitação campo a campo no módulo de Compras/Recebimento do ERP Pirâmide (Série, Número, Chave SEFAZ de 44 dígitos, Protocolo, NDO, Motivos e Almoxarifados).

O **Validador Fiscal Hebron** automatizou 100% desse ciclo:
1. Realiza o cruzamento matemático e tributário entre a **Nota de Origem (NFO)** e a **Nota de Devolução (NFD)** (suportando XML e DANFE em PDF).
2. Audita preços unitários, quantidades devolvidas, rateio proporcional de descontos comerciais, ICMS próprio, reduções de base e rastreabilidade sanitária de lotes (ANVISA RDC 430/2020 e NT 2021.004).
3. Estando a nota 100% em conformidade fiscal, grava os registros diretamente nas **Tabelas de Integração Staging (TI)** do Oracle com status `'NP'` (*Não Processado*).
4. O Job periódico do Pirâmide lê a fila a cada ~60 segundos, processa a entrada física/fiscal e atualiza o status para `'P'` (*Processado*).

---

## 🌐 2. TOPOLOGIA DE SERVIDORES E AMBIENTES

| Ambiente | Host / IP | Porta | Serviço / SID | Schema | Função no Projeto |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **🧪 Homologação Oracle (TESTE)** | **`192.169.97.61`** | **`1521`** | **`TESTE`** | **`PIRAMIDE`** | **Ambiente Oficial de Testes**. Destino exclusivo de todas as cargas, simulações e validações do Validador. |
| **🏭 Produção Oracle (OFICIAL)** | `192.169.97.60` | `1521` | `PROD` | `PIRAMIDE` | **Ambiente de Produção Oficial Hebron**. Mantido em **STANDBY** até a homologação final com a gerência. |
| **🖥️ Servidor Web Aplicação (VM)** | `192.168.97.10` | `5002` | `HTTP` | N/A | Máquina Virtual Debian (`vm-debian-vf`) onde o frontend do Validador é servido via Docker. |

> [!IMPORTANT]
> **Regra de Segurança Inegociável:** Nenhuma carga de teste deve ser disparada para o servidor final `.60`. O conector padrão do sistema aponta estritamente para o servidor `.61`. A virada para produção é feita unicamente alterando o IP no `.env` do servidor.

---

## 🗄️ 3. ARQUITETURA DAS TABELAS DE INTEGRAÇÃO (MÉTODO C PROCENGE)

A integração oficial segue o **Método C** do manual de integração da Procenge (carga via tabelas staging intermediárias no schema `PIRAMIDE`):

```
┌─────────────────────────────────────────────────────────────┐
│                 TI_NOTA_FISCAL_ENTRADA                      │
│        (Cabeçalho da NF, Série, Emissor, Chave, Totais)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1 : N
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              TI_ITEM_NOTA_FISCAL_ENTRADA                    │
│   (Itens Faturados, Preço Líquido, NDO, CFOP, Almoxarifado) │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1 : N
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  TI_ITEM_ENTRADA_LOTE                       │
│     (Rastreabilidade Sanitária ANVISA: Lote, Validade, Qtd) │
└─────────────────────────────────────────────────────────────┘
```

### 3.1. Tabela 1: `TI_NOTA_FISCAL_ENTRADA` (Cabeçalho)
* **Chave Primária Lógica:** `(COD_SISTEMA_ORIGEM, NUM_SEQUENCIAL_ENTRADA_ORIGEM)`.
* **Identificador do Sistema Integrador:** `COD_SISTEMA_ORIGEM = 'VAL'` (cadastrado na tabela mestre `TI_SISTEMA`).
* **Status do Registro:** `COD_STATUS_REGISTRO = 'NP'` (*Não Processado*).
* **Campos Críticos:**
  * `COD_UNIDADE_NEGOCIO_ORIGEM`: **Obrigatória (NOT NULL)**. Recebe o código da filial Hebron (`001`, `003`, `004` ou `005`).
  * `COD_FILIAL_ORIGEM` e `COD_EMPRESA_ORIGEM`: Identificador da empresa faturadora.
  * `COD_TIPO_ENTRADA = 'D'` (Devolução de Cliente).
  * `COD_EMITENTE = 'T'` (Terceiros / Cliente emitente).
  * `IND_EMISSAO = 'N'` (Emissão normal do cliente).
  * `COD_CLASSIFICACAO_ENTRADA = 'NR'` (Não Rejeitada).
  * `COD_CHAVE_ACESSO_NFEL`: 44 dígitos da chave de acesso da NFD.

### 3.2. Tabela 2: `TI_ITEM_NOTA_FISCAL_ENTRADA` (Itens)
* **Amarração Relacional:** Amarrada ao cabeçalho por `NUM_SEQUENCIAL_ENTRADA_ORIGEM`.
* **Atenção:** Esta tabela **NÃO POSSUI** a coluna `COD_SISTEMA_ORIGEM`. O sistema integrador é gravado na coluna `COD_SIST_SOLIC_OPER_REGISTRO = 'VAL'`.
* **Restrições de Tamanho Rigorosas:**
  * `COD_NDO_ORIGEM`: **`VARCHAR2(6)`** (Máximo 6 caracteres!).
  * `COD_DEPOSITO`: **`VARCHAR2(5)`** (Máximo 5 caracteres!).
  * `VAL_OUTRAS_DESPESAS`: **Obrigatória (NOT NULL)**. Deve sempre receber `0` se não houver despesas adicionais.
  * `VAL_CONTABIL_ESTOQUE`: Valor total líquido do item ($q \times vUn$).
  * `COD_NOTA_FISCAL_SAIDA`: Número da NF de Origem (NFO faturada pela Hebron).
  * `NUM_ITEM_NOTA_FISCAL_SAIDA`: Número do item na NFO de saída original.

### 3.3. Tabela 3: `TI_ITEM_ENTRADA_LOTE` (Rastreabilidade ANVISA)
* **Amarração Relacional:** Amarrada por `COD_ENTRADA_ORIGEM` (`NUM_SEQUENCIAL_ENTRADA_ORIGEM`) e `COD_ITEM_ENTRADA_ORIGEM` (`NUM_SEQUENCIAL_ITEM_ENTRADA`).
* **Campos:**
  * `COD_LOTE`: Número do lote farmacêutico faturado.
  * `DAT_VALIDADE`: Data de validade formatada (`TO_DATE('YYYY-MM-DD', 'YYYY-MM-DD')`).
  * `DAT_FABRICACAO`: Data de fabricação sanitária.
  * `QTD_LOTE`: Quantidade devolvida do respectivo lote.
  * `COD_FABRICANTE`: Filial fabricante / faturadora.

---

## 🏢 4. MATRIZ DE DE-PARA CORPORATIVO (HEBRON & PIRÂMIDE)

### 4.1. Unidades de Negócio / Filiais Hebron
| Código | Razão Social | CNPJ Base | Perfil Fiscal |
| :--- | :--- | :--- | :--- |
| **`001`** | **QUESALON Matriz (PB)** | `04.792.134/0001-43` | Distribuidora Matriz. Base Cheia (100%). |
| **`003`** | **INFAN Indústria Química Farmacêutica S/A** | `08.939.548/0001-03` | Indústria Farmacêutica. Redução de Base PB (9,90% e 10,49%). PIS Monofásico CST 50. |
| **`004`** | **QUESALON Filial Extrema (MG)** | `04.792.134/0004-96` | Distribuidora Filial MG (Termo de Acordo MG: 12% ou 7% interestadual). |
| **`005`** | **QUEDES Distribuidora (AL)** | `10.565.860/0001-08` | Distribuidora Alagoas. |

### 4.2. Mapeamento Oficial de NDOs (`VARCHAR2(6)`)
| Código NDO | Descrição no Pirâmide | Cenário de Aplicação |
| :--- | :--- | :--- |
| **`COM032`** | QUESALON - RETORNO DE AG POR DEVOLUCAO | Devolução de Mercadorias para Comercialização (Revenda, CFOP de entrada `1.202` ou `2.202`). |
| **`COM206`** | INFAN - RETORNO NOSSA NF PRODUTO ACABADO C MOV EST | Devolução de Venda de Produção Própria da Indústria (CFOP de entrada `1.201` ou `2.201`). |
| **`COM200`** | INFAN - ENTRADA EM BONIFICAÇÃO | Devolução de produtos bonificados (CFOP de entrada `1.949` ou `2.949`). |
| **`COM033`** | QUESALON - RETORNO DE LITERATURA | Devolução de materiais promocionais e literatura. |

### 4.3. Mapeamento de Almoxarifados (`VARCHAR2(5)`)
| Motivo Hebron | Descrição do Motivo | Sigla Oficial Pirâmide | Tamanho |
| :--- | :--- | :--- | :--- |
| `11`, `04`, `33` | Avaria / Cartucho Amassado | **`AVCD`** *(ou `GQ`)* | 4 caracteres (Atende max 5) |
| `05`, `30`, `31`, `32`, `34`, `35`, `36` | Vazando / Desvio Qualidade / Falha Rotulagem | **`GQ`** | 2 caracteres |
| `03` | Vencido | **`VC`** | 2 caracteres |
| `10`, `15` | Extravio | **`EXPED`** | 5 caracteres |
| `39`, `49` | Falta de Volume / Parcial | **`EXTRV`** | 5 caracteres |
| `24` | Recall Farmacêutico ANVISA | **`RECAL`** | 5 caracteres |
| `29` | Próximo ao Vencimento | **`CQ`** | 2 caracteres |
| Regular / Retorno Físico Conforme | Almoxarifado Central | **`ALMOX`** | 5 caracteres |

---

## ⚡ 5. MECANISMO DE PROCESSAMENTO (ESTEIRA DO ERP PIRÂMIDE)

1. **Inserção com Status `'NP'`:** O Validador insere os registros nas três tabelas com `COD_STATUS_REGISTRO = 'NP'`.
2. **Ciclo de Polling do Job (`DBMS_JOB`):**
   * O ERP Pirâmide possui jobs configurados em `USER_JOBS` executando a cada **60 segundos** (`SYSDATE + 60/(24*60*60)`).
   * O Job aciona as packages proprietárias: `PCK_PIR_BASE_INTEGRA`, `PCK_PIR_BASE_NFE` e `PCK_PIR_ATRIBUTO_ENTRADA`.
3. **Promoção de Status:**
   * Se os dados cadastrais (cliente, produto, lote, CFOP) estiverem consistentes: atualiza `COD_STATUS_REGISTRO = 'P'` (*Processado*) e gera o espelho de entrada de compras no Pirâmide.
   * Se houver divergência cadastral no ERP (ex: produto sem NDO amarrada no cadastro da empresa): atualiza `COD_STATUS_REGISTRO = 'ER'` e preenche a coluna `DSC_ERRO_REGISTRO` com a descrição exata da crítica.

---

## 💻 6. ARQUITETURA DE CÓDIGO (FULL-STACK TYPESCRIPT)

### 6.1. Backend / Camada de Integração
* [`src/server/oracleDbPool.ts`](file:///c:/Users/nicolas/.gemini/antigravity/scratch/gleciaAlhandra1/src/server/oracleDbPool.ts): Gerencia o pool de conexões nativo em **Thin Mode** do driver oficial `oracledb` (dispensa instalação de client Oracle pesado).
* [`src/server/piramideIntegrator.ts`](file:///c:/Users/nicolas/.gemini/antigravity/scratch/gleciaAlhandra1/src/server/piramideIntegrator.ts): Executa transações ACID completas com injeção automática de `ALTER SESSION SET CURRENT_SCHEMA = PIRAMIDE`, limpeza prévia de registros duplicados e commit garantido.
* [`src/server/piramideViteMiddleware.ts`](file:///c:/Users/nicolas/.gemini/antigravity/scratch/gleciaAlhandra1/src/server/piramideViteMiddleware.ts): Roteador HTTP embutido que serve as rotas REST:
  * `GET /api/piramide/health`: Teste de conectividade e banner do Oracle.
  * `POST /api/piramide/integrate`: Carga completa em 1-clique.
  * `GET /api/piramide/status/:notaFiscal`: Consulta ao vivo do status (`NP`, `P`, `ER`).
  * `DELETE /api/piramide/rollback/:notaFiscal`: Exclusão de nota de teste.

### 6.2. Frontend / Cockpit do Operador
* [`src/components/DataBridgeCopilot.tsx`](file:///c:/Users/nicolas/.gemini/antigravity/scratch/gleciaAlhandra1/src/components/DataBridgeCopilot.tsx): Interface executiva de alta usabilidade com:
  * Seleção dinâmica da Empresa/Filial (`001`, `003`, `004`, `005`).
  * Mapeamento preditivo de Motivo ➔ Almoxarifado.
  * Circuito de segurança (*Circuit Breaker*) que bloqueia o envio caso a nota tenha divergências fiscais impeditivas (preço divergente ou quantidade excedente), permitindo envio apenas com *Ressalva Fiscal*.
  * Fallback de contingência para cópia campo a campo ou visualização de scripts PL/SQL de DBA.

---

## 🛠️ 7. SCRIPTS PL/SQL DE CONTINGÊNCIA (GUIA RÁPIDO DO DBA)

### 7.1. Carga Manual via PL/SQL Developer (Schema `PIRAMIDE`)
```sql
DECLARE
  v_seq_entrada NUMBER := TO_NUMBER(TO_CHAR(SYSDATE, 'YYYYMMDD') || '663338');
BEGIN
  -- Cabeçalho
  INSERT INTO TI_NOTA_FISCAL_ENTRADA (
    COD_FILIAL_ORIGEM, COD_UNIDADE_NEGOCIO_ORIGEM, NUM_SEQUENCIAL_ENTRADA_ORIGEM,
    COD_SISTEMA_ORIGEM, COD_EMPRESA_ORIGEM, COD_SERIE, COD_NOTA_FISCAL, COD_FATURA,
    COD_SIST_SOLIC_OPER_REGISTRO, COD_OPERACAO_REGISTRO, COD_STATUS_REGISTRO,
    COD_CLIENTE_ORIGEM, COD_TIPO_ENTRADA, COD_EMITENTE, IND_CIF_FOB, IND_EMISSAO,
    VAL_TOTAL_NOTA, VAL_DESCONTO, DAT_EMISSAO, DAT_ENTRADA, DAT_ENTRADA_EMPRESA,
    COD_CHAVE_ACESSO_NFEL, COD_PROTOCOLO_NFEL, COD_CLASSIFICACAO_ENTRADA
  ) VALUES (
    '001', '001', v_seq_entrada, 'VAL', '001', '1', '663338', '663338',
    'VAL', 'I', 'NP', '84521053000490', 'D', 'T', '1', 'N',
    468.17, 76.21, TO_DATE('2026-07-23', 'YYYY-MM-DD'), TRUNC(SYSDATE), TRUNC(SYSDATE),
    '15260784521053000490550010006633381403148640', '215260040568304', 'NR'
  );

  -- Itens
  INSERT INTO TI_ITEM_NOTA_FISCAL_ENTRADA (
    COD_FILIAL_ORIGEM, NUM_SEQUENCIAL_ENTRADA_ORIGEM, NUM_SEQUENCIAL_ITEM_ENTRADA,
    COD_SIST_SOLIC_OPER_REGISTRO, COD_OPERACAO_REGISTRO, COD_STATUS_REGISTRO,
    COD_PRODUTO_ORIGEM, COD_UNIDADE_MEDIDA_ORIGEM, COD_NDO_ORIGEM, COD_CFOP, COD_DEPOSITO,
    QTD_ITEM, QTD_NOTA_FISCAL, QTD_RECEBIDA, VAL_ITEM, VAL_PRECO_UNITARIO_ITEM,
    VAL_DESCONTO_ITEM, VAL_OUTRAS_DESPESAS, VAL_CONTABIL_ESTOQUE, COD_NOTA_FISCAL_SAIDA,
    COD_SERIE_NOTA_FISCAL_SAIDA, NUM_ITEM_NOTA_FISCAL_SAIDA, COD_LOTE_CONF,
    DAT_VALIDADE_LOTE_CONF, IND_RESERVA, IND_COMPRA_DIRETA, IND_TIPO_DESCONTO, COD_CLASSIFICACAO_ITEM
  ) VALUES (
    '001', v_seq_entrada, 1, 'VAL', 'I', 'NP',
    '172424', 'UN', 'COM032', '2202', 'AVCD',
    3, 3, 3, 256.07, 85.3567, 41.68, 0, 256.07, '280748', '1', 5,
    '2606039', TO_DATE('2028-06-30', 'YYYY-MM-DD'), 'N', 'N', 'V', 'NR'
  );

  -- Rastreabilidade de Lotes
  INSERT INTO TI_ITEM_ENTRADA_LOTE (
    COD_FILIAL_ORIGEM, COD_ENTRADA_ORIGEM, COD_ITEM_ENTRADA_ORIGEM,
    COD_LOTE, COD_FABRICANTE, DAT_VALIDADE, DAT_FABRICACAO, QTD_LOTE
  ) VALUES (
    '001', v_seq_entrada, 1, '2606039', '001',
    TO_DATE('2028-06-30', 'YYYY-MM-DD'), TO_DATE('2026-06-11', 'YYYY-MM-DD'), 3
  );

  COMMIT;
END;
/
```

### 7.2. Consulta de Monitoramento (Grid 3 em 1)
```sql
-- 1. Cabeçalho
SELECT COD_FILIAL_ORIGEM, COD_NOTA_FISCAL, COD_STATUS_REGISTRO, VAL_TOTAL_NOTA, NUM_SEQUENCIAL_ENTRADA_ORIGEM 
FROM TI_NOTA_FISCAL_ENTRADA 
WHERE COD_SISTEMA_ORIGEM = 'VAL' AND COD_NOTA_FISCAL = '663338';

-- 2. Itens
SELECT NUM_SEQUENCIAL_ITEM_ENTRADA, COD_PRODUTO_ORIGEM, COD_NDO_ORIGEM, COD_DEPOSITO, QTD_ITEM, VAL_ITEM, COD_STATUS_REGISTRO
FROM TI_ITEM_NOTA_FISCAL_ENTRADA
WHERE NUM_SEQUENCIAL_ENTRADA_ORIGEM IN (
  SELECT NUM_SEQUENCIAL_ENTRADA_ORIGEM FROM TI_NOTA_FISCAL_ENTRADA WHERE COD_SISTEMA_ORIGEM = 'VAL' AND COD_NOTA_FISCAL = '663338'
);

-- 3. Lotes
SELECT COD_ITEM_ENTRADA_ORIGEM, COD_LOTE, DAT_VALIDADE, QTD_LOTE
FROM TI_ITEM_ENTRADA_LOTE
WHERE COD_ENTRADA_ORIGEM IN (
  SELECT NUM_SEQUENCIAL_ENTRADA_ORIGEM FROM TI_NOTA_FISCAL_ENTRADA WHERE COD_SISTEMA_ORIGEM = 'VAL' AND COD_NOTA_FISCAL = '663338'
);
```

### 7.3. Limpeza Transacional / Rollback
```sql
BEGIN
  DELETE FROM TI_ITEM_ENTRADA_LOTE 
  WHERE COD_ENTRADA_ORIGEM IN (
    SELECT NUM_SEQUENCIAL_ENTRADA_ORIGEM FROM TI_NOTA_FISCAL_ENTRADA WHERE COD_SISTEMA_ORIGEM = 'VAL' AND COD_NOTA_FISCAL = '663338'
  );

  DELETE FROM TI_ITEM_NOTA_FISCAL_ENTRADA 
  WHERE NUM_SEQUENCIAL_ENTRADA_ORIGEM IN (
    SELECT NUM_SEQUENCIAL_ENTRADA_ORIGEM FROM TI_NOTA_FISCAL_ENTRADA WHERE COD_SISTEMA_ORIGEM = 'VAL' AND COD_NOTA_FISCAL = '663338'
  );

  DELETE FROM TI_NOTA_FISCAL_ENTRADA 
  WHERE COD_SISTEMA_ORIGEM = 'VAL' AND COD_NOTA_FISCAL = '663338';

  COMMIT;
END;
/
```

---

## 📌 8. HISTÓRICO DE AUDITORIA & LIÇÕES APRENDIDAS (GOTCHAS)

1. **`ORA-12899` em `COD_NDO_ORIGEM`:**  
   Nunca passar nomes textuais longos (ex: `DEV-VDA-REV-INTER`). Utilizar estritamente os códigos de até 6 caracteres cadastrados na tabela `NDO` (`COM032`, `COM206`, `COM200` ou o CFOP limpo).
2. **`ORA-12899` em `COD_DEPOSITO`:**  
   A palavra `AVARIA` tem 6 letras e estoura o limite `VARCHAR2(5)`. A Hebron utiliza a sigla oficial de CD `AVCD` (4 caracteres).
3. **`ORA-01400` em `COD_UNIDADE_NEGOCIO_ORIGEM` e `VAL_OUTRAS_DESPESAS`:**  
   Ambas as colunas possuem constraint `NOT NULL` ativas no Oracle. Devem ser sempre preenchidas.
4. **`ORA-00904` em filtros de itens:**  
   Não filtrar itens por `COD_SISTEMA_ORIGEM`, pois a coluna não existe em `TI_ITEM_NOTA_FISCAL_ENTRADA`. Filtrar sempre por `NUM_SEQUENCIAL_ENTRADA_ORIGEM`.
