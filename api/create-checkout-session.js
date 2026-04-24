/**
 * create-checkout-session.js — Whop V2
 * Star Signal checkout session creator
 */

const WHOP_KEY = process['env']['WHOP_API_KEY_STAR'] || process['env']['WHOP_API_KEY'];

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = req.body || {};
        const plan_id        = body.plan_id;
        const affiliate_code = body.affiliate_code || '';
        const tid            = body.tid || '';
        const fbc            = body.fbc || '';
        const fbp            = body.fbp || '';
        const ref            = body.ref || '';
        const quizMetadata   = body.metadata || {};

        if (!plan_id) {
            return res.status(400).json({ error: 'plan_id is required' });
        }

        // Build metadata for the webhook
        const meta = {};
        if (tid)            meta.tid           = tid;
        if (fbc)            meta.fbc           = fbc;
        if (fbp)            meta.fbp           = fbp;
        if (ref)            meta.ref           = ref;
        if (affiliate_code) meta.earnhive_ref  = affiliate_code;

        if (quizMetadata.firstName)          meta.firstName          = quizMetadata.firstName;
        if (quizMetadata.birthDate)          meta.birthDate          = quizMetadata.birthDate;
        if (quizMetadata.birthTime)          meta.birthTime          = quizMetadata.birthTime;
        if (quizMetadata.birthCity)          meta.birthCity          = quizMetadata.birthCity;
        if (quizMetadata.gender)             meta.gender             = quizMetadata.gender;
        if (quizMetadata.lifeArea)           meta.lifeArea           = quizMetadata.lifeArea;
        if (quizMetadata.relationshipStatus) meta.relationshipStatus = quizMetadata.relationshipStatus;
        if (quizMetadata.cosmicSigns)        meta.cosmicSigns        = JSON.stringify(quizMetadata.cosmicSigns);

        const requestBody = {
            plan_id:      plan_id,
            metadata:     meta,
            redirect_url: 'https://starsignal.co/thank-you'
        };

        if (quizMetadata.email) {
            requestBody.customer_email = quizMetadata.email;
        }

        const response = await fetch('https://api.whop.com/api/v2/checkout_sessions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + WHOP_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('[CHECKOUT] Whop error:', JSON.stringify(result));
            return res.status(response.status).json({
                error: 'Failed to create checkout session',
                details: result
            });
        }

        const purchaseUrl = result.purchase_url || result.url || result.checkout_url;

        if (!purchaseUrl) {
            console.error('[CHECKOUT] No URL in response:', JSON.stringify(result));
            return res.status(500).json({ error: 'No checkout URL returned' });
        }

        console.log('[CHECKOUT] Created for plan:', plan_id);

        return res.status(200).json({
            purchase_url: purchaseUrl,
            session_id:   result.id || null,
            success:      true
        });

    } catch (err) {
        console.error('[CHECKOUT] Crash:', err.message, err.stack);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
