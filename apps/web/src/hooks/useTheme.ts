/**
 * Hook personalizat pentru gestionarea temei vizuale (light/dark) a aplicatiei.
 *
 * Rolul acestui hook:
 * - Gestioneaza starea temei curente (dark sau light)
 * - Persista preferinta utilizatorului in localStorage
 * - Aplica tema pe elementul <html> prin atributul data-theme
 * - Ofera posibilitatea de a schimba culoarea de accent
 *
 * Cum se foloseste:
 *   const { isDark, toggle, setAccent } = useTheme();
 *   - isDark: boolean - true daca tema curenta este dark
 *   - toggle(): comuta intre dark si light
 *   - setAccent(color, dark?): schimba culoarea de accent a aplicatiei
 *
 * Cum se modifica:
 * - Pentru a adauga o noua proprietate de tema, modifica setAccent sau adauga o noua functie
 * - Pentru a schimba tema implicita, modifica valoarea default din useState ('dark')
 */
import { useState, useEffect, useCallback } from 'react';

export function useTheme() {
  /**
   * Starea temei - citeste din localStorage la initializare.
   * Daca nu exista nicio preferinta salvata, foloseste 'dark' ca valoare implicita.
   * Cheia din localStorage: 'amass-theme' (valori posibile: 'dark' | 'light')
   */
  const [isDark, setIsDark] = useState(() => {
    return (localStorage.getItem('amass-theme') || 'dark') === 'dark';
  });

  /**
   * Efect care se executa la fiecare schimbare a temei:
   * 1. Seteaza atributul data-theme pe <html> (folosit de CSS pentru variabile tematice)
   * 2. Salveaza preferinta in localStorage pentru persistenta intre sesiuni
   */
  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('amass-theme', theme);
  }, [isDark]);

  /**
   * Functie de comutare a temei (toggle) - inverseaza starea curenta.
   * Memorizata cu useCallback pentru a evita re-renderizari inutile.
   */
  const toggle = useCallback(() => setIsDark(d => !d), []);

  /**
   * Functie pentru schimbarea culorii de accent a aplicatiei.
   * @param color - Culoarea de accent principala (ex: '#C8102E')
   * @param dark  - (optional) Varianta mai inchisa a culorii de accent
   *
   * Seteaza variabilele CSS direct pe elementul <html>:
   * - --accent: culoarea principala
   * - --accent-lt: versiune transparenta (cu sufixul '26' = ~15% opacitate hex)
   * - --accent-glow: versiune semi-transparenta (cu sufixul '66' = ~40% opacitate hex)
   * - --accent-dk: varianta inchisa (daca este furnizata)
   *
   * Salveaza valorile in localStorage pentru persistenta.
   */
  const setAccent = useCallback((color: string, dark?: string) => {
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-lt', color + '26');
    document.documentElement.style.setProperty('--accent-glow', color + '66');
    if (dark) document.documentElement.style.setProperty('--accent-dk', dark);
    localStorage.setItem('amass-accent', color);
    if (dark) localStorage.setItem('amass-accent-dk', dark);
  }, []);

  return { isDark, toggle, setAccent };
}
