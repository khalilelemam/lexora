export type VoiceLocale = "en-US" | "en-GB" | "ar-SA" | "ar-EG";

const VOICE_LIST_TIMEOUT_MS = 1500;
const SPEECH_END_TIMEOUT_MS = 14000;

function getSpeechSynthesisInstance() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  return window.speechSynthesis;
}

function normalizeLanguageTag(languageTag?: string) {
  return (languageTag ?? "").toLowerCase();
}

function getLocaleCandidates(locale: VoiceLocale) {
  switch (locale) {
    case "ar-EG":
      return ["ar-eg", "ar-sa", "ar"];
    case "ar-SA":
      return ["ar-sa", "ar-eg", "ar"];
    case "en-GB":
      return ["en-gb", "en-us", "en"];
    case "en-US":
      return ["en-us", "en-gb", "en"];
  }
}

function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  locale: VoiceLocale,
): SpeechSynthesisVoice | undefined {
  const requestedCandidates = getLocaleCandidates(locale);

  for (const candidate of requestedCandidates) {
    const exactVoice = voices.find(
      (voice) => normalizeLanguageTag(voice.lang) === candidate,
    );
    if (exactVoice) {
      return exactVoice;
    }
  }

  for (const candidate of requestedCandidates) {
    const sameBaseVoice = voices.find((voice) => {
      const lang = normalizeLanguageTag(voice.lang);
      return lang === candidate || lang.startsWith(`${candidate}-`);
    });
    if (sameBaseVoice) {
      return sameBaseVoice;
    }
  }

  if (locale.startsWith("ar")) {
    const arabicVoice = voices.find((voice) =>
      normalizeLanguageTag(voice.lang).startsWith("ar"),
    );

    if (arabicVoice) {
      return arabicVoice;
    }
  }

  const defaultVoice = voices.find((voice) => voice.default);
  return defaultVoice ?? voices[0];
}

function loadVoices(speechSynthesis: SpeechSynthesis) {
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    return Promise.resolve(voices);
  }

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let settled = false;

    const complete = () => {
      if (settled) {
        return;
      }

      settled = true;
      speechSynthesis.removeEventListener("voiceschanged", complete);
      resolve(speechSynthesis.getVoices());
    };

    speechSynthesis.addEventListener("voiceschanged", complete);
    window.setTimeout(complete, VOICE_LIST_TIMEOUT_MS);
  });
}

async function createUtterance(text: string, locale: VoiceLocale) {
  const speechSynthesis = getSpeechSynthesisInstance();
  if (!speechSynthesis || !text.trim()) {
    return null;
  }

  const voices = await loadVoices(speechSynthesis);
  const utterance = new SpeechSynthesisUtterance(text);
  const selectedVoice = pickBestVoice(voices, locale);

  utterance.lang = selectedVoice?.lang ?? locale;
  utterance.voice = selectedVoice ?? null;
  utterance.rate = 0.95;
  utterance.pitch = 1;

  return {
    utterance,
    speechSynthesis,
  };
}

function speakConfiguredUtterance(
  speechSynthesis: SpeechSynthesis,
  utterance: SpeechSynthesisUtterance,
) {
  speechSynthesis.cancel();
  speechSynthesis.resume();
  speechSynthesis.speak(utterance);
}

export function speakText(text: string, locale: VoiceLocale = "en-GB") {
  if (!getSpeechSynthesisInstance() || !text.trim()) {
    return false;
  }

  void createUtterance(text, locale).then((configured) => {
    if (!configured) {
      return;
    }

    speakConfiguredUtterance(configured.speechSynthesis, configured.utterance);
  });

  return true;
}

export async function unlockSpeechSynthesis(
  locale: VoiceLocale = "en-US",
): Promise<boolean> {
  const configured = await createUtterance(".", locale);
  if (!configured) {
    return false;
  }

  configured.utterance.volume = 0;

  return new Promise<boolean>((resolve) => {
    let settled = false;

    const complete = (didUnlock: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(didUnlock);
    };

    configured.utterance.onend = () => complete(true);
    configured.utterance.onerror = () => complete(false);

    speakConfiguredUtterance(configured.speechSynthesis, configured.utterance);

    window.setTimeout(() => complete(true), 350);
  });
}

export async function speakTextAndWait(
  text: string,
  locale: VoiceLocale = "en-US",
) {
  const configured = await createUtterance(text, locale);
  if (!configured) {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    let settled = false;

    const complete = (didSpeak: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(didSpeak);
    };

    configured.utterance.onend = () => complete(true);
    configured.utterance.onerror = () => complete(false);

    speakConfiguredUtterance(configured.speechSynthesis, configured.utterance);

    window.setTimeout(() => complete(false), SPEECH_END_TIMEOUT_MS);
  });
}
