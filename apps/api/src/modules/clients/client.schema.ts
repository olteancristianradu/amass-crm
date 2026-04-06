import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(200).optional(),
  location: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  stage: z.enum(['T1', 'T2', 'T3', 'Contractat', 'Pierdut']).optional(),
  assignedToId: z.string().optional(),
  area: z.string().max(20).optional(),
});

export const updateClientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  assignedToId: z.string().nullable().optional(),
  area: z.string().max(20).optional(),
  floors: z.string().max(10).optional(),
  construction: z.array(z.string()).optional(),
  insulation: z.array(z.string()).optional(),
  currentSystem: z.array(z.string()).optional(),
  currentSystemOther: z.string().max(200).optional(),
  connectedTo: z.array(z.string()).optional(),
  consumptionType: z.string().max(50).optional(),
  consumptionAmount: z.string().max(50).optional(),
  consumptionUnit: z.string().max(50).optional(),
  electricConnection: z.string().max(50).optional(),
  pvPower: z.string().max(20).optional(),
  batteries: z.string().max(50).optional(),
  inverter: z.string().max(50).optional(),
  annualProduction: z.string().max(50).optional(),
  hasSolarPanels: z.boolean().optional(),
  t1Step: z.number().int().min(0).max(13).optional(),
  t1Checks: z.record(z.boolean()).optional(),
  t1Notes: z.record(z.string()).optional(),
  budgetLevel: z.string().max(50).optional(),
  primaryType: z.string().max(50).optional(),
  secondaryType: z.string().max(50).optional(),
  positiveReaction: z.string().max(500).optional(),
  t1Resistances: z.string().max(1000).optional(),
  t2Step: z.number().int().min(0).max(5).optional(),
  t2Checks: z.record(z.boolean()).optional(),
  t2Notes: z.record(z.string()).optional(),
  timeline: z.string().max(200).optional(),
  technicalSolution: z.string().max(1000).optional(),
  priceReaction: z.string().max(500).optional(),
  t2Resistances: z.string().max(1000).optional(),
  t3Step: z.number().int().min(0).max(7).optional(),
  t3Checks: z.record(z.boolean()).optional(),
  t3Notes: z.record(z.string()).optional(),
  calculatedConsumption: z.string().max(100).optional(),
  installedPower: z.string().max(100).optional(),
  offeredAmount: z.string().max(100).optional(),
  paymentVariant: z.string().max(50).optional(),
  installmentAmount: z.string().max(100).optional(),
  fullPaymentAmount: z.string().max(100).optional(),
  depositAmount: z.string().max(100).optional(),
  offerReaction: z.string().max(500).optional(),
  t3Resistances: z.string().max(1000).optional(),
  nextContact: z.string().datetime().nullable().optional(),
  importNote: z.string().max(1000).optional(),
  formNotes: z.string().max(5000).optional(),
  fisaData: z.record(z.unknown()).nullable().optional(),
}).strict();

export const moveStageSchema = z.object({
  stage: z.enum(['T1', 'T2', 'T3', 'Contractat', 'Pierdut']),
  lossReason: z.string().max(200).optional(),
  lossNote: z.string().max(1000).optional(),
});

export const importEmailSchema = z.object({
  rawText: z.string().min(1).max(10000),
  assignTo: z.string().optional(),
});

export const importBatchSchema = z.object({
  emails: z.array(z.object({
    rawText: z.string().min(1).max(10000),
    assignTo: z.string().optional(),
  })).min(1).max(100),
});
