import { Resend } from 'resend';
import { ValidationFailure } from '../scraper/ScraperValidator';

const DEFAULT_FROM = 'Pool Finder Alerts <alerts@poolfinderalerts.com>';

function buildHtml(
  scraperName: string,
  localityId: string,
  failures: ValidationFailure[],
): string {
  const timestamp = new Date().toUTCString();

  const failureRows = failures
    .map((f, i) => {
      const poolLabel =
        f.poolId !== null
          ? `${f.poolName ?? f.poolId} <span style="color:#6b7280;font-size:12px;">(id: ${f.poolId})</span>`
          : '<em style="color:#6b7280;">Locality-level</em>';

      const urlCell = f.scrapeUrl
        ? `<a href="${f.scrapeUrl}" style="color:#2563eb;word-break:break-all;">${f.scrapeUrl}</a>`
        : '<span style="color:#9ca3af;">—</span>';

      const rowBg = i % 2 === 0 ? '#ffffff' : '#f9fafb';

      return `
      <tr style="background-color:${rowBg};">
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;vertical-align:top;">${poolLabel}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;vertical-align:top;color:#dc2626;">${f.reason}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;vertical-align:top;font-size:12px;">${urlCell}</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pool Finder Scraper Alert</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:640px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color:#dc2626;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                Pool Finder Scraper Alert
              </h1>
            </td>
          </tr>

          <!-- Subheader -->
          <tr>
            <td style="padding:24px 32px 16px;border-bottom:1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Scraper</p>
                    <p style="margin:0;font-size:16px;color:#111827;font-weight:600;">${scraperName}</p>
                  </td>
                </tr>
                <tr><td style="padding:12px 0;"></td></tr>
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Locality</p>
                    <p style="margin:0;font-size:16px;color:#111827;font-weight:600;">${localityId}</p>
                  </td>
                </tr>
                <tr><td style="padding:12px 0;"></td></tr>
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Timestamp</p>
                    <p style="margin:0;font-size:14px;color:#374151;">${timestamp}</p>
                  </td>
                </tr>
                <tr><td style="padding:12px 0;"></td></tr>
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Issues Found</p>
                    <p style="margin:0;font-size:16px;color:#dc2626;font-weight:700;">${failures.length}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Failures table -->
          <tr>
            <td style="padding:24px 32px;">
              <h2 style="margin:0 0 16px;font-size:16px;color:#111827;font-weight:600;">Validation Failures</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;font-size:13px;">
                <thead>
                  <tr style="background-color:#f9fafb;">
                    <th style="padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;border-bottom:2px solid #e5e7eb;white-space:nowrap;">Pool</th>
                    <th style="padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;border-bottom:2px solid #e5e7eb;">Reason</th>
                    <th style="padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;border-bottom:2px solid #e5e7eb;white-space:nowrap;">Scrape URL</th>
                  </tr>
                </thead>
                <tbody>
                  ${failureRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                This alert was generated automatically. The existing database data has been preserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send a scraper validation failure alert email via Resend.
 *
 * Requires the following environment variables:
 *   - RESEND_API_KEY  — Resend API key (required; no-op if absent)
 *   - ALERT_EMAIL_TO  — Recipient address (required; no-op if absent)
 *   - ALERT_EMAIL_FROM — Sender address (optional; falls back to DEFAULT_FROM)
 *
 * This function never throws — a mailer failure must not crash the scraper.
 */
export async function sendScraperAlertEmail(
  scraperName: string,
  localityId: string,
  failures: ValidationFailure[],
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[AlertMailer] RESEND_API_KEY is not set — skipping alert email.');
    return;
  }

  const to = process.env.ALERT_EMAIL_TO;
  if (!to) {
    console.warn('[AlertMailer] ALERT_EMAIL_TO is not set — skipping alert email.');
    return;
  }

  const from = process.env.ALERT_EMAIL_FROM ?? DEFAULT_FROM;
  const subject = `[Pool Finder Alert] ${scraperName} scraper failed — ${failures.length} issue(s) in ${localityId}`;
  const html = buildHtml(scraperName, localityId, failures);

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({ from, to, subject, html });
    console.log(`[AlertMailer] Alert email sent to ${to} for ${scraperName} / ${localityId}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[AlertMailer] Failed to send alert email: ${message}`);
  }
}
