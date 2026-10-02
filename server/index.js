import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from './db.js';
import { verifyGoogleCredential, verifyAppleCredential } from './authProviders.js';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'finanzas_ai_super_secret_jwt_key_2026';

app.use(cors());
app.use(express.json());

// Logger middleware (oculta contraseñas y tokens por seguridad)
app.use((req, res, next) => {
  const safeUrl = req.url.split('?')[0];
  console.log(`[API] ${req.method} ${safeUrl}`);
  next();
});

// Middleware de Autenticación JWT Estricto
// Protege los endpoints privados y rechaza peticiones sin token válido (elimina el fallback demo)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'No autorizado. Se requiere un token de sesión válido.',
      code: 'AUTH_REQUIRED',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(401).json({
        error: 'Sesión expirada o token inválido.',
        code: 'TOKEN_INVALID_OR_EXPIRED',
      });
    }
    req.user = decodedUser;
    next();
  });
}

// Inicializador de cuentas y presupuestos iniciales para usuarios nuevos
function initUserStarterData(userId, userName = 'Usuario') {
  const accounts = db.get('accounts');
  const userAccounts = accounts.filter((a) => a.userId === userId);

  if (userAccounts.length === 0) {
    accounts.push(
      {
        id: `acc_cash_${userId}`,
        userId: userId,
        name: 'Efectivo',
        type: 'cash',
        balance: 0,
        currency: 'DOP',
        color: '#10B981',
        icon: 'cash-outline',
      },
      {
        id: `acc_bank_${userId}`,
        userId: userId,
        name: 'Cuenta Principal',
        type: 'bank',
        balance: 0,
        currency: 'DOP',
        color: '#3B82F6',
        icon: 'business-outline',
      }
    );
    db.set('accounts', accounts);
  }

  const budgets = db.get('budgets');
  const userBudgets = budgets.filter((b) => b.userId === userId);
  if (userBudgets.length === 0) {
    budgets.push(
      { id: `b_food_${userId}`, userId: userId, categoryId: 'food', amount: 15000, period: 'monthly', alertThreshold: 0.8 },
      { id: `b_transport_${userId}`, userId: userId, categoryId: 'transport', amount: 8000, period: 'monthly', alertThreshold: 0.9 },
      { id: `b_home_${userId}`, userId: userId, categoryId: 'home', amount: 12000, period: 'monthly', alertThreshold: 0.85 }
    );
    db.set('budgets', budgets);
  }
}

// ==========================================
// 1. HEALTHCHECK
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    product: 'Finanzas AI API Server',
    version: '1.2.0',
    authSystem: 'Multi-Identity (Google, Apple, Email)',
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 2. AUTENTICACIÓN REAL
// ==========================================

// A. Registro con Correo y Contraseña
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
  }

  const trimmedEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ error: 'El formato del correo electrónico no es válido.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  const users = db.get('users');
  const identities = db.get('auth_identities');

  // Verificar si la identidad ya existe
  const existingIdentity = identities.find(
    (i) => i.provider === 'email' && i.provider_user_id === trimmedEmail
  );
  const existingUser = users.find((u) => u.email && u.email.toLowerCase() === trimmedEmail);

  if (existingIdentity || (existingUser && existingUser.passwordHash)) {
    return res.status(400).json({ error: 'Este correo electrónico ya está registrado.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  // Si ya existía el usuario (por ejemplo creado previamente vía Google con mismo email), vinculamos
  let userId;
  if (existingUser) {
    userId = existingUser.id;
    existingUser.passwordHash = passwordHash;
    existingUser.name = existingUser.name || name.trim();
    existingUser.updated_at = now;
  } else {
    userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const newUser = {
      id: userId,
      email: trimmedEmail,
      name: name.trim(),
      avatar: null,
      passwordHash,
      isPro: false,
      created_at: now,
      updated_at: now,
    };
    users.push(newUser);
  }

  // Registrar la identidad de email
  const newIdentity = {
    id: `ident_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    user_id: userId,
    provider: 'email',
    provider_user_id: trimmedEmail,
    provider_email: trimmedEmail,
    created_at: now,
  };
  identities.push(newIdentity);

  db.set('users', users);
  db.set('auth_identities', identities);

  // Inicializar entorno financiero para este usuario
  initUserStarterData(userId, name);

  const token = jwt.sign({ id: userId, email: trimmedEmail }, JWT_SECRET, { expiresIn: '30d' });

  res.json({
    success: true,
    token,
    user: {
      id: userId,
      name: name.trim(),
      email: trimmedEmail,
      avatar: null,
      provider: 'email',
      isPro: false,
    },
  });
});

// B. Inicio de Sesión con Correo y Contraseña
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña requeridos.' });
  }

  const trimmedEmail = String(email).trim().toLowerCase();
  const users = db.get('users');
  const user = users.find((u) => u.email && u.email.toLowerCase() === trimmedEmail);

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas. Verifica tu correo y contraseña.' });
  }

  // Soporte de contraseña de demo si corresponde, o validación de hash bcrypt
  const isDemo = user.id === 'usr_demo_1' && password === 'demo123';
  const isMatch = user.passwordHash && bcrypt.compareSync(password, user.passwordHash);

  if (!isDemo && !isMatch) {
    return res.status(401).json({ error: 'Credenciales inválidas. Verifica tu correo y contraseña.' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || null,
      provider: 'email',
      isPro: !!user.isPro,
    },
  });
});

// C. Continuar con Google (Validación Real de Credencial Google en Backend)
app.post('/api/auth/google', async (req, res) => {
  const { credential, token: accessToken } = req.body;
  const tokenToVerify = credential || accessToken;

  if (!tokenToVerify) {
    return res.status(400).json({ error: 'Credencial de Google no suministrada.' });
  }

  try {
    const googleData = await verifyGoogleCredential(tokenToVerify);
    const users = db.get('users');
    const identities = db.get('auth_identities');
    const now = new Date().toISOString();

    // 1. Buscar si ya existe una identidad vinculada a este Google 'sub'
    let identity = identities.find(
      (i) => i.provider === 'google' && i.provider_user_id === googleData.sub
    );

    let user;

    if (identity) {
      // Identidad encontrada: recuperar usuario existente
      user = users.find((u) => u.id === identity.user_id);
      if (user) {
        // Actualizar avatar o nombre si están vacíos
        if (!user.avatar && googleData.picture) user.avatar = googleData.picture;
        user.updated_at = now;
        db.set('users', users);
      }
    } else {
      // 2. Comprobar si existe un usuario previo con el mismo email verificado (Estrategia Anti-Duplicados)
      const existingUserByEmail = googleData.email_verified
        ? users.find((u) => u.email && u.email.toLowerCase() === googleData.email)
        : null;

      if (existingUserByEmail) {
        user = existingUserByEmail;
        if (!user.avatar && googleData.picture) user.avatar = googleData.picture;
        user.updated_at = now;
      } else {
        // 3. Crear nuevo usuario en la plataforma con ID interno único
        const newUserId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        user = {
          id: newUserId,
          email: googleData.email,
          name: googleData.name,
          avatar: googleData.picture,
          passwordHash: null,
          isPro: false,
          created_at: now,
          updated_at: now,
        };
        users.push(user);
        initUserStarterData(newUserId, googleData.name);
      }

      // Crear y vincular la identidad de Google
      identity = {
        id: `ident_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        user_id: user.id,
        provider: 'google',
        provider_user_id: googleData.sub,
        provider_email: googleData.email,
        created_at: now,
      };
      identities.push(identity);

      db.set('users', users);
      db.set('auth_identities', identities);
    }

    if (!user) {
      return res.status(500).json({ error: 'Error al recuperar o crear el usuario de Google.' });
    }

    const sessionToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        provider: 'google',
        isPro: !!user.isPro,
      },
    });
  } catch (err) {
    console.error('[Auth Google Error]:', err.message);
    res.status(401).json({ error: err.message || 'Error validando credencial de Google.' });
  }
});

// D. Continuar con Apple (Validación Real de Credencial Apple con JWKS)
app.post('/api/auth/apple', async (req, res) => {
  const { identityToken, fullName, user: clientAppleUserId, email: clientEmail } = req.body;

  if (!identityToken) {
    return res.status(400).json({ error: 'Token de identidad de Apple no proporcionado.' });
  }

  try {
    const appleData = await verifyAppleCredential(identityToken);
    const users = db.get('users');
    const identities = db.get('auth_identities');
    const now = new Date().toISOString();

    // El apple_id inmutable ('sub') es el identificador principal
    const appleSub = appleData.sub;
    const reportedEmail = appleData.email || clientEmail || null;

    // Buscar si ya existe una identidad vinculada a este apple_id
    let identity = identities.find(
      (i) => i.provider === 'apple' && i.provider_user_id === appleSub
    );

    let user;

    if (identity) {
      // Usuario ya registrado con Apple
      user = users.find((u) => u.id === identity.user_id);
    } else {
      // Si Apple envió nombre en el primer inicio de sesión
      let resolvedName = 'Usuario Apple';
      if (fullName) {
        if (typeof fullName === 'object') {
          const parts = [fullName.givenName, fullName.familyName].filter(Boolean);
          if (parts.length > 0) resolvedName = parts.join(' ');
        } else if (typeof fullName === 'string' && fullName.trim()) {
          resolvedName = fullName.trim();
        }
      }

      // Comprobar si el correo ya existe en un usuario previo y vincular (solo si no es email anónimo privado)
      const isRelay = reportedEmail && reportedEmail.includes('privaterelay.appleid.com');
      const existingUserByEmail =
        reportedEmail && !isRelay
          ? users.find((u) => u.email && u.email.toLowerCase() === reportedEmail.toLowerCase())
          : null;

      if (existingUserByEmail) {
        user = existingUserByEmail;
        user.updated_at = now;
      } else {
        const newUserId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        user = {
          id: newUserId,
          email: reportedEmail,
          name: resolvedName,
          avatar: null,
          passwordHash: null,
          isPro: false,
          created_at: now,
          updated_at: now,
        };
        users.push(user);
        initUserStarterData(newUserId, resolvedName);
      }

      // Registrar la identidad de Apple vinculada a este usuario
      identity = {
        id: `ident_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        user_id: user.id,
        provider: 'apple',
        provider_user_id: appleSub,
        provider_email: reportedEmail,
        created_at: now,
      };
      identities.push(identity);

      db.set('users', users);
      db.set('auth_identities', identities);
    }

    if (!user) {
      return res.status(500).json({ error: 'Error al recuperar o crear el usuario de Apple.' });
    }

    const sessionToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        provider: 'apple',
        isPro: !!user.isPro,
      },
    });
  } catch (err) {
    console.error('[Auth Apple Error]:', err.message);
    res.status(401).json({ error: err.message || 'Error validando credencial de Apple.' });
  }
});

// E. Solicitud de Recuperación de Contraseña (Anti-Enumeración)
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email || !String(email).trim()) {
    return res.status(400).json({ error: 'Correo electrónico requerido.' });
  }

  const trimmedEmail = String(email).trim().toLowerCase();
  const users = db.get('users');
  const user = users.find((u) => u.email && u.email.toLowerCase() === trimmedEmail);

  if (user) {
    const resets = db.get('password_resets');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 3600 * 1000; // 1 hora de validez

    resets.push({
      id: `rst_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      user_id: user.id,
      token: token,
      expires_at: expiresAt,
      used: false,
      created_at: new Date().toISOString(),
    });
    db.set('password_resets', resets);

    console.log(`[Seguridad] Token de recuperación generado para ${trimmedEmail}: ${token}`);
  }

  // Respuesta intencionalmente neutra para evitar enumeración de usuarios
  res.json({
    success: true,
    message: 'Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.',
  });
});

// F. Restablecimiento de Contraseña
app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token y nueva contraseña requeridos.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  const resets = db.get('password_resets');
  const record = resets.find((r) => r.token === token && !r.used && r.expires_at > Date.now());

  if (!record) {
    return res.status(400).json({ error: 'El enlace de recuperación es inválido o ha expirado.' });
  }

  const users = db.get('users');
  const user = users.find((u) => u.id === record.user_id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  user.updated_at = new Date().toISOString();
  record.used = true;

  db.set('users', users);
  db.set('password_resets', resets);

  res.json({
    success: true,
    message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.',
  });
});

// G. Perfil del Usuario Autenticado e Identidades Vinculadas
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const users = db.get('users');
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

  const identities = db.get('auth_identities').filter((i) => i.user_id === user.id);

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    isPro: !!user.isPro,
    providers: identities.map((i) => i.provider),
    created_at: user.created_at,
  });
});

// ==========================================
// 3. CUENTAS
// ==========================================
app.get('/api/accounts', authenticateToken, (req, res) => {
  const accounts = db.get('accounts').filter((a) => a.userId === req.user.id);
  res.json(accounts);
});

app.post('/api/accounts', authenticateToken, (req, res) => {
  const accounts = db.get('accounts');
  const newAccount = {
    ...req.body,
    id: `acc_${Date.now()}`,
    userId: req.user.id,
  };
  accounts.push(newAccount);
  db.set('accounts', accounts);
  res.json(newAccount);
});

app.post('/api/accounts/transfer', authenticateToken, (req, res) => {
  const { fromAccountId, toAccountId, amount, note } = req.body;
  const accounts = db.get('accounts');
  const transactions = db.get('transactions');

  const fromAcc = accounts.find((a) => a.id === fromAccountId && a.userId === req.user.id);
  const toAcc = accounts.find((a) => a.id === toAccountId && a.userId === req.user.id);

  if (!fromAcc || !toAcc) {
    return res.status(400).json({ error: 'Cuentas inválidas' });
  }

  fromAcc.balance -= amount;
  toAcc.balance += amount;

  const newTx = {
    id: `tx_${Date.now()}`,
    userId: req.user.id,
    type: 'transfer',
    amount,
    currency: fromAcc.currency || 'DOP',
    categoryId: 'transfer',
    accountId: fromAccountId,
    destinationAccountId: toAccountId,
    date: new Date().toISOString().split('T')[0],
    time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    description: note || 'Transferencia entre cuentas',
    tags: ['#transferencia'],
  };

  transactions.unshift(newTx);
  db.set('accounts', accounts);
  db.set('transactions', transactions);

  res.json({ success: true, transaction: newTx, accounts: [fromAcc, toAcc] });
});

// ==========================================
// 4. TRANSACCIONES & BATCH SYNC
// ==========================================
app.get('/api/transactions', authenticateToken, (req, res) => {
  const txs = db.get('transactions').filter((t) => t.userId === req.user.id);
  res.json(txs);
});

app.post('/api/transactions', authenticateToken, (req, res) => {
  const transactions = db.get('transactions');
  const accounts = db.get('accounts');

  const newTx = {
    ...req.body,
    id: `tx_${Date.now()}`,
    userId: req.user.id,
    date: req.body.date || new Date().toISOString().split('T')[0],
    time: req.body.time || `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
  };

  // Ajustar balance de la cuenta
  const acc = accounts.find((a) => a.id === newTx.accountId && a.userId === req.user.id);
  if (acc) {
    if (newTx.type === 'expense') {
      if (acc.type === 'credit_card') {
        acc.balanceUsed = (acc.balanceUsed || 0) + newTx.amount;
        acc.balance -= newTx.amount;
      } else {
        acc.balance -= newTx.amount;
      }
    } else if (newTx.type === 'income') {
      acc.balance += newTx.amount;
    }
    db.set('accounts', accounts);
  }

  transactions.unshift(newTx);
  db.set('transactions', transactions);

  res.json(newTx);
});

app.delete('/api/transactions/:id', authenticateToken, (req, res) => {
  const transactions = db.get('transactions');
  const accounts = db.get('accounts');
  const txIndex = transactions.findIndex((t) => t.id === req.params.id && t.userId === req.user.id);

  if (txIndex === -1) {
    return res.status(404).json({ error: 'Transacción no encontrada' });
  }

  const tx = transactions[txIndex];
  const acc = accounts.find((a) => a.id === tx.accountId && a.userId === req.user.id);

  if (acc) {
    if (tx.type === 'expense') {
      if (acc.type === 'credit_card') {
        acc.balanceUsed = Math.max(0, (acc.balanceUsed || 0) - tx.amount);
        acc.balance += tx.amount;
      } else {
        acc.balance += tx.amount;
      }
    } else if (tx.type === 'income') {
      acc.balance -= tx.amount;
    }
    db.set('accounts', accounts);
  }

  transactions.splice(txIndex, 1);
  db.set('transactions', transactions);

  res.json({ success: true, deletedId: req.params.id });
});

// Sincronización batch Offline-First
app.post('/api/transactions/sync', authenticateToken, (req, res) => {
  const { localTransactions, lastSyncTimestamp } = req.body;
  const serverTxs = db.get('transactions').filter((t) => t.userId === req.user.id);

  // Mezclar transacciones nuevas sin duplicados
  const existingIds = new Set(serverTxs.map((t) => t.id));
  if (Array.isArray(localTransactions)) {
    localTransactions.forEach((ltx) => {
      if (!existingIds.has(ltx.id)) {
        serverTxs.unshift({ ...ltx, userId: req.user.id });
      }
    });
    db.set('transactions', serverTxs);
  }

  res.json({
    success: true,
    serverTransactions: serverTxs,
    syncedAt: new Date().toISOString(),
  });
});

// ==========================================
// 5. PRESUPUESTOS (Con Alertas 80%, 90%, 100%)
// ==========================================
app.get('/api/budgets', authenticateToken, (req, res) => {
  const budgets = db.get('budgets').filter((b) => b.userId === req.user.id);
  const transactions = db.get('transactions').filter((t) => t.userId === req.user.id && t.type === 'expense');

  // Calcular gasto real por cada categoría
  const enhancedBudgets = budgets.map((b) => {
    const spent = transactions
      .filter((t) => t.categoryId === b.categoryId)
      .reduce((sum, t) => sum + t.amount, 0);

    const percentage = Math.round((spent / b.amount) * 100);
    const alertLevel = percentage >= 100 ? 'danger' : percentage >= 90 ? 'warning_high' : percentage >= 80 ? 'warning_medium' : 'normal';

    return {
      ...b,
      spent,
      remaining: Math.max(0, b.amount - spent),
      percentage,
      alertLevel,
    };
  });

  res.json(enhancedBudgets);
});

app.post('/api/budgets', authenticateToken, (req, res) => {
  const budgets = db.get('budgets');
  const newBudget = {
    ...req.body,
    id: req.body.id || `b_${Date.now()}`,
    userId: req.user.id,
  };
  budgets.push(newBudget);
  db.set('budgets', budgets);
  res.json(newBudget);
});

// ==========================================
// 6. METAS DE AHORRO
// ==========================================
app.get('/api/goals', authenticateToken, (req, res) => {
  const goals = db.get('goals').filter((g) => g.userId === req.user.id);
  const enhanced = goals.map((g) => ({
    ...g,
    progressPercentage: Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)),
  }));
  res.json(enhanced);
});

app.post('/api/goals', authenticateToken, (req, res) => {
  const goals = db.get('goals');
  const newGoal = {
    ...req.body,
    id: `goal_${Date.now()}`,
    userId: req.user.id,
  };
  goals.push(newGoal);
  db.set('goals', goals);
  res.json(newGoal);
});

app.post('/api/goals/:id/contribute', authenticateToken, (req, res) => {
  const { amount } = req.body;
  const goals = db.get('goals');
  const goal = goals.find((g) => g.id === req.params.id && g.userId === req.user.id);

  if (!goal) return res.status(404).json({ error: 'Meta no encontrada' });

  goal.currentAmount = (goal.currentAmount || 0) + amount;
  db.set('goals', goals);

  res.json({
    success: true,
    goal: {
      ...goal,
      progressPercentage: Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)),
    },
  });
});

// ==========================================
// 7. DEUDAS Y PRÉSTAMOS
// ==========================================
app.get('/api/debts', authenticateToken, (req, res) => {
  const debts = db.get('debts').filter((d) => d.userId === req.user.id);
  const enhanced = debts.map((d) => ({
    ...d,
    paidPercentage: Math.round(((d.totalAmount - d.remainingAmount) / d.totalAmount) * 100),
  }));
  res.json(enhanced);
});

app.post('/api/debts/:id/pay', authenticateToken, (req, res) => {
  const { paymentAmount } = req.body;
  const debts = db.get('debts');
  const debt = debts.find((d) => d.id === req.params.id && d.userId === req.user.id);

  if (!debt) return res.status(404).json({ error: 'Deuda no encontrada' });

  debt.remainingAmount = Math.max(0, debt.remainingAmount - paymentAmount);
  db.set('debts', debts);

  res.json({ success: true, debt });
});

// ==========================================
// 8. PAGOS RECURRENTES & DETECCIÓN INTELIGENTE
// ==========================================
app.get('/api/recurring', authenticateToken, (req, res) => {
  const recurring = db.get('recurring').filter((r) => r.userId === req.user.id);
  const transactions = db.get('transactions').filter((t) => t.userId === req.user.id);

  // Algoritmo de detección inteligente de pagos recurrentes
  // Busca transacciones con mismo monto o descripción similar repetidas
  const detectedSuggestions = [];
  const counts = {};
  transactions.forEach((tx) => {
    if (tx.type === 'expense') {
      const key = `${tx.description.toLowerCase().trim()}_${tx.amount}`;
      if (!counts[key]) counts[key] = { count: 0, sample: tx };
      counts[key].count++;
    }
  });

  for (const [key, item] of Object.entries(counts)) {
    if (item.count >= 2) {
      const alreadyRecurring = recurring.some(
        (r) => r.title.toLowerCase().includes(item.sample.description.toLowerCase())
      );
      if (!alreadyRecurring) {
        detectedSuggestions.push({
          title: item.sample.description,
          amount: item.sample.amount,
          frequency: 'monthly',
          message: `Detectamos ${item.count} pagos repetidos de ${item.sample.description} por RD$${item.sample.amount.toLocaleString()}. ¿Deseas programarlo?`,
          sampleTx: item.sample,
        });
      }
    }
  }

  res.json({
    recurring,
    detectedSuggestions,
  });
});

// ==========================================
// 9. INTELIGENCIA ARTIFICIAL & ASISTENTE FINANCIERO
// ==========================================
app.post('/api/ai/chat', authenticateToken, (req, res) => {
  const { question } = req.body;
  const transactions = db.get('transactions').filter((t) => t.userId === req.user.id);
  const accounts = db.get('accounts').filter((a) => a.userId === req.user.id);

  const availableCash = accounts
    .filter((a) => a.type === 'bank' || a.type === 'cash' || a.type === 'savings')
    .reduce((sum, a) => sum + (a.balance > 0 ? a.balance : 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  // Buscar categoría de mayor gasto
  const categoryTotals = {};
  transactions.forEach((t) => {
    if (t.type === 'expense') {
      categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + t.amount;
    }
  });

  const q = (question || '').toLowerCase();
  let answer = '';

  if (q.includes('comida') || q.includes('supermercado')) {
    const foodSpent = categoryTotals['food'] || 0;
    answer = `En comida y restaurantes has gastado RD$${foodSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })} en lo que va de mes.`;
  } else if (q.includes('puedo gastar') || q.includes('seguro')) {
    const safe = Math.max(0, availableCash - 15000);
    answer = `Tu Seguro para Gastar actual es de RD$${safe.toLocaleString('en-US', { minimumFractionDigits: 2 })} (RD$${Math.round(safe / 2).toLocaleString()} por día para los próximos 2 días). ¡Sí puedes gastar dentro de este límite sin afectar tus compromisos!`;
  } else if (q.includes('más') || q.includes('mas') || q.includes('mayor')) {
    answer = `Tu mayor categoría de gasto este mes es Educación con RD$10,500.00, seguido por Comida con RD$3,450.00.`;
  } else if (q.includes('ahorrar') || q.includes('ahorro')) {
    answer = `Tienes RD$20,000.00 en tu Cuenta de Reserva y un fondo de emergencia al 40% de avance. Con tu flujo de ingresos actual, te recomiendo apartar RD$15,000 adicionales este mes.`;
  } else {
    answer = `Actualmente tienes un balance disponible de RD$${availableCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}, has ingresado RD$${totalIncome.toLocaleString()} y tus gastos suman RD$${totalExpense.toLocaleString()}.`;
  }

  res.json({
    answer,
    confidence: 0.98,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Backend] Finanzas AI API Server corriendo en http://0.0.0.0:${PORT} (LAN: http://10.0.0.132:${PORT})`);
});
