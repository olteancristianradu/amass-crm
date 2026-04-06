/**
 * ============================================================================
 * OPTIONS.TS — Optiuni predefinite pentru formulare, tipologii si sabloane
 * ============================================================================
 *
 * Acest fisier contine toate listele de optiuni (dropdown-uri, selecturi)
 * folosite in formularele CRM, precum si:
 *   - Tipologiile de clienti (pentru adaptarea discursului de vanzare)
 *   - Motivele de pierdere a clientilor
 *   - Sabloanele de mesaje (WhatsApp / SMS) pentru fiecare etapa
 *
 * Constantele sunt exportate prin barrel-ul principal (index.ts) si utilizate
 * atat de frontend (populare selecturi, validari formulare) cat si de backend
 * (validarea datelor la salvare/import).
 * ============================================================================
 */

import type { Typology } from '../types/pipeline';

/**
 * SISTEME — Tipurile de sisteme de incalzire existente la client
 *
 * Lista dropdown folosita in formularul de fisa client pentru a inregistra
 * ce sistem de incalzire are clientul inainte de achizitia AMASS.
 * Aceasta informatie este esentiala pentru:
 *   - Etapa T1 (confirmarea contextului actual)
 *   - Calculul economiilor potentiale fata de sistemul actual
 *   - Personalizarea solutiei tehnice in T2
 *
 * Valori:
 *   'CT gaz'           — Centrala termica pe gaz natural
 *   'CT lemne'         — Centrala termica pe lemne
 *   'CT peleti'        — Centrala termica pe peleti (biomasa)
 *   'Pompa caldura'    — Pompa de caldura (aer-apa, sol-apa etc.)
 *   'CT electrica'     — Centrala termica electrica
 *   'Sobe'             — Sobe clasice (lemne, teracota etc.)
 *   'Radiatoare ulei'  — Radiatoare electrice cu ulei
 *   'AC'               — Aer conditionat (folosit si pentru incalzire)
 *   'Plasme infrarosu' — Panouri cu infrarosu (plasme)
 *   'IEP'              — Incalzire electrica prin pardoseala
 */
export const SISTEME = [
  'CT gaz', 'CT lemne', 'CT peleti', 'Pompa caldura', 'CT electrica',
  'Sobe', 'Radiatoare ulei', 'AC', 'Plasme infrarosu', 'IEP',
];

/**
 * CONECTAT — Tipul de sistem de distributie (emitere caldura) existent
 *
 * Lista dropdown din formularul de fisa client care indica cum este
 * distribuita caldura in locuinta clientului. Important pentru proiectarea
 * solutiei tehnice AMASS (compatibilitate cu radiatoarele cu roca vulcanica).
 *
 * Valori:
 *   'Radiatoare (apa)'       — Radiatoare clasice conectate la circuit de apa
 *   'Convectoare'            — Convectoare (de obicei pe gaz sau electrice)
 *   'Incalzire pardoseala'   — Sistem de incalzire in pardoseala
 *   'Nimic'                  — Fara sistem de distributie existent
 */
export const CONECTAT = [
  'Radiatoare (apa)', 'Convectoare', 'Incalzire pardoseala', 'Nimic',
];

/**
 * CONSTRUCTIE — Tipul de constructie al locuintei clientului
 *
 * Lista dropdown din formularul de fisa client. Materialul de constructie
 * influenteaza calculul pierderilor termice si dimensionarea solutiei.
 *
 * Valori:
 *   'BCA'                — Beton celular autoclavizat
 *   'Caramida'           — Constructie din caramida
 *   'Lemn'               — Constructie din lemn (case de lemn)
 *   'Panou sandwich'     — Panouri sandwich (hale, constructii modulare)
 *   'Beton'              — Beton armat
 *   'Structura Metalica' — Structura metalica (case pe structura de otel)
 */
export const CONSTRUCTIE = [
  'BCA', 'Caramida', 'Lemn', 'Panou sandwich', 'Beton', 'Structura Metalica',
];

/**
 * IZOLATIE — Tipul de izolatie termica a locuintei clientului
 *
 * Lista dropdown din formularul de fisa client. Izolatia influenteaza
 * direct consumul energetic si dimensionarea sistemului de incalzire.
 *
 * Valori:
 *   'Polistiren'      — Izolatie cu polistiren expandat/extrudat (EPS/XPS)
 *   'Vata minerala'   — Izolatie cu vata minerala (bazaltica sau de sticla)
 *   'Lana de lemn'    — Izolatie ecologica din lana de lemn
 *   'Celuloza'        — Izolatie din celuloza reciclata (insuflata)
 *   'Neizolat'        — Locuinta fara izolatie termica
 */
export const IZOLATIE = [
  'Polistiren', 'Vata minerala', 'Lana de lemn', 'Celuloza', 'Neizolat',
];

/**
 * NIVEL_BANI — Profilul financiar / disponibilitatea de plata a clientului
 *
 * Folosit in formularul de fisa client pentru a clasifica clientul din punct
 * de vedere financiar. Ajuta consultantul sa adapteze oferta si varianta
 * de plata propusa in T3.
 *
 * Valori:
 *   'Necumpatat' — Client care cheltuieste fara sa compare mult (buget generos)
 *   'Cumpatat'   — Client atent la cheltuieli, compara optiuni
 *   'Smart'      — Client orientat spre raportul calitate-pret, analizeaza ROI
 *   'Lux'        — Client cu buget ridicat, orientat spre calitate premium
 */
export const NIVEL_BANI = [
  'Necumpatat', 'Cumpatat', 'Smart', 'Lux',
];

/**
 * LOSS_REASONS — Motivele de pierdere a unui client
 *
 * Cand un client este mutat in etapa "Pierdut", consultantul selecteaza
 * unul din aceste motive. Datele sunt agregate in Dashboard pentru a
 * identifica tendinte si probleme in procesul de vanzare.
 *
 * Valori:
 *   'Pret prea mare'       — Clientul considera pretul prea ridicat
 *   'A ales concurenta'    — Clientul a cumparat de la un competitor
 *   'Nu mai e interesat'   — Clientul si-a pierdut interesul
 *   'Nu raspunde'          — Clientul nu mai raspunde la apeluri/mesaje
 *   'Buget insuficient'    — Clientul nu are bugetul necesar
 *   'A amanat'             — Clientul a amanat decizia pe termen nedefinit
 *   'Alt motiv'            — Alt motiv (se adauga detalii in note)
 */
export const LOSS_REASONS = [
  'Pret prea mare', 'A ales concurenta', 'Nu mai e interesat',
  'Nu raspunde', 'Buget insuficient', 'A amanat', 'Alt motiv',
];

/**
 * TIPOLOGII — Tipologiile de personalitate ale clientilor
 *
 * Sistem de clasificare a clientilor folosit de consultanti pentru a-si
 * adapta discursul de vanzare. Fiecare tipologie are o strategie diferita.
 * Afisate in fisa clientului ca butoane colorate; consultantul selecteaza
 * tipologia detectata in timpul conversatiei.
 *
 * Structura fiecarei tipologii (Typology):
 *   - id      : identificator unic (folosit ca cheie in baza de date)
 *   - icon    : emoji afisat pe buton
 *   - name    : numele scurt al tipologiei (afisat pe buton)
 *   - traits  : trasaturi cheie pentru identificarea rapida
 *   - button  : strategia de comunicare recomandata (tooltip/eticheta buton)
 *   - replica : replica model pe care consultantul o poate folosi
 *   - color   : culoarea hex a butonului in interfata
 *
 * Tipologii disponibile:
 *   'logic'      — Client analitic: se bazeaza pe cifre, compara, este calm.
 *                  Strategie: Claritate + Eficienta.
 *   'emotional'  — Client emotional: prioritizeaza familia, confortul, caldura.
 *                  Strategie: Siguranta + Stare de bine.
 *   'pret'       — Vanator de pret: cauta cea mai buna oferta, alegerea inteligenta.
 *                  Strategie: Curiozitate + Diferentiere.
 *   'nehotarat'  — Client nehotarat: interesat dar nu poate lua o decizie.
 *                  Strategie: Autoritate + Ghidare (consultant il ghideaza).
 *   'grabit'     — Client grabit: vrea totul rapid si direct, fara detalii.
 *                  Strategie: Direct + Simplu.
 */
export const TIPOLOGII: Typology[] = [
  { id: 'logic', icon: '\u2B50', name: 'LOGIC', traits: 'cifre, compara, calm', button: 'Claritate + Eficienta', replica: 'Pe termen lung, acesta optimizeaza cel mai bine consumul.', color: '#2563EB' },
  { id: 'emotional', icon: '\uD83D\uDD25', name: 'EMOTIONAL', traits: 'familie, confort, cald repede', button: 'Siguranta + Stare de bine', replica: 'Caldura constanta, fara variatii — casa devine primitoare.', color: '#DC2626' },
  { id: 'pret', icon: '\uD83D\uDCB0', name: 'VANATOR PRET', traits: 'vrea alegerea inteligenta', button: 'Curiozitate + Diferentiere', replica: 'Va arat varianta ieftina — dar vedeti si ce regreta clientii.', color: '#059669' },
  { id: 'nehotarat', icon: '\uD83E\uDDCA', name: 'NEHOTARAT', traits: 'interesat dar nu decide', button: 'Autoritate + Ghidare', replica: 'Daca as alege pentru casa mea, pe acesta l-as lua.', color: '#7C3AED' },
  { id: 'grabit', icon: '\u26A1', name: 'GRABIT', traits: 'vrea rapid, direct', button: 'Direct + Simplu', replica: 'Cel mai echilibrat model — merge in majoritatea locuintelor.', color: '#EA580C' },
];

/**
 * TEMPLATES — Sabloane de mesaje predefinite (WhatsApp / SMS)
 *
 * Folosite in interfata CRM pentru a genera rapid mesaje personalizate
 * catre clienti. Consultantul selecteaza sablonul, iar placeholder-urile
 * ({nume}, {locatie}, {suprafata}) sunt inlocuite automat cu datele
 * clientului din fisa.
 *
 * Sabloane disponibile:
 *   'T1'       — Mesaj de bun-venit dupa completarea formularului pe amass.ro.
 *                Trimis automat sau manual dupa primirea lead-ului.
 *                Placeholder-uri: {nume}, {locatie}
 *   'T2'       — Mesaj de revenire cu solutia tehnica personalizata.
 *                Trimis inaintea apelului T2 pentru a pregati clientul.
 *                Placeholder-uri: {nume}, {suprafata}
 *   'T3'       — Mesaj de prezentare a ofertei si programare discutie financiara.
 *                Trimis inaintea apelului T3.
 *                Placeholder-uri: {nume}
 *   'followUp' — Mesaj de follow-up pentru clientii care nu au raspuns.
 *                Folosit cand clientul nu a revenit cu un raspuns.
 *                Placeholder-uri: {nume}
 */
export const TEMPLATES: Record<string, string> = {
  T1: 'Buna ziua {nume}, va multumim ca ati completat formularul pe amass.ro. In scurt timp un consultant va va contacta pentru a discuta solutia potrivita pentru locuinta dvs. din {locatie}.',
  T2: 'Buna ziua {nume}, revenind cu solutia tehnica pentru locuinta dvs. de {suprafata}. Am pregatit o propunere personalizata pe care as vrea sa o discutam.',
  T3: 'Buna ziua {nume}, am finalizat oferta pentru sistemul de incalzire. As vrea sa programam o discutie scurta pentru a va prezenta variantele financiare.',
  followUp: 'Buna ziua {nume}, revin cu un mesaj scurt. Ati avut timp sa va ganditi la propunerea noastra? Sunt disponibil pentru orice intrebare.',
};
