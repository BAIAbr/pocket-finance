// Regras estáticas de categorização — sem IA, apenas correspondência textual.
// Cada regra mapeia um padrão (contém, uppercase) para o NOME de uma categoria default.
// A resolução para category_id é feita em runtime contra as categorias do usuário.

export type CategoryRule = {
  pattern: string; // uppercase, sem acento
  category: string; // nome-alvo (fallback se não existir -> "Outros")
  type: 'income' | 'expense';
};

export const STATIC_RULES: CategoryRule[] = [
  // Transporte
  { pattern: 'UBER', category: 'Transporte', type: 'expense' },
  { pattern: '99APP', category: 'Transporte', type: 'expense' },
  { pattern: '99 APP', category: 'Transporte', type: 'expense' },
  { pattern: '99 POP', category: 'Transporte', type: 'expense' },
  { pattern: 'CABIFY', category: 'Transporte', type: 'expense' },
  { pattern: 'BLABLACAR', category: 'Transporte', type: 'expense' },
  { pattern: 'METRO', category: 'Transporte', type: 'expense' },
  { pattern: 'BILHETE UNICO', category: 'Transporte', type: 'expense' },
  { pattern: 'ONIBUS', category: 'Transporte', type: 'expense' },
  { pattern: 'RECARGA BU', category: 'Transporte', type: 'expense' },
  { pattern: 'ESTACIONAMENTO', category: 'Transporte', type: 'expense' },
  { pattern: 'ZUL', category: 'Transporte', type: 'expense' },
  { pattern: 'PEDAGIO', category: 'Transporte', type: 'expense' },
  { pattern: 'SEM PARAR', category: 'Transporte', type: 'expense' },
  { pattern: 'CONECTCAR', category: 'Transporte', type: 'expense' },
  { pattern: 'MOVIDA', category: 'Transporte', type: 'expense' },
  { pattern: 'LOCALIZA', category: 'Transporte', type: 'expense' },
  { pattern: 'UNIDAS', category: 'Transporte', type: 'expense' },

  // Combustível
  { pattern: 'POSTO', category: 'Combustível', type: 'expense' },
  { pattern: 'SHELL', category: 'Combustível', type: 'expense' },
  { pattern: 'IPIRANGA', category: 'Combustível', type: 'expense' },
  { pattern: 'PETROBRAS', category: 'Combustível', type: 'expense' },
  { pattern: 'ALESAT', category: 'Combustível', type: 'expense' },
  { pattern: 'BR MANIA', category: 'Combustível', type: 'expense' },
  { pattern: 'GASOLINA', category: 'Combustível', type: 'expense' },
  { pattern: 'ETANOL', category: 'Combustível', type: 'expense' },

  // Alimentação — delivery/fast food
  { pattern: 'IFOOD', category: 'Alimentação', type: 'expense' },
  { pattern: 'RAPPI', category: 'Alimentação', type: 'expense' },
  { pattern: 'UBER EATS', category: 'Alimentação', type: 'expense' },
  { pattern: 'JAMES DELIVERY', category: 'Alimentação', type: 'expense' },
  { pattern: 'BURGER KING', category: 'Alimentação', type: 'expense' },
  { pattern: 'MCDONALDS', category: 'Alimentação', type: 'expense' },
  { pattern: 'MC DONALDS', category: 'Alimentação', type: 'expense' },
  { pattern: 'BOB S', category: 'Alimentação', type: 'expense' },
  { pattern: 'HABIB', category: 'Alimentação', type: 'expense' },
  { pattern: 'SUBWAY', category: 'Alimentação', type: 'expense' },
  { pattern: 'PIZZA', category: 'Alimentação', type: 'expense' },
  { pattern: 'RESTAURANTE', category: 'Alimentação', type: 'expense' },
  { pattern: 'LANCHONETE', category: 'Alimentação', type: 'expense' },
  { pattern: 'CAFETERIA', category: 'Alimentação', type: 'expense' },
  { pattern: 'STARBUCKS', category: 'Alimentação', type: 'expense' },
  { pattern: 'CACAU SHOW', category: 'Alimentação', type: 'expense' },
  { pattern: 'KOPENHAGEN', category: 'Alimentação', type: 'expense' },
  { pattern: 'PADARIA', category: 'Alimentação', type: 'expense' },
  { pattern: 'CONFEITARIA', category: 'Alimentação', type: 'expense' },
  { pattern: 'OUTBACK', category: 'Alimentação', type: 'expense' },

  // Mercado / Compras alimentação
  { pattern: 'MERCADO', category: 'Alimentação', type: 'expense' },
  { pattern: 'SUPERMERCADO', category: 'Alimentação', type: 'expense' },
  { pattern: 'HIPERMERCADO', category: 'Alimentação', type: 'expense' },
  { pattern: 'CARREFOUR', category: 'Alimentação', type: 'expense' },
  { pattern: 'EXTRA', category: 'Alimentação', type: 'expense' },
  { pattern: 'PAO DE ACUCAR', category: 'Alimentação', type: 'expense' },
  { pattern: 'ASSAI', category: 'Alimentação', type: 'expense' },
  { pattern: 'ATACADAO', category: 'Alimentação', type: 'expense' },
  { pattern: 'SAM S CLUB', category: 'Alimentação', type: 'expense' },
  { pattern: 'MAKRO', category: 'Alimentação', type: 'expense' },
  { pattern: 'DIA%', category: 'Alimentação', type: 'expense' },
  { pattern: 'HORTIFRUTI', category: 'Alimentação', type: 'expense' },
  { pattern: 'ACOUGUE', category: 'Alimentação', type: 'expense' },

  // Assinaturas
  { pattern: 'NETFLIX', category: 'Contas', type: 'expense' },
  { pattern: 'SPOTIFY', category: 'Contas', type: 'expense' },
  { pattern: 'DISNEY', category: 'Contas', type: 'expense' },
  { pattern: 'PRIME VIDEO', category: 'Contas', type: 'expense' },
  { pattern: 'AMAZON PRIME', category: 'Contas', type: 'expense' },
  { pattern: 'HBO', category: 'Contas', type: 'expense' },
  { pattern: 'MAX ', category: 'Contas', type: 'expense' },
  { pattern: 'YOUTUBE PREMIUM', category: 'Contas', type: 'expense' },
  { pattern: 'DEEZER', category: 'Contas', type: 'expense' },
  { pattern: 'APPLE.COM/BILL', category: 'Contas', type: 'expense' },
  { pattern: 'APPLE COM BILL', category: 'Contas', type: 'expense' },
  { pattern: 'GOOGLE ONE', category: 'Contas', type: 'expense' },
  { pattern: 'GOOGLE PLAY', category: 'Contas', type: 'expense' },
  { pattern: 'MICROSOFT', category: 'Contas', type: 'expense' },
  { pattern: 'ADOBE', category: 'Contas', type: 'expense' },
  { pattern: 'CANVA', category: 'Contas', type: 'expense' },
  { pattern: 'CHATGPT', category: 'Contas', type: 'expense' },
  { pattern: 'OPENAI', category: 'Contas', type: 'expense' },

  // Compras / e-commerce
  { pattern: 'AMAZON', category: 'Compras', type: 'expense' },
  { pattern: 'MERCADO LIVRE', category: 'Compras', type: 'expense' },
  { pattern: 'MERCADOLIVRE', category: 'Compras', type: 'expense' },
  { pattern: 'MERCADO PAGO', category: 'Compras', type: 'expense' },
  { pattern: 'SHOPEE', category: 'Compras', type: 'expense' },
  { pattern: 'ALIEXPRESS', category: 'Compras', type: 'expense' },
  { pattern: 'MAGAZINE LUIZA', category: 'Compras', type: 'expense' },
  { pattern: 'MAGALU', category: 'Compras', type: 'expense' },
  { pattern: 'AMERICANAS', category: 'Compras', type: 'expense' },
  { pattern: 'SUBMARINO', category: 'Compras', type: 'expense' },
  { pattern: 'CASAS BAHIA', category: 'Compras', type: 'expense' },
  { pattern: 'PONTO FRIO', category: 'Compras', type: 'expense' },
  { pattern: 'RENNER', category: 'Compras', type: 'expense' },
  { pattern: 'RIACHUELO', category: 'Compras', type: 'expense' },
  { pattern: 'C&A', category: 'Compras', type: 'expense' },
  { pattern: 'ZARA', category: 'Compras', type: 'expense' },
  { pattern: 'CENTAURO', category: 'Compras', type: 'expense' },
  { pattern: 'NETSHOES', category: 'Compras', type: 'expense' },

  // Saúde
  { pattern: 'FARMACIA', category: 'Saúde', type: 'expense' },
  { pattern: 'DROGARIA', category: 'Saúde', type: 'expense' },
  { pattern: 'DROGA RAIA', category: 'Saúde', type: 'expense' },
  { pattern: 'DROGASIL', category: 'Saúde', type: 'expense' },
  { pattern: 'PAGUE MENOS', category: 'Saúde', type: 'expense' },
  { pattern: 'PANVEL', category: 'Saúde', type: 'expense' },
  { pattern: 'HOSPITAL', category: 'Saúde', type: 'expense' },
  { pattern: 'CLINICA', category: 'Saúde', type: 'expense' },
  { pattern: 'LABORATORIO', category: 'Saúde', type: 'expense' },
  { pattern: 'DR CONSULTA', category: 'Saúde', type: 'expense' },
  { pattern: 'DENTISTA', category: 'Saúde', type: 'expense' },
  { pattern: 'PLANO DE SAUDE', category: 'Saúde', type: 'expense' },
  { pattern: 'UNIMED', category: 'Saúde', type: 'expense' },
  { pattern: 'AMIL', category: 'Saúde', type: 'expense' },
  { pattern: 'BRADESCO SAUDE', category: 'Saúde', type: 'expense' },
  { pattern: 'HAPVIDA', category: 'Saúde', type: 'expense' },

  // Educação
  { pattern: 'ESCOLA', category: 'Educação', type: 'expense' },
  { pattern: 'FACULDADE', category: 'Educação', type: 'expense' },
  { pattern: 'UNIVERSIDADE', category: 'Educação', type: 'expense' },
  { pattern: 'CURSO', category: 'Educação', type: 'expense' },
  { pattern: 'UDEMY', category: 'Educação', type: 'expense' },
  { pattern: 'ALURA', category: 'Educação', type: 'expense' },
  { pattern: 'COURSERA', category: 'Educação', type: 'expense' },
  { pattern: 'DUOLINGO', category: 'Educação', type: 'expense' },
  { pattern: 'MENSALIDADE', category: 'Educação', type: 'expense' },
  { pattern: 'LIVRARIA', category: 'Educação', type: 'expense' },

  // Contas / Moradia
  { pattern: 'ENERGIA', category: 'Contas', type: 'expense' },
  { pattern: 'ELETRICA', category: 'Contas', type: 'expense' },
  { pattern: 'ENEL', category: 'Contas', type: 'expense' },
  { pattern: 'CEMIG', category: 'Contas', type: 'expense' },
  { pattern: 'LIGHT', category: 'Contas', type: 'expense' },
  { pattern: 'COPEL', category: 'Contas', type: 'expense' },
  { pattern: 'ELETROPAULO', category: 'Contas', type: 'expense' },
  { pattern: 'SABESP', category: 'Contas', type: 'expense' },
  { pattern: 'AGUA', category: 'Contas', type: 'expense' },
  { pattern: 'COMGAS', category: 'Contas', type: 'expense' },
  { pattern: 'GAS', category: 'Contas', type: 'expense' },
  { pattern: 'VIVO', category: 'Contas', type: 'expense' },
  { pattern: 'CLARO', category: 'Contas', type: 'expense' },
  { pattern: 'TIM', category: 'Contas', type: 'expense' },
  { pattern: 'OI ', category: 'Contas', type: 'expense' },
  { pattern: 'NET SERVICOS', category: 'Contas', type: 'expense' },
  { pattern: 'INTERNET', category: 'Contas', type: 'expense' },
  { pattern: 'ALUGUEL', category: 'Moradia', type: 'expense' },
  { pattern: 'CONDOMINIO', category: 'Moradia', type: 'expense' },
  { pattern: 'IPTU', category: 'Moradia', type: 'expense' },

  // Lazer
  { pattern: 'CINEMA', category: 'Lazer', type: 'expense' },
  { pattern: 'CINEMARK', category: 'Lazer', type: 'expense' },
  { pattern: 'INGRESSO', category: 'Lazer', type: 'expense' },
  { pattern: 'STEAM', category: 'Lazer', type: 'expense' },
  { pattern: 'PLAYSTATION', category: 'Lazer', type: 'expense' },
  { pattern: 'XBOX', category: 'Lazer', type: 'expense' },
  { pattern: 'NINTENDO', category: 'Lazer', type: 'expense' },
  { pattern: 'BAR ', category: 'Lazer', type: 'expense' },
  { pattern: 'PUB ', category: 'Lazer', type: 'expense' },
  { pattern: 'BALADA', category: 'Lazer', type: 'expense' },

  // Bancário / Transferências (fica como Outros/expense se não identificar melhor)
  { pattern: 'PIX ENVIADO', category: 'Outros', type: 'expense' },
  { pattern: 'PIX RECEBIDO', category: 'Outros', type: 'income' },
  { pattern: 'TED ENVIADA', category: 'Outros', type: 'expense' },
  { pattern: 'TED RECEBIDA', category: 'Outros', type: 'income' },
  { pattern: 'DOC ENVIADO', category: 'Outros', type: 'expense' },
  { pattern: 'BOLETO', category: 'Contas', type: 'expense' },
  { pattern: 'FATURA CARTAO', category: 'Contas', type: 'expense' },
  { pattern: 'PAGAMENTO FATURA', category: 'Contas', type: 'expense' },

  // Renda
  { pattern: 'SALARIO', category: 'Salário', type: 'income' },
  { pattern: 'FOLHA PAGTO', category: 'Salário', type: 'income' },
  { pattern: 'FOLHA PAGAMENTO', category: 'Salário', type: 'income' },
  { pattern: 'PROVENTO', category: 'Salário', type: 'income' },
  { pattern: 'RENDIMENTO', category: 'Investimentos', type: 'income' },
  { pattern: 'DIVIDENDO', category: 'Investimentos', type: 'income' },
  { pattern: 'JCP', category: 'Investimentos', type: 'income' },
  { pattern: 'RESGATE', category: 'Investimentos', type: 'income' },
];

export function normalizeText(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 %]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type UserRule = { pattern: string; category_id: string; match_type: 'contains' | 'equals' | 'regex' };

export function applyRules(
  description: string,
  type: 'income' | 'expense',
  userRules: UserRule[],
  categoriesByName: Record<string, { id: string; type: string }[]>,
): string | null {
  const norm = normalizeText(description);
  // 1) regras do usuário (prioridade)
  for (const r of userRules) {
    if (r.match_type === 'equals' && norm === r.pattern) return r.category_id;
    if (r.match_type === 'contains' && norm.includes(r.pattern)) return r.category_id;
    if (r.match_type === 'regex') {
      try { if (new RegExp(r.pattern).test(norm)) return r.category_id; } catch {}
    }
  }
  // 2) regras estáticas
  for (const rule of STATIC_RULES) {
    if (rule.type !== type) continue;
    if (norm.includes(rule.pattern)) {
      const list = categoriesByName[rule.category.toUpperCase()];
      if (list) {
        const match = list.find(c => c.type === type) || list[0];
        if (match) return match.id;
      }
    }
  }
  // 3) fallback "Outros" do tipo
  const outros = categoriesByName['OUTROS'];
  if (outros) {
    const m = outros.find(c => c.type === type);
    if (m) return m.id;
  }
  return null;
}
