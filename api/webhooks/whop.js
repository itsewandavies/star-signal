/**
 * webhooks/whop.js — Whop V5 webhook handler
 *
 * Receives payment_succeeded from Whop V5, generates the personalized
 * Cosmic Blueprint via Claude, saves to Supabase, and sends the reading
 * email via Resend.
 *
 * V5 payload differences from V2:
 *   - event field: body.action (not body.type or body.event)
 *   - email: data.user_email (not data.email)
 *   - metadata: data.checkout_metadata (not data.metadata)
 *   - amount: data.final_amount (not data.total)
 *   - user id: data.user_id (not data.user.id)
 *   - api_version: "v5" present on V5 payloads
 *
 * Signature verification (ws_ prefix = Standard Webhooks / Svix):
 *   - Headers: webhook-signature, webhook-id, webhook-timestamp
 *   - Signed payload: {webhook-id}.{webhook-timestamp}.{raw body string}
 *   - Secret: Buffer.from(secret.slice(3), 'base64')  [strip 'ws_' prefix]
 *   - HMAC-SHA256, base64 digest
 *   - Compare to 'v1,{base64sig}' entries in webhook-signature header
 */

const crypto      = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const generateReading  = require('../_generate');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// SIGNATURE VERIFICATION — Standard Webhooks (Svix) format
// Used by Whop when secret starts with ws_ prefix
// ============================================================
function verifyWebhookSignature(req) {
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.warn('[WEBHOOK] WHOP_WEBHOOK_SECRET not set — skipping signature check');
        return true; // Don't block if secret not configured yet
    }

    try {
        const webhookSignature = req.headers['webhook-signature'] || req.headers['svix-signature'];
        const webhookId        = req.headers['webhook-id']        || req.headers['svix-id'];
        const webhookTimestamp = req.headers['webhook-timestamp']  || req.headers['svix-timestamp'];

        if (!webhookSignature || !webhookId || !webhookTimestamp) {
            // V5 fallback: check x-whop-secret header directly
            const directSecret = req.headers['x-whop-secret'];
            if (directSecret && directSecret === webhookSecret) {
                return true;
            }
            console.warn('[WEBHOOK] Missing signature headers — rejecting');
            return false;
        }

        // Decode secret: strip ws_ prefix (3 chars), then base64 decode
        let secretBytes;
        if (webhookSecret.startsWith('whsec_')) {
            secretBytes = Buffer.from(webhookSecret.slice(6), 'base64');
        } else if (webhookSecret.startsWith('ws_')) {
            secretBytes = Buffer.from(webhookSecret.slice(3), 'base64');
        } else {
            secretBytes = Buffer.from(webhookSecret, 'utf8');
        }

        // Signed payload = "{webhook-id}.{webhook-timestamp}.{raw body}"
        const rawBody      = JSON.stringify(req.body);
        const signedPayload = `${webhookId}.${webhookTimestamp}.${rawBody}`;

        const expectedSig = crypto
            .createHmac('sha256', secretBytes)
            .update(signedPayload)
            .digest('base64');

        // Signature header format: "v1,{base64sig} v1,{base64sig2} ..."
        const signatures = webhookSignature.split(' ');
        const isValid = signatures.some(sig => {
            const [version, sigValue] = sig.split(',');
            return version === 'v1' && sigValue === expectedSig;
        });

        if (!isValid) {
            console.warn('[WEBHOOK] Signature mismatch — rejecting');
            return false;
        }

        return true;

    } catch (err) {
        console.error('[WEBHOOK] Signature verification error:', err.message);
        return false;
    }
}

// ============================================================
// PAYLOAD EXTRACTION — normalises V5 and V2 payloads
// ============================================================
function extractPayload(body) {
    // V5: body.action + body.api_version = "v5"
    // V2: body.type  (no api_version)
    const apiVersion = body.api_version || 'v2';
    const eventName  = body.action || body.type || body.event || '';

    // Normalise event name (underscore OR dot notation)
    const isPaymentSucceeded =
        eventName === 'payment_succeeded' ||
        eventName === 'payment.succeeded';

    const isMembershipActive =
        eventName === 'membership_went_active'   ||
        eventName === 'membership.went_active';

    if (!isPaymentSucceeded && !isMembershipActive) {
        return null;
    }

    const data = body.data || {};
    // V5 sometimes nests the payment inside data.payment
    const payment = data.payment || data;

    let email, whopOrderId, firstName, birthDate, birthTime,
        birthCity, gender, lifeArea, relationshipStatus, cosmicSigns, userId;

    if (apiVersion === 'v5') {
        // V5 field names
        email        = payment.user_email || data.user_email;
        userId       = payment.user_id    || data.user_id;
        whopOrderId  = payment.id         || data.id;

        // In V5, our quiz data is in checkout_metadata
        const meta   = payment.checkout_metadata || data.checkout_metadata || {};

        firstName          = meta.firstName          || 'Cosmic Traveler';
        birthDate          = meta.birthDate;
        birthTime          = meta.birthTime;
        birthCity          = meta.birthCity;
        gender             = meta.gender;
        lifeArea           = meta.lifeArea           || 'love';
        relationshipStatus = meta.relationshipStatus;

        try {
            cosmicSigns = Array.isArray(meta.cosmicSigns)
                ? meta.cosmicSigns
                : (meta.cosmicSigns ? JSON.parse(meta.cosmicSigns) : []);
        } catch { cosmicSigns = []; }

    } else {
        // V2 field names (legacy)
        email        = data.email || data.user?.email;
        userId       = data.user?.id || data.user_id;
        whopOrderId  = data.order_id || data.id;

        const meta   = data.metadata || {};

        firstName          = meta.firstName          || 'Cosmic Traveler';
        birthDate          = meta.birthDate;
        birthTime          = meta.birthTime;
        birthCity          = meta.birthCity;
        gender             = meta.gender;
        lifeArea           = meta.lifeArea           || 'love';
        relationshipStatus = meta.relationshipStatus;

        try {
            cosmicSigns = Array.isArray(meta.cosmicSigns)
                ? meta.cosmicSigns
                : (meta.cosmicSigns ? JSON.parse(meta.cosmicSigns) : []);
        } catch { cosmicSigns = []; }
    }

    return {
        email,
        userId,
        whopOrderId,
        firstName,
        birthDate,
        birthTime,
        birthCity,
        gender,
        lifeArea,
        relationshipStatus,
        cosmicSigns
    };
}

// ============================================================
// EMAIL — Resend transactional
// ============================================================
async function sendReadingEmail(email, firstName, readingUrl, lifePathNumber) {
    try {
        const name = firstName || 'Cosmic Traveler';
        const html = `
            <div style="font-family: Georgia, serif; max-width: 580px; margin: 0 auto; background: #FDFBF7; padding: 40px 32px; color: #2C2828;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <span style="font-size: 24px; font-style: italic; color: #2C2828;">✦ Star Signal</span>
                </div>
                <h1 style="font-size: 28px; font-weight: 600; margin-bottom: 8px; line-height: 1.2;">
                    ${name}, your Cosmic Blueprint is ready.
                </h1>
                <p style="font-size: 16px; color: #5A5252; margin-bottom: 24px; line-height: 1.6;">
                    Your personalised reading has been decoded — built entirely from your exact birth coordinates.
                    Your Life Path Number is <strong style="color: #B89600;">${lifePathNumber || '—'}</strong>.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${readingUrl}" style="display: inline-block; background: linear-gradient(135deg, #D4AF37, #B89600); color: white; font-size: 17px; font-weight: 600; padding: 16px 40px; border-radius: 100px; text-decoration: none;">
                        🔮 Open My Cosmic Blueprint →
                    </a>
                </div>
                <p style="font-size: 14px; color: #5A5252; line-height: 1.6;">
                    This link is unique to you — bookmark it so you can return anytime.<br>
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${readingUrl}" style="color: #B89600; word-break: break-all;">${readingUrl}</a>
                </p>
                <hr style="border: none; border-top: 1px solid #E8D1D1; margin: 32px 0;">
                <p style="font-size: 12px; color: #9A8F8F; text-align: center; line-height: 1.6;">
                    © 2026 Star Signal. Readings are intended for personal reflection and entertainment.
                </p>
            </div>
        `;

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from:    'Star Signal <noreply@starsignal.co>',
                to:      [email],
                subject: `✦ ${name}, your Cosmic Blueprint is ready`,
                html:    html
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.warn(`[RESEND] Failed for ${email}: ${response.status} — ${errText}`);
        } else {
            console.log(`[RESEND] Email sent to ${email}`);
        }
    } catch (error) {
        console.warn(`[RESEND] Error: ${error.message}`);
        // Don't throw — email failure must not fail the webhook response
    }
}

// ============================================================
// MAIN HANDLER
// ============================================================
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── Signature verification ───────────────────────────────
    if (!verifyWebhookSignature(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const payload = extractPayload(req.body);

        if (!payload) {
            // Not an event we handle — return 200 so Whop doesn't retry
            const eventName = req.body?.action || req.body?.type || 'unknown';
            console.log(`[WEBHOOK] Ignoring event: ${eventName}`);
            return res.status(200).json({ ignored: true, event: eventName });
        }

        if (!payload.email || !payload.birthDate) {
            console.warn('[WEBHOOK] Payload missing required fields:', JSON.stringify(payload));
            // Return 200 — Whop would retry forever otherwise and generate duplicate readings
            return res.status(200).json({ error: 'Missing required fields', payload });
        }

        const { email, whopOrderId, ...quizData } = payload;

        console.log(`[WEBHOOK] Processing for ${email} (order: ${whopOrderId})`);

        // ── Deduplicate ──────────────────────────────────────
        const { data: existing, error: lookupError } = await supabase
            .from('star_signal_readings')
            .select('id, generation_status')
            .eq('email', email)
            .maybeSingle(); // maybeSingle doesn't error on 0 rows

        if (lookupError) {
            throw new Error(`Supabase lookup failed: ${lookupError.message}`);
        }

        if (existing && existing.generation_status === 'complete') {
            console.log(`[WEBHOOK] Reading already complete for ${email} (${existing.id}) — skipping`);
            return res.status(200).json({ success: true, readingId: existing.id, skipped: true });
        }

        let readingId = existing?.id;

        // ── Create or update record ──────────────────────────
        if (!existing) {
            const { data: newRecord, error: insertError } = await supabase
                .from('star_signal_readings')
                .insert([{
                    email,
                    whop_order_id:       whopOrderId,
                    first_name:          quizData.firstName,
                    birth_date:          quizData.birthDate,
                    birth_time:          quizData.birthTime,
                    birth_city:          quizData.birthCity,
                    gender:              quizData.gender,
                    life_area:           quizData.lifeArea,
                    relationship_status: quizData.relationshipStatus,
                    cosmic_signs:        quizData.cosmicSigns,
                    generation_status:   'generating'
                }])
                .select('id')
                .single();

            if (insertError) {
                throw new Error(`Insert failed: ${insertError.message}`);
            }
            readingId = newRecord.id;
        } else {
            // Update to 'generating' if previously failed
            await supabase
                .from('star_signal_readings')
                .update({ generation_status: 'generating', whop_order_id: whopOrderId })
                .eq('id', existing.id);
        }

        // ── Generate reading via Claude ──────────────────────
        let readingContent, lifePathNumber, sunSign, personalYear2026;

        try {
            readingContent  = await generateReading(quizData);
            lifePathNumber  = readingContent.lifePathNumber;
            sunSign         = readingContent.sunSign;
            personalYear2026 = readingContent.personalYear2026;
        } catch (genError) {
            console.error(`[GENERATE] Error for ${email}:`, genError.message);

            await supabase
                .from('star_signal_readings')
                .update({ generation_status: 'failed' })
                .eq('id', readingId);

            // Return 200 — don't retry on generation failure (costs money)
            return res.status(200).json({ success: false, error: 'Generation failed', readingId });
        }

        // ── Save completed reading ────────────────────────────
        const { error: updateError } = await supabase
            .from('star_signal_readings')
            .update({
                generation_status: 'complete',
                reading_content:   readingContent,
                life_path_number:  lifePathNumber,
                sun_sign:          sunSign,
                personal_year_2026: personalYear2026
            })
            .eq('id', readingId);

        if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`);
        }

        // ── Send email ────────────────────────────────────────
        const readingUrl = `https://starsignal.co/r/${readingId}`;
        await sendReadingEmail(email, quizData.firstName, readingUrl, lifePathNumber);

        console.log(`[WEBHOOK] ✅ Complete for ${email} → ${readingUrl}`);

        return res.status(200).json({ success: true, readingId, readingUrl });

    } catch (error) {
        console.error('[WEBHOOK] Unhandled error:', error.message);
        // Always return 200 — Whop retries on non-200, causing duplicate readings
        return res.status(200).json({ success: false, error: error.message });
    }
}
