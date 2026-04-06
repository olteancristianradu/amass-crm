/**
 * Fisier de design tokens (variabile de stil) pentru intreaga aplicatie.
 *
 * Rolul acestui fisier:
 * - Centralizeaza toate culorile, fonturile si valorile de design intr-un singur loc
 * - Permite consistenta vizuala in toata aplicatia
 * - Foloseste variabile CSS (var(--...)) pentru a suporta tema light/dark
 *
 * Cum se modifica:
 * - Pentru a adauga o culoare noua de brand, adauga o proprietate in obiectul BRAND
 * - Pentru a adauga un token de tema (care se schimba intre light/dark), adauga o variabila CSS
 *   in globals.css si referentiaza-o cu var(--...) in obiectul T
 * - Fonturile se schimba modificand constantele F si FM
 */

/**
 * BRAND - Culorile fixe ale brandului, care NU se schimba intre tema light si dark.
 * Acestea sunt culori absolute folosite pentru accente, statusuri, badge-uri etc.
 *
 * red / redDk  - Rosu principal si varianta mai inchisa (erori, pericol, stergere)
 * green        - Verde (succes, scor bun, stare pozitiva)
 * yellow       - Galben/portocaliu (avertismente, scor mediu)
 * blue         - Albastru (informatii, link-uri)
 * purple       - Mov (accent secundar, statistici)
 * orange       - Portocaliu (accent alternativ)
 */
export const BRAND = {
  red: '#C8102E',
  redDk: '#9B0D23',
  green: '#059669',
  yellow: '#D97706',
  blue: '#2563EB',
  purple: '#7C3AED',
  orange: '#EA580C',
} as const;

/**
 * T - Tokens-ul principal de design, combina culorile de brand cu variabilele CSS tematice.
 *
 * Variabilele CSS (var(--...)) sunt definite in globals.css si se schimba automat
 * cand utilizatorul comuta intre tema light si dark.
 *
 * bg          - Culoarea de fundal a paginii
 * surface     - Fundalul cardurilor si componentelor principale
 * surface2    - Fundalul inputurilor si elementelor secundare
 * surface3    - Fundalul elementelor de nivel 3 (bare de progres etc.)
 * border      - Culoarea bordurii principale
 * border2     - Culoarea bordurii secundare (mai subtila)
 * text        - Culoarea textului principal
 * text2       - Culoarea textului secundar (subtitluri, descrieri)
 * text3       - Culoarea textului tertiar (placeholder, informatii minore)
 * redLt...purpleLt - Versiuni deschise ale culorilor (folosite ca fundal pentru badge-uri)
 * shadow/shadowSm  - Umbre pentru carduri si elemente float
 * accent      - Culoarea de accent principala (buton principal, selectii active)
 * accentDk    - Varianta mai inchisa a accentului
 * accentLt    - Varianta mai deschisa/transparenta a accentului (fundal selectii)
 * accentGlow  - Efect de glow/stralucire pentru accent (hover, focus)
 */
export const T = {
  ...BRAND,
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  surface2: 'var(--surface2)',
  surface3: 'var(--surface3)',
  border: 'var(--border)',
  border2: 'var(--border2)',
  text: 'var(--text)',
  text2: 'var(--text2)',
  text3: 'var(--text3)',
  redLt: 'var(--red-lt)',
  greenLt: 'var(--green-lt)',
  yellowLt: 'var(--yellow-lt)',
  blueLt: 'var(--blue-lt)',
  purpleLt: 'var(--purple-lt)',
  shadow: 'var(--shadow-md)',
  shadowSm: 'var(--shadow-sm)',
  accent: 'var(--accent)',
  accentDk: 'var(--accent-dk)',
  accentLt: 'var(--accent-lt)',
  accentGlow: 'var(--accent-glow)',
} as const;

/**
 * F - Fontul principal al aplicatiei (Outfit, sans-serif).
 * Folosit pentru toate textele din interfata.
 */
export const F = "'Outfit',sans-serif";

/**
 * FM - Fontul monospace (JetBrains Mono).
 * Folosit pentru cod, numere, date si alte valori tehnice.
 */
export const FM = "'JetBrains Mono',monospace";
