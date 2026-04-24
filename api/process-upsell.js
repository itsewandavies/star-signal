/**
 * process-upsell.js — Star Signal OTO one-click charge
 *
 * Charges the customer's saved card for the $67 Deep Blueprint Unlock
 * without them needing to enter card details again.
 *
 * Flow (confirmed from EarnHive start-coaching.ts pattern):
 *   1. Receive payment_id from original $19 purchase (passed via URL after redirect)
 *   2. Fetch original payment from Whop → extract membership_id
 *   3. Fetch saved payment method by member_id via V1 API
 *   4. Charge via V1 POST /api/v1/payments (company_id + member_id + pm_id + plan_id)
 *   5. Poll for payment confirmation (up to 5 × 2s)
 *   6. Record affiliate commission in Supabase
 *   7. Update star_signal_unlocks record
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WHOP_API_KEY = process.env.WHOP_API_KEY; // Acct 2: biz_s27RTb1bp6HdK2
const COMPANY_ID     = 'biz_s27RTb1bp6HdK2';
const FUNNEL_ID      = 'star-signal';
const FUNNEL_DOMAIN  = 'https://starsignal.co';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// ── Whop API helpers ──────────────────────────────────────────
async function whopGet(path) {
    const res = await fetch(`https://api.whop.com${path}`, {
        headers: {
            'Authorization': `Bearer ${WHOP_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Whop GET ${path} → ${res.status}: ${text}`);
    }
    return res.json();
}

async function whopPost(path, body) {
    const res = await fetch(`https://api.whop.com${path}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${WHOP_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
}

// ── Main handler ──────────────────────────────────────────────
module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).set(corsHeaders).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = req.body || {};

        const paymentId     = body.payment_id;
        const price         = body.amount;        // 67
        const productName   = body.product_name  || 'Star Signal Deep Blueprint Unlock';
        const planId        = body.plan_id;
        const affiliateCode = body.affiliate_code;
        const trackingId    = body.tracking_id;
        const fbc           = body.fbc;
        const fbp           = body.fbp;
        const lifeArea      = body.life_area     || 'love';
        const readingId     = body.reading_id;

        if (!paymentId) return res.status(400).json({ error: 'Missing payment_id', success: false });
        if (!planId)    return res.status(400).json({ error: 'Missing plan_id',    success: false });

        // ── STEP 1: Look up original payment → get membership_id ──
        // V5 payment data is available via webhook payload but we need to
        // look it up here since we only have the payment_id from the URL.
        // Using V2 GET since no V5 payment lookup endpoint is documented.
        let paymentData, membershipId, customerEmail;

        try {
            paymentData = await whopGet(`/api/v2/payments/${paymentId}`);
            membershipId  = paymentData.membership_id || paymentData.membership?.id;
            customerEmail = paymentData.email || paymentData.user?.email || '';
        } catch (err) {
            console.error('[OTO] Payment lookup failed:', err.message);
            return res.status(400).json({ error: 'Could not find original payment. Please contact support.', success: false });
        }

        if (!membershipId) {
            console.error('[OTO] No membership_id in payment data:', JSON.stringify(paymentData));
            return res.status(400).json({ error: 'No membership found for this payment', success: false });
        }

        // ── STEP 2: Get saved payment method by member_id (V1 pattern) ──
        let paymentMethodId;

        try {
            const pmData = await whopGet(`/api/v1/payment_methods?member_id=${membershipId}&first=1`);
            paymentMethodId = pmData.data?.[0]?.id;
        } catch (err) {
            console.error('[OTO] Payment methods lookup failed:', err.message);
            return res.status(400).json({ error: 'Could not retrieve payment method', success: false });
        }

        if (!paymentMethodId) {
            return res.status(400).json({ error: 'No saved payment method found for this customer', success: false });
        }

        // ── STEP 3: Charge via V1 POST /payments (confirmed EarnHive pattern) ──
        const chargeMetadata = {
            is_upsell:   'true',
            funnel_id:   FUNNEL_ID,
            life_area:   lifeArea,
            source:      'oto_page'
        };
        if (affiliateCode) chargeMetadata.earnhive_ref = affiliateCode;
        if (trackingId)    chargeMetadata.tid           = trackingId;
        if (fbc)           chargeMetadata.fbc            = fbc;
        if (fbp)           chargeMetadata.fbp            = fbp;
        if (readingId)     chargeMetadata.reading_id     = readingId;

        const { ok: chargeOk, status: chargeStatus, data: chargeResult } = await whopPost(
            '/api/v1/payments',
            {
                company_id:        COMPANY_ID,
                member_id:         membershipId,
                payment_method_id: paymentMethodId,
                plan_id:           planId,
                metadata:          chargeMetadata
            }
        );

        if (!chargeOk) {
            const errMsg = chargeResult?.error_message || chargeResult?.message || JSON.stringify(chargeResult);
            console.error('[OTO] V1 payment charge failed:', chargeStatus, errMsg);
            return res.status(400).json({ error: errMsg, success: false });
        }

        // Check payment status
        const paymentStatus = chargeResult.data?.status || chargeResult.status;
        if (paymentStatus === 'failed' || paymentStatus === 'declined' || paymentStatus === 'cancelled') {
            console.error('[OTO] Payment status:', paymentStatus);
            return res.status(400).json({ error: `Payment ${paymentStatus}. Please try again or contact support.`, success: false });
        }

        const confirmedPaymentId = chargeResult.data?.id || chargeResult.id;
        const confirmedMembershipId = chargeResult.data?.membership_id || chargeResult.membership_id || chargeResult.data?.membership?.id;

        if (!confirmedPaymentId) {
            console.warn('[OTO] No payment ID in response — might be processing:', JSON.stringify(chargeResult));
        }

        console.log(`[OTO] ✅ Charged ${price} for ${lifeArea} path — payment: ${confirmedPaymentId}`);

        // ── STEP 4: Look up affiliate ────────────────────────────
        let affiliateId   = null;
        let affiliateTier = null;

        if (trackingId) {
            const { data: click } = await supabase
                .from('click_tracking')
                .select('affiliate_id')
                .eq('tracking_id', trackingId)
                .single();
            if (click) affiliateId = click.affiliate_id;
        }

        if (!affiliateId && affiliateCode) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, tier')
                .or(`username.eq.${affiliateCode},affiliate_code.eq.${affiliateCode}`)
                .single();
            if (profile) {
                affiliateId   = profile.id;
                affiliateTier = profile.tier;
            }
        }

        if (affiliateId && !affiliateTier) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('tier')
                .eq('id', affiliateId)
                .single();
            if (profile) affiliateTier = profile.tier;
        }

        // ── STEP 5: Record affiliate commission ─────────────────
        if (affiliateId && price) {
            let commissionRate;
            switch (affiliateTier) {
                case 'platinum': commissionRate = 0.90; break;
                case 'partner':  commissionRate = 0.70; break;
                case 'starter':
                default:         commissionRate = 0.30; break;
            }

            await supabase.from('affiliate_sales').insert({
                affiliate_id:        affiliateId,
                affiliate_code:      affiliateCode,
                funnel_id:           FUNNEL_ID,
                product_name:        productName,
                sale_amount:         price,
                commission_rate:     commissionRate,
                commission_amount:   price * commissionRate,
                customer_email:      customerEmail,
                tracking_id:         trackingId,
                whop_payment_id:     confirmedPaymentId || `pending_${Date.now()}`,
                tier_at_sale:        affiliateTier || 'starter',
                is_upsell:           true,
                source:              'oto',
                paid:                false,
                refunded:            false,
                metadata: {
                    life_area:   lifeArea,
                    reading_id:  readingId
                },
                created_at: new Date().toISOString()
            });
        }

        // ── STEP 6: Update reading unlock record ─────────────────
        if (readingId) {
            await supabase.from('star_signal_unlocks').upsert({
                reading_id:       readingId,
                has_oto:          true,
                oto_area:         lifeArea,
                oto_payment_id:   confirmedPaymentId || 'processing',
                oto_purchased_at: new Date().toISOString()
            }, { onConflict: 'reading_id' });
        }

        // ── STEP 7: Return success ────────────────────────────────
        return res.status(200).json({
            success:    true,
            payment_id: confirmedPaymentId,
            product:    productName
        });

    } catch (error) {
        console.error('[OTO] Unhandled error:', error.message);
        return res.status(500).json({ error: error.message, success: false });
    }
};
