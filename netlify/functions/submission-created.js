// Runs on every verified Netlify Forms submission. Two separate jobs, each on
// its own so one failing never stops the other:
//   1. the lead's auto-reply email (Resend), the same email as before
//   2. hand the lead to the Lakeside OS (the Leads tab), new
// Netlify's own email to inboundleads@ is a form notification set in the
// Netlify UI; this file does not send or change it.
// The OS hand-off needs two env vars on this site: OS_LEADS_URL and
// LEADS_INTAKE_TOKEN. If either is missing it is skipped and nothing breaks.
// It never sends the visitor's IP or browser, and nothing here logs a name,
// email or answer: only the submission id.

// The form fields the OS stores, by the form's own names (index.html).
const OS_FIELDS = ['first-name', 'last-name', 'company-name', 'business-email',
  'phone', 'what-you-sell', 'monthly-orders', 'fulfillment-type'];

// The name is typed by the visitor and goes into an email's HTML, so it is
// escaped: nobody can send their own HTML or links from our address.
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 1. The auto-reply. Returns true when Resend accepted it.
async function sendAutoReply(data) {
  const firstName = escapeHtml(String(data['first-name'] || 'there').trim().slice(0, 80) || 'there');
  const email = data['business-email'];

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Lakeside Fulfillment <noreply@lakesidefulfillment.com>',
      to: email,
      subject: "We received your quote request — you'll hear from us within 24 hours",
      html: `
        <div style="font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
          <div style="background:#0a1628;padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;">
            <span style="font-size:18px;font-weight:700;color:white;">Lakeside Fulfillment</span>
          </div>
          <div style="background:#f8fafc;padding:40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
            <h2 style="font-size:22px;font-weight:700;color:#0a1628;margin:0 0 16px;">Hey ${firstName}, we got your request!</h2>
            <p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;">
              Thanks for reaching out. Our team is reviewing your fulfillment details and will send you a custom pricing plan within <strong style="color:#0a1628;">24 hours</strong>.
            </p>
            <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:24px;margin-bottom:24px;">
              <p style="font-size:13px;font-weight:700;color:#1a4fd8;text-transform:uppercase;letter-spacing:.08em;margin:0 0 14px;">What happens next</p>
              <p style="font-size:14px;color:#0f172a;margin:0 0 10px;line-height:1.5;">1. Our team reviews your volume and product type</p>
              <p style="font-size:14px;color:#0f172a;margin:0 0 10px;line-height:1.5;">2. We build a custom fulfillment and pricing plan</p>
              <p style="font-size:14px;color:#0f172a;margin:0;line-height:1.5;">3. You receive your quote within 24 hours — no commitment</p>
            </div>
            <p style="font-size:14px;color:#64748b;margin:0;">
              Questions? Reply to this email or reach us at
              <a href="mailto:inboundleads@lakesidefulfillment.com" style="color:#1a4fd8;">inboundleads@lakesidefulfillment.com</a>
            </p>
          </div>
          <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:16px;">Lakeside Fulfillment · Austin, TX</p>
        </div>
      `
    })
  });

  return res.ok;
}

// 2. The OS hand-off. Returns 'sent' or 'skipped'; throws if the OS said no.
// The token only ever goes over https: a mistyped http:// URL sends nothing.
async function sendToOS(sub) {
  const url = process.env.OS_LEADS_URL;
  const token = process.env.LEADS_INTAKE_TOKEN;
  if (!url || !token || sub.form_name !== 'quote-request') return 'skipped';
  if (!/^https:\/\//i.test(url)) throw new Error('OS_LEADS_URL is not https, nothing sent');

  const data = sub.data || {};
  const fields = {};
  for (const k of OS_FIELDS) fields[k] = data[k] == null ? '' : String(data[k]);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-leads-token': token },
    body: JSON.stringify({
      v: 1,
      source: 'website',
      submission_id: sub.id,
      form_name: sub.form_name,
      submitted_at: sub.created_at,
      referrer: data.referrer || null,
      fields
    }),
    signal: AbortSignal.timeout(8000)
  });
  await res.text().catch(() => null);
  if (!res.ok) throw new Error(`OS answered ${res.status}`);
  return 'sent';
}

exports.handler = async function(event) {
  const sub = JSON.parse(event.body).payload;
  const data = sub.data || {};

  if (!data['business-email']) return { statusCode: 400, body: 'No email' };

  const [reply, os] = await Promise.allSettled([sendAutoReply(data), sendToOS(sub)]);
  if (os.status === 'rejected') {
    console.error(`[lakeside-os] lead ${sub.id} not delivered: ${os.reason && os.reason.message}`);
  }

  // The answer reflects the auto-reply alone, the same as before.
  const replied = reply.status === 'fulfilled' && reply.value === true;
  return { statusCode: replied ? 200 : 500, body: replied ? 'sent' : 'error' };
};
