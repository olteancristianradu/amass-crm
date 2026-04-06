/**
 * Modul de utilitati pentru lucrul cu date calendaristice.
 *
 * Furnizeaza functii pentru formatarea datelor in format romanesc (ro-RO),
 * calculul diferentei in zile intre doua date si determinarea "varstei" unei date
 * (cate zile au trecut de la o anumita data pana in prezent).
 *
 * Aceste functii sunt folosite in intregul sistem CRM pentru:
 * - Afisarea datelor in interfata utilizatorului (format romanesc)
 * - Calculul scorului clientului in functie de cat de recent a fost actualizat (scoring.ts)
 * - Determinarea actiunilor urgente (clienti necontactati de mai mult de 7/14/30 zile)
 * - Afisarea datelor de contact programate (nextContact)
 */

/**
 * Formateaza o data ISO 8601 intr-un format citibil in limba romana.
 *
 * Algoritm:
 * 1. Verifica daca parametrul primit este valid (non-null, non-undefined, non-empty).
 *    Daca nu este valid, returneaza cratima lunga '—' ca placeholder vizual.
 * 2. Parseaza string-ul ISO intr-un obiect Date si il formateaza folosind
 *    toLocaleDateString cu locale-ul 'ro-RO'.
 * 3. Formatul rezultat: "zi luna_prescurtat an" (de ex. "22 mar. 2026").
 * 4. Daca parsarea esueaza (string invalid), prinde exceptia si returneaza '—'.
 *
 * @param iso - String-ul datei in format ISO 8601 (de ex. "2026-03-22T10:30:00Z"),
 *              sau null/undefined daca data nu este disponibila.
 * @returns Data formatata in limba romana (de ex. "22 mar. 2026") sau '—' daca
 *          datele de intrare sunt invalide sau absente.
 *
 * Cazuri limita tratate:
 * - Parametru null sau undefined → returneaza '—'
 * - String gol → returneaza '—' (evaluat ca falsy)
 * - String ISO invalid (de ex. "abc") → try/catch returneaza '—'
 *
 * Utilizare in CRM: Folosita in componentele de UI pentru afisarea datelor
 * de creare, actualizare si programare a contactului urmator.
 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  try {
    return new Date(iso).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '\u2014';
  }
}

/**
 * Calculeaza numarul de zile intregi intre doua date.
 *
 * Algoritm:
 * 1. Parseaza ambele string-uri ISO in obiecte Date.
 * 2. Verifica daca ambele date sunt valide (nu sunt NaN). Daca oricare este invalida,
 *    returneaza 0 pentru a evita propagarea de valori NaN in calcule.
 * 3. Calculeaza diferenta in milisecunde intre cele doua date (b - a).
 * 4. Converteste milisecundele in zile prin impartire la (1000 * 60 * 60 * 24)
 *    si aplica Math.floor pentru a obtine un numar intreg de zile.
 *
 * Nota: Rezultatul poate fi negativ daca d1 este dupa d2 (d1 > d2), ceea ce
 * indica faptul ca prima data este in viitor fata de a doua.
 *
 * @param d1 - Prima data in format ISO 8601 (data de start).
 * @param d2 - A doua data in format ISO 8601 (data de sfarsit).
 * @returns Numarul de zile intregi intre cele doua date (pozitiv daca d2 > d1,
 *          negativ daca d2 < d1, sau 0 daca vreo data este invalida).
 *
 * Cazuri limita tratate:
 * - Una sau ambele date invalide → returneaza 0
 * - Date identice → returneaza 0
 * - d1 dupa d2 → returneaza valoare negativa
 *
 * Utilizare in CRM: Functie de baza folosita de daysSince() si indirect de
 * calcScore() din scoring.ts pentru a determina "prospetimea" datelor clientului.
 */
export function daysBetween(d1: string, d2: string): number {
  const a = new Date(d1);
  const b = new Date(d2);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculeaza numarul de zile trecute de la o data specificata pana in momentul prezent.
 *
 * Algoritm:
 * 1. Verifica daca parametrul iso este prezent (non-null, non-undefined, non-empty).
 *    Daca nu, returneaza 0 (nu s-au scurs zile — nu avem o data de referinta).
 * 2. Parseaza string-ul ISO intr-un obiect Date si verifica validitatea.
 *    Daca data este invalida (NaN), returneaza 0.
 * 3. Apeleaza daysBetween cu data primita si data curenta (new Date().toISOString())
 *    pentru a calcula diferenta in zile.
 *
 * @param iso - Data de referinta in format ISO 8601, sau null/undefined.
 * @returns Numarul de zile trecute de la data specificata pana acum.
 *          Returneaza 0 daca input-ul este invalid sau absent.
 *          Valoarea este pozitiva pentru date in trecut, negativa pentru date in viitor.
 *
 * Cazuri limita tratate:
 * - Parametru null sau undefined → returneaza 0
 * - String gol → returneaza 0 (evaluat ca falsy)
 * - Data invalida → returneaza 0
 * - Data in viitor → returneaza valoare negativa
 *
 * Utilizare in CRM: Folosita de scoring.ts (calcScore) pentru a penaliza scorul
 * clientilor care nu au fost actualizati de mult timp (>14 zile, >30 zile) si de
 * getNextAction() pentru a identifica clientii care trebuie contactati urgent.
 */
export function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  return daysBetween(iso, new Date().toISOString());
}
