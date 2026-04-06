/**
 * ============================================================================
 * STAGES.TS — Etapele pipeline-ului de vanzari si scripturile de apel
 * ============================================================================
 *
 * Acest fisier defineste:
 *   1. STAGES       — Lista ordonata a etapelor prin care trece fiecare client
 *                     in procesul de vanzare (pipeline CRM).
 *   2. STAGE_COLORS — Culorile asociate fiecarei etape, folosite in interfata
 *                     (Kanban board, badge-uri, grafice Dashboard).
 *   3. TRASEU       — Scriptul de apel pentru etapa T1 (primul contact telefonic).
 *   4. T2_STEPS     — Scriptul de apel pentru etapa T2 (prezentare solutie tehnica).
 *   5. T3_STEPS     — Scriptul de apel pentru etapa T3 (ofertare si inchidere).
 *
 * Constantele sunt exportate prin barrel-ul principal (index.ts) si consumate
 * atat de frontend (vizualizare pipeline, formulare) cat si de backend (validari).
 * ============================================================================
 */

import type { ScriptStep } from '../types/pipeline';
import type { Stage } from '../types/client';

/**
 * STAGES — Etapele pipeline-ului de vanzari AMASS
 *
 * Fiecare client parcurge aceste etape, de la primul contact pana la contractare
 * sau pierdere. Ordinea din array reflecta progresul natural al procesului:
 *
 *   'T1'          — Primul apel telefonic (calificare si descoperire nevoi).
 *                   Consultantul urmeaza scriptul TRASEU (vezi mai jos).
 *   'T2'          — Al doilea apel (prezentare solutie tehnica personalizata).
 *                   Consultantul urmeaza scriptul T2_STEPS.
 *   'T3'          — Al treilea apel (ofertare financiara si inchidere).
 *                   Consultantul urmeaza scriptul T3_STEPS.
 *   'Contractat'  — Clientul a semnat contractul. Vanzare reusita.
 *   'Pierdut'     — Clientul a fost pierdut (nu a cumparat). Se inregistreaza
 *                   motivul pierderii din lista LOSS_REASONS (options.ts).
 *
 * Folosit in: Kanban board (coloane), filtre, validari backend, rapoarte.
 */
export const STAGES: Stage[] = ['T1', 'T2', 'T3', 'Contractat', 'Pierdut'];

/**
 * STAGE_COLORS — Culorile hex asociate fiecarei etape
 *
 * Utilizate in interfata pentru a diferentia vizual etapele:
 *   - Kanban board: culoarea header-ului fiecarei coloane
 *   - Badge-uri pe cardul clientului
 *   - Grafice si statistici din Dashboard
 *
 *   T1          → #3B82F6 (albastru)   — etapa de descoperire, informativa
 *   T2          → #F59E0B (portocaliu)  — etapa de prezentare, in lucru
 *   T3          → #C8102E (rosu)        — etapa critica de ofertare/inchidere
 *   Contractat  → #10B981 (verde)       — succes, contract semnat
 *   Pierdut     → #6B7280 (gri)         — client pierdut, inactiv
 */
export const STAGE_COLORS: Record<Stage, string> = {
  T1: '#3B82F6',
  T2: '#F59E0B',
  T3: '#C8102E',
  Contractat: '#10B981',
  Pierdut: '#6B7280',
};

/**
 * TRASEU — Scriptul de apel pentru etapa T1 (primul contact telefonic)
 *
 * Acesta este ghidul pas-cu-pas pe care consultantul il urmeaza in timpul
 * primului apel cu un lead nou. Scopul T1 este sa califice clientul,
 * sa identifice nevoile si sa prezinte pe scurt solutia AMASS.
 *
 * Fiecare pas (ScriptStep) contine:
 *   - id    : numar unic, folosit pentru a marca progresul in fisa clientului
 *   - short : titlul scurt afisat in lista de pasi din interfata
 *   - full  : textul complet / replica pe care consultantul o rosteste
 *
 * Pasii scriptului T1:
 *   1.  Confirmare context       — Verifica sistemul actual de incalzire si consumul
 *   2.  Motiv principal          — Identifica motivatia clientului ("Doriti sa...?")
 *   3.  Suma lunara              — Afla bugetul lunar acceptabil al clientului
 *   4.  Solutie tehnica          — Prezinta solutia cu radiatoare cu roca vulcanica (RRV)
 *   5.  Alternativa              — Valideaza si demonteaza eventuale alternative
 *   6.  Consum AMASS vs PQ       — Compara consumul AMASS cu al concurentei (PQ)
 *   7.  La pachet                — Explica diferentele reale, ce primeste clientul
 *   8.  Prezentare RRV           — Prezentare scurta a radiatorului cu roca vulcanica
 *   9.  Explicatie RRV           — Explicatie simpla, pe intelesul clientului
 *   10. Panouri + PI             — Panouri fotovoltaice si puterea instalata necesara
 *   11. Dovada                   — Studii de caz si rezultate concrete
 *   12. Intrebari client         — Raspunde la intrebarile clientului
 *   13. Sistem ideal             — Propune sistemul ideal personalizat
 *
 * Folosit in: Pagina de fisa client (sectiunea de script T1), raportare progres apel.
 */
export const TRASEU: ScriptStep[] = [
  { id: 1, short: 'Confirmare context', full: 'Confirmare context: Sistemul actual este ___ Corect? + Consum actual este ___ Corect?' },
  { id: 2, short: 'Motiv principal', full: 'Motivul principal: "Doriti sa...?"' },
  { id: 3, short: 'Suma lunara', full: '"Care vreti sa fie suma platita lunar ca sa achizitionati un sistem de incalzire conectabil la Panourile Fotovoltaice?"' },
  { id: 4, short: 'Solutie tehnica', full: 'O sa gandim o solutie tehnica cu radiatoare cu roca vulcanica care sa aibe o transa maxima de ...' },
  { id: 5, short: 'Alternativa', full: 'Alternativa? (Validare + Demontare)' },
  { id: 6, short: 'Consum AMASS vs PQ', full: 'Consum similar AMASS vs. PQ (Daca asta este alternativa)' },
  { id: 7, short: 'La pachet', full: 'Cu ce vine la pachet — diferenta reala' },
  { id: 8, short: 'Prezentare RRV', full: 'Prezentare scurta RRV' },
  { id: 9, short: 'Explicatie RRV', full: 'Explicatie simpla RRV' },
  { id: 10, short: 'Panouri + PI', full: 'Panouri + PI necesar' },
  { id: 11, short: 'Dovada', full: 'Dovada: studii si rezultate' },
  { id: 12, short: 'Intrebari client', full: 'Intrebari client' },
  { id: 13, short: 'Sistem ideal', full: 'Sistem ideal propus' },
];

/**
 * T2_STEPS — Scriptul de apel pentru etapa T2 (prezentare solutie tehnica)
 *
 * Dupa ce clientul a fost calificat in T1, consultantul revine cu o solutie
 * tehnica proiectata pe datele specifice ale locuintei clientului.
 * Scopul T2: prezentare personalizata + ancorarea primelor sume + programare T3.
 *
 * Pasii scriptului T2:
 *   1. Solutie tehnica       — Prezinta solutia proiectata pe datele clientului
 *   2. Axa timp              — Afla cand doreste implementarea (urgent vs. planificat)
 *   3. Prima discutie sume   — Introduce primele referinte financiare (<50 EUR/mp)
 *   4. Reactie client        — Observa si noteaza reactia clientului la sume
 *   5. Programare T3         — Stabileste data si ora pentru apelul de ofertare T3
 *
 * Folosit in: Pagina de fisa client (sectiunea de script T2).
 */
export const T2_STEPS: ScriptStep[] = [
  { id: 1, short: 'Solutie tehnica', full: 'Prezentare solutie tehnica proiectata pe datele clientului' },
  { id: 2, short: 'Axa timp', full: 'Cand doreste implementarea? Urgenta sau planificat?' },
  { id: 3, short: 'Prima discutie sume', full: '"Noi consideram ca o solutie tehnica buna este intotdeauna urmata de o solutie financiara buna! Sunt si parghii financiare, toate sub 50€/mp"' },
  { id: 4, short: 'Reactie client', full: 'Cum reactioneaza la prima mentiune de sume? Noteaza reactia.' },
  { id: 5, short: 'Programare T3', full: 'Stabileste data si ora pentru apelul de ofertare T3' },
];

/**
 * T3_STEPS — Scriptul de apel pentru etapa T3 (ofertare si inchidere)
 *
 * Acesta este apelul decisiv in care consultantul prezinta oferta financiara
 * si incearca sa inchida vanzarea. Se discuta variantele de plata si se
 * solicita decizia clientului.
 *
 * Pasii scriptului T3:
 *   1. Consum calculat     — Prezinta calculul de consum bazat pe datele tehnice
 *   2. Putere instalata    — Propune strategia de putere instalata
 *   3. Amortizare          — Discutie despre amortizarea investitiei in timp
 *   4. Esalonare lunara    — Varianta 1: plata in rate (~60-70 EUR/luna pe 5 ani)
 *   5. Plata integrala     — Varianta 2: plata integrala cu reducere de ~1000 EUR
 *   6. Avans 30%           — Varianta 3: avans 30% (~2800-2900 EUR), livrare la achitare
 *   7. Decizie             — Solicita decizia clientului, ton degajat, fara presiune
 *
 * Folosit in: Pagina de fisa client (sectiunea de script T3).
 */
export const T3_STEPS: ScriptStep[] = [
  { id: 1, short: 'Consum calculat', full: 'Prezentare calcul consum pe baza datelor tehnice' },
  { id: 2, short: 'Putere instalata', full: 'Strategie de putere instalata propusa' },
  { id: 3, short: 'Amortizare', full: 'Discutie pe amortizarea investitiei' },
  { id: 4, short: 'Esalonare lunara', full: '"Daca mergeti prin esalonare lunara, aveti 60-70 €/luna pt 5 ani. Va convine?"' },
  { id: 5, short: 'Plata integrala', full: '"Daca vreti plata integrala la semnare este cu 1000€ mai putin"' },
  { id: 6, short: 'Avans 30%', full: '"Daca vreti avans 30% suma este de 2800-2900€ si se livreaza pana achitati"' },
  { id: 7, short: 'Decizie', full: '"Cu care varianta va simtiti confortabil?" Asteptam. DEGAJAT.' },
];
