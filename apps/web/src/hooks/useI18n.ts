import { useState, useCallback } from 'react';
import { ro, en, de, fr, es, it, pt, nl, pl, hu } from '@amass/shared';

type Lang = 'ro' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'pt' | 'nl' | 'pl' | 'hu';

const LANGS: Record<Lang, Record<string, string>> = { ro, en, de, fr, es, it, pt, nl, pl, hu };

const LANG_LABELS: Record<Lang, string> = {
  ro: 'Romana',
  en: 'English',
  de: 'Deutsch',
  fr: 'Francais',
  es: 'Espanol',
  it: 'Italiano',
  pt: 'Portugues',
  nl: 'Nederlands',
  pl: 'Polski',
  hu: 'Magyar',
};

export function useI18n() {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('amass-lang') as Lang) || 'ro';
  });

  const tr = useCallback((key: string): string => {
    return LANGS[lang]?.[key] || LANGS.ro[key] || key;
  }, [lang]);

  const changeLang = useCallback((newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem('amass-lang', newLang);
  }, []);

  return { lang, tr, changeLang, LANG_LABELS, availableLangs: Object.keys(LANGS) as Lang[] };
}
