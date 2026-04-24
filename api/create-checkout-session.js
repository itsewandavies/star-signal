/**
 * create-checkout-session.js — Whop V2
 *
 * Creates a Whop checkout session for Star Signal.
 * Called by checkout.html on page load (twice — once for FE-only, once for FE+bump bundle).
 *
 * Returns: { purchase_url, success }
 * The frontend embeds: <iframe src="{purchase_url}">
 *
 * Quiz answers + tracking data are passed as metadata so the
 * payment_succeeded webhook can use them to generate the personalized reading.
 */

const WHOP_KEY = process['env']['WHOP_API_KEY_STAR'] || process['env']['WHOP_API_KEY'];

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).set(corsHeaders).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).set(corsHeaders).json({ error: 'Method not allowed' });
    }

    try {
        const body = req.body || {};
        const {
            plan_id,
            affiliate_code,
            tid,
            fbc,
            fbp,
            ref,
            metadata: quizMetadata
        } = body;

        if (!plan_id) {
            return res.status(400).set(corsHeaders).json({ error: 'plan_id is required' });
        }

        // Build metadata — passed to webhook so it can generate the personalized reading
        const checkout_metadata = {};

        // Tracking
        if (tid)            checkout_metadata.tid           = tid;
        if (fbc)            checkout_metadata.fbc           = fbc;
        if (fbp)            checkout_metadata.fbp           = fbp;
        if (ref)            checkout_metadata.ref           = ref;
        if (affiliate_code) checkout_metadata.earnhive_ref  = affiliate_code;

        // Quiz data
        if (quizMetadata) {
            if (quizMetadata.firstName)          checkout_metadata.firstName          = quizMetadata.firstName;
            if (quizMetadata.birthDate)          checkout_metadata.birthDate          = quizMetadata.birthDate;
            if (quizMetadata.birthTime)          checkout_metadata.birthTime          = quizMetadata.birthTime;
            if (quizMetadata.birthCity)          checkout_metadata.birthCity          = quizMetadata.birthCity;
            if (quizMetadata.gender)             checkout_metadata.gender             = quizMetadata.gender;
            if (quizMetadata.lifeArea)           checkout_metadata.lifeArea           = quizMetadata.lifeArea;
            if (quizMetadata.relationshipStatus) checkout_metadata.relationshipStatus = quizMetadata.relationshipStatus;
            if (quizMetadata.cosmicSigns)        checkout_metadata.cosmicSigns        = JSON.stringify(quizMetadata.cosmicSigns);
        }

        const requestBody = {
            plan_id:      plan_id,
            metadata:     checkout_metadata,
            redirect_url: 'https://starsignal.co/thank-you'
        };

        if (quizMetadata && quizMetadata.email) {
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
            console.error('[CHECKOUT] Whop API error:', JSON.stringify(result));
            return res.status(response.status).set(corsHeaders).json({
                error: 'Failed to create checkout session',
                details: result
            });
        }

        const purchaseUrl = result.purchase_url || result.url || result.checkout_url;

        if (!purchaseUrl) {
            console.error('[CHECKOUT] No purchase_url in response:', JSON.stringify(result));
            return res.status(500).set(corsHeaders).json({
                error: 'Whop returned no checkout URL',
                raw: result
            });
        }

        console.log('[CHECKOUT] Created for plan:', plan_id, 'URL:', purchaseUrl.substring(0, 60));

        return res.status(200).set(corsHeaders).json({
            purchase_url: purchaseUrl,
            session_id:   result.id || null,
            success:      true
        });

    } catch (error) {
        console.error('[CHECKOUT] Error:', error.message);
        return res.status(500).set(corsHeaders).json({ error: error.message });
    }
};
