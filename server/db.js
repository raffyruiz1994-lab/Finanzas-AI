import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'finanzas_data.json');

const INITIAL_DB = {
  users: [
    {
      id: 'usr_demo_1',
      email: 'demo@finanzasai.app',
      name: 'Raffy Ruiz',
      avatar: null,
      passwordHash: '$2a$10$X8O57F9q1Z5E6Wz1p.d5cegqM1K5Pz5.ZlCj9yVz9w/r8uR6t.Keq', // 'demo123'
      isPro: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  auth_identities: [
    {
      id: 'ident_demo_1',
      user_id: 'usr_demo_1',
      provider: 'email',
      provider_user_id: 'demo@finanzasai.app',
      provider_email: 'demo@finanzasai.app',
      created_at: new Date().toISOString(),
    },
  ],
  password_resets: [],
  accounts: [
    {
      id: 'acc_bank_main',
      userId: 'usr_demo_1',
      name: 'Banco Popular',
      type: 'bank',
      balance: 85000,
      currency: 'DOP',
      color: '#0066B2',
      icon: 'business-outline',
      bankName: 'Banco Popular Dominicano',
    },
    {
      id: 'acc_cash',
      userId: 'usr_demo_1',
      name: 'Efectivo Billetera',
      type: 'cash',
      balance: 12500,
      currency: 'DOP',
      color: '#10B981',
      icon: 'cash-outline',
    },
    {
      id: 'acc_savings',
      userId: 'usr_demo_1',
      name: 'Cuenta Ahorro Reserva',
      type: 'savings',
      balance: 20000,
      currency: 'DOP',
      color: '#8B5CF6',
      icon: 'wallet-outline',
      bankName: 'Banreservas',
    },
    {
      id: 'acc_credit_card',
      userId: 'usr_demo_1',
      name: 'Tarjeta Popular Visa',
      type: 'credit_card',
      balance: -35000,
      balanceUsed: 35000,
      creditLimit: 100000,
      currency: 'DOP',
      color: '#F59E0B',
      icon: 'card-outline',
      billingClosingDay: 15,
      paymentDueDay: 28,
      bankName: 'Banco Popular',
    },
  ],
  transactions: [
    {
      id: 'tx_01',
      userId: 'usr_demo_1',
      type: 'income',
      amount: 102000,
      currency: 'DOP',
      categoryId: 'other_income',
      subcategory: 'Saldo inicial',
      accountId: 'acc_bank_main',
      date: '2026-09-26',
      time: '09:00',
      description: 'Saldo inicial',
      tags: ['#inicial'],
    },
    {
      id: 'tx_02',
      userId: 'usr_demo_1',
      type: 'expense',
      amount: 10500,
      currency: 'DOP',
      categoryId: 'education',
      subcategory: 'Colegio / Escuela',
      accountId: 'acc_credit_card',
      date: '2026-09-26',
      time: '11:30',
      description: 'Colegio nico',
      tags: ['#tarjeta', '#educación'],
      merchant: 'Colegio Santo Domingo',
    },
    {
      id: 'tx_03',
      userId: 'usr_demo_1',
      type: 'expense',
      amount: 100,
      currency: 'DOP',
      categoryId: 'savings_goal',
      subcategory: 'Fondo de Emergencia',
      accountId: 'acc_cash',
      date: '2026-09-26',
      time: '14:15',
      description: 'Meta de Ahorro',
      tags: ['#ahorro'],
    },
    {
      id: 'tx_04',
      userId: 'usr_demo_1',
      type: 'expense',
      amount: 3450,
      currency: 'DOP',
      categoryId: 'food',
      subcategory: 'Supermercado',
      accountId: 'acc_credit_card',
      date: '2026-09-25',
      time: '18:40',
      description: 'Supermercado Nacional',
      tags: ['#supermercado', '#tarjeta'],
      merchant: 'Supermercado Nacional',
    },
    {
      id: 'tx_05',
      userId: 'usr_demo_1',
      type: 'expense',
      amount: 2200,
      currency: 'DOP',
      categoryId: 'transport',
      subcategory: 'Gasolina',
      accountId: 'acc_credit_card',
      date: '2026-09-24',
      time: '08:20',
      description: 'Combustible Shell Churchill',
      tags: ['#gasolina'],
      merchant: 'Estación Shell',
    },
    {
      id: 'tx_06',
      userId: 'usr_demo_1',
      type: 'expense',
      amount: 799,
      currency: 'DOP',
      categoryId: 'entertainment',
      subcategory: 'Streaming (Netflix, Spotify)',
      accountId: 'acc_credit_card',
      date: '2026-09-22',
      time: '03:00',
      description: 'Netflix Premium Familiar',
      tags: ['#recurrente', '#suscripción'],
      isRecurring: true,
    },
    {
      id: 'tx_07',
      userId: 'usr_demo_1',
      type: 'expense',
      amount: 1850,
      currency: 'DOP',
      categoryId: 'home',
      subcategory: 'Electricidad / Luz',
      accountId: 'acc_bank_main',
      date: '2026-09-20',
      time: '10:05',
      description: 'Factura Edeeste',
      tags: ['#servicios', '#hogar'],
      merchant: 'Edeeste',
      isRecurring: true,
    },
  ],
  budgets: [
    { id: 'b_food', userId: 'usr_demo_1', categoryId: 'food', amount: 15000, period: 'monthly', alertThreshold: 0.8 },
    { id: 'b_transport', userId: 'usr_demo_1', categoryId: 'transport', amount: 8000, period: 'monthly', alertThreshold: 0.9 },
    { id: 'b_education', userId: 'usr_demo_1', categoryId: 'education', amount: 12000, period: 'monthly', alertThreshold: 1.0 },
    { id: 'b_entertainment', userId: 'usr_demo_1', categoryId: 'entertainment', amount: 4000, period: 'monthly', alertThreshold: 0.8 },
  ],
  goals: [
    {
      id: 'goal_car',
      userId: 'usr_demo_1',
      title: 'Comprar vehículo nuevo',
      targetAmount: 1000000,
      currentAmount: 350000,
      currency: 'DOP',
      deadlineDate: '2027-12-31',
      icon: 'car-sport-outline',
      color: '#3B82F6',
    },
    {
      id: 'goal_emergency',
      userId: 'usr_demo_1',
      title: 'Fondo de Emergencia (6 meses)',
      targetAmount: 300000,
      currentAmount: 120000,
      currency: 'DOP',
      deadlineDate: '2027-06-30',
      icon: 'shield-checkmark-outline',
      color: '#10B981',
    },
  ],
  debts: [
    {
      id: 'debt_loan',
      userId: 'usr_demo_1',
      title: 'Préstamo Personal Banco',
      totalAmount: 250000,
      remainingAmount: 165000,
      monthlyPayment: 8500,
      dueDate: 'Día 10 de cada mes',
      creditor: 'Banco Popular',
      currency: 'DOP',
    },
  ],
  recurring: [
    {
      id: 'rec_netflix',
      userId: 'usr_demo_1',
      title: 'Netflix Premium',
      amount: 799,
      frequency: 'monthly',
      nextDueDate: '2026-10-22',
      categoryId: 'entertainment',
      accountId: 'acc_credit_card',
    },
    {
      id: 'rec_electricity',
      userId: 'usr_demo_1',
      title: 'Factura Edeeste',
      amount: 1850,
      frequency: 'monthly',
      nextDueDate: '2026-10-20',
      categoryId: 'home',
      accountId: 'acc_bank_main',
    },
    {
      id: 'rec_tuition',
      userId: 'usr_demo_1',
      title: 'Colegio Nico',
      amount: 10500,
      frequency: 'monthly',
      nextDueDate: '2026-10-26',
      categoryId: 'education',
      accountId: 'acc_credit_card',
    },
  ],
};

export class Database {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.auth_identities) {
          this.data.auth_identities = [
            {
              id: 'ident_demo_1',
              user_id: 'usr_demo_1',
              provider: 'email',
              provider_user_id: 'demo@finanzasai.app',
              provider_email: 'demo@finanzasai.app',
              created_at: new Date().toISOString(),
            },
          ];
          this.save();
        }
        if (!this.data.password_resets) {
          this.data.password_resets = [];
          this.save();
        }
      } else {
        this.data = INITIAL_DB;
        this.save();
      }
    } catch (err) {
      console.error('Error cargando base de datos, usando inicial:', err);
      this.data = INITIAL_DB;
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error guardando en base de datos:', err);
    }
  }

  get(table) {
    return this.data[table] || [];
  }

  set(table, value) {
    this.data[table] = value;
    this.save();
  }
}

export const db = new Database();
