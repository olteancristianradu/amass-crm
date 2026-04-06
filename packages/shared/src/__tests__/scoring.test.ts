import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calcScore, getNextAction } from '../utils/scoring';
import type { Client } from '../types/client';

// We need to mock daysSince since it depends on current date
vi.mock('../utils/date', async () => {
  const actual = await vi.importActual<typeof import('../utils/date')>('../utils/date');
  return {
    ...actual,
    daysSince: vi.fn().mockReturnValue(0),
  };
});

import { daysSince } from '../utils/date';
const mockDaysSince = vi.mocked(daysSince);

describe('calcScore', () => {
  beforeEach(() => {
    mockDaysSince.mockReturnValue(0);
  });

  it('returns 0 for empty client', () => {
    expect(calcScore({})).toBe(0);
  });

  it('adds 10 for phone', () => {
    expect(calcScore({ phone: '0712345678' })).toBe(10);
  });

  it('adds 5 for email', () => {
    expect(calcScore({ email: 'test@test.com' })).toBe(5);
  });

  it('adds 5 for area', () => {
    expect(calcScore({ area: '120' })).toBe(5);
  });

  it('adds 5 for location', () => {
    expect(calcScore({ location: 'Bucuresti' })).toBe(5);
  });

  it('adds 5 for currentSystem with length > 0', () => {
    expect(calcScore({ currentSystem: ['centrala gaz'] })).toBe(5);
  });

  it('does not add for empty currentSystem', () => {
    expect(calcScore({ currentSystem: [] })).toBe(0);
  });

  it('adds 5 for consumptionAmount', () => {
    expect(calcScore({ consumptionAmount: '500 RON' })).toBe(5);
  });

  it('adds 10 for hasSolarPanels', () => {
    expect(calcScore({ hasSolarPanels: true })).toBe(10);
  });

  it('adds 10 for primaryType', () => {
    expect(calcScore({ primaryType: 'residential' } as Partial<Client>)).toBe(10);
  });

  it('adds 5 for budgetLevel', () => {
    expect(calcScore({ budgetLevel: 'medium' } as Partial<Client>)).toBe(5);
  });

  it('adds 10 for nextContact', () => {
    expect(calcScore({ nextContact: '2026-04-01' } as Partial<Client>)).toBe(10);
  });

  it('adds stage bonus: T1 = 0', () => {
    expect(calcScore({ stage: 'T1' })).toBe(0);
  });

  it('adds stage bonus: T2 = 15', () => {
    expect(calcScore({ stage: 'T2' })).toBe(15);
  });

  it('adds stage bonus: T3 = 30', () => {
    expect(calcScore({ stage: 'T3' })).toBe(30);
  });

  it('adds stage bonus: Contractat = 50', () => {
    expect(calcScore({ stage: 'Contractat' })).toBe(50);
  });

  it('applies penalty for Pierdut: -20 (clamped to 0)', () => {
    expect(calcScore({ stage: 'Pierdut' })).toBe(0);
  });

  it('penalizes -10 if updatedAt > 14 days ago', () => {
    mockDaysSince.mockReturnValue(15);
    expect(calcScore({ phone: '123', updatedAt: '2026-01-01T00:00:00Z' } as Partial<Client>)).toBe(0);
    // phone=10, stageBonus(T1)=0, penalty=-10 => 0
  });

  it('penalizes -20 if updatedAt > 30 days ago', () => {
    mockDaysSince.mockReturnValue(31);
    expect(calcScore({ phone: '123', email: 'a@b.com', area: '100', updatedAt: '2025-01-01T00:00:00Z' } as Partial<Client>)).toBe(0);
    // phone=10 + email=5 + area=5 = 20, penalty=-20 => 0
  });

  it('clamps score to max 100', () => {
    const full: Partial<Client> = {
      phone: '123',
      email: 'a@b.com',
      area: '100',
      location: 'Buc',
      currentSystem: ['gaz'],
      consumptionAmount: '500',
      hasSolarPanels: true,
      primaryType: 'res' as never,
      budgetLevel: 'med' as never,
      nextContact: '2026-04-01' as never,
      stage: 'Contractat',
    };
    // 10+5+5+5+5+5+10+10+5+10 = 70, +50 = 120, clamped to 100
    expect(calcScore(full)).toBe(100);
  });

  it('clamps score to min 0 for negative total', () => {
    expect(calcScore({ stage: 'Pierdut' })).toBe(0);
  });
});

describe('getNextAction', () => {
  beforeEach(() => {
    mockDaysSince.mockReturnValue(0);
  });

  it('returns "Client pierdut" for Pierdut stage', () => {
    expect(getNextAction({ stage: 'Pierdut' })).toBe('Client pierdut');
  });

  it('returns "Client contractat" with checkmark for Contractat stage', () => {
    expect(getNextAction({ stage: 'Contractat' })).toContain('Client contractat');
    expect(getNextAction({ stage: 'Contractat' })).toContain('\u2714');
  });

  it('returns "Adauga nr. telefon" when phone is missing', () => {
    expect(getNextAction({ stage: 'T1' })).toBe('Adauga nr. telefon');
  });

  it('returns "Identifica tipologia" for T1 without primaryType', () => {
    expect(getNextAction({ stage: 'T1', phone: '123' })).toBe('Identifica tipologia clientului');
  });

  it('returns T1 step progress when primaryType exists and steps < 13', () => {
    const result = getNextAction({ stage: 'T1', phone: '123', primaryType: 'res' as never, t1Step: 5 } as Partial<Client>);
    expect(result).toBe('Continua traseu T1 (pas 6/13)');
  });

  it('returns "Muta in T2" when T1 is complete', () => {
    const result = getNextAction({ stage: 'T1', phone: '123', primaryType: 'res' as never, t1Step: 13 } as Partial<Client>);
    expect(result).toBe('Muta in T2');
  });

  it('returns T2 step progress when steps < 5', () => {
    const result = getNextAction({ stage: 'T2', phone: '123', t2Step: 2 } as Partial<Client>);
    expect(result).toBe('Continua traseu T2 (pas 3/5)');
  });

  it('returns "Muta in T3" when T2 is complete', () => {
    const result = getNextAction({ stage: 'T2', phone: '123', t2Step: 5 } as Partial<Client>);
    expect(result).toBe('Muta in T3');
  });

  it('returns T3 step progress when steps < 7', () => {
    const result = getNextAction({ stage: 'T3', phone: '123', t3Step: 3 } as Partial<Client>);
    expect(result).toBe('Continua traseu T3 (pas 4/7)');
  });

  it('returns "Confirma varianta de plata" when T3 steps complete but no paymentVariant', () => {
    const result = getNextAction({ stage: 'T3', phone: '123', t3Step: 7 } as Partial<Client>);
    expect(result).toBe('Confirma varianta de plata');
  });

  it('returns "Contracteaza clientul" when T3 is fully complete', () => {
    const result = getNextAction({ stage: 'T3', phone: '123', t3Step: 7, paymentVariant: 'rate' } as Partial<Client>);
    expect(result).toBe('Contracteaza clientul');
  });

  it('defaults to T1 when stage is undefined', () => {
    expect(getNextAction({})).toBe('Adauga nr. telefon');
  });

  it('returns "Urmareste progresul" as fallback', () => {
    // Need an unknown stage that isn't T1/T2/T3/Pierdut/Contractat
    // with phone set and age <= 7
    mockDaysSince.mockReturnValue(0);
    const result = getNextAction({ stage: 'Unknown' as never, phone: '123' });
    expect(result).toBe('Urmareste progresul');
  });
});
