export function speakText(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-GB";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function speakTextAndWait(text: string) {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);

    window.speechSynthesis.speak(utterance);
  });
}
