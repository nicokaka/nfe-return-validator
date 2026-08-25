# Diretrizes e Regras Fiscais Oficiais — Validador Fiscal de Devoluções (NFO x NFD)
> **Autoridade Técnica:** Gerência Fiscal (Polliana)  
> **Sistema ERP de Destino:** ERP Pirâmide  
> **Status:** Regras Oficiais Consolidadas e Implementadas no Motor de Auditoria

---

## 1. Princípio Fundamental: Regra da "Nota Espelho" (Anulação Contábil Exata)

> [!IMPORTANT]
> **Princípio da Nota Espelho:** A Nota Fiscal de Devolução (NFD) emitida pelo cliente deve reproduzir com **exatidão absoluta** os destaques fiscais, alíquotas, reduções de base e valores unitários constantes na Nota de Saída/Venda Original (NFO).
> * Mesmo que a nota de venda original tenha sido emitida com alíquota diferenciada, benefício fiscal regional ou erro formal anterior, a devolução deve espelhar a saída para garantir a anulação contábil exata na SEFAZ e no livro fiscal do ERP Pirâmide.
> * Quaisquer retificações posteriores devem ser realizadas via Carta de Correção Eletrônica (CC-e) ou Nota Complementar, jamais alterando unilateralmente a devolução.

---

## 2. As 4 Divisões Corporativas e Regras de ICMS Próprio

| Divisão / Empresa | UF | Tipo | Alíquota Interna | Alíquota Interestadual | Regra de Redução de Base de ICMS |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **🏭 Indústria INFAN** | **PB** | Indústria | **20,50%** | **12,00%** | **Medicamentos (NCM 3004):** Redução de 9,90% ($\text{Base} = \text{Valor} \times 0,901$).<br>**Cosméticos/Higiene (NCMs 3401, 3304, 3307):** Redução de 10,49% ($\text{Base} = \text{Valor} \times 0,8951$).<br>**Demais NCMs:** Base Cheia (100%). |
| **🏢 QUESALON PB (Matriz)** | **PB** | Distribuidora | **20,00%** | **12,00%** | **Base Cheia (100%)** para todos os NCMs e produtos. |
| **🏢 QUESALON Extrema (MG)** | **MG** | Filial | **12,00% ou 18,00%** *(Termo Acordo)* | **12,00% / 7,00%** | **Sul e Sudeste (exceto ES):** 12,00%.<br>**ES, Centro-Oeste, Norte e Nordeste:** 7,00%.<br>Base Cheia (100%). |
| **🏢 QUEDES (AL)** | **AL** | Distribuidora | *Sem vendas internas* | **12,00%** | Linha exclusiva de medicamentos. Apenas interestadual a 12,00%. |

---

## 3. Fórmulas Oficiais de Desconto Proporcional e Validação de Itens

Em devoluções parciais (ex: venda de 24 frascos, devolução de 3 frascos), o desconto faturado na saída deve ser rateado proporcionalmente:

$$\text{Desconto Unitário Original } (d_u) = \frac{\text{Desconto Total do Item na NFO}}{\text{Quantidade Faturada na NFO}}$$

$$\text{Desconto Esperado na Devolução } (d_p) = d_u \times q_{\text{devolvida}}$$

$$\text{Valor Líquido Esperado } (V_L) = (v_{\text{unCom}} \times q_{\text{devolvida}}) - d_p$$

*   **Tolerância de Centavos:** É admitida tolerância matemática de até **R$ 0,05** no valor total do item decorrente de arredondamentos de 4 casas decimais do XML.
*   **Rejeição SEFAZ 483:** O valor do desconto ($vDesc$) **nunca** pode superar o valor bruto do produto ($vProd$).

---

## 4. Auditoria de ICMS-ST (Substituição Tributária)

*   **Herança Obrigatória:** Se a NFO original teve destaque de $vBCST$ e $vICMSST$, a devolução deve destacar o valor proporcional exato:
    $$\text{vICMSST}_{\text{esperado}} = \text{vICMSST}_{\text{original}} \times \left(\frac{q_{\text{devolvida}}}{Q_{\text{faturada}}}\right)$$
*   **Inexistência de ST:** Se a nota de origem **não** possui destaque de ICMS-ST, a nota de devolução **não pode conter destaque de ST** sob pena de inconsistência na escrituração fiscal.

---

## 5. Matriz Oficial de CFOPs para o ERP Pirâmide

O sistema cruza automaticamente o CFOP da NFO (saída) e da NFD (devolução do cliente) para indicar o código exato de lançamento no ERP Pirâmide:

| Operação de Saída (NFO) | CFOP Saída | CFOP Devolução Cliente (NFD) | CFOP Entrada ERP Pirâmide | Descrição do Lançamento no Pirâmide |
| :--- | :---: | :---: | :---: | :--- |
| Venda Mercadoria Adquirida (Interna) | 5102 / 51021 | 5202 | **1202** | Devolução de compra para comercialização |
| Venda Produção do Estabelecimento | 5101 / 51011 | 5202 | **1201** | Devolução de venda de produção do estabelecimento |
| Venda c/ Substituição Tributária (ST) | 5401 / 54011 / 5403 / 54031 | 5411 | **1411** | Devolução compra com ST |
| Remessa em Bonificação / Doação | 5910 | 5949 | **1949** | Outra entrada não especificada (Bonificação) |
| Venda Comercialização Interestadual | 6101 / 61011 / 6102 / 61021 | 6202 | **2202** | Devolução interestadual de comercialização |
| Venda Interestadual com ST | 6403 / 64031 | 6411 | **2411** | Devolução interestadual compra com ST |
| Venda Suframa Comercialização | 6110 | 6202 | **2204** | Devolução Suframa mercadoria adquirida |
| Venda Suframa Produção | 6109 | 6202 | **2203** | Devolução Suframa produção própria |

---

## 6. Reforma Tributária (IBS e CBS) e SEFAZ 2026

1.  **Apropriação de Créditos de IBS e CBS (Vigência Plena em 2027):**
    *   Para clientes enquadrados no **Regime Normal (CRT=3)**, a nota de devolução deve conter o destaque do IBS (alíquota-teste estadual 0,10%) e da CBS (alíquota-teste federal 0,90%).
    *   A omissão desses grupos impede a tomada do crédito fiscal na apuração da empresa, gerando **prejuízo financeiro direto no fluxo de caixa**.
2.  **Validação `<DFeReferenciado>` SEFAZ 2026 (NT RTC v1.40 / Regra VC02-14):**
    *   A partir de 01/09/2026, cada item da nota de devolução deverá conter a amarração explícita do número do item (`nItem`) com a chave de 44 dígitos da nota de origem no grupo `<DFeReferenciado>`. A ausência gera a **Rejeição SEFAZ 321**.

---

## 7. Rastreabilidade Regulatória e NT 2021.004

*   **Medicamentos (NCM 3004 / 3003):** Exigem registro ANVISA e rastreabilidade por lote. Na devolução ($finNFe=4$), se o cliente omitir a tag `<rastro>`, a SEFAZ autoriza a nota, mas o sistema gera aviso informativo para **conferência física obrigatória na doca de recebimento**.
*   **Vitaminas e Suplementos (NCM 2936, 2106, 2309):** Não possuem obrigatoriedade de tag `<rastro>` na SEFAZ e operam em regime de conferência voluntária.
*   **Lote Vencido:** Se a data de validade informada na NFD estiver expirada, o sistema emite alerta crítico para segregação imediata no almoxarifado de **Quarentena / Avaria**.

---

## 8. Almoxarifados e Direcionamento Logístico (ERP Pirâmide)

A empresa possui **52 motivos catalogados** no ERP Pirâmide com regras de destinação física:
*   **ALMOX (Principal):** Devoluções comerciais regulares (Desacordo Comercial, Pedido Duplicado, Cancelamento de Pedido).
*   **AVARIA / QUARENTENA:** Danos físicos, quebra em trânsito, avaria no recebimento ou violação de embalagem.
*   **DEFEITO:** Desvios de qualidade industrial ou farmacêutica.
