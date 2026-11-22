/**
 * Valgfri dansk oplæsning (progressiv forbedring). Hvis browseren ikke har en dansk stemme,
 * er funktionen blot ikke tilgængelig – spillet virker uændret.
 * VIGTIGT: Det hemmelige ord må kun sendes hertil, når runden er afsluttet.
 */
let cachedVoice: SpeechSynthesisVoice | null | undefined;

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

export function danishVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  if (cachedVoice) return cachedVoice;
  const voices = s.getVoices();
  cachedVoice = voices.find((v) => v.lang?.toLowerCase().startsWith('da')) ?? null;
  return cachedVoice;
}

export function isSpeechAvailable(): boolean {
  return danishVoice() !== null;
}

/** Lytter efter at stemmer indlæses (Chrome indlæser dem asynkront). */
export function onVoicesChanged(cb: () => void): () => void {
  const s = synth();
  if (!s) return () => undefined;
  const handler = () => {
    cachedVoice = undefined;
    cb();
  };
  s.addEventListener?.('voiceschanged', handler);
  return () => s.removeEventListener?.('voiceschanged', handler);
}

export function speak(text: string): void {
  const s = synth();
  const voice = danishVoice();
  if (!s || !voice) return;
  try {
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.92;
    u.pitch = 1.05;
    s.speak(u);
  } catch {
    /* oplæsning er valgfri */
  }
}

export function stopSpeaking(): void {
  try {
    synth()?.cancel();
  } catch {
    /* ignorer */
  }
}
