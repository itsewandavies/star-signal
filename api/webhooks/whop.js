/**
 * webhooks/whop.js — Whop V5 webhook handler (lean version)
 *
 * Responsibilities:
 *   1. Verify Whop signature (Svix format)
 *   2. Extract quiz payload from checkout_metadata
 *   3. Create/guard the star_signal_readings record
 *   4. Fire generate-reading endpoint async (without awaiting)
 *   5. Return 200 to Whop IMMEDIATELY (before Claude even starts)
 *
 * Generation is handled by /api/generate-reading (maxDuration: 300).
 * This keeps the webhook under 5s — well within Whop's 30s timeout.
 */

const crypto           = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const config = { maxDuration: 30 };

// ============================================================
// SIGNATURE VERIFICATION — Standard Webhooks (Svix) format
// ============================================================
function verifyWebhookSignature(req) {
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.warn('[WEBHOOK] WHOP_WEBHOOK_SECRET not set — skipping signature check');
        return true;
    }

    try {
        const webhookSignature = req.headers['webhook-signature'] || req.headers['svix-signature'];
        const webhookId        = req.headers['webhook-id']        || req.headers['svix-id'];
        const webhookTimestamp = req.headers['webhook-timestamp']  || req.headers['svix-timestamp'];

        if (!webhookSignature || !webhookId || !webhookTimestamp) {
            const directSecret = req.headers['x-whop-secret'];
            if (directSecret && directSecret === webhookSecret) return true;
            console.warn('[WEBHOOK] Missing signature headers — rejecting');
            return false;
        }

        let secretBytes;
        if (webhookSecret.startsWith('whsec_')) {
            secretBytes = Buffer.from(webhookSecret.slice(6), 'base64');
        } else if (webhookSecret.startsWith('ws_')) {
            secretBytes = Buffer.from(webhookSecret.slice(3), 'base64');
        } else {
            secretBytes = Buffer.from(webhookSecret, 'utf8');
        }

        const rawBody      = JSON.stringify(req.body);
        const signedPayload = `${webhookId}.${webhookTimestamp}.${rawBody}`;

        const expectedSig = crypto
            .createHmac('sha256', secretBytes)
            .update(signedPayload)
            .digest('base64');

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
        console.error('[WEBHOOK] Signature error:', err.message);
        return false;
    }
}

// ============================================================
// PAYLOAD EXTRACTION — normalises V5 and V2 payloads
// ============================================================
function extractPayload(body) {
    const apiVersion = body.api_version || 'v2';
    const eventName  = body.action || body.type || body.event || '';

    const isPaymentSucceeded =
        eventName === 'payment_succeeded' ||
        eventName === 'payment.succeeded';

    const isMembershipActive =
        eventName === 'membership_went_active' ||
        eventName === 'membership.went_active';

    if (!isPaymentSucceeded && !isMembershipActive) return null;

    const data    = body.data || {};
    const payment = data.payment || data;

    let email, whopOrderId, firstName, birthDate, birthTime,
        birthCity, gender, lifeArea, relationshipStatus, cosmicSigns;

    if (apiVersion === 'v5') {
        email       = payment.user_email || data.user_email;
        whopOrderId = payment.id         || data.id;
        const meta  = payment.checkout_metadata || data.checkout_metadata || {};

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
        email       = data.email || data.user?.email;
        whopOrderId = data.order_id || data.id;
        const meta  = data.metadata || {};

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

    return { email, whopOrderId, firstName, birthDate, birthTime,
             birthCity, gender, lifeArea, relationshipStatus, cosmicSigns };
}

// ============================================================
// MAIN HANDLER
// ============================================================
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!verifyWebhookSignature(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const payload = extractPayload(req.body);

        if (!payload) {
            const eventName = req.body?.action || req.body?.type || 'unknown';
            console.log(`[WEBHOOK] Ignoring event: ${eventName}`);
            return res.status(200).json({ ignored: true, event: eventName });
        }

        if (!payload.email || !payload.birthDate) {
            console.warn('[WEBHOOK] Missing required fields:', JSON.stringify(payload));
            return res.status(200).json({ error: 'Missing required fields', payload });
        }

        const { email, whopOrderId, ...quizData } = payload;

        console.log(`[WEBHOOK] Received for ${email} (order: ${whopOrderId})`);

        // ── Check for existing reading ───────────────────────
        const { data: existing } = await supabase
            .from('star_signal_readings')
            .select('id, generation_status, updated_at')
            .eq('email', email)
            .maybeSingle();

        // Skip if already complete
        const isComplete = existing?.generation_status === 'complete' ||
                           existing?.generation_status === 'completed';
        if (isComplete) {
            console.log(`[WEBHOOK] Already complete for ${email} (${existing.id}) — skipping`);
            return res.status(200).json({ success: true, readingId: existing.id, skipped: true });
        }

        // Skip if currently generating (Whop retry within 5 mins — generation already in progress)
        if (existing?.generation_status === 'generating') {
            const updatedAt = new Date(existing.updated_at || Date.now()).getTime();
            const ageMs = Date.now() - updatedAt;
            if (ageMs < 5 * 60 * 1000) {
                console.log(`[WEBHOOK] Already generating for ${email} (${Math.round(ageMs/1000)}s ago) — skipping retry`);
                return res.status(200).json({ success: true, readingId: existing.id, skipped: 'generating' });
            }
        }

        // ── Create or reset record ───────────────────────────
        let readingId = existing?.id;

        if (!existing) {
            const { data: newRecord, error: insertErr } = await supabase
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
                    generation_status:   'pending',
                }])
                .select('id')
                .single();

            if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);
            readingId = newRecord.id;
            console.log(`[WEBHOOK] Created reading record: ${readingId}`);
        } else {
            // Reset a failed/stalled record
            await supabase
                .from('star_signal_readings')
                .update({
                    generation_status: 'pending',
                    whop_order_id:     whopOrderId,
                    updated_at:        new Date().toISOString()
                })
                .eq('id', existing.id);
            console.log(`[WEBHOOK] Reset stalled record to pending: ${readingId}`);
        }

        // ── Fire generation async — DO NOT AWAIT ────────────
        // This starts the 300s generate-reading function independently.
        // We return 200 to Whop immediately without waiting for Claude.
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'https://starsignal.co';

        fetch(`${baseUrl}/api/generate-reading`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ readingId }),
        }).catch(err => {
            // Log but don't surface — generation will be retried by the polling UI
            console.error('[WEBHOOK] Failed to fire generate-reading:', err.message);
        });

        console.log(`[WEBHOOK] ✅ Queued generation for ${email} → ${readingId}`);
        return res.status(200).json({ received: true, readingId });

    } catch (error) {
        console.error('[WEBHOOK] Unhandled error:', error.message);
        return res.status(200).json({ success: false, error: error.message });
    }
};
