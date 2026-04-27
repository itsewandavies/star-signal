/**
 * GENERATE READING — async background processor
 *
 * Called internally by the Whop webhook after it creates the DB record.
 * Runs as a separate Vercel function with maxDuration: 300 so Claude has
 * plenty of time to generate (~170s average).
 *
 * The webhook fires this endpoint WITHOUT awaiting the response, so it can
 * return 200 to Whop immediately (within ~2s) while generation continues here.
 *
 * This endpoint is intentionally simple to validate:
 * - readingId must exist in star_signal_readings
 * - status must be 'pending' (prevents double-generation on duplicate calls)
 */

const { createClient } = require('@supabase/supabase-js');
const generateReading  = require('./_generate');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const config = { maxDuration: 300 };

async function sendReadingEmail(email, firstName, readingUrl, lifePathNumber) {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.log(`[RESEND] No API key — skipping email for ${email}. Reading at: ${readingUrl}`);
            return;
        }

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
                    If the button doesn't work, copy and paste this link:<br>
                    <a href="${readingUrl}" style="color: #B89600; word-break: break-all;">${readingUrl}</a>
                </p>
                <hr style="border: none; border-top: 1px solid #E8D1D1; margin: 32px 0;">
                <p style="font-size: 12px; color: #9A8F8F; text-align: center;">
                    © 2026 Star Signal. Readings are for personal reflection and entertainment.
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
                from:    'Star Signal <noreply@send.starsignal.co>',
                to:      [email],
                subject: `✦ ${name}, your Cosmic Blueprint is ready`,
                html
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.warn(`[RESEND] Failed for ${email}: ${response.status} — ${errText}`);
        } else {
            console.log(`[RESEND] ✅ Email sent to ${email}`);
        }
    } catch (err) {
        console.warn(`[RESEND] Error: ${err.message}`);
        // Never throw — email failure must not fail the generation
    }
}

module.exports = async function handler(req, res) {
    // CORS for same-origin internal calls
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { readingId } = req.body || {};
    if (!readingId) {
        return res.status(400).json({ error: 'readingId required' });
    }

    try {
        // Fetch the reading record
        const { data: reading, error: fetchError } = await supabase
            .from('star_signal_readings')
            .select('*')
            .eq('id', readingId)
            .single();

        if (fetchError || !reading) {
            console.error(`[GENERATE] Reading not found: ${readingId}`);
            return res.status(404).json({ error: 'Reading not found' });
        }

        // Idempotency: skip if already complete or currently generating
        const isComplete = reading.generation_status === 'complete' ||
                           reading.generation_status === 'completed';
        if (isComplete) {
            console.log(`[GENERATE] Already complete for ${reading.email} — skipping`);
            return res.status(200).json({ skipped: true, status: reading.generation_status });
        }

        const isGenerating = reading.generation_status === 'generating';
        if (isGenerating) {
            // Only skip if it was set to 'generating' within the last 5 minutes
            // (prevents blocking a genuine retry after a crash)
            const updatedAt = new Date(reading.updated_at || reading.created_at).getTime();
            const ageMs = Date.now() - updatedAt;
            if (ageMs < 5 * 60 * 1000) {
                console.log(`[GENERATE] Already generating for ${reading.email} (${Math.round(ageMs/1000)}s ago) — skipping`);
                return res.status(200).json({ skipped: true, status: 'generating' });
            }
            // Older than 5 mins — assume it crashed, retry
            console.log(`[GENERATE] Previous generation stalled for ${reading.email} — retrying`);
        }

        // Mark as generating
        await supabase
            .from('star_signal_readings')
            .update({ generation_status: 'generating', updated_at: new Date().toISOString() })
            .eq('id', readingId);

        // Build quizData from the DB record
        const quizData = {
            firstName:          reading.first_name,
            email:              reading.email,
            birthDate:          reading.birth_date,
            birthTime:          reading.birth_time,
            birthCity:          reading.birth_city,
            gender:             reading.gender,
            lifeArea:           reading.life_area,
            relationshipStatus: reading.relationship_status,
            cosmicSigns:        reading.cosmic_signs || [],
        };

        console.log(`[GENERATE] Starting Claude generation for ${reading.email} (${readingId})`);
        const startTime = Date.now();

        let readingContent;
        try {
            readingContent = await generateReading(quizData);
        } catch (genErr) {
            console.error(`[GENERATE] Claude error for ${reading.email}:`, genErr.message);
            await supabase
                .from('star_signal_readings')
                .update({ generation_status: 'failed', updated_at: new Date().toISOString() })
                .eq('id', readingId);
            return res.status(200).json({ success: false, error: genErr.message });
        }

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`[GENERATE] Claude completed in ${elapsed}s for ${reading.email}`);

        // Save completed reading
        const { error: saveErr } = await supabase
            .from('star_signal_readings')
            .update({
                generation_status:  'complete',
                reading_content:    readingContent,
                life_path_number:   readingContent.lifePathNumber  || readingContent.life_path_number,
                sun_sign:           readingContent.sunSign         || readingContent.sun_sign,
                personal_year_2026: readingContent.personalYear2026 || readingContent.personal_year_2026,
                updated_at:         new Date().toISOString()
            })
            .eq('id', readingId);

        if (saveErr) {
            console.error(`[GENERATE] Save error for ${reading.email}:`, saveErr.message);
            return res.status(500).json({ error: 'Failed to save reading' });
        }

        console.log(`[GENERATE] ✅ Saved for ${reading.email}`);

        // Send email notification
        const paymentRef = reading.whop_order_id || '';
        const readingUrl = paymentRef
            ? `https://starsignal.co/r/${readingId}?pay=${paymentRef}`
            : `https://starsignal.co/r/${readingId}`;
        await sendReadingEmail(reading.email, reading.first_name, readingUrl, readingContent.lifePathNumber);

        return res.status(200).json({ success: true, readingId, elapsed });

    } catch (err) {
        console.error('[GENERATE] Unhandled error:', err.message);
        // Mark as failed so the admin can retry
        try {
            await supabase
                .from('star_signal_readings')
                .update({ generation_status: 'failed', updated_at: new Date().toISOString() })
                .eq('id', readingId);
        } catch {}
        return res.status(500).json({ error: err.message });
    }
};
