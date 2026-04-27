/**
 * Manual reading generator — run locally to retry failed readings
 * Usage: node generate-reading-manual.js
 */

require('dotenv').config({ path: '.env.prod' });

const generateReading = require('./api/_generate');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function sendReadingEmail(email, firstName, readingId) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Star Signal <noreply@send.starsignal.co>',
        to: [email],
        subject: `${firstName}, your Cosmic Blueprint is ready`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0f; color: #e8e0d0;">
            <h1 style="color: #d4af37; font-size: 28px; text-align: center;">Your Cosmic Blueprint Is Ready</h1>
            <p style="font-size: 16px; line-height: 1.7; color: #c8c0b0;">Hi ${firstName},</p>
            <p style="font-size: 16px; line-height: 1.7; color: #c8c0b0;">Your personalized reading has been generated. Click below to access your full Cosmic Blueprint:</p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://starsignal.co/reading.html?id=${readingId}" 
                 style="background: linear-gradient(135deg, #d4af37 0%, #f5d76e 100%); color: #0a0a0f; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-size: 18px; font-weight: bold; display: inline-block;">
                View My Cosmic Blueprint →
              </a>
            </div>
            <p style="font-size: 14px; color: #8a8070; text-align: center;">This is your personal reading — bookmark the link above to return to it anytime.</p>
          </div>
        `
      })
    });
    const data = await res.json();
    console.log('[EMAIL] Resend response:', data);
    return data;
  } catch (err) {
    console.error('[EMAIL] Error:', err.message);
  }
}

async function main() {
  const READING_ID = '0f300384-742f-4dae-91a3-6de82ff5ec53';

  console.log(`[START] Generating reading for ID: ${READING_ID}`);

  // Fetch the record
  const { data: record, error } = await supabase
    .from('star_signal_readings')
    .select('*')
    .eq('id', READING_ID)
    .single();

  if (error || !record) {
    console.error('[ERROR] Could not fetch reading:', error);
    process.exit(1);
  }

  console.log(`[RECORD] Found: ${record.email} | status=${record.generation_status}`);

  // Build quizData from DB record
  const quizData = {
    firstName: record.first_name,
    email: record.email,
    birthDate: record.birth_date,
    birthTime: record.birth_time,
    birthCity: record.birth_city,
    gender: record.gender,
    lifeArea: record.life_area,
    relationshipStatus: record.relationship_status,
    cosmicSigns: record.cosmic_signs || [],
  };

  console.log('[QUIZ DATA]', JSON.stringify(quizData, null, 2));
  console.log('[GENERATING] Calling Claude... this takes 30-60 seconds');

  try {
    const readingContent = await generateReading(quizData);

    console.log('[CLAUDE] Reading generated successfully');
    console.log('[CLAUDE] Keys:', Object.keys(readingContent));

    // Calculate derived values
    const lifePathNumber = readingContent.lifePathNumber || readingContent.life_path_number;
    const sunSign = readingContent.sunSign || readingContent.sun_sign;
    const personalYear = readingContent.personalYear2026 || readingContent.personal_year_2026;

    // Save to Supabase
    const { error: updateError } = await supabase
      .from('star_signal_readings')
      .update({
        reading_content: readingContent,
        generation_status: 'completed',
        life_path_number: lifePathNumber,
        sun_sign: sunSign,
        personal_year_2026: personalYear,
        updated_at: new Date().toISOString()
      })
      .eq('id', READING_ID);

    if (updateError) {
      console.error('[SUPABASE] Update error:', updateError);
      process.exit(1);
    }

    console.log('[SUPABASE] Reading saved successfully');

    // Send email
    console.log('[EMAIL] Sending reading email...');
    await sendReadingEmail(record.email, record.first_name, READING_ID);

    console.log(`\n[DONE] Reading available at: https://starsignal.co/reading.html?id=${READING_ID}`);
  } catch (err) {
    console.error('[ERROR] Generation failed:', err.message);

    // Mark as failed
    await supabase
      .from('star_signal_readings')
      .update({ generation_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', READING_ID);

    process.exit(1);
  }
}

main();
