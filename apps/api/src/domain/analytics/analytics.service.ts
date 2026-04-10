import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    const profile = await this.prisma.profile.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return this.emptyOverview();
    }

    // Get all user's links
    const links = await this.prisma.socialLink.findMany({
      where: { profileId: profile.id },
      select: { id: true, totalClicks: true, views: true, title: true, platform: true, url: true },
    });

    const linkIds = links.map((l) => l.id);

    // Get all user's forms
    const forms = await this.prisma.form.findMany({
      where: { userId },
      select: { id: true, title: true, viewCount: true, submissionCount: true },
    });

    // ── Current period link analytics ──
    const currentLinkStats = linkIds.length > 0
      ? await this.prisma.link_analytics.aggregate({
          where: { linkId: { in: linkIds }, date: { gte: startDate } },
          _sum: { clicks: true },
        })
      : { _sum: { clicks: 0 } };

    // ── Previous period link analytics ──
    const prevLinkStats = linkIds.length > 0
      ? await this.prisma.link_analytics.aggregate({
          where: { linkId: { in: linkIds }, date: { gte: prevStartDate, lt: startDate } },
          _sum: { clicks: true },
        })
      : { _sum: { clicks: 0 } };

    // ── Current period form analytics ──
    const formIds = forms.map((f) => f.id);
    const currentFormStats = formIds.length > 0
      ? await this.prisma.form_analytics.aggregate({
          where: { formId: { in: formIds }, date: { gte: startDate } },
          _sum: { views: true, submissions: true },
        })
      : { _sum: { views: 0, submissions: 0 } };

    // ── Previous period form analytics ──
    const prevFormStats = formIds.length > 0
      ? await this.prisma.form_analytics.aggregate({
          where: { formId: { in: formIds }, date: { gte: prevStartDate, lt: startDate } },
          _sum: { views: true, submissions: true },
        })
      : { _sum: { views: 0, submissions: 0 } };

    const totalClicks = currentLinkStats._sum.clicks || 0;
    const prevClicks = prevLinkStats._sum.clicks || 0;
    const totalFormViews = currentFormStats._sum.views || 0;
    const prevFormViews = prevFormStats._sum.views || 0;
    const totalSubmissions = currentFormStats._sum.submissions || 0;
    const prevSubmissions = prevFormStats._sum.submissions || 0;
    const totalLinkViews = links.reduce((sum, l) => sum + l.views, 0);

    // Daily click data for chart
    const dailyClicks = linkIds.length > 0
      ? await this.prisma.link_analytics.groupBy({
          by: ['date'],
          where: { linkId: { in: linkIds }, date: { gte: startDate } },
          _sum: { clicks: true },
          orderBy: { date: 'asc' },
        })
      : [];

    // Daily form submissions for chart
    const dailySubmissions = formIds.length > 0
      ? await this.prisma.form_analytics.groupBy({
          by: ['date'],
          where: { formId: { in: formIds }, date: { gte: startDate } },
          _sum: { views: true, submissions: true },
          orderBy: { date: 'asc' },
        })
      : [];

    // Device breakdown
    const deviceBreakdown = linkIds.length > 0
      ? await this.prisma.link_analytics.groupBy({
          by: ['device'],
          where: { linkId: { in: linkIds }, date: { gte: startDate } },
          _sum: { clicks: true },
        })
      : [];

    // Browser breakdown
    const browserBreakdown = linkIds.length > 0
      ? await this.prisma.link_analytics.groupBy({
          by: ['browser'],
          where: { linkId: { in: linkIds }, date: { gte: startDate }, browser: { not: null } },
          _sum: { clicks: true },
          orderBy: { _sum: { clicks: 'desc' } },
          take: 5,
        })
      : [];

    // Country breakdown
    const countryBreakdown = linkIds.length > 0
      ? await this.prisma.link_analytics.groupBy({
          by: ['country'],
          where: { linkId: { in: linkIds }, date: { gte: startDate }, country: { not: null } },
          _sum: { clicks: true },
          orderBy: { _sum: { clicks: 'desc' } },
          take: 8,
        })
      : [];

    // Referrer breakdown
    const referrerBreakdown = linkIds.length > 0
      ? await this.prisma.link_analytics.groupBy({
          by: ['referrer'],
          where: { linkId: { in: linkIds }, date: { gte: startDate }, referrer: { not: null } },
          _sum: { clicks: true },
          orderBy: { _sum: { clicks: 'desc' } },
          take: 5,
        })
      : [];

    // Top links by clicks
    const topLinks = [...links]
      .sort((a, b) => b.totalClicks - a.totalClicks)
      .slice(0, 5)
      .map((l) => ({
        id: l.id,
        title: l.title || l.platform,
        platform: l.platform,
        url: l.url,
        clicks: l.totalClicks,
      }));

    // Top forms by submissions
    const topForms = [...forms]
      .sort((a, b) => b.submissionCount - a.submissionCount)
      .slice(0, 5)
      .map((f) => ({
        id: f.id,
        title: f.title,
        views: f.viewCount,
        submissions: f.submissionCount,
        conversionRate: f.viewCount > 0
          ? Math.round((f.submissionCount / f.viewCount) * 100)
          : 0,
      }));

    const chartData = this.buildChartData(dailyClicks, dailySubmissions, days);

    const conversionRate = totalFormViews > 0 ? Math.round((totalSubmissions / totalFormViews) * 100) : 0;
    const prevConversionRate = prevFormViews > 0 ? Math.round((prevSubmissions / prevFormViews) * 100) : 0;

    return {
      summary: {
        totalClicks,
        totalLinkViews,
        totalFormViews,
        totalSubmissions,
        linksCount: links.length,
        formsCount: forms.length,
        conversionRate,
        changes: {
          clicks: this.calcChange(totalClicks, prevClicks),
          formViews: this.calcChange(totalFormViews, prevFormViews),
          submissions: this.calcChange(totalSubmissions, prevSubmissions),
          conversionRate: this.calcChange(conversionRate, prevConversionRate),
        },
      },
      chartData,
      deviceBreakdown: deviceBreakdown.map((d) => ({
        device: d.device || 'unknown',
        clicks: d._sum.clicks || 0,
      })),
      browserBreakdown: browserBreakdown.map((b) => ({
        browser: b.browser || 'unknown',
        clicks: b._sum.clicks || 0,
      })),
      countryBreakdown: countryBreakdown.map((c) => ({
        country: c.country || 'unknown',
        clicks: c._sum.clicks || 0,
      })),
      referrerBreakdown: referrerBreakdown.map((r) => ({
        referrer: r.referrer || 'مباشر',
        clicks: r._sum.clicks || 0,
      })),
      topLinks,
      topForms,
    };
  }

  private calcChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private buildChartData(
    dailyClicks: { date: Date; _sum: { clicks: number | null } }[],
    dailySubmissions: { date: Date; _sum: { views: number | null; submissions: number | null } }[],
    days: number,
  ) {
    const data: { date: string; clicks: number; submissions: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const clickEntry = dailyClicks.find(
        (c) => c.date.toISOString().split('T')[0] === dateStr,
      );
      const subEntry = dailySubmissions.find(
        (s) => s.date.toISOString().split('T')[0] === dateStr,
      );

      data.push({
        date: dateStr,
        clicks: clickEntry?._sum.clicks || 0,
        submissions: subEntry?._sum.submissions || 0,
      });
    }

    return data;
  }

  private emptyOverview() {
    return {
      summary: {
        totalClicks: 0,
        totalLinkViews: 0,
        totalFormViews: 0,
        totalSubmissions: 0,
        linksCount: 0,
        formsCount: 0,
        conversionRate: 0,
        changes: {
          clicks: 0,
          formViews: 0,
          submissions: 0,
          conversionRate: 0,
        },
      },
      chartData: [],
      deviceBreakdown: [],
      browserBreakdown: [],
      countryBreakdown: [],
      referrerBreakdown: [],
      topLinks: [],
      topForms: [],
    };
  }
}
