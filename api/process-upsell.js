/**
 * process-upsell.js
 * Star Signal — OTO one-click charge handler
 *
 * Flow:
 * 1. Receive payment_id from original $19 purchase
 * 2. Look up user_id from that payment via Whop API
 * 3. Fetch their saved payment method from Whop
 * 4. Create a checkout_request (one-click charge) for the OTO plan
 * 5. Poll for confirmation (up to 5 attempts × 2s)
 * 6. Record affiliate commission in Supabase
 * 7. Return success → frontend redirects to reading page
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WHOP_API_KEY  = process.env.WHOP_API_KEY_2; // Acct 2: end-customer sales
const FUNNEL_ID     = 'star-signal';
const FUNNEL_DOMAIN = 'https://starsignal.co';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

module.exports = async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).set(corsHeaders).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = req.body || {};

        const paymentId    = body.payment_id;
        const price        = body.amount;             // 67
        const productName  = body.product_name || 'Star Signal Deep Blueprint';
        const planId       = body.plan_id;
        const affiliateCode = body.affiliate_code;
        const trackingId   = body.tracking_id;
        const fbc          = body.fbc;
        const fbp          = body.fbp;
        const lifeArea     = body.life_area || 'love';
        const readingId    = body.reading_id;
        const eventSourceUrl = `${FUNNEL_DOMAIN}/oto?area=${lifeArea}`;

        if (!paymentId) {
            return res.status(400).json({ error: 'Missing payment_id', success: false });
        }
        if (!planId) {
            return res.status(400).json({ error: 'Missing plan_id', success: false });
        }

        // ======================================================
        // STEP 1: Get original payment → extract user_id
        // ======================================================
        const paymentRes = await fetch(`https://api.whop.com/api/v2/payments/${paymentId}`, {
            headers: {
                'Authorization': `Bearer ${WHOP_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!paymentRes.ok) {
            const err = await paymentRes.text();
            console.error('Whop payment lookup failed:', err);
            return res.status(400).json({ error: 'Could not find original payment. Please contact support.', success: false });
        }

        const paymentData   = await paymentRes.json();
        const userId        = paymentData.user;
        const currency      = paymentData.currency || 'usd';
        const customerEmail = paymentData.email || '';

        if (!userId) {
            return res.status(400).json({ error: 'No user found in original payment', success: false });
        }

        // ======================================================
        // STEP 2: Get user's saved payment methods
        // ======================================================
        const pmRes = await fetch(`https://api.whop.com/api/v2/payment_methods?user_id=${userId}`, {
            headers: {
                'Authorization': `Bearer ${WHOP_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!pmRes.ok) {
            const err = await pmRes.text();
            console.error('Whop payment methods failed:', err);
            return res.status(400).json({ error: 'Could not retrieve payment method', success: false });
        }

        const pmData           = await pmRes.json();
        const paymentMethods   = pmData.data || [];

        if (!paymentMethods.length) {
            return res.status(400).json({ error: 'No payment method on file for this customer', success: false });
        }

        const paymentMethodId = paymentMethods[0]?.id;
        if (!paymentMethodId) {
            return res.status(400).json({ error: 'Invalid payment method returned', success: false });
        }

        // ======================================================
        // STEP 3: Create checkout_request (one-click charge)
        // ======================================================
        const chargeMetadata = {
            is_upsell:   'true',
            funnel_id:   FUNNEL_ID,
            life_area:   lifeArea
        };
        if (affiliateCode) chargeMetadata.earnhive_ref = affiliateCode;
        if (trackingId)    chargeMetadata.tid           = trackingId;
        if (fbc)           chargeMetadata.fbc            = fbc;
        if (fbp)           chargeMetadata.fbp            = fbp;
        if (readingId)     chargeMetadata.reading_id     = readingId;

        const chargePayload = {
            plan_id:           planId,
            currency:          currency,
            user_id:           userId,
            payment_method_id: paymentMethodId,
            metadata:          chargeMetadata
        };

        const chargeRes = await fetch('https://api.whop.com/api/v2/checkout_requests', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHOP_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(chargePayload)
        });

        const chargeResult = await chargeRes.json();

        if (chargeResult.error_message) {
            console.error('Whop charge error:', chargeResult.error_message);
            return res.status(400).json({ error: chargeResult.error_message, success: false });
        }

        const checkoutRequestId = chargeResult.id; // chreq_xxx
        if (!checkoutRequestId) {
            return res.status(400).json({ error: 'No checkout request ID returned from Whop', success: false });
        }

        // ======================================================
        // STEP 3.5: Poll for payment confirmation (5 × 2s)
        // ======================================================
        let confirmedPaymentId = null;
        let statusData = null;

        for (let attempt = 1; attempt <= 5; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const statusRes = await fetch(`https://api.whop.com/api/v2/checkout_requests/${checkoutRequestId}`, {
                headers: {
                    'Authorization': `Bearer ${WHOP_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            statusData = await statusRes.json();

            if (statusData.error_message) {
                console.error('Checkout request error on poll:', statusData.error_message);
                return res.status(400).json({ success: false, error: statusData.error_message });
            }

            confirmedPaymentId = statusData.payment_id;
            if (confirmedPaymentId) break;
        }

        if (!confirmedPaymentId) {
            // Payment didn't confirm in time — could still process async
            console.warn('OTO payment not confirmed after 5 polls. checkout_request_id:', checkoutRequestId);
            return res.status(200).json({
                success: false,
                status: 'not_confirmed',
                checkout_request_id: checkoutRequestId,
                message: 'Payment is still processing. If you were charged, your upgrade will appear in your reading within a few minutes.'
            });
        }

        // ======================================================
        // STEP 4: Look up affiliate via click_tracking or code
        // ======================================================
        let affiliateId  = null;
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

        // ======================================================
        // STEP 5: Record affiliate commission
        // ======================================================
        if (affiliateId && price) {
            let commissionRate;
            switch (affiliateTier) {
                case 'platinum': commissionRate = 0.90; break;
                case 'partner':  commissionRate = 0.70; break;
                case 'starter':
                default:         commissionRate = 0.30; break;
            }

            const commissionAmount = price * commissionRate;

            const saleRecord = {
                affiliate_id:        affiliateId,
                affiliate_code:      affiliateCode,
                funnel_id:           FUNNEL_ID,
                product_name:        productName,
                sale_amount:         price,
                commission_rate:     commissionRate,
                commission_amount:   commissionAmount,
                customer_email:      customerEmail,
                tracking_id:         trackingId,
                whop_payment_id:     confirmedPaymentId,
                checkout_request_id: checkoutRequestId,
                tier_at_sale:        affiliateTier || 'starter',
                is_upsell:           true,
                source:              'upsell',
                paid:                false,
                refunded:            false,
                metadata: {
                    life_area:   lifeArea,
                    reading_id:  readingId
                },
                created_at: new Date().toISOString()
            };

            const { error: insertError } = await supabase
                .from('affiliate_sales')
                .insert(saleRecord);

            if (insertError) {
                console.error('Failed to record affiliate sale:', insertError);
                // Don't fail the request — customer paid, we just log it
            }
        }

        // ======================================================
        // STEP 6: Update reading record to mark OTO purchased
        // ======================================================
        if (readingId) {
            const { error: updateError } = await supabase
                .from('star_signal_unlocks')
                .upsert({
                    reading_id:        readingId,
                    has_oto:           true,
                    oto_area:          lifeArea,
                    oto_payment_id:    confirmedPaymentId,
                    oto_purchased_at:  new Date().toISOString()
                }, { onConflict: 'reading_id' });

            if (updateError) {
                console.error('Failed to update unlock record:', updateError);
            }
        }

        // ======================================================
        // STEP 7: Return success
        // ======================================================
        return res.status(200).json({
            success:             true,
            id:                  checkoutRequestId,
            payment_id:          confirmedPaymentId,
            checkout_request_id: checkoutRequestId,
            product:             productName
        });

    } catch (error) {
        console.error('process-upsell unhandled error:', error);
        return res.status(500).json({ error: error.message, success: false });
    }
};
