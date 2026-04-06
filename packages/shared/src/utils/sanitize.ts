/**
 * Modul de sanitizare a datelor de intrare (input sanitization).
 *
 * Acest modul este folosit in intregul sistem CRM pentru a curata si valida
 * datele introduse de utilizatori sau primite din surse externe (formulare web,
 * email-uri parsate, importuri CSV etc.). Previne injectarea de cod HTML/XSS
 * si asigura ca datele respecta limitele de lungime impuse.
 */

/**
 * Functia principala de sanitizare a unui string generic.
 *
 * Algoritm:
 * 1. Verifica daca valoarea primita este de tip string. Daca nu este (numar, null,
 *    undefined, obiect etc.), returneaza un string gol — evitand astfel erori
 *    de runtime in restul aplicatiei.
 * 2. Elimina caracterele '<' si '>' pentru a preveni injectarea de tag-uri HTML/XSS.
 * 3. Aplica trim() pentru a elimina spatiile de la inceput si sfarsit.
 * 4. Truncheaza rezultatul la lungimea maxima specificata (implicit 500 de caractere).
 *
 * @param s - Valoarea de sanitizat. Accepta `unknown` pentru a fi sigura la apeluri
 *            cu date de tip necunoscut (de ex. date din JSON parsat, campuri de formular).
 * @param maxLen - Lungimea maxima permisa a string-ului rezultat. Implicit 500.
 *                 Se poate modifica in functie de context (de ex. 20 pentru telefon).
 * @returns String-ul sanitizat, gol daca input-ul nu este string.
 *
 * Cazuri limita tratate:
 * - Input non-string (numar, null, undefined, obiect) → returneaza ''
 * - String care contine tag-uri HTML → caracterele < si > sunt eliminate complet
 * - String foarte lung → este trunchiat la maxLen caractere
 * - String cu spatii la margini → spatiile sunt eliminate de trim()
 *
 * Utilizare in CRM: Aceasta functie este apelata de toate celelalte functii de sanitizare
 * (sanTel, sanEmail) si de parserul de email-uri (email-parser.ts) pentru curatarea
 * fiecarui camp extras.
 */
export function san(s: unknown, maxLen = 500): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[<>]/g, '').trim().slice(0, maxLen);
}

/**
 * Sanitizeaza un numar de telefon.
 *
 * Algoritm:
 * 1. Aplica mai intai sanitizarea generala prin san() (elimina HTML, trim, limita).
 * 2. Elimina toate caracterele care NU sunt cifre (0-9), semnul '+' (pentru prefix
 *    international, de ex. +40), spatii, cratime, puncte sau paranteze — toate fiind
 *    caractere valide intr-un numar de telefon formatat.
 * 3. Truncheaza rezultatul final la 20 de caractere — suficient pentru orice numar
 *    de telefon international (de ex. "+40 (123) 456-7890").
 *
 * @param s - String-ul brut al numarului de telefon, asa cum a fost introdus de
 *            utilizator sau extras dintr-un formular/email.
 * @returns Numarul de telefon sanitizat, continand doar caractere valide, maxim 20 caractere.
 *
 * Cazuri limita tratate:
 * - Litere sau caractere speciale in numar → sunt eliminate
 * - Numar foarte lung → este trunchiat la 20 de caractere
 * - Input care nu e string → san() returneaza '' si regex-ul nu modifica nimic
 *
 * Utilizare in CRM: Folosita la importul contactelor din email-uri (email-parser.ts)
 * si la salvarea/editarea datelor de contact ale clientilor.
 */
export function sanTel(s: string): string {
  return san(s).replace(/[^0-9+\s\-().]/g, '').slice(0, 20);
}

/**
 * Sanitizeaza o adresa de email.
 *
 * In prezent, aplica doar sanitizarea generala prin san() — elimina tag-uri HTML,
 * face trim si limiteaza lungimea la 500 de caractere.
 *
 * Nota: Nu efectueaza o validare completa a formatului email (de ex. regex RFC 5322).
 * Validarea formatului se poate adauga ulterior daca este necesar.
 *
 * @param s - String-ul brut al adresei de email.
 * @returns Adresa de email sanitizata.
 *
 * Utilizare in CRM: Folosita la parsarea email-urilor primite de la formularul web
 * si la salvarea adreselor de email ale clientilor in baza de date.
 */
export function sanEmail(s: string): string {
  return san(s);
}
