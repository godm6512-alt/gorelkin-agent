/**
 * Voice Helper — интерактивная подсказка при первом голосовом без распознавалки
 *
 * Когда ученик впервые шлёт голосовое и ни Deepgram, ни Whisper не подключены —
 * вместо сухого «Не удалось распознать» показываем меню с кнопками:
 *   ➕ Deepgram (рекомендуем) — ведёт в /settings пресет (5 минут, $200 кредитов)
 *   ➕ OpenAI Whisper — если уже есть ключ OpenAI
 *
 * Кнопка Deepgram использует существующий callback `env_quick_DEEPGRAM_API_KEY`
 * из secrets-menu.js — UX полностью переиспользуется (инструкция + удаление сообщения).
 */

import { InlineKeyboard } from "grammy";
import { execSync } from "node:child_process";

// Проверка — есть ли локальный whisper в PATH
export function hasWhisperInstalled() {
  try {
    execSync("which whisper", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Проверка — настроена ли хоть одна распознавалка
export function hasAnyTranscriber() {
  return !!process.env.DEEPGRAM_API_KEY || !!process.env.OPENAI_API_KEY || hasWhisperInstalled();
}

// Клавиатура с кнопками для первого голосового без ключа
export function voiceFallbackKeyboard() {
  return new InlineKeyboard()
    .text("➕ Deepgram (лучшее качество)", "env_quick_DEEPGRAM_API_KEY").row()
    .text("➕ OpenAI Whisper (если есть ключ)", "env_quick_OPENAI_API_KEY");
}

// Текст-приглашение к выбору
export const VOICE_FALLBACK_PROMPT =
  "🎤 Услышал голосовое, но распознавание ещё не настроено.\n\n" +
  "Выбери один из вариантов:\n\n" +
  "<b>Deepgram</b> — облачное распознавание, точное и быстрое. " +
  "$200 кредитов без карты при регистрации (~770 часов на русском).\n\n" +
  "<b>OpenAI Whisper</b> — если уже есть ключ OpenAI, голосовые заработают сразу.";

export function registerVoiceHelpers(bot, isOwner) {
  // Кнопки Deepgram/OpenAI обрабатываются через env_quick_* в secrets-menu.js —
  // отдельных callback-хендлеров здесь не требуется.
}
