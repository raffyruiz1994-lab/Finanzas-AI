import { Category, CategoryGroup } from '@/types';

export const DEFAULT_CATEGORY_GROUPS: CategoryGroup[] = [
  // Gastos
  {
    id: 'grp_food',
    name: 'Comida y Bebida',
    type: 'expense',
    color: '#F59E0B',
  },
  {
    id: 'grp_lifestyle',
    name: 'Estilo de Vida',
    type: 'expense',
    color: '#EC4899',
  },
  {
    id: 'grp_family',
    name: 'Familia',
    type: 'expense',
    color: '#8B5CF6',
  },
  {
    id: 'grp_home',
    name: 'Hogar y Servicios',
    type: 'expense',
    color: '#10B981',
  },
  {
    id: 'grp_transport',
    name: 'Transporte',
    type: 'expense',
    color: '#3B82F6',
  },
  {
    id: 'grp_other_expense',
    name: 'Otros',
    type: 'expense',
    color: '#6B7280',
  },

  // Ingresos
  {
    id: 'grp_income_work',
    name: 'Trabajo y Empleo',
    type: 'income',
    color: '#10B981',
  },
  {
    id: 'grp_income_investments',
    name: 'Inversiones y Rentas',
    type: 'income',
    color: '#14B8A6',
  },
  {
    id: 'grp_income_other',
    name: 'Otros Ingresos',
    type: 'income',
    color: '#F59E0B',
  },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Gastos - Comida y Bebida
  {
    id: 'food',
    name: 'Restaurantes',
    icon: 'restaurant-outline',
    color: '#F59E0B', // Amber
    type: 'expense',
    groupId: 'grp_food',
    subcategories: ['Almuerzo', 'Cena', 'Delivery', 'Menú ejecutivo'],
  },
  {
    id: 'groceries',
    name: 'Supermercado',
    icon: 'cart-outline',
    color: '#10B981',
    type: 'expense',
    groupId: 'grp_food',
    subcategories: ['Despensa', 'Frutas y Verduras'],
  },
  {
    id: 'bars_drinks',
    name: 'Bebidas y Bares',
    icon: 'wine-outline',
    color: '#8B5CF6',
    type: 'expense',
    groupId: 'grp_food',
    subcategories: [],
  },
  {
    id: 'fast_food',
    name: 'Comida Rápida',
    icon: 'fast-food-outline',
    color: '#EF4444',
    type: 'expense',
    groupId: 'grp_food',
    subcategories: [],
  },
  {
    id: 'cafe',
    name: 'Cafeterías',
    icon: 'cafe-outline',
    color: '#D97706',
    type: 'expense',
    groupId: 'grp_food',
    subcategories: [],
  },

  // Gastos - Estilo de Vida
  {
    id: 'health',
    name: 'Cuidado Personal',
    icon: 'sparkles-outline',
    color: '#EC4899',
    type: 'expense',
    groupId: 'grp_lifestyle',
    subcategories: ['Farmacia', 'Consultas Médicas', 'Gimnasio', 'Seguro Médico'],
  },
  {
    id: 'sports',
    name: 'Deportes',
    icon: 'fitness-outline',
    color: '#3B82F6',
    type: 'expense',
    groupId: 'grp_lifestyle',
    subcategories: [],
  },
  {
    id: 'entertainment',
    name: 'Entretenimiento',
    icon: 'film-outline',
    color: '#EC4899', // Pink
    type: 'expense',
    groupId: 'grp_lifestyle',
    subcategories: ['Streaming (Netflix, Spotify)', 'Cine', 'Eventos', 'Videojuegos'],
  },
  {
    id: 'furniture',
    name: 'Hogar y Muebles',
    icon: 'bed-outline',
    color: '#10B981',
    type: 'expense',
    groupId: 'grp_lifestyle',
    subcategories: [],
  },
  {
    id: 'pets',
    name: 'Mascotas',
    icon: 'paw-outline',
    color: '#F59E0B',
    type: 'expense',
    groupId: 'grp_lifestyle',
    subcategories: [],
  },
  {
    id: 'shopping',
    name: 'Ropa y Calzado',
    icon: 'shirt-outline',
    color: '#8B5CF6', // Purple
    type: 'expense',
    groupId: 'grp_lifestyle',
    subcategories: ['Ropa', 'Calzado', 'Accesorios'],
  },
  {
    id: 'subscriptions',
    name: 'Suscripciones',
    icon: 'repeat-outline',
    color: '#6366F1',
    type: 'expense',
    groupId: 'grp_lifestyle',
    subcategories: ['Netflix', 'Spotify', 'iCloud'],
  },
  {
    id: 'technology',
    name: 'Tecnología',
    icon: 'hardware-chip-outline',
    color: '#06B6D4',
    type: 'expense',
    groupId: 'grp_lifestyle',
    subcategories: [],
  },
  {
    id: 'travel',
    name: 'Viajes',
    icon: 'airplane-outline',
    color: '#F97316',
    type: 'expense',
    groupId: 'grp_lifestyle',
    subcategories: [],
  },

  // Gastos - Hogar y Servicios
  {
    id: 'home',
    name: 'Hogar & Servicios',
    icon: 'home-outline',
    color: '#10B981', // Emerald
    type: 'expense',
    groupId: 'grp_home',
    subcategories: ['Electricidad / Luz', 'Internet / Teléfono', 'Agua', 'Alquiler', 'Mantenimiento'],
  },

  // Gastos - Transporte
  {
    id: 'transport',
    name: 'Transporte',
    icon: 'car-outline',
    color: '#3B82F6', // Blue
    type: 'expense',
    groupId: 'grp_transport',
    subcategories: ['Gasolina', 'Uber / Taxi', 'Mantenimiento', 'Peaje', 'Transporte público'],
  },

  // Gastos - Familia
  {
    id: 'education',
    name: 'Educación',
    icon: 'school-outline',
    color: '#6366F1', // Indigo
    type: 'expense',
    groupId: 'grp_family',
    subcategories: ['Colegio / Escuela', 'Universidad', 'Cursos Online', 'Libros'],
  },
  {
    id: 'savings_goal',
    name: 'Meta de Ahorro',
    icon: 'wallet-outline',
    color: '#06B6D4', // Cyan
    type: 'expense',
    groupId: 'grp_family',
    subcategories: ['Fondo de Emergencia', 'Vacaciones', 'Vehículo nuevo', 'Inversión'],
  },

  // Gastos - Otros
  {
    id: 'other_expense',
    name: 'Otros Gastos',
    icon: 'ellipsis-horizontal-circle-outline',
    color: '#6B7280', // Gray
    type: 'expense',
    groupId: 'grp_other_expense',
    subcategories: ['Varios', 'Imprevistos', 'Donaciones'],
  },

  // Ingresos
  {
    id: 'salary',
    name: 'Salario & Nómina',
    icon: 'cash-outline',
    color: '#10B981',
    type: 'income',
    groupId: 'grp_income_work',
    subcategories: ['Sueldo Mensual', 'Quincena', 'Bono de desempeño', 'Comisiones'],
  },
  {
    id: 'business',
    name: 'Negocio & Freelance',
    icon: 'briefcase-outline',
    color: '#059669',
    type: 'income',
    groupId: 'grp_income_work',
    subcategories: ['Servicios Profesionales', 'Ventas de Productos', 'Consultoría'],
  },
  {
    id: 'investments',
    name: 'Inversiones',
    icon: 'trending-up-outline',
    color: '#14B8A6',
    type: 'income',
    groupId: 'grp_income_investments',
    subcategories: ['Dividendos', 'Intereses bancarios', 'Ganancias de capital'],
  },
  {
    id: 'other_income',
    name: 'Otros Ingresos',
    icon: 'gift-outline',
    color: '#047857',
    type: 'income',
    groupId: 'grp_income_other',
    subcategories: ['Saldo inicial', 'Regalos', 'Reembolsos'],
  },
];

export const PRESET_QUICK_EXPENSES = [
  { id: 'p1', title: 'Café', amount: 150, categoryId: 'food', icon: 'cafe-outline', color: '#F59E0B' },
  { id: 'p2', title: 'Gasolina', amount: 1500, categoryId: 'transport', icon: 'speedometer-outline', color: '#3B82F6' },
  { id: 'p3', title: 'Almuerzo', amount: 450, categoryId: 'food', icon: 'fast-food-outline', color: '#10B981' },
  { id: 'p4', title: 'Supermercado', amount: 3500, categoryId: 'food', icon: 'cart-outline', color: '#8B5CF6' },
  { id: 'p5', title: 'Uber', amount: 280, categoryId: 'transport', icon: 'car-outline', color: '#EC4899' },
  { id: 'p6', title: 'Farmacia', amount: 650, categoryId: 'health', icon: 'medkit-outline', color: '#EF4444' },
];

