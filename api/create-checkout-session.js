/**
 * create-checkout-session.js
 * Creates a Whop checkout session for Star Signal
 * Called by checkout.html on page load (once for FE-only, once for FE+bump bundle)
 *
 * Returns: { session_id, success }
 * The frontend embeds: https://whop.com/checkout/{session_id}/
 *
 * Quiz answers are passed as metadata so the Whop webhook can use them
 * to generate the personalized reading after payment.
 */

const WHOP_API_KEY = process.env.WHOP_API_KEY_2; // Acct 2: biz_s27RTb1bp6HdK2

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

        // Build metadata — tracking data + quiz answers for webhook
        const metadata = {};

        // Tracking
        if (tid)            metadata.tid = tid;
        if (fbc)            metadata.fbc = fbc;
        if (fbp)            metadata.fbp = fbp;
        if (ref)            metadata.ref = ref;
        if (affiliate_code) metadata.earnhive_ref = affiliate_code;

        // Quiz data (so webhook can generate reading without needing a separate DB lookup)
        if (quizMetadata) {
            if (quizMetadata.firstName)          metadata.firstName          = quizMetadata.firstName;
            if (quizMetadata.birthDate)          metadata.birthDate          = quizMetadata.birthDate;
            if (quizMetadata.birthTime)          metadata.birthTime          = quizMetadata.birthTime;
            if (quizMetadata.birthCity)          metadata.birthCity          = quizMetadata.birthCity;
            if (quizMetadata.gender)             metadata.gender             = quizMetadata.gender;
            if (quizMetadata.lifeArea)           metadata.lifeArea           = quizMetadata.lifeArea;
            if (quizMetadata.relationshipStatus) metadata.relationshipStatus = quizMetadata.relationshipStatus;
            if (quizMetadata.cosmicSigns)        metadata.cosmicSigns        = JSON.stringify(quizMetadata.cosmicSigns);
        }

        // Build Whop checkout session request
        const requestBody = {
            plan_id:  plan_id,
            metadata: metadata
        };

        // Attach Whop affiliate code (for Whop's own affiliate attribution if applicable)
        if (affiliate_code) {
            requestBody.affiliate_code = affiliate_code;
        }

        // Create session via Whop API v2
        const response = await fetch('https://api.whop.com/api/v2/checkout_sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHOP_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('[CHECKOUT SESSION] Whop API error:', result);
            return res.status(response.status).set(corsHeaders).json({
                error: 'Failed to create checkout session',
                details: result
            });
        }

        console.log('[CHECKOUT SESSION] Created:', result.id, 'for plan:', plan_id);

        return res.status(200).set(corsHeaders).json({
            session_id: result.id,
            success: true
        });

    } catch (error) {
        console.error('[CHECKOUT SESSION] Error:', error.message);
        return res.status(500).set(corsHeaders).json({ error: error.message });
    }
};
