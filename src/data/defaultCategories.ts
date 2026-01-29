import { Category } from '@/types/finance';

export const defaultCategories: Category[] = [
  // Income categories
  { id: 'salary', name: 'Salário', icon: 'Briefcase', color: '#10B981', type: 'income' },
  { id: 'freelance', name: 'Freelance', icon: 'Laptop', color: '#34D399', type: 'income' },
  { id: 'investments', name: 'Investimentos', icon: 'TrendingUp', color: '#6EE7B7', type: 'income' },
  { id: 'gifts-in', name: 'Presentes', icon: 'Gift', color: '#A7F3D0', type: 'income' },
  { id: 'other-income', name: 'Outros', icon: 'Plus', color: '#059669', type: 'income' },
  
  // Expense categories
  { id: 'food', name: 'Alimentação', icon: 'UtensilsCrossed', color: '#F43F5E', type: 'expense' },
  { id: 'transport', name: 'Transporte', icon: 'Car', color: '#FB7185', type: 'expense' },
  { id: 'housing', name: 'Moradia', icon: 'Home', color: '#FDA4AF', type: 'expense' },
  { id: 'entertainment', name: 'Lazer', icon: 'Gamepad2', color: '#E11D48', type: 'expense' },
  { id: 'health', name: 'Saúde', icon: 'Heart', color: '#BE123C', type: 'expense' },
  { id: 'education', name: 'Educação', icon: 'GraduationCap', color: '#9F1239', type: 'expense' },
  { id: 'shopping', name: 'Compras', icon: 'ShoppingBag', color: '#881337', type: 'expense' },
  { id: 'bills', name: 'Contas', icon: 'Receipt', color: '#F472B6', type: 'expense' },
  { id: 'other-expense', name: 'Outros', icon: 'MoreHorizontal', color: '#DB2777', type: 'expense' },
];
