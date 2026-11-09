/**
 * Every player-facing string. Keys are stable; lore-keeper owns the values.
 * Keep lines short: about 50 characters per line at 320x180.
 * Allowed characters: those in the Stele font (src/art/font.ts).
 */
export const STRINGS: Record<string, string> = {
  'game.title': 'Pawns of Olympus',
  'game.tagline': 'The gods are playing. You are the pieces.',

  'ui.endTurn': 'End turn',
  'ui.undo': 'Undo',
  'ui.restart': 'Restart',
  'ui.turn': 'Turn',
  'ui.par': 'par',
  'ui.kleos': 'Kleos',
  'ui.patron': 'Patron',
  'ui.trojansAct': 'Trojans act',
  'ui.continue': 'Continue',
  'ui.newCampaign': 'New campaign',
  'ui.settings': 'Settings',
  'ui.credits': 'Credits',
  'ui.retry': 'Retry',
  'ui.undoLastTurn': 'Undo last turn',
  'ui.next': 'Next',
  'ui.back': 'Back',
  'ui.skip': 'Skip',
  'ui.levelSelect': 'Level select',
  'ui.victory': 'Victory',
  'ui.defeat': 'The gods are amused.',
};

export function t(key: string, vars: Record<string, string | number> = {}): string {
  const s = STRINGS[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
