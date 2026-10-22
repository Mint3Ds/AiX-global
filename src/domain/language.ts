// Conservative labels for display. AI still handles meaning and quotes; this never gates analysis.
export function detectReviewLanguage(
  text: string,
): "en" | "ms" | "mixed" | "unknown" {
  const words = ` ${text.toLowerCase().replace(/[^\p{L}]+/gu, " ")} `;
  const malay = [
    " saya ",
    " boleh ",
    " kerusi ",
    " sedap ",
    " tak ",
    " agak ",
    " sampai ",
    " makan ",
    " pilihan ",
    " pun ",
    " sangat ",
    " asyik ",
    " kalau ",
    " nasi goreng ",
    " lebih ",
    " minuman ",
    " lambat ",
    " sejuk ",
    " teh ",
    " kami ",
    " dia ",
    " memang ",
  ].some((word) => words.includes(word));
  const english = [
    " the ",
    " was ",
    " were ",
    " and ",
    " with ",
    " could ",
    " our ",
    " but ",
    " this ",
    " staff ",
    " review ",
    " lunch ",
    " dinner ",
    " fried rice ",
    " noodles ",
    " dumplings ",
    " will ",
    " can ",
  ].some((word) => words.includes(word));
  return malay && english ? "mixed" : malay ? "ms" : english ? "en" : "unknown";
}
