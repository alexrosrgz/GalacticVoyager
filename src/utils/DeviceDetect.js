export function isMobileDevice() {
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const hasTouchPoints = navigator.maxTouchPoints > 0;
  const smallScreen = window.innerWidth <= 1024 && window.innerHeight <= 1366;
  return coarsePointer && hasTouchPoints && smallScreen;
}
