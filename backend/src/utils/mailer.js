const nodemailer = require('nodemailer');
const https = require('https');
const { URL } = require('url');
require('dotenv').config(); // make sure to load .env variables

// Create transporter using Gmail SMTP (kept for fallback)
const allowSelfSigned = process.env.SMTP_ALLOW_SELF_SIGNED === 'true'

// Detect provider-specific defaults (prefer implicit TLS for Gmail)
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
const isGmail = smtpHost.includes('gmail') || smtpHost.includes('google')
const defaultPort = isGmail ? 465 : 587
const defaultSecure = isGmail ? true : false

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: Number(process.env.SMTP_PORT) || defaultPort,
  secure: (typeof process.env.SMTP_SECURE !== 'undefined') ? (process.env.SMTP_SECURE === 'true') : defaultSecure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // Allow self-signed certs when explicitly requested for development/debugging
    rejectUnauthorized: !allowSelfSigned,
  },
})

// Helper: send via Elastic Email v2 HTTP API (form-encoded)
function sendViaElasticEmail({ to, subject, text, html }) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ELASTICEMAIL_API_KEY;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!apiKey) return reject(new Error('ELASTICEMAIL_API_KEY not configured'));

    const params = new URLSearchParams();
    params.append('apikey', apiKey);
    params.append('to', to);
    params.append('from', from);
    params.append('subject', subject || 'No subject');
    if (html) params.append('bodyHtml', html);
    if (text) params.append('bodyText', text || '');

    const postData = params.toString();
    const url = new URL('https://api.elasticemail.com/v2/email/send');

    const options = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Elastic Email v2 returns { success: true/false, error: "..." }
          if (parsed && parsed.success) {
            console.log('✅ Elastic Email accepted:', parsed);
            resolve(parsed);
          } else {
            const err = new Error('Elastic Email API error: ' + (parsed && parsed.error ? parsed.error : data));
            err.response = parsed;
            reject(err);
          }
        } catch (err) {
          err.responseText = data;
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

// Function to send an email: prefer Elastic Email API when API key is present, otherwise use SMTP.
async function sendMail({ to, subject, text, html }) {
  const apiKey = process.env.ELASTICEMAIL_API_KEY;
  // Try API-first if key is present
  if (apiKey) {
    try {
      const result = await sendViaElasticEmail({ to, subject, text, html });
      return { provider: 'elasticemail', result };
    } catch (apiErr) {
      console.error('⚠️ Elastic Email send failed, falling back to SMTP. Error:', apiErr && apiErr.message);
      // proceed to SMTP fallback below
    }
  }

  // SMTP fallback
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"CPC E-Voting" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('✅ SMTP Email sent:', info && info.messageId);
    return { provider: 'smtp', info };
  } catch (error) {
    console.error('❌ Error sending email via SMTP:', error);
    throw error;
  }
}

module.exports = {
  sendMail,
};