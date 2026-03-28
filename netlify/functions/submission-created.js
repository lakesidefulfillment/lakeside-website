exports.handler = async function(event) {
  const payload = JSON.parse(event.body);
  const data = payload.payload.data;

  const firstName = data['first-name'] || 'there';
  const email = data['business-email'];

  if (!email) return { statusCode: 400, body: 'No email' };

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

  return { statusCode: res.ok ? 200 : 500, body: res.ok ? 'sent' : 'error' };
};
