# Roadmap

## Fase atual
- [x] FASE 5.2 — Correções de períodos, status, fatura paga e estados de leitura aplicadas; duas transações reais e estados de demora/falha testados sem operações financeiras.
- [ ] FASE 5.2 — Validar recorrência vencida e cartão sem fatura aberta com registros reais (bloqueado: a conta disponível não possui recorrências, cartões nem faturas; não criar dados nem usar outra conta sem autorização).
- [x] FASE 5 — Apresentação de Dinheiro refinada; estados vazios e links testados em 1280px/393px nos quatro temas, sem operações financeiras.
- [x] FASE 5 — Linhas de duas transações reais conferidas em 1280px/393px nos quatro temas durante a Fase 5.2.
- [ ] FASE 5 — Validar descrições longas, saldo negativo, cartões e alertas preenchidos (bloqueado: a conta disponível não apresentou esses casos; não criar dados nem usar outra conta sem autorização).

## Aguardando autorização
- [ ] FASE 7 — Finango IA / Copiloto Fox (aguardando aprovação do usuário)

## Pendências técnicas futuras (não implementar agora)
- [ ] Investimentos não respeita atualmente o contexto Minha Conta / Família e carrega os investimentos do usuário logado mesmo no modo Família.

## Melhorias visuais futuras (não implementar agora)
- [ ] Valorização em Investimentos: positivo → verde, negativo → vermelho, zero → neutro (hoje 0,00% aparece em verde).

## Fora do escopo (Stitch — Investimentos)
- Retorno de 12 meses, comparação de benchmarks, calendário de dividendos, tabela completa com filtros, exportação PDF/DARF. Não criar dados, tabelas ou regras para eles.

## Futuro
- [ ] Limpeza estrutural do Modo Família (código, tabelas, RLS, funções) — só após estabilizar a remoção da interface.
- [ ] Atualizar no admin os textos do plano "Premium ANUAL" (hoje só "Tudo do Premium" aparece, pois os demais itens falavam de família).
