/**
 * Integer-only upscaling. The canvas always renders at 320x180 internal pixels.
 * We pick the largest whole multiple that fits the window in *device* pixels, so
 * every game pixel is an exact block of screen pixels even at 125%/150% Windows
 * scaling or on high-DPI phones. The page background letterboxes the rest.
 */
export const GAME_W = 320;
export const GAME_H = 180;

export function computeScale(viewW: number, viewH: number, dpr: number): { factor: number; cssW: number; cssH: number } {
  const devW = Math.floor(viewW * dpr);
  const devH = Math.floor(viewH * dpr);
  const factor = Math.max(1, Math.floor(Math.min(devW / GAME_W, devH / GAME_H)));
  return { factor, cssW: (GAME_W * factor) / dpr, cssH: (GAME_H * factor) / dpr };
}

export function attachIntegerScaler(canvas: HTMLCanvasElement, onChange?: (factor: number) => void): () => void {
  const apply = (): void => {
    const vv = window.visualViewport;
    const cs = getComputedStyle(document.body);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) || 0;
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) || 0;
    const vw = (vv?.width ?? window.innerWidth) - padX, vh = (vv?.height ?? window.innerHeight) - padY;
    const { factor, cssW, cssH } = computeScale(vw, vh, window.devicePixelRatio || 1);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    onChange?.(factor);
  };
  apply();
  window.addEventListener('resize', apply);
  window.visualViewport?.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
  const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  mq.addEventListener?.('change', apply);
  return () => window.removeEventListener('resize', apply);
}
