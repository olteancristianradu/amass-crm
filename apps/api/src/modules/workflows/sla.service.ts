import { prisma } from '../../config/database';

export class SlaService {
  /**
   * Find deals whose updatedAt is older than their stage's rottingDays threshold.
   */
  async checkIdleLeads(tenantId: string) {
    const deals = await prisma.deal.findMany({
      where: {
        tenantId,
        closedAt: null,
      },
      include: {
        stage: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    const now = Date.now();
    const idleDeals = deals.filter((deal) => {
      const rottingDays = deal.stage.rottingDays;
      if (!rottingDays) return false;
      const ageMs = now - deal.updatedAt.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      return ageDays > rottingDays;
    });

    return idleDeals.map((deal) => ({
      dealId: deal.id,
      title: deal.title,
      stageName: deal.stage.name,
      rottingDays: deal.stage.rottingDays,
      daysSinceUpdate: Math.floor((now - deal.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
      assignedTo: deal.assignedTo,
    }));
  }

  /**
   * Find tasks where dueDate < now and status is not completed or cancelled.
   */
  async checkOverdueTasks(tenantId: string) {
    const tasks = await prisma.task.findMany({
      where: {
        tenantId,
        dueDate: { lt: new Date() },
        status: { notIn: ['completed', 'cancelled'] },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return tasks.map((task) => ({
      taskId: task.id,
      title: task.title,
      dueDate: task.dueDate,
      status: task.status,
      priority: task.priority,
      assignedTo: task.user,
    }));
  }

  /**
   * Find contacts created more than N hours ago with zero activities.
   */
  async checkUnrespondedContacts(tenantId: string, hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const contacts = await prisma.contact.findMany({
      where: {
        tenantId,
        createdAt: { lt: cutoff },
        activities: { none: {} },
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return contacts.map((contact) => ({
      contactId: contact.id,
      name: `${contact.firstName} ${contact.lastName}`.trim(),
      email: contact.email,
      phone: contact.phone,
      createdAt: contact.createdAt,
      hoursSinceCreation: Math.floor((Date.now() - contact.createdAt.getTime()) / (1000 * 60 * 60)),
      assignedTo: contact.assignedTo,
    }));
  }

  /**
   * Run all SLA checks and return a combined summary.
   */
  async runAllChecks(tenantId: string) {
    const [idleLeads, overdueTasks, unrespondedContacts] = await Promise.all([
      this.checkIdleLeads(tenantId),
      this.checkOverdueTasks(tenantId),
      this.checkUnrespondedContacts(tenantId),
    ]);

    return {
      idleLeads: { count: idleLeads.length, items: idleLeads },
      overdueTasks: { count: overdueTasks.length, items: overdueTasks },
      unrespondedContacts: { count: unrespondedContacts.length, items: unrespondedContacts },
      checkedAt: new Date().toISOString(),
    };
  }
}
