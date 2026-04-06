import { prisma } from '../../config/database';
import { env } from '../../config/env';

/**
 * AI/ML service for CRM intelligence features.
 * Uses rule-based scoring with ML-ready data structures.
 * In production, swap with actual ML model predictions.
 */
export class AiService {
  /**
   * ML-based lead scoring using multiple signals.
   * Returns a score 0-100 based on engagement, profile completeness,
   * deal value, activity recency, and behavioral patterns.
   */
  async scoreContact(tenantId: string, contactId: string): Promise<{
    score: number;
    signals: Array<{ name: string; value: number; weight: number }>;
    recommendation: string;
  }> {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId },
      include: {
        deals: { include: { deal: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        tasks: true,
        emailMessages: true,
        smsMessages: true,
        company: true,
      },
    });

    if (!contact) throw new Error('Contact not found');

    const signals: Array<{ name: string; value: number; weight: number }> = [];

    // Profile completeness (0-20)
    let profileScore = 0;
    if (contact.email) profileScore += 4;
    if (contact.phone) profileScore += 4;
    if (contact.company) profileScore += 4;
    if (contact.jobTitle) profileScore += 4;
    if (contact.source) profileScore += 4;
    signals.push({ name: 'profile_completeness', value: profileScore, weight: 0.15 });

    // Engagement recency (0-20)
    const lastActivity = contact.activities[0];
    let recencyScore = 0;
    if (lastActivity) {
      const daysSince = (Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 1) recencyScore = 20;
      else if (daysSince < 3) recencyScore = 16;
      else if (daysSince < 7) recencyScore = 12;
      else if (daysSince < 14) recencyScore = 8;
      else if (daysSince < 30) recencyScore = 4;
    }
    signals.push({ name: 'engagement_recency', value: recencyScore, weight: 0.25 });

    // Activity volume (0-20)
    const activityCount = contact.activities.length;
    const volumeScore = Math.min(20, activityCount * 2);
    signals.push({ name: 'activity_volume', value: volumeScore, weight: 0.15 });

    // Deal potential (0-20)
    const activeDeals = contact.deals.filter(d => !d.deal.closedAt);
    let dealScore = 0;
    if (activeDeals.length > 0) {
      const totalValue = activeDeals.reduce((sum, d) => sum + Number(d.deal.value), 0);
      if (totalValue > 50000) dealScore = 20;
      else if (totalValue > 20000) dealScore = 16;
      else if (totalValue > 10000) dealScore = 12;
      else if (totalValue > 5000) dealScore = 8;
      else dealScore = 4;
    }
    signals.push({ name: 'deal_potential', value: dealScore, weight: 0.25 });

    // Communication responsiveness (0-20)
    const emails = contact.emailMessages.length;
    const sms = contact.smsMessages.length;
    const commScore = Math.min(20, (emails + sms) * 3);
    signals.push({ name: 'communication', value: commScore, weight: 0.20 });

    // Calculate weighted score
    const score = Math.round(
      signals.reduce((sum, s) => sum + s.value * s.weight, 0) /
      signals.reduce((sum, s) => sum + 20 * s.weight, 0) * 100
    );

    // Generate recommendation
    let recommendation = '';
    if (score >= 80) recommendation = 'Hot lead - prioritizeaza contactul imediat';
    else if (score >= 60) recommendation = 'Lead promitator - programeaza un follow-up';
    else if (score >= 40) recommendation = 'Lead mediu - continua nurturing prin email';
    else if (score >= 20) recommendation = 'Lead rece - adauga in campanie automatizata';
    else recommendation = 'Lead inactiv - verifica daca datele sunt corecte';

    // Update contact score
    await prisma.contact.update({ where: { id: contactId }, data: { score } });

    return { score, signals, recommendation };
  }

  /**
   * Score all contacts in a tenant (batch operation).
   */
  async scoreAllContacts(tenantId: string): Promise<{ scored: number; avgScore: number }> {
    const contacts = await prisma.contact.findMany({
      where: { tenantId },
      select: { id: true },
    });

    let totalScore = 0;
    for (const c of contacts) {
      try {
        const result = await this.scoreContact(tenantId, c.id);
        totalScore += result.score;
      } catch {
        // Skip contacts that fail scoring
      }
    }

    return {
      scored: contacts.length,
      avgScore: contacts.length > 0 ? Math.round(totalScore / contacts.length) : 0,
    };
  }

  /**
   * AI-powered email draft generation.
   * Uses templates and contact context to generate personalized emails.
   * In production, this would call an LLM API (Claude, GPT, etc.)
   */
  async draftEmail(tenantId: string, params: {
    contactId: string;
    purpose: 'introduction' | 'follow_up' | 'proposal' | 'thank_you' | 're_engage';
    context?: string;
  }): Promise<{ subject: string; body: string }> {
    const contact = await prisma.contact.findFirst({
      where: { id: params.contactId, tenantId },
      include: {
        company: true,
        deals: { include: { deal: { include: { stage: true } } } },
        activities: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!contact) throw new Error('Contact not found');

    const name = `${contact.firstName} ${contact.lastName}`.trim();
    const companyName = contact.company?.name || '';
    const activeDeals = contact.deals.filter(d => !d.deal.closedAt);
    const dealInfo = activeDeals.length > 0 ? activeDeals[0].deal : null;

    const templates: Record<string, { subject: string; body: string }> = {
      introduction: {
        subject: `Introducere - AMASS${companyName ? ` pentru ${companyName}` : ''}`,
        body: `Buna ziua ${name},\n\nMa numesc [Numele tau] de la AMASS si as dori sa va prezint solutiile noastre${companyName ? ` pentru ${companyName}` : ''}.\n\n${params.context || 'Am identificat cateva oportunitati prin care va putem ajuta sa va optimizati procesele.'}\n\nAti fi disponibil pentru o discutie scurta de 15 minute saptamana aceasta?\n\nCu stima,\n[Numele tau]\nAMASS`,
      },
      follow_up: {
        subject: `Follow-up: ${dealInfo?.title || 'discutia noastra'}`,
        body: `Buna ziua ${name},\n\nRevin cu privire la ${dealInfo?.title || 'discutia noastra anterioara'}.\n\n${params.context || 'As dori sa aflu daca ati avut timpul sa analizati propunerea.'}\n\nSunt la dispozitia dvs. pentru orice intrebare.\n\nCu stima,\n[Numele tau]\nAMASS`,
      },
      proposal: {
        subject: `Propunere: ${dealInfo?.title || 'solutie personalizata'}`,
        body: `Buna ziua ${name},\n\nVa trimit atasat propunerea noastra${dealInfo ? ` pentru ${dealInfo.title}` : ''}.\n\n${params.context || 'Am pregatit o solutie adaptata nevoilor dumneavoastra.'}\n\n${dealInfo ? `Valoare estimata: ${Number(dealInfo.value).toLocaleString('ro-RO')} ${dealInfo.currency}\n\n` : ''}Raman la dispozitie pentru a discuta detaliile.\n\nCu stima,\n[Numele tau]\nAMASS`,
      },
      thank_you: {
        subject: `Multumim${companyName ? `, ${companyName}` : ''}!`,
        body: `Buna ziua ${name},\n\nVa multumim pentru increderea acordata${companyName ? ` echipei ${companyName}` : ''}.\n\n${params.context || 'A fost o placere sa colaboram si asteptam cu nerabdare continuarea parteneriatului.'}\n\nDaca aveti nevoie de orice, nu ezitati sa ne contactati.\n\nCu stima,\n[Numele tau]\nAMASS`,
      },
      re_engage: {
        subject: `Ne este dor de dvs., ${name}`,
        body: `Buna ziua ${name},\n\nA trecut ceva timp de la ultimul nostru contact si as dori sa reluam discutia.\n\n${params.context || 'Am cateva noutati si imbunatatiri care v-ar putea interesa.'}\n\nAti fi disponibil pentru o scurta conversatie?\n\nCu stima,\n[Numele tau]\nAMASS`,
      },
    };

    return templates[params.purpose] || templates.follow_up;
  }

  /**
   * Next-best-action suggestions for a contact/deal.
   * Analyzes current state and activity history to recommend actions.
   */
  async suggestNextAction(tenantId: string, params: {
    contactId?: string;
    dealId?: string;
  }): Promise<Array<{ action: string; reason: string; priority: 'high' | 'medium' | 'low' }>> {
    const suggestions: Array<{ action: string; reason: string; priority: 'high' | 'medium' | 'low' }> = [];

    if (params.dealId) {
      const deal = await prisma.deal.findFirst({
        where: { id: params.dealId, tenantId },
        include: {
          stage: true,
          contacts: { include: { contact: true } },
          activities: { orderBy: { createdAt: 'desc' }, take: 10 },
          tasks: { where: { status: { not: 'completed' } } },
          lineItems: true,
        },
      });

      if (deal) {
        // Check if no activity in last 3 days
        const lastActivity = deal.activities[0];
        if (!lastActivity || Date.now() - new Date(lastActivity.createdAt).getTime() > 3 * 24 * 60 * 60 * 1000) {
          suggestions.push({
            action: 'Contacteaza clientul - deal-ul stagneza',
            reason: `Nu exista activitate in ultimele 3 zile pe deal-ul "${deal.title}"`,
            priority: 'high',
          });
        }

        // Check if no contacts linked
        if (deal.contacts.length === 0) {
          suggestions.push({
            action: 'Adauga un contact la acest deal',
            reason: 'Deal-ul nu are niciun contact asociat',
            priority: 'medium',
          });
        }

        // Check if no line items and deal is in advanced stage
        if (deal.lineItems.length === 0 && deal.stage.sortOrder >= 2) {
          suggestions.push({
            action: 'Adauga produse/servicii la deal',
            reason: 'Deal-ul este in stadiu avansat dar nu are produse',
            priority: 'medium',
          });
        }

        // Check overdue tasks
        const overdueTasks = deal.tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());
        if (overdueTasks.length > 0) {
          suggestions.push({
            action: `Rezolva ${overdueTasks.length} task-uri restante`,
            reason: 'Exista task-uri cu termen depasit',
            priority: 'high',
          });
        }

        // Check if expected close date is soon
        if (deal.expectedCloseDate) {
          const daysUntilClose = (new Date(deal.expectedCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          if (daysUntilClose < 7 && daysUntilClose > 0) {
            suggestions.push({
              action: 'Pregateste propunerea finala - termen apropiat',
              reason: `Data estimata de inchidere este in ${Math.round(daysUntilClose)} zile`,
              priority: 'high',
            });
          } else if (daysUntilClose < 0) {
            suggestions.push({
              action: 'Actualizeaza data estimata de inchidere',
              reason: 'Data estimata a fost depasita',
              priority: 'medium',
            });
          }
        }
      }
    }

    if (params.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: params.contactId, tenantId },
        include: {
          activities: { orderBy: { createdAt: 'desc' }, take: 5 },
          deals: { include: { deal: true } },
          consentRecords: { where: { revokedAt: null } },
        },
      });

      if (contact) {
        // No recent activity
        if (contact.activities.length === 0) {
          suggestions.push({
            action: 'Initializeaza primul contact',
            reason: 'Contactul nu are nicio activitate inregistrata',
            priority: 'high',
          });
        }

        // No deals
        if (contact.deals.length === 0) {
          suggestions.push({
            action: 'Creeaza un deal pentru acest contact',
            reason: 'Contactul nu are niciun deal asociat',
            priority: 'medium',
          });
        }

        // Missing consent
        if (contact.consentRecords.length === 0) {
          suggestions.push({
            action: 'Obtine consimtamantul GDPR',
            reason: 'Nu exista niciun consimtamant inregistrat',
            priority: 'medium',
          });
        }

        // Incomplete profile
        if (!contact.email || !contact.phone) {
          suggestions.push({
            action: 'Completeaza profilul contactului',
            reason: `Lipseste: ${!contact.email ? 'email' : ''} ${!contact.phone ? 'telefon' : ''}`.trim(),
            priority: 'low',
          });
        }
      }
    }

    // Sort by priority
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));

    return suggestions;
  }

  /**
   * Simple sentiment analysis based on keywords.
   * In production, use an NLP model or API.
   */
  analyzeSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; confidence: number; keywords: string[] } {
    const lower = text.toLowerCase();

    const positiveWords = ['multumesc', 'excelent', 'perfect', 'super', 'bine', 'da', 'accept', 'acord', 'interesat', 'doresc', 'apreciez', 'minunat', 'fantastic'];
    const negativeWords = ['nu', 'scump', 'problema', 'nemultumit', 'dezamagit', 'rau', 'gresit', 'prost', 'refuz', 'renunt', 'anuleaza', 'reclamatie', 'neinteresat'];

    const foundPositive = positiveWords.filter(w => lower.includes(w));
    const foundNegative = negativeWords.filter(w => lower.includes(w));

    const posScore = foundPositive.length;
    const negScore = foundNegative.length;
    const total = posScore + negScore;

    if (total === 0) return { sentiment: 'neutral', confidence: 0.5, keywords: [] };

    if (posScore > negScore) {
      return { sentiment: 'positive', confidence: Math.min(0.95, 0.5 + posScore / total * 0.45), keywords: foundPositive };
    } else if (negScore > posScore) {
      return { sentiment: 'negative', confidence: Math.min(0.95, 0.5 + negScore / total * 0.45), keywords: foundNegative };
    }
    return { sentiment: 'neutral', confidence: 0.5, keywords: [...foundPositive, ...foundNegative] };
  }

  /**
   * Churn prediction based on engagement patterns.
   * Returns probability of losing the deal/contact.
   */
  async predictChurn(tenantId: string, dealId: string): Promise<{
    churnProbability: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
  }> {
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, tenantId },
      include: {
        stage: true,
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!deal) throw new Error('Deal not found');

    const factors: string[] = [];
    let riskScore = 0;

    // Inactivity
    const lastActivity = deal.activities[0];
    if (lastActivity) {
      const daysSince = (Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 30) { riskScore += 30; factors.push('Inactiv de peste 30 zile'); }
      else if (daysSince > 14) { riskScore += 20; factors.push('Inactiv de peste 14 zile'); }
      else if (daysSince > 7) { riskScore += 10; factors.push('Inactiv de peste 7 zile'); }
    } else {
      riskScore += 25;
      factors.push('Nicio activitate inregistrata');
    }

    // Stage rotting
    if (deal.stage.rottingDays) {
      const daysInStage = (Date.now() - new Date(deal.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysInStage > deal.stage.rottingDays) {
        riskScore += 20;
        factors.push(`Deal stagnant in etapa ${deal.stage.name}`);
      }
    }

    // Declining activity
    if (deal.activities.length >= 10) {
      const recentCount = deal.activities.filter(a => Date.now() - new Date(a.createdAt).getTime() < 14 * 24 * 60 * 60 * 1000).length;
      const olderCount = deal.activities.filter(a => {
        const age = Date.now() - new Date(a.createdAt).getTime();
        return age >= 14 * 24 * 60 * 60 * 1000 && age < 28 * 24 * 60 * 60 * 1000;
      }).length;
      if (olderCount > 0 && recentCount < olderCount / 2) {
        riskScore += 15;
        factors.push('Activitate in scadere');
      }
    }

    // Expected close date passed
    if (deal.expectedCloseDate && new Date(deal.expectedCloseDate) < new Date()) {
      riskScore += 15;
      factors.push('Data estimata de inchidere depasita');
    }

    // Low probability stage
    if (deal.stage.probability < 25 && deal.stage.sortOrder > 0) {
      riskScore += 10;
      factors.push('Probabilitate scazuta de conversie');
    }

    const churnProbability = Math.min(95, riskScore);
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (churnProbability >= 70) riskLevel = 'critical';
    else if (churnProbability >= 50) riskLevel = 'high';
    else if (churnProbability >= 30) riskLevel = 'medium';
    else riskLevel = 'low';

    return { churnProbability, riskLevel, factors };
  }

  /** Transcribe a call recording using OpenAI Whisper API */
  async transcribeCall(callId: string): Promise<{ transcript: string }> {
    const call = await prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new Error('Call not found');
    if (!call.recordingUrl) throw new Error('No recording available');

    if (!env.OPENAI_API_KEY) {
      // Mock transcript when no API key
      const transcript = `[Mock transcript for call ${callId}]\nAgent: Hello, how can I help you today?\nCustomer: I'm interested in your services.\nAgent: Let me walk you through our offerings...`;
      await prisma.call.update({ where: { id: callId }, data: { transcript } });
      return { transcript };
    }

    // Fetch recording and send to Whisper API
    const audioResp = await fetch(call.recordingUrl);
    const audioBlob = await audioResp.blob();
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.mp3');
    formData.append('model', 'whisper-1');

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
      body: formData,
    });

    const result = await resp.json() as { text: string };
    const transcript = result.text;
    await prisma.call.update({ where: { id: callId }, data: { transcript } });
    return { transcript };
  }

  /** Summarize a call transcript using OpenAI */
  async summarizeTranscript(transcript: string): Promise<{
    summary: string;
    keyTopics: string[];
    actionItems: string[];
    decisions: string[];
    sentiment: string;
  }> {
    if (!env.OPENAI_API_KEY) {
      return {
        summary: 'Call discussed product offerings and pricing. Customer showed interest in pro plan.',
        keyTopics: ['product demo', 'pricing', 'pro plan'],
        actionItems: ['Send proposal', 'Schedule follow-up'],
        decisions: ['Customer will review proposal'],
        sentiment: 'positive',
      };
    }

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: 'Analyze this call transcript. Return JSON with: summary (string), keyTopics (string[]), actionItems (string[]), decisions (string[]), sentiment (positive/negative/neutral).',
        }, {
          role: 'user',
          content: transcript,
        }],
        response_format: { type: 'json_object' },
      }),
    });

    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    return JSON.parse(data.choices[0].message.content);
  }

  /** Extract action items from transcript and create Task records */
  async extractActionItems(callId: string, transcript: string, tenantId: string, userId: string): Promise<Array<{ task: string; dueDate?: string }>> {
    const summary = await this.summarizeTranscript(transcript);
    const tasks = [];
    for (const item of summary.actionItems) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      const task = await prisma.task.create({
        data: {
          tenantId,
          title: item,
          description: `Auto-extracted from call ${callId}`,
          status: 'todo',
          priority: 'medium',
          dueDate,
          userId,
          createdById: userId,
        },
      });
      tasks.push({ task: item, dueDate: dueDate.toISOString() });
    }
    return tasks;
  }

  /** Analyze sentiment of a call transcript */
  analyzeCallSentiment(transcript: string): { score: number; label: string; keyPhrases: string[] } {
    const result = this.analyzeSentiment(transcript);
    const score = result.sentiment === 'positive' ? 0.8 : result.sentiment === 'negative' ? 0.2 : 0.5;
    return {
      score,
      label: result.sentiment,
      keyPhrases: result.keywords,
    };
  }
}
