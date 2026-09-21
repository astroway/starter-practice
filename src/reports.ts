/**
 * The sixteen reports, their price, and what each one needs.
 *
 * Written down here rather than fetched, because a practitioner picking a
 * report wants the price before the call and the API does not offer a list of
 * reports with their inputs. Every figure was measured against production on
 * 2026-09-21 by rendering one of each; the page counts are what that rendering
 * produced and move with the chart.
 */

export type Needs = 'chart' | 'twoCharts' | 'none' | 'window';

export interface ReportSpec {
  slug: string;
  title: string;
  /** Credits charged per render. */
  cost: number;
  /** Pages the published sample came out at. */
  pages: number;
  needs: Needs;
  note?: string;
}

export const REPORTS: ReportSpec[] = [
  { slug: 'natal', title: 'Natal', cost: 5000, pages: 3, needs: 'chart' },
  { slug: 'love', title: 'Love', cost: 5000, pages: 2, needs: 'chart' },
  { slug: 'career', title: 'Career', cost: 5000, pages: 2, needs: 'chart' },
  { slug: 'money', title: 'Money', cost: 5000, pages: 3, needs: 'chart' },
  { slug: 'child', title: 'Child', cost: 5000, pages: 2, needs: 'chart' },
  { slug: 'business', title: 'Business', cost: 5000, pages: 2, needs: 'chart', note: 'Chart of the company, not the founder.' },
  { slug: 'transit-yearly', title: 'Yearly transits', cost: 5000, pages: 5, needs: 'chart' },
  { slug: 'human-design', title: 'Human Design', cost: 5000, pages: 2, needs: 'chart' },
  { slug: 'vedic-kundli', title: 'Vedic kundli', cost: 5000, pages: 2, needs: 'chart' },
  { slug: 'lal-kitab', title: 'Lal Kitab', cost: 5000, pages: 2, needs: 'chart' },
  { slug: 'gemstone', title: 'Gemstone', cost: 5000, pages: 7, needs: 'chart' },
  { slug: 'stellaforge', title: 'Chart poster', cost: 5000, pages: 1, needs: 'chart', note: 'One page, print-ready.' },
  { slug: 'synastry', title: 'Synastry', cost: 5000, pages: 2, needs: 'twoCharts' },
  { slug: 'relocation', title: 'Relocation', cost: 5000, pages: 6, needs: 'chart', note: 'Two or three more pages per city.' },
  { slug: 'muhurta', title: 'Muhurta', cost: 5000, pages: 4, needs: 'window' },
  { slug: 'tarot', title: 'Tarot spread', cost: 100, pages: 3, needs: 'none', note: 'No ephemeris, so fifty times cheaper.' },
];

export const SAMPLE_URL = (slug: string) => `https://api.astroway.info/samples/reports/${slug}.pdf`;
