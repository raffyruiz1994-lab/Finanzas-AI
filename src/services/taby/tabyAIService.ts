import * as FileSystem from 'expo-file-system/legacy';
import { getActiveAIKey, TABY_CONFIG } from '@/config/tabyConfig';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUIStore } from '@/store/useUIStore';
import { tabySoundService } from './tabySoundService';

export interface ProcessExpenseResult {
  success: boolean;
  intent?: 'expense' | 'income' | 'companion' | 'not_supported' | 'unknown';
  emotion?: 'celebrate' | 'happy' | 'love' | 'no' | 'disappointed' | 'wow' | 'talking';
  amount?: number;
  category?: string;
  description?: string;
  reply: string;
  speechText?: string;
  error?: string;
}

export class TabyAIService {
  /**
   * Procesa el audio grabado del usuario para transcribir y registrar el gasto
   */
  async processAudio(audioUri: string): Promise<ProcessExpenseResult> {
    if (!audioUri) {
      return {
        success: false,
        reply: 'No se detectó audio. Mantén presionado el botón para hablar.',
        speechText: 'No se detectó audio. Mantén presionado el botón para hablar.',
        emotion: 'disappointed',
      };
    }

    const aiConfig = getActiveAIKey();

    try {
      if (aiConfig.provider === 'gemini') {
        return await this.processWithGeminiAudio(audioUri, aiConfig.key);
      }

      if (aiConfig.provider === 'openai') {
        return await this.processWithOpenAIWhisper(audioUri, aiConfig.key);
      }

      return {
        success: false,
        reply: 'No hay una clave de API configurada para Gemini.',
        speechText: 'No hay una clave de API configurada.',
        emotion: 'disappointed',
      };
    } catch (err: any) {
      console.warn('[TabyAIService] Error procesando con API de IA:', err);
      return {
        success: false,
        reply: 'No logré entender el audio o hubo un problema de conexión. Intenta de nuevo.',
        speechText: 'No logré entender el audio. Intenta de nuevo.',
        emotion: 'disappointed',
      };
    }
  }

  /**
   * Procesa directamente con Gemini Flash enviando el audio en base64
   */
  private async processWithGeminiAudio(audioUri: string, apiKey: string): Promise<ProcessExpenseResult> {
    let uriToRead = audioUri;
    if (!uriToRead.startsWith('file://') && !uriToRead.startsWith('content://')) {
      uriToRead = 'file://' + uriToRead;
    }

    let fileInfo = await FileSystem.getInfoAsync(uriToRead).catch(() => null);
    if ((!fileInfo || !fileInfo.exists) && uriToRead.includes('/private/var/')) {
      const altUri = uriToRead.replace('/private/var/', '/var/');
      const altInfo = await FileSystem.getInfoAsync(altUri).catch(() => null);
      if (altInfo?.exists) {
        uriToRead = altUri;
        fileInfo = altInfo;
      }
    } else if ((!fileInfo || !fileInfo.exists) && uriToRead.includes('file:///var/')) {
      const altUri = uriToRead.replace('file:///var/', 'file:///private/var/');
      const altInfo = await FileSystem.getInfoAsync(altUri).catch(() => null);
      if (altInfo?.exists) {
        uriToRead = altUri;
        fileInfo = altInfo;
      }
    }

    console.log('[TabyAIService] Audio URI:', uriToRead, 'FileInfo:', JSON.stringify(fileInfo));

    let base64Audio = '';
    try {
      base64Audio = await FileSystem.readAsStringAsync(uriToRead, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (readErr) {
      console.warn('[TabyAIService] Initial read warning:', readErr);
    }

    if (!base64Audio || base64Audio.length === 0) {
      const candidates = [
        uriToRead.startsWith('file://') ? uriToRead.slice(7) : 'file://' + uriToRead,
        uriToRead.includes('/var/') && !uriToRead.includes('/private/var/') ? uriToRead.replace('/var/', '/private/var/') : null,
        uriToRead.includes('/private/var/') ? uriToRead.replace('/private/var/', '/var/') : null,
      ].filter(Boolean) as string[];

      for (const cand of candidates) {
        try {
          const content = await FileSystem.readAsStringAsync(cand, {
            encoding: FileSystem.EncodingType.Base64,
          });
          if (content && content.length > 50) {
            base64Audio = content;
            console.log('[TabyAIService] Successfully read base64 from candidate:', cand, 'length:', content.length);
            break;
          }
        } catch (_) {}
      }
    }
    console.log('[TabyAIService] Final base64 audio length:', base64Audio?.length || 0);

    if (!base64Audio || base64Audio.length < 50) {
      return {
        success: false,
        intent: 'unknown',
        emotion: 'disappointed',
        reply: 'No logré escucharte bien. Mantén presionado el micrófono mientras hablas.',
        speechText: 'No logré escucharte bien. Mantén presionado el micrófono mientras hablas.',
      };
    }

    let mimeType = 'audio/mp4';
    const lowerUri = uriToRead.toLowerCase();
    if (lowerUri.endsWith('.m4a') || lowerUri.endsWith('.mp4')) mimeType = 'audio/mp4';
    else if (lowerUri.endsWith('.3gp')) mimeType = 'audio/3gpp';
    else if (lowerUri.endsWith('.aac')) mimeType = 'audio/aac';
    else if (lowerUri.endsWith('.wav')) mimeType = 'audio/wav';
    else if (lowerUri.endsWith('.webm')) mimeType = 'audio/webm';

    const prompt = `Eres Taby, el entrañable, carismático y dinámico asistente virtual inteligente de finanzas personales.
Tu objetivo es escuchar con atención este audio del usuario en español, comprender su significado y responder como en la app oficial de Taby.

Tus capacidades:
1. GESTIÓN FINANCIERA: Registrar gastos o ingresos cuando el usuario dice montos y compras/pagos (ej: "gasté 400 en sushi", "pagué 1200 de luz", "gané 5000").
2. COMPAÑERO CARISMÁTICO: Responder con empatía, cariño y alegría si charlan contigo, te saludan, o te piden algo lindo (ej: "dime algo lindo", "hola Taby", "cómo estás?", "un consejo para ahorrar").
3. LÍMITES AMABLES: Si pide algo fuera de tus capacidades de finanzas (ej: "puedes crearme una carpeta en mi pc?", "abre whatsapp", "hackea facebook", "llama a mi mamá"), responde educada y amablemente explicando que eres un asistente de finanzas personales y que tus funciones se enfocan en sus gastos, presupuestos y ahorros.

CATEGORÍAS DE GASTO:
"Comida", "Transporte", "Servicios", "Salud", "Educación", "Entretenimiento", "Compras", "Hogar", "Otros".

REGLAS DE EMOCIONES PARA LA ANIMACIÓN VISUAL DE TABY:
- "celebrate" o "happy": Para registro exitoso de gastos/ingresos, celebraciones y logros.
- "love": Para frases cariñosas, afectuosas ("dime algo lindo", "te quiero", "eres el mejor").
- "no": Cuando el usuario pide algo que NO puedes hacer en su dispositivo ("crear una carpeta", abrir apps, etc.). Taby moverá la cabeza y levantará el dedo índice diciendo no.
- "disappointed": Si no se escuchó nada o hubo solo ruido.
- "wow": Para sorpresas o gastos inusualmente grandes.
- "talking": Para consejos, explicaciones financieras o saludos.

FORMATO DE RESPUESTA EXCLUSIVO (JSON):
Si es un GASTO o INGRESO con monto numérico:
{
  "intent": "expense" o "income",
  "understood": true,
  "amount": número exacto,
  "category": categoría adecuada,
  "description": detalle breve,
  "emotion": "celebrate",
  "reply": "¡Listo! Anoté RD$400 en Comida (Sushi). 🍣",
  "speechText": "Listo. Anoté cuatrocientos pesos en Comida."
}

Si es CONVERSACIÓN / ALGO LINDO / SALUDO / CONSEJO:
{
  "intent": "companion",
  "understood": true,
  "emotion": "love" (o "talking" o "happy"),
  "reply": "Espero que tengas un día lleno de cosas buenas. ✨",
  "speechText": "Espero que tengas un día lleno de cosas buenas."
}

Si pide algo fuera de tus funciones (ej: carpetas en PC, abrir apps):
{
  "intent": "not_supported",
  "understood": true,
  "emotion": "no",
  "reply": "No puedo crear carpetas en tu PC. Soy tu asistente de finanzas y mis capacidades se limitan a gestionar tus gastos y presupuestos.",
  "speechText": "No puedo crear carpetas en tu PC. Soy tu asistente de finanzas y mis capacidades se limitan a gestionar tus gastos y presupuestos."
}

Si solo hay SILENCIO o RUIDO sin voz clara:
{
  "intent": "unknown",
  "understood": false,
  "emotion": "disappointed",
  "reply": "No logré escucharte bien. Mantén presionado el micrófono y habla claramente.",
  "speechText": "No logré escucharte bien. Mantén presionado el micrófono y habla claramente."
}

Responde ÚNICAMENTE con el objeto JSON sin formato markdown.`;

    const modelsToTry = [
      TABY_CONFIG.GEMINI_MODEL,
      TABY_CONFIG.GEMINI_BACKUP_MODEL,
      TABY_CONFIG.GEMINI_FALLBACK_MODEL,
    ];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Audio,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = new Error(`Gemini error (${model}): ${response.status} - ${errText}`);
          continue;
        }

        const data = await response.json();
        const parts = data?.candidates?.[0]?.content?.parts;
        let rawContent = '{}';
        if (Array.isArray(parts)) {
          for (const p of parts) {
            if (p.text && !p.thought) {
              rawContent = p.text;
              break;
            }
          }
          if (rawContent === '{}' && parts[0]?.text) {
            rawContent = parts[0].text;
          }
        }
        rawContent = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(rawContent);

        // 1. Si es GASTO o INGRESO con monto real
        if ((parsed.intent === 'expense' || parsed.intent === 'income') && parsed.amount && Number(parsed.amount) > 0) {
          return this.commitTransaction({
            amount: Number(parsed.amount),
            type: parsed.intent === 'income' ? 'income' : 'expense',
            category: parsed.category || 'Comida',
            description: parsed.description || 'Gasto registrado',
            reply: parsed.reply || `¡Listo! Anoté RD$${parsed.amount} en ${parsed.category}. 🎉`,
            speechText: parsed.speechText || `Listo. Anoté ${parsed.amount} pesos en ${parsed.category}.`,
            emotion: parsed.emotion === 'happy' ? 'happy' : 'celebrate',
          });
        }

        // 2. Si es CHARLA DE COMPAÑERO ("dime algo lindo", "hola", consejo)
        if (parsed.intent === 'companion') {
          return {
            success: true,
            intent: 'companion',
            emotion: parsed.emotion || 'love',
            reply: parsed.reply || 'Espero que tengas un día lleno de cosas buenas. ✨',
            speechText: parsed.speechText || parsed.reply || 'Espero que tengas un día lleno de cosas buenas.',
          };
        }

        // 3. Si pide algo fuera de alcance ("crear una carpeta en mi PC", etc.)
        if (parsed.intent === 'not_supported') {
          return {
            success: true,
            intent: 'not_supported',
            emotion: 'no',
            reply: parsed.reply || 'No puedo crear carpetas en tu PC. Soy tu asistente de finanzas y mis capacidades se limitan a gestionar tus gastos y presupuestos.',
            speechText: parsed.speechText || parsed.reply || 'No puedo crear carpetas en tu PC. Soy tu asistente de finanzas y mis capacidades se limitan a gestionar tus gastos y presupuestos.',
          };
        }

        // 4. Si fue silencio o ininteligible
        return {
          success: false,
          intent: 'unknown',
          emotion: 'disappointed',
          reply: parsed.reply || 'No logré escucharte bien. Mantén presionado el micrófono y dime tu gasto claramente.',
          speechText: parsed.speechText || 'No logré escucharte bien. Mantén presionado el micrófono y dime tu gasto claramente.',
        };
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('No se pudo procesar el audio con Gemini');
  }

  /**
   * Procesa con OpenAI Whisper transcribiendo y luego estructurando
   */
  private async processWithOpenAIWhisper(audioUri: string, apiKey: string): Promise<ProcessExpenseResult> {
    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'voice_expense.m4a',
    } as any);
    formData.append('model', 'whisper-1');
    formData.append('language', 'es');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      throw new Error(`Whisper API error: ${whisperRes.status} - ${errText}`);
    }

    const whisperData = await whisperRes.json();
    const transcribedText = (whisperData.text || '').trim();

    if (!transcribedText || transcribedText.length < 3) {
      return {
        success: false,
        reply: 'No logré escucharte bien. Mantén presionado y habla claro.',
      };
    }

    // Usar Gemini para interpretar el texto transcrito con precisión
    const aiConfig = getActiveAIKey();
    if (aiConfig.provider === 'gemini') {
      const textPrompt = `Analiza esta frase dicha por el usuario: "${transcribedText}".
Si no contiene un gasto ni monto numérico, devuelve {"understood": false, "reply": "No escuché un monto en lo que dijiste."}.
Si contiene un gasto o ingreso, devuelve {"understood": true, "type": "expense" o "income", "amount": número, "category": string, "description": string, "reply": string}.
Devuelve únicamente JSON.`;

      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${TABY_CONFIG.GEMINI_MODEL}:generateContent?key=${aiConfig.key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: textPrompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (gRes.ok) {
        const gData = await gRes.json();
        const parsed = JSON.parse(gData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
        if (!parsed.understood || !parsed.amount) {
          return {
            success: false,
            reply: parsed.reply || 'No entendí el monto en lo que dijiste.',
          };
        }
        return this.commitTransaction({
          amount: Number(parsed.amount),
          type: parsed.type === 'income' ? 'income' : 'expense',
          category: parsed.category,
          description: parsed.description || transcribedText,
          reply: parsed.reply,
        });
      }
    }

    return {
      success: false,
      reply: 'No se pudo interpretar el gasto.',
    };
  }

  /**
   * Guarda de forma real la transacción en useFinanceStore y dispara feedback
   */
  private commitTransaction(params: {
    amount: number;
    type: 'expense' | 'income';
    category: string;
    categoryId?: string;
    description: string;
    reply: string;
    speechText?: string;
    emotion?: 'celebrate' | 'happy';
  }): ProcessExpenseResult {
    const store = useFinanceStore.getState();

    // Mapeo seguro a una categoría del sistema
    let categoryId = params.categoryId;
    if (!categoryId) {
      const catLower = params.category.toLowerCase();
      if (catLower.includes('comid') || catLower.includes('super') || catLower.includes('rest') || catLower.includes('almuer') || catLower.includes('cena')) categoryId = 'food';
      else if (catLower.includes('trans') || catLower.includes('uber') || catLower.includes('gas') || catLower.includes('pasaje')) categoryId = 'transport';
      else if (catLower.includes('serv') || catLower.includes('luz') || catLower.includes('agua') || catLower.includes('hogar')) categoryId = 'home';
      else if (catLower.includes('salud') || catLower.includes('farm') || catLower.includes('med')) categoryId = 'health';
      else if (catLower.includes('comp') || catLower.includes('tiend') || catLower.includes('ropa')) categoryId = 'shopping';
      else categoryId = params.type === 'income' ? 'other_income' : 'other_expense';
    }

    const today = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toTimeString().slice(0, 5);

    // Registro real en la base de datos Zustand
    const newTx = store.addTransaction({
      type: params.type,
      amount: params.amount,
      currency: 'DOP',
      categoryId: categoryId,
      description: params.description,
      date: today,
      time: timeNow,
    });

    // Disparar efecto visual de balance y toast
    useUIStore.getState().triggerRegisteredTxEffect({
      id: newTx.id,
      type: newTx.type === 'income' ? 'income' : 'expense',
      amount: newTx.amount,
      currency: 'DOP',
      description: newTx.description,
    });

    // Reproducir sonido de campanita de Taby
    tabySoundService.play('chime');

    return {
      success: true,
      intent: params.type,
      emotion: params.emotion || 'celebrate',
      amount: params.amount,
      category: params.category,
      description: params.description,
      reply: params.reply,
      speechText: params.speechText || params.reply,
    };
  }
}

export const tabyAIService = new TabyAIService();

