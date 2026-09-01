# 📚 HEBRON FISCAL KNOWLEDGE BASE (BASE DE CONHECIMENTO FISCAL & REGULATÓRIA)

> **Indústria Farmacêutica:** HEBRON FARMACÊUTICA & HEBRONVET  
> **Sistema Especialista:** Validador Fiscal de Devoluções (NFO x NFD) integrado ao ERP Pirâmide  
> **Responsáveis Fiscais e Operacionais:** Gerência Fiscal (Polliana), Operação Doca (Glécia) e Gestão (Marcelo)  
> **Perfil Técnico do Agente:** Auditor Fiscal Sênior de Elite & Dev Full-Stack Sênior de Elite  

---

## 🏭 1. ESTRUTURA CORPORATIVA DO GRUPO HEBRON

A **Hebron** é uma indústria farmacêutica nacional de alta relevância com mais de 30 anos de mercado, atuando tanto na **Saúde Humana** quanto na **Saúde Animal (HebronVet)**.

### Divisões Fiscais e Razões Sociais Operadas no Validador:
1. **🏭 INFAN INDÚSTRIA QUÍMICA FARMACÊUTICA NACIONAL S/A (Paraíba):**
   * **Papel:** Unidade Fabril e Indústria Farmacêutica.
   * **UF:** Paraíba (PB).
   * **Alíquota Interna de ICMS:** **20,50%**.
   * **Benefício de Redução de Base de ICMS:**
     * **Medicamentos (NCM 3004):** Redução fiscal de **9,90%** $\rightarrow$ **Base Efetiva = 90,10%** do valor da mercadoria ($\text{vBC} = \text{vProdLiq} \times 0,901$).
     * **Cosméticos, Sabonetes e Higiene (NCMs 3401.20.10, 3304.99.10, 3307.90.00, 3401.30.00):** Redução fiscal de **10,49%** $\rightarrow$ **Base Efetiva = 89,51%** ($\text{vBC} = \text{vProdLiq} \times 0,8951$).
     * **Demais NCMs:** Base Cheia (100%).
   * **Operações Interestaduais:** Alíquota padrão de **12,00%**.

2. **🏢 QUESALON DISTRIBUIDORA DE PRODUTOS FARMACÊUTICOS LTDA (Matriz PB):**
   * **Papel:** Centro de Distribuição e Logística Farmacêutica.
   * **UF:** Paraíba (PB) — CNPJ Base: `04.792.134/0001-43`.
   * **Alíquota Interna de ICMS:** **20,00%** com **Base Cheia (100%)** para toda a linha.
   * **Operações Interestaduais:** Alíquota padrão de **12,00%** para todo o território nacional.

3. **🏢 QUESALON DISTRIBUIDORA DE PRODUTOS FARMACÊUTICOS LTDA (Filial Extrema - MG):**
   * **Papel:** Centro de Distribuição Estratégico para Regiões Sudeste, Sul, Centro-Oeste e Norte.
   * **UF:** Minas Gerais (MG) — CNPJ Base: `04.792.134/0004-96`.
   * **Alíquota Interna de ICMS:** **12,00%** ou **18,00%** conforme Termo de Acordo firmado com a SEF/MG.
   * **Operações Interestaduais:**
     * **Destino Sul e Sudeste (exceto Espírito Santo):** **12,00%** (SP, RJ, MG, PR, SC, RS).
     * **Destino Espírito Santo, Centro-Oeste, Norte e Nordeste:** **7,00%** (ES, BA, PE, CE, GO, DF, MT, MS, etc.).

4. **🏢 QUEDES DISTRIBUIDORA DE MEDICAMENTOS LTDA (Alagoas):**
   * **Papel:** Distribuidora especializada exclusiva em medicamentos.
   * **UF:** Alagoas (AL).
   * **Operações:** Foco interestadual com alíquota de **12,00%**.

5. **🐾 LINHA HEBRONVET (Saúde Animal & Medicina Veterinária):**
   * **Papel:** Linha de medicamentos veterinários, suplementos nutricionais animais e produtos de suporte clínico veterinário.
   * **Regulação:** Ministério da Agricultura e Pecuária (MAPA) e SEFAZ.
   * **Classificações:** NCMs do Capítulo 30 (medicamentos de uso veterinário), Capítulo 23 (preparações para alimentação animal) e Capítulo 29 (vitaminas para uso veterinário).
   * **Rastreabilidade:** Controle rigoroso de número de partida / lote e data de validade.

---

## ⚖️ 2. DIRETRIZES TRIBUTÁRIAS & PRINCÍPIO DA NOTA ESPELHO

### A. Princípio da "Nota Espelho" (Anulação Contábil Exata)
A Nota Fiscal de Devolução (NFD) emitida pelo cliente comprador tem a finalidade jurídica e contábil de **anular a operação de venda original (NFO)**.
* A alíquota do ICMS, o CST, a Base de Cálculo e o Preço Unitário Bruto na NFD devem ser **estritamente idênticos** aos praticados na NFO.
* Não cabe ao cliente aplicar alíquotas arbitrárias ou alterar bases de cálculo na devolução.
* Divergências de preço unitário ou alíquota são classificadas como **CRITICAL** (rejeição de entrada).

---

## 🧮 3. FÓRMULAS DE RATEIO MATEMÁTICO-FISCAL

### 1. Desconto Comercial Rateado (Fórmula Oficial Hebron):
$$\text{Desconto Unitário Original } (d_u) = \frac{\text{Desconto Total do Item na NFO}}{\text{Quantidade Faturada na NFO}}$$

$$\text{Desconto Esperado na Devolução } (d_p) = d_u \times q_{\text{devolvida}}$$

$$\text{Preço Líquido Esperado } (V_L) = (v_{\text{unCom}} \times q_{\text{devolvida}}) - d_p$$

* **Tolerância Operacional:** Até **R$ 0,05** no somatório do item para acomodar arredondamentos de 4 casas decimais do XML.
* **Rejeição SEFAZ 483:** $vDesc \le vProd$ (O desconto nunca pode superar o valor bruto do produto).

### 2. ICMS-ST (Substituição Tributária) Proporcional:
$$\text{vICMSST}_{\text{esperado}} = \text{vICMSST}_{\text{original}} \times \left(\frac{q_{\text{devolvida}}}{Q_{\text{faturada}}}\right)$$

* Se a NFO não teve destaque de ICMS-ST, a NFD **não pode destacar ST** sob hipótese alguma.

---

## 🔄 4. MATRIZ DE CFOPS & ERP PIRÂMIDE

| Operação de Saída Hebron (NFO) | CFOP Saída | CFOP Devolução Cliente (NFD) | CFOP Entrada ERP Pirâmide | Descrição do Lançamento no Pirâmide |
| :--- | :---: | :---: | :---: | :--- |
| Venda Mercadoria Adquirida (Interna) | 5102 / 51021 | 5202 | **1202** | Devolução de compra para comercialização |
| Venda Produção do Estabelecimento | 5101 / 51011 | 5202 | **1201** | Devolução de venda de produção do estabelecimento |
| Venda c/ Substituição Tributária (ST) | 5401 / 5403 | 5411 | **1411** | Devolução compra com ST |
| Remessa em Bonificação / Doação | 5910 | 5949 | **1949** | Outra entrada não especificada (Bonificação) |
| Venda Comercialização Interestadual | 6101 / 6102 | 6202 | **2202** | Devolução interestadual de comercialização |
| Venda Interestadual com ST | 6403 | 6411 | **2411** | Devolução interestadual compra com ST |
| Venda Suframa Comercialização | 6110 | 6202 | **2204** | Devolução Suframa mercadoria adquirida |
| Venda Suframa Produção | 6109 | 6202 | **2203** | Devolução Suframa produção própria |

---

## 📦 5. OS 11 MOTIVOS DE DEVOLUÇÃO & ALMOXARIFADOS DO PIRÂMIDE

O ERP Pirâmide possui **52 motivos cadastrados**, consolidados nos 11 fluxos fundamentais de destinação física:

| Código | Motivo da Devolução | Direcionamento de Almoxarifado | Tipo de Direcionamento |
| :---: | :--- | :--- | :---: |
| **01** | Produto Vencido | **ALMOX: VENCIDO** | Automático |
| **07** | Recolhimento / Recall Sanitário | **ALMOX: RECOLHIMENTO** | Automático |
| **10** | Retorno de Mercadoria Não Entregue | **ALMOX: DISPONIVEL** | Automático |
| **11** | Mercadoria Avariada / Danificada | **ALMOX: AVARIA** | Automático |
| **02** | Desistência de Compra | **Avaliação na Doca (Quarentena)** | Manual / Inspeção |
| **03** | Erro de Pedido do Cliente | **Avaliação na Doca (Quarentena)** | Manual / Inspeção |
| **04** | Mercadoria em Desacordo | **Avaliação na Doca (Quarentena)** | Manual / Inspeção |
| **05** | Falta de Mercadoria | **Avaliação na Doca (Quarentena)** | Manual / Inspeção |
| **06** | Troca Comercial | **Avaliação na Doca (Quarentena)** | Manual / Inspeção |
| **08** | Devolução Indevida | **Avaliação na Doca (Quarentena)** | Manual / Inspeção |
| **09** | Cancelamento de Pedido | **Avaliação na Doca (Quarentena)** | Manual / Inspeção |

---

## 💊 6. RASTREABILIDADE SANITÁRIA ANVISA, MAPA & SEFAZ

1. **Medicamentos Humanos (NCM 3003 / 3004):**
   * Exigem rastreabilidade com identificação de lote (`<nLote>`), quantidade do lote (`<qLote>`), data de fabricação (`<dFab>`) e data de validade (`<dVal>`).
   * Na devolução ($finNFe=4$), se o cliente omitir a tag `<rastro>`, a SEFAZ autoriza a nota conforme a **NT 2021.004**, mas o validador gera aviso informativo (`INFO`) orientando conferência física na doca com base no lote da NFO.
2. **Vitaminas & Suplementos (NCM 2936 / 2106):**
   * Produtos como Imunoglucan, Vitaminas e Enzyfor são dispensados da tag `<rastro>` obrigatória na SEFAZ.
3. **Produtos Veterinários (HebronVet):**
   * Sujeitos à fiscalização do MAPA e registro de lote para garantia de rastreabilidade na cadeia de distribuição agropecuária.
4. **PIS / COFINS Monofásico (Lei 10.147/2000):**
   * Medicamentos e produtos farmacêuticos possuem tributação concentrada na indústria (INFAN), aplicando-se alíquota zero (CST 01/49) nas etapas subsequentes de distribuição.

---

## 🚀 7. PROTOCOLOS DE DESENVOLVIMENTO & VALIDAÇÃO DO ENGENHEIRO SENIOR

Para garantir estabilidade máxima e zero regressões:
* **Suíte de Testes:** Manter 100% de aprovação nos testes automatizados (`npm test`).
* **Compilação de Produção:** Validar compilação TypeScript com `tsc` e Vite (`npm run build`).
* **Deploy em Produção (Debian):** Atualização via `git pull origin main && docker compose build --no-cache && docker compose up -d --force-recreate`.
