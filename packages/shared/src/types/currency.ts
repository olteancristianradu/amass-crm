/**
 * ============================================================================
 * CURRENCY.TS — Tipuri si utilitare pentru suportul multi-valuta
 * ============================================================================
 *
 * Defineste tipurile de valuta suportate, constantele cu detalii despre fiecare
 * valuta, si functii utilitare pentru formatarea si conversia sumelor.
 *
 * Valutele suportate: EUR, USD, RON, GBP, CHF
 * ============================================================================
 */

/**
 * Codurile de valuta suportate de sistem (format ISO 4217).
 *
 * - 'EUR' — Euro
 * - 'USD' — Dolar american
 * - 'RON' — Leu romanesc
 * - 'GBP' — Lira sterlina
 * - 'CHF' — Franc elvetian
 */
export type CurrencyCode = 'EUR' | 'USD' | 'RON' | 'GBP' | 'CHF';

/**
 * Interfata care descrie o valuta cu toate detaliile necesare
 * pentru afisare si calcule.
 */
export interface Currency {
  /** Codul ISO 4217 al valutei (ex: 'EUR') */
  code: CurrencyCode;

  /** Simbolul valutar folosit in afisare (ex: '\u20AC') */
  symbol: string;

  /** Numele complet al valutei (ex: 'Euro') */
  name: string;

  /** Numarul de zecimale standard pentru aceasta valuta (de obicei 2) */
  decimalPlaces: number;
}

/**
 * Harta cu toate valutele suportate si detaliile lor.
 * Folosita pentru afisare in dropdown-uri, formatare si validare.
 */
export const CURRENCIES: Record<CurrencyCode, Currency> = {
  EUR: { code: 'EUR', symbol: '\u20AC', name: 'Euro', decimalPlaces: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimalPlaces: 2 },
  RON: { code: 'RON', symbol: 'lei', name: 'Romanian Leu', decimalPlaces: 2 },
  GBP: { code: 'GBP', symbol: '\u00A3', name: 'British Pound', decimalPlaces: 2 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimalPlaces: 2 },
};

/**
 * Formateaza o suma intr-un string human-readable cu simbolul valutar.
 *
 * Foloseste Intl.NumberFormat cu locale 'ro-RO' pentru formatare consistenta.
 * Daca codul valutar nu este recunoscut, se foloseste formatul implicit.
 *
 * @param amount - Suma de formatat
 * @param currencyCode - Codul valutar (implicit 'EUR')
 * @returns String formatat (ex: '1.234,56 \u20AC')
 */
export function formatCurrency(amount: number, currencyCode: CurrencyCode = 'EUR'): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: CURRENCIES[currencyCode]?.decimalPlaces ?? 2,
  }).format(amount);
}

/**
 * Converteste o suma dintr-o valuta in alta folosind ratele de schimb furnizate.
 *
 * Ratele de schimb trebuie sa fie relative la o valuta de baza comuna.
 * Formula: amount * (rataDestinatie / rataSursa)
 *
 * @param amount - Suma de convertit
 * @param from - Codul valutar sursa
 * @param to - Codul valutar destinatie
 * @param rates - Obiect cu ratele de schimb (cheile sunt codurile valutare, valorile sunt ratele)
 * @returns Suma convertita in valuta destinatie
 *
 * @example
 * // Daca ratele sunt relative la EUR:
 * // { EUR: 1, USD: 1.08, RON: 4.97, GBP: 0.86, CHF: 0.94 }
 * convertCurrency(100, 'EUR', 'USD', rates) // => 108
 * convertCurrency(100, 'USD', 'EUR', rates) // => 92.59
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<string, number>,
): number {
  if (from === to) return amount;

  const fromRate = rates[from];
  const toRate = rates[to];

  if (!fromRate || !toRate) {
    throw new Error(`Missing exchange rate for ${!fromRate ? from : to}`);
  }

  return amount * (toRate / fromRate);
}
