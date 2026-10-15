export const notFoundTitle = "Game not found — SpawnKit"
export const notFoundDescription = "Discover more games powered by SpawnKit."

export const notFoundArtwork = `<svg viewBox="0 0 560 260" fill="none">
        <ellipse cx="280" cy="220" rx="220" ry="22" fill="currentColor" opacity=".035"/>
        <ellipse cx="280" cy="148" rx="236" ry="88" stroke="currentColor" opacity=".13" stroke-dasharray="4 8"/>
        <path d="M34 171h492M76 197h408M128 220h304" stroke="currentColor" opacity=".08"/>
        <g fill="currentColor" opacity=".18">
          <path transform="translate(45 0)" d="M125 58h-28l-57 91v25h61v34h28v-34h16v-26h-16V58Zm-24 90H72l29-48v48Z"/>
          <path transform="translate(-30 0)" d="M485 58h-28l-57 91v25h61v34h28v-34h16v-26h-16V58Zm-24 90h-29l29-48v48Z"/>
        </g>
        <g transform="rotate(-12 280 130)">
          <path d="M243 92h74c16 0 25 12 29 29l11 45c3 15-12 24-23 14l-20-18h-68l-20 18c-11 10-26 1-23-14l11-45c4-17 13-29 29-29Z" fill="var(--nf-pad)" stroke="var(--nf-accent)" stroke-width="2"/>
          <path d="M235 126h24m-12-12v24" stroke="var(--nf-accent)" stroke-width="7" stroke-linecap="round"/>
          <circle cx="316" cy="113" r="5" fill="var(--nf-accent)"/>
          <circle cx="301" cy="128" r="5" fill="var(--nf-accent)"/>
          <circle cx="331" cy="128" r="5" fill="var(--nf-accent)"/>
          <circle cx="316" cy="143" r="5" fill="var(--nf-accent)"/>
          <path d="M272 150h16" stroke="var(--nf-accent)" stroke-width="4" stroke-linecap="round" opacity=".45"/>
        </g>
        <path d="m386 51 5 10 10 5-10 5-5 10-5-10-10-5 10-5Z" fill="var(--nf-accent)"/>
        <path d="m180 218 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="var(--nf-accent)" opacity=".65"/>
        <circle cx="112" cy="38" r="4" stroke="currentColor" opacity=".5"/>
        <circle cx="406" cy="191" r="3" fill="currentColor" opacity=".4"/>
      </svg>`

// The game host mirrors the dashboard's Brand and shadcn Button presentation without a client runtime.
// Only fixed destinations are accepted. Never interpolate a request URL or hostname into this HTML.
export function notFoundMarkup(home: "/" | "https://spawnkit.cloud/") {
  return `<div class="spawn-not-found">
  <header class="nf-header">
    <a class="nf-brand" href="${home}" aria-label="SpawnKit home">
      <span class="nf-brand-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"/></svg></span>
      <span>SpawnKit<span class="nf-brand-dot">.</span></span>
    </a>
  </header>
  <main class="nf-main" id="main">
    <div class="nf-art" aria-hidden="true">${notFoundArtwork}</div>
    <h1>Game not found</h1>
    <p class="nf-description">${notFoundDescription}</p>
    <a class="nf-discover" href="${home}">Discover games <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a>
  </main>
</div>`
}
