export type SpriteId =
  | "i-heart"
  | "i-boot"
  | "i-sword"
  | "i-target"
  | "i-flag"
  | "i-brain"
  | "i-shield"
  | "i-check"
  | "i-warn"
  | "i-user"
  | "i-users"
  | "i-sparkle"
  | "i-star-list";

export function sprite(id: SpriteId, className = ""): string {
  const cls = className ? ` class="${className}"` : "";
  return `<svg${cls} aria-hidden="true"><use href="#${id}"/></svg>`;
}

export const SPRITE_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<defs>
<symbol id="i-heart" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 21s-7.5-4.7-10-9.3C.4 8.1 2.3 4 6.2 4c2.1 0 3.7 1.2 4.8 3 1.1-1.8 2.7-3 4.8-3 3.9 0 5.8 4.1 4.2 7.7C19.5 16.3 12 21 12 21z"/></symbol>
<symbol id="i-boot" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M8 3v6l-5 4.5C2 15 2 17 2 18v2h20l-1-4-6-2V3H8z"/></symbol>
<symbol id="i-sword" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M14.5 3.5L21 10l-2 2-1.5-1.5L7 21l-4-4 10.5-10.5L12 5l2.5-2.5z"/></symbol>
<symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1" fill="currentColor"/></symbol>
<symbol id="i-flag" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 21V4c4 0 5-2 9-2s5 2 9 2v10c-4 0-5-2-9-2s-5 2-9 2"/></symbol>
<symbol id="i-brain" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 3a3 3 0 00-3 3 3 3 0 00-2 5 3 3 0 002 5 3 3 0 003 3M15 3a3 3 0 013 3 3 3 0 012 5 3 3 0 01-2 5 3 3 0 01-3 3M9 3v16M15 3v16"/></symbol>
<symbol id="i-shield" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M4 12l6 6L20 6"/></symbol>
<symbol id="i-warn" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3l10 18H2L12 3zm0 7v4m0 3h.01"/></symbol>
<symbol id="i-user" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 12a5 5 0 100-10 5 5 0 000 10zM3 21c1.5-5 6-7 9-7s7.5 2 9 7"/></symbol>
<symbol id="i-users" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M13 3.1a4 4 0 010 7.8M21 20v-1a4 4 0 00-3-3.9M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"/></symbol>
<symbol id="i-sparkle" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 2l1.8 5.5L19 9l-5.2 1.5L12 16l-1.8-5.5L5 9l5.2-1.5L12 2z"/></symbol>
<symbol id="i-star-list" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h10"/></symbol>
</defs>
</svg>`;
