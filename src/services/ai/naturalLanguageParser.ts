import { Category, TransactionType } from '@/types';
import { ParsedTransactionResult } from './aiService.interface';

/**
 * Motor inteligente de interpretación en lenguaje natural de transacciones
 * Diseñado para procesar entradas de voz y texto con alta precisión
 */
export function parseNaturalLanguageInput(
  input: string,
  categories: Category[]
): ParsedTransactionResult {
  const normalized = input.trim().toLowerCase();

  // 1. Detectar Tipo (Gasto / Ingreso / Transferencia)
  let type: TransactionType = 'expense';
  if (
    normalized.includes('recibí') ||
    normalized.includes('recibi') ||
    normalized.includes('me depositaron') ||
    normalized.includes('me pagaron') ||
    normalized.includes('ingreso') ||
    normalized.includes('cobré') ||
    normalized.includes('cobre') ||
    normalized.includes('salario') && !normalized.includes('gasté')
  ) {
    type = 'income';
  } else if (
    normalized.includes('transferí') ||
    normalized.includes('transferi') ||
    normalized.includes('transferencia') ||
    normalized.includes('pasé') ||
    normalized.includes('pase')
  ) {
    type = 'transfer';
  }

  // 2. Extraer Monto
  // Soportar casos como: "150", "2,500", "50 mil", "50,000", "RD$750", "$300"
  let amount = 0;
  
  // Detectar patrones como "50 mil" o "100 mil"
  const thousandMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*mil\b/);
  if (thousandMatch) {
    const base = parseFloat(thousandMatch[1].replace(',', '.'));
    amount = base * 1000;
  } else {
    // Buscar números con separador de miles o decimales
    const match = normalized.match(/(?:rd\$|\$|€|£)?\s*([0-9]{1,3}(?:[,.][0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/);
    if (match) {
      const cleanNum = match[1].replace(/,/g, '');
      amount = parseFloat(cleanNum) || 0;
    }
  }

  // 3. Detectar Cuenta / Método de pago
  let accountHint: 'bank' | 'cash' | 'credit_card' | undefined = undefined;
  if (
    normalized.includes('tarjeta') ||
    normalized.includes('popular') ||
    normalized.includes('crédito') ||
    normalized.includes('credito')
  ) {
    accountHint = 'credit_card';
  } else if (
    normalized.includes('efectivo') ||
    normalized.includes('cash') ||
    normalized.includes('mano')
  ) {
    accountHint = 'cash';
  } else if (
    normalized.includes('banco') ||
    normalized.includes('transferencia') ||
    normalized.includes('cuenta')
  ) {
    accountHint = 'bank';
  }

  // 4. Categorización Inteligente & Subcategoría
  let categoryId = type === 'income' ? 'other_income' : 'other_expense';
  let subcategory: string | undefined = undefined;
  let merchant: string | undefined = undefined;
  let description = input.trim();

  // Diccionario de reglas semánticas y términos clave
  const categoryKeywords: Record<
    string,
    { keywords: string[]; defaultSub?: string; catId: string }
  > = {
    food: {
      catId: 'food',
      keywords: ['comida', 'supermercado', 'nacional', 'sirena', 'jumbo', 'café', 'cafe', 'almuerzo', 'desayuno', 'cena', 'restaurante', 'pizza', 'hamburguesa', 'delivery', 'pedidosya', 'uber eats'],
      defaultSub: 'Restaurantes',
    },
    transport: {
      catId: 'transport',
      keywords: ['gasolina', 'combustible', 'shell', 'total', 'texaco', 'uber', 'taxi', 'indrive', 'peaje', 'pasaje', 'carro', 'vehículo', 'vehiculo', 'mecánico', 'mecanico'],
      defaultSub: 'Gasolina',
    },
    education: {
      catId: 'education',
      keywords: ['colegio', 'escuela', 'universidad', 'uasd', 'pucmm', 'intec', 'unibe', 'curso', 'libro', 'matrícula', 'matricula', 'mensualidad escolar'],
      defaultSub: 'Colegio / Escuela',
    },
    home: {
      catId: 'home',
      keywords: ['luz', 'electricidad', 'edeeste', 'edesur', 'edenorte', 'agua', 'caasd', 'internet', 'claro', 'altice', 'alquiler', 'renta', 'mantenimiento'],
      defaultSub: 'Electricidad / Luz',
    },
    entertainment: {
      catId: 'entertainment',
      keywords: ['netflix', 'spotify', 'cine', 'caribbean cinemas', 'boleta', 'concierto', 'juego', 'playstation', 'steam'],
      defaultSub: 'Streaming (Netflix, Spotify)',
    },
    health: {
      catId: 'health',
      keywords: ['farmacia', 'carol', 'gbc', 'medicina', 'médico', 'medico', 'consulta', 'doctor', 'hospital', 'clínica', 'clinica', 'gimnasio', 'gym', 'smart fit'],
      defaultSub: 'Farmacia',
    },
    shopping: {
      catId: 'shopping',
      keywords: ['zapatos', 'ropa', 'tienda', 'amazon', 'shein', 'zara', 'electrónicos', 'tecnología'],
      defaultSub: 'Ropa & Calzado',
    },
    salary: {
      catId: 'salary',
      keywords: ['salario', 'sueldo', 'nómina', 'nomina', 'quincena', 'pago mensual'],
      defaultSub: 'Sueldo Mensual',
    },
    business: {
      catId: 'business',
      keywords: ['cliente', 'factura pagada', 'honorarios', 'freelance', 'proyecto', 'venta'],
      defaultSub: 'Servicios Profesionales',
    },
  };

  for (const [key, mapping] of Object.entries(categoryKeywords)) {
    const match = mapping.keywords.some((kw) => normalized.includes(kw));
    if (match) {
      categoryId = mapping.catId;
      subcategory = mapping.defaultSub;

      // Refinar subcategorías específicas
      if (normalized.includes('supermercado') || normalized.includes('nacional') || normalized.includes('sirena')) {
        subcategory = 'Supermercado';
        if (normalized.includes('nacional')) merchant = 'Supermercado Nacional';
      } else if (normalized.includes('café') || normalized.includes('cafe')) {
        subcategory = 'Cafetería';
      } else if (normalized.includes('uber') && !normalized.includes('eats')) {
        subcategory = 'Uber / Taxi';
        merchant = 'Uber';
      } else if (normalized.includes('gasolina') || normalized.includes('shell')) {
        subcategory = 'Gasolina';
        if (normalized.includes('shell')) merchant = 'Estación Shell';
      } else if (normalized.includes('luz') || normalized.includes('electricidad') || normalized.includes('edeeste')) {
        subcategory = 'Electricidad / Luz';
        if (normalized.includes('edeeste')) merchant = 'Edeeste';
      } else if (normalized.includes('netflix')) {
        subcategory = 'Streaming (Netflix, Spotify)';
        merchant = 'Netflix';
      } else if (normalized.includes('colegio')) {
        subcategory = 'Colegio / Escuela';
      }
      break;
    }
  }

  // Generar descripción limpia para la UI
  if (normalized.includes('en ') || normalized.includes('de ') || normalized.includes('por ')) {
    const parts = input.split(/(?:en|de|por)\s+/i);
    if (parts.length > 1) {
      description = parts[1].trim();
      // Capitalizar primera letra
      description = description.charAt(0).toUpperCase() + description.slice(1);
    }
  }

  return {
    type,
    amount,
    currency: 'DOP',
    categoryId,
    subcategory,
    accountHint,
    description: description || (type === 'income' ? 'Ingreso registrado' : 'Gasto registrado'),
    merchant,
    confidence: 0.95,
    rawInput: input,
  };
}

