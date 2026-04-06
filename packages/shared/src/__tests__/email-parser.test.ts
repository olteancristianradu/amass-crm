import { describe, it, expect } from 'vitest';
import { parseEmail } from '../utils/email-parser';

describe('parseEmail', () => {
  it('extracts name from Prenume and Nume fields', () => {
    const text = 'Prenume: Ion\nNume: Popescu';
    const result = parseEmail(text);
    expect(result.name).toBe('Ion Popescu');
  });

  it('extracts only prenume if nume is missing', () => {
    const text = 'Prenume: Ion';
    const result = parseEmail(text);
    expect(result.name).toBe('Ion');
  });

  it('extracts email', () => {
    const text = 'Email: ion@example.com';
    const result = parseEmail(text);
    expect(result.email).toBe('ion@example.com');
  });

  it('extracts phone', () => {
    const text = 'Telefon: 0712345678';
    const result = parseEmail(text);
    expect(result.phone).toBe('0712345678');
  });

  it('extracts area (suprafata)', () => {
    const text = 'Suprafata: 120 mp';
    const result = parseEmail(text);
    expect(result.area).toBe('120 mp');
  });

  it('extracts location (oras)', () => {
    const text = 'Oras: Bucuresti';
    const result = parseEmail(text);
    expect(result.location).toBe('Bucuresti');
  });

  it('detects solar panels', () => {
    const text = 'Are panouri fotovoltaice instalate';
    const result = parseEmail(text);
    expect(result.hasSolarPanels).toBe(true);
  });

  it('returns false for hasSolarPanels when not mentioned', () => {
    const text = 'Prenume: Ion';
    const result = parseEmail(text);
    expect(result.hasSolarPanels).toBe(false);
  });

  it('extracts consumption amount from keyword-based line', () => {
    const text = 'Cat platiti pe luna pe incalzire?\n500 RON';
    const result = parseEmail(text);
    expect(result.consumptionAmount).toBe('500 RON');
  });

  it('extracts consumption amount from RON pattern fallback', () => {
    const text = 'Consum lunar: 350 RON pe luna';
    const result = parseEmail(text);
    expect(result.consumptionAmount).toBe('350 RON');
  });

  it('extracts current heating system from keyword line', () => {
    const text = 'Ce sistem de incalzire aveti acum?\ncentrala gaz';
    const result = parseEmail(text);
    expect(result.currentSystem).toBe('centrala gaz');
  });

  it('extracts current system from known keywords fallback', () => {
    const text = 'Locuinta are centrala lemne instalata';
    const result = parseEmail(text);
    expect(result.currentSystem).toBe('centrala lemne');
  });

  it('extracts stage from varianta aleasa', () => {
    const text = 'Varianta aleasa:\nPremium Plus';
    const result = parseEmail(text);
    expect(result.stage).toBe('Premium Plus');
  });

  it('extracts form notes starting from marker', () => {
    const text = 'Prenume: Ion\nIntrebari suplimentare\nVreau mai multe detalii\nMultumesc';
    const result = parseEmail(text);
    expect(result.formNotes).toContain('Intrebari suplimentare');
    expect(result.formNotes).toContain('Vreau mai multe detalii');
  });

  it('extracts desired system', () => {
    const text = 'Pe care din sistemele noastre l-ati alege?\nPompa de caldura aer-apa';
    const result = parseEmail(text);
    expect(result.desiredSystem).toBe('Pompa de caldura aer-apa');
  });

  it('extracts monthly payment', () => {
    const text = 'Cat doriti sa platiti pe luna?\n300 RON';
    const result = parseEmail(text);
    expect(result.monthlyPayment).toBe('300 RON');
  });

  it('handles empty/null input', () => {
    const result = parseEmail('');
    expect(result.name).toBe('');
    expect(result.email).toBe('');
    expect(result.phone).toBe('');
    expect(result.hasSolarPanels).toBe(false);
  });

  it('handles comprehensive email', () => {
    const text = [
      'Prenume: Maria',
      'Nume: Ionescu',
      'Email: maria@test.com',
      'Telefon: +40712345678',
      'Suprafata: 150 mp',
      'Oras: Cluj-Napoca',
      'Are panouri fotovoltaice',
      'Ce sistem de incalzire aveti acum?: centrala gaz',
      'Cat platiti pe luna pe incalzire?: 600 RON',
      'Varianta aleasa:',
      'Standard',
      'Pe care din sistemele noastre l-ati alege?',
      'Pompa de caldura',
      'Cat doriti sa platiti pe luna?',
      '400 RON',
    ].join('\n');

    const result = parseEmail(text);
    expect(result.name).toBe('Maria Ionescu');
    expect(result.email).toBe('maria@test.com');
    expect(result.phone).toBe('+40712345678');
    expect(result.area).toBe('150 mp');
    expect(result.location).toBe('Cluj-Napoca');
    expect(result.hasSolarPanels).toBe(true);
    expect(result.currentSystem).toBe('centrala gaz');
    expect(result.consumptionAmount).toBe('600 RON');
    expect(result.stage).toBe('Standard');
    expect(result.desiredSystem).toBe('Pompa de caldura');
    expect(result.monthlyPayment).toBe('400 RON');
  });

  it('truncates very long input to 10000 chars', () => {
    const longText = 'a'.repeat(20000);
    // Should not throw
    const result = parseEmail(longText);
    expect(result.name).toBe('');
  });
});
