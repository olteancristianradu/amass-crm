import { prisma } from '../../config/database';

export class SequenceService {
  async createSequence(tenantId: string, userId: string, data: { name: string; steps: unknown[] }) {
    const sequence = await prisma.sequence.create({
      data: {
        tenant: { connect: { id: tenantId } },
        name: data.name,
        steps: data.steps as any,
        createdBy: userId,
      },
    });
    return sequence;
  }

  async updateSequence(id: string, data: Partial<{ name: string; steps: unknown[]; status: string }>) {
    const sequence = await prisma.sequence.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.steps !== undefined ? { steps: data.steps as any } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
    return sequence;
  }

  async deleteSequence(id: string) {
    await prisma.sequence.delete({ where: { id } });
  }

  async listSequences(tenantId: string) {
    const sequences = await prisma.sequence.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { enrollments: true } },
      },
    });
    return sequences;
  }

  async getSequence(id: string) {
    const sequence = await prisma.sequence.findUnique({
      where: { id },
      include: {
        _count: { select: { enrollments: true } },
      },
    });
    if (!sequence) {
      throw new Error('Sequence not found');
    }
    return sequence;
  }

  async enrollContact(sequenceId: string, contactId: string, tenantId: string) {
    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequence: { connect: { id: sequenceId } },
        contactId,
        tenantId,
        status: 'active',
        currentStep: 0,
        nextStepAt: new Date(),
      },
    });
    return enrollment;
  }

  async unenrollContact(enrollmentId: string) {
    const enrollment = await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'unsubscribed' },
    });
    return enrollment;
  }

  async processNextSteps() {
    const now = new Date();

    const enrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        status: 'active',
        nextStepAt: { lte: now },
      },
      include: {
        sequence: true,
      },
    });

    let processed = 0;

    for (const enrollment of enrollments) {
      const steps = enrollment.sequence.steps as unknown[];
      if (!Array.isArray(steps)) continue;

      const currentStepIndex = enrollment.currentStep;

      if (currentStepIndex >= steps.length) {
        // Sequence completed
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: 'completed', completedAt: now },
        });
        continue;
      }

      const step = steps[currentStepIndex] as { type?: string; delayMinutes?: number };

      // Log activity for the executed step
      await prisma.activity.create({
        data: {
          tenantId: enrollment.tenantId,
          userId: enrollment.sequence.createdBy,
          contactId: enrollment.contactId,
          type: 'sequence_step',
          subject: `Sequence "${enrollment.sequence.name}" - Step ${currentStepIndex + 1}`,
          body: JSON.stringify(step),
          metadata: {
            sequenceId: enrollment.sequenceId,
            enrollmentId: enrollment.id,
            step: currentStepIndex,
          },
        },
      });

      const nextStepIndex = currentStepIndex + 1;
      const delayMinutes = step.delayMinutes || 60;

      if (nextStepIndex >= steps.length) {
        // Last step executed, mark as completed
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            currentStep: nextStepIndex,
            status: 'completed',
            completedAt: now,
            nextStepAt: null,
          },
        });
      } else {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            currentStep: nextStepIndex,
            nextStepAt: new Date(now.getTime() + delayMinutes * 60 * 1000),
          },
        });
      }

      processed++;
    }

    return { processed };
  }

  async getSequenceStats(sequenceId: string) {
    const [active, completed, unsubscribed, bounced] = await Promise.all([
      prisma.sequenceEnrollment.count({ where: { sequenceId, status: 'active' } }),
      prisma.sequenceEnrollment.count({ where: { sequenceId, status: 'completed' } }),
      prisma.sequenceEnrollment.count({ where: { sequenceId, status: 'unsubscribed' } }),
      prisma.sequenceEnrollment.count({ where: { sequenceId, status: 'bounced' } }),
    ]);

    return { active, completed, unsubscribed, bounced, total: active + completed + unsubscribed + bounced };
  }
}
