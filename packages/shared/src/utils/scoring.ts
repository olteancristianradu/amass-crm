/**
 * Modul de scorare si determinare a actiunilor urmatoare pentru clienti.
 *
 * Acest modul implementeaza logica de business centrala a CRM-ului:
 * 1. Calculul unui scor de completitudine/prioritate pentru fiecare client (0-100).
 * 2. Determinarea actiunii urmatoare recomandate pentru agentul de vanzari.
 *
 * Scorul reflecta cat de complet este profilul clientului si cat de avansat este
 * in pipeline-ul de vanzari (T1 → T2 → T3 → Contractat). Un scor mai mare
 * inseamna un client mai valoros si mai aproape de conversie.
 *
 * Traseul de vanzari al CRM-ului are 3 etape principale:
 * - T1 (Prospectare): 13 pasi — identificare client, colectare date initiale
 * - T2 (Calificare): 5 pasi — evaluare nevoi, prezentare solutii
 * - T3 (Negociere/Inchidere): 7 pasi — oferta, negociere, varianta de plata
 * - Contractat: client castigat
 * - Pierdut: client pierdut
 */

import type { Client, Stage } from '../types/client';
import { daysSince } from './date';

/**
 * Calculeaza scorul de completitudine si prioritate al unui client.
 *
 * Algoritmul de scorare functioneaza pe baza unui sistem de puncte aditive:
 *
 * 1. PUNCTE PENTRU COMPLETITUDINEA PROFILULUI (maxim 70 puncte):
 *    - Numar de telefon prezent (phone): +10 puncte
 *      (cel mai important camp — fara telefon nu se poate contacta clientul)
 *    - Adresa de email (email): +5 puncte
 *    - Suprafata locuintei (area): +5 puncte
 *    - Locatia/orasul (location): +5 puncte
 *    - Sistem actual de incalzire specificat (currentSystem): +5 puncte
 *    - Suma consum lunar specificata (consumptionAmount): +5 puncte
 *    - Are panouri solare (hasSolarPanels): +10 puncte
 *      (indica un client eco-constient, potential mai interesat de pompe de caldura)
 *    - Tipologia principala identificata (primaryType): +10 puncte
 *    - Nivel de buget specificat (budgetLevel): +5 puncte
 *    - Data urmatoarei contactari programata (nextContact): +10 puncte
 *      (indica ca agentul a planificat deja urmatoarea interactiune)
 *
 * 2. BONUS/PENALIZARE PENTRU ETAPA IN PIPELINE (stageBonus):
 *    - T1 (Prospectare): +0 puncte (etapa initiala, fara bonus)
 *    - T2 (Calificare): +15 puncte
 *    - T3 (Negociere): +30 puncte
 *    - Contractat: +50 puncte (client castigat — scor maxim posibil)
 *    - Pierdut: -20 puncte (penalizare pentru client pierdut)
 *
 * 3. PENALIZARE PENTRU LIPSA ACTUALIZARII (bazata pe updatedAt):
 *    - Daca ultimul update a fost acum mai mult de 14 zile: -10 puncte
 *    - Daca ultimul update a fost acum mai mult de 30 zile: -10 puncte suplimentare
 *      (total -20 puncte pentru clienti neactualizati de peste 30 zile)
 *    Aceasta penalizare incurajeaza agentii sa isi actualizeze regulat clientii.
 *
 * 4. LIMITARE FINALA: Scorul este limitat in intervalul [0, 100] prin
 *    Math.max(0, Math.min(100, s)).
 *
 * @param c - Obiectul clientului (partial — nu toate campurile trebuie sa fie prezente).
 * @returns Scorul calculat, un numar intreg intre 0 si 100.
 *
 * Cazuri limita tratate:
 * - Client complet gol (fara campuri) → scor 0
 * - Client fara etapa specificata → se presupune T1 (bonus 0)
 * - Client cu etapa necunoscuta → bonus 0 (|| 0 la sfarsit)
 * - Scor negativ posibil (de ex. Pierdut cu profil gol) → limitat la 0
 * - Scor peste 100 (de ex. Contractat cu profil complet) → limitat la 100
 *
 * Utilizare in CRM: Scorul este afisat in lista de clienti, folosit pentru sortare
 * si prioritizare, si afisat vizual cu bare de progres colorate.
 */
export function calcScore(c: Partial<Client>): number {
  let s = 0;

  /* Puncte pentru completitudinea profilului clientului */
  if (c.phone) s += 10;
  if (c.email) s += 5;
  if (c.area) s += 5;
  if (c.location) s += 5;
  if (c.currentSystem && c.currentSystem.length > 0) s += 5;
  if (c.consumptionAmount) s += 5;
  if (c.hasSolarPanels) s += 10;
  if (c.primaryType) s += 10;
  if (c.budgetLevel) s += 5;
  if (c.nextContact) s += 10;

  /* Bonus sau penalizare bazata pe etapa din pipeline-ul de vanzari */
  const stageBonus: Record<string, number> = { T1: 0, T2: 15, T3: 30, Contractat: 50, Pierdut: -20 };
  s += stageBonus[c.stage || 'T1'] || 0;

  /* Penalizare pentru lipsa actualizarilor recente ale clientului */
  if (c.updatedAt) {
    const age = daysSince(c.updatedAt);
    if (age > 14) s -= 10;  /* Penalizare usoara: >14 zile fara actualizare */
    if (age > 30) s -= 10;  /* Penalizare suplimentara: >30 zile fara actualizare */
  }

  /* Limitarea scorului in intervalul [0, 100] */
  return Math.max(0, Math.min(100, s));
}

/**
 * Determina actiunea urmatoare recomandata pentru un client.
 *
 * Aceasta functie ghideaza agentul de vanzari prin traseul CRM-ului,
 * indicandu-i exact ce trebuie sa faca in continuare pentru fiecare client.
 *
 * Algoritmul de decizie (in ordinea prioritatii):
 *
 * 1. VERIFICARE STARI FINALE:
 *    - Daca clientul este "Pierdut" → mesaj "Client pierdut" (nu mai este nimic de facut)
 *    - Daca clientul este "Contractat" → mesaj "Client contractat" cu bifa (succes!)
 *
 * 2. VERIFICARE DATE OBLIGATORII:
 *    - Daca lipseste numarul de telefon → "Adauga nr. telefon"
 *      (telefonul este esential pentru contactarea clientului)
 *
 * 3. LOGICA SPECIFICA FIECAREI ETAPE:
 *
 *    T1 (Prospectare — 13 pasi):
 *    - Daca tipologia principala nu este identificata → "Identifica tipologia clientului"
 *    - Daca nu a parcurs toti cei 13 pasi → "Continua traseu T1 (pas X/13)"
 *    - Daca toti pasii sunt completi → "Muta in T2"
 *
 *    T2 (Calificare — 5 pasi):
 *    - Daca nu a parcurs toti cei 5 pasi → "Continua traseu T2 (pas X/5)"
 *    - Daca toti pasii sunt completi → "Muta in T3"
 *
 *    T3 (Negociere/Inchidere — 7 pasi):
 *    - Daca nu a parcurs toti cei 7 pasi → "Continua traseu T3 (pas X/7)"
 *    - Daca varianta de plata nu e confirmata → "Confirma varianta de plata"
 *    - Daca totul e complet → "Contracteaza clientul"
 *
 * 4. VERIFICARE URGENTA (pentru orice etapa):
 *    - Daca au trecut mai mult de 7 zile de la ultimul update → mesaj de urgenta
 *
 * 5. ACTIUNE IMPLICITA:
 *    - "Urmareste progresul" — daca niciuna din regulile de mai sus nu se aplica
 *
 * @param c - Obiectul clientului (partial).
 * @returns String cu actiunea recomandata, in limba romana, gata de afisat in UI.
 *
 * Cazuri limita tratate:
 * - Client fara etapa → se presupune T1
 * - Client fara updatedAt → age = 0, nu se genereaza alerta de urgenta
 * - Pasii (t1Step, t2Step, t3Step) pot fi undefined → se trateaza ca 0 cu || 0
 *
 * Utilizare in CRM: Mesajul returnat este afisat in coloana "Actiune urmatoare"
 * din tabelul de clienti si in panoul de detalii al clientului. Ghideaza agentii
 * de vanzari pas cu pas prin procesul de conversie.
 */
export function getNextAction(c: Partial<Client>): string {
  const stage = c.stage || 'T1';

  /* Verificare stari finale — clienti care nu mai necesita actiuni */
  if (stage === 'Pierdut') return 'Client pierdut';
  if (stage === 'Contractat') return 'Client contractat \u2714';

  /* Verificare date obligatorii — telefonul este esential */
  if (!c.phone) return 'Adauga nr. telefon';

  /* Calculam cate zile au trecut de la ultima actualizare */
  const age = c.updatedAt ? daysSince(c.updatedAt) : 0;

  /* Logica pentru etapa T1 — Prospectare (13 pasi) */
  if (stage === 'T1') {
    if (!c.primaryType) return 'Identifica tipologia clientului';
    if ((c.t1Step || 0) < 13) return `Continua traseu T1 (pas ${(c.t1Step || 0) + 1}/13)`;
    return 'Muta in T2';
  }

  /* Logica pentru etapa T2 — Calificare (5 pasi) */
  if (stage === 'T2') {
    if ((c.t2Step || 0) < 5) return `Continua traseu T2 (pas ${(c.t2Step || 0) + 1}/5)`;
    return 'Muta in T3';
  }

  /* Logica pentru etapa T3 — Negociere si inchidere (7 pasi) */
  if (stage === 'T3') {
    if ((c.t3Step || 0) < 7) return `Continua traseu T3 (pas ${(c.t3Step || 0) + 1}/7)`;
    if (!c.paymentVariant) return 'Confirma varianta de plata';
    return 'Contracteaza clientul';
  }

  /* Alerta de urgenta daca clientul nu a fost contactat de peste 7 zile */
  if (age > 7) return '\u26A0 Contacteaza urgent (7+ zile)';

  /* Actiune implicita — totul este in regula, se urmareste progresul */
  return 'Urmareste progresul';
}
