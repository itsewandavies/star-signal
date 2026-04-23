/**
 * WHOP PURCHASE WEBHOOK HANDLER
 * Receives payment notifications from Whop and triggers reading generation
 */

const { createClient } = require("@supabase/supabase-js");
const generateReading = require("../_generate");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Extract customer data from Whop webhook payload
function extractPayload(body) {
  const { event, data } = body;

  // Handle both underscore (current Whop V2) and dot notation (legacy)
  if (event === "payment_succeeded" || event === "payment.succeeded") {
    const { email, metadata, order_id, id } = data;
    return {
      email,
      whopOrderId: order_id || id,
      firstName: metadata?.firstName || "Cosmic Traveler",
      birthDate: metadata?.birthDate,
      birthTime: metadata?.birthTime,
      birthCity: metadata?.birthCity,
      gender: metadata?.gender,
      lifeArea: metadata?.lifeArea || "love",
      relationshipStatus: metadata?.relationshipStatus,
      cosmicSigns: Array.isArray(metadata?.cosmicSigns)
        ? metadata.cosmicSigns
        : (metadata?.cosmicSigns ? JSON.parse(metadata.cosmicSigns) : []),
    };
  } else if (event === "membership.went_active" || event === "membership_went_active") {
    const { user, id, product } = data;
    return {
      email: user?.email,
      whopOrderId: id,
      firstName: product?.metadata?.firstName || "Cosmic Traveler",
      birthDate: product?.metadata?.birthDate,
      birthTime: product?.metadata?.birthTime,
      birthCity: product?.metadata?.birthCity,
      gender: product?.metadata?.gender,
      lifeArea: product?.metadata?.lifeArea || "love",
      relationshipStatus: product?.metadata?.relationshipStatus,
      cosmicSigns: product?.metadata?.cosmicSigns || [],
    };
  }

  return null;
}

// Send email via Resend transactional API
async function sendLoopsEmail(email, firstName, readingUrl, lifePathNumber) {
  try {
    const name = firstName || 'Cosmic Traveler';
    const html = `
      <div style="font-family: Georgia, serif; max-width: 580px; margin: 0 auto; background: #FDFBF7; padding: 40px 32px; color: #2C2828;">
        <div style="text-align:center; margin-bottom: 32px;">
          <span style="font-size: 24px; font-style: italic; color: #2C2828;">✦ Star Signal</span>
        </div>
        <h1 style="font-size: 28px; font-weight: 600; margin-bottom: 8px; line-height: 1.2;">
          ${name}, your Cosmic Blueprint is ready.
        </h1>
        <p style="font-size: 16px; color: #5A5252; margin-bottom: 24px; line-height: 1.6;">
          Your personalised reading has been decoded — 40+ pages built entirely from your exact birth coordinates.
          Your Life Path Number is <strong style="color: #B89600;">${lifePathNumber}</strong>.
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
          <br><a href="https://starsignal.co/unsubscribe?email=${encodeURIComponent(email)}" style="color: #9A8F8F;">Unsubscribe</a>
        </p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Star Signal <noreply@starsignal.co>",
        to: [email],
        subject: `✦ ${name}, your Cosmic Blueprint is ready`,
        html: html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[RESEND] Failed to send email to ${email}: ${response.status} — ${errText}`);
    } else {
      console.log(`[RESEND] Email sent successfully to ${email}`);
    }
  } catch (error) {
    console.warn(`[RESEND] Error sending email: ${error.message}`);
    // Don't throw — email is nice-to-have, webhook must succeed
  }
}

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  // Only POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = extractPayload(req.body);

    if (!payload || !payload.email || !payload.birthDate) {
      console.warn("[WHOP] Payload missing required fields:", payload);
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { email, whopOrderId, ...quizData } = payload;

    // Check if reading already exists for this email
    const { data: existing, error: lookupError } = await supabase
      .from("star_signal_readings")
      .select("id, generation_status")
      .eq("email", email)
      .single();

    if (lookupError && lookupError.code !== "PGRST116") {
      // PGRST116 = no rows found (expected)
      throw new Error(`Supabase lookup failed: ${lookupError.message}`);
    }

    let readingId = existing?.id;

    // If not exists, create new record
    if (!existing) {
      const { data: newRecord, error: insertError } = await supabase
        .from("star_signal_readings")
        .insert([
          {
            email,
            whop_order_id: whopOrderId,
            first_name: quizData.firstName,
            birth_date: quizData.birthDate,
            birth_time: quizData.birthTime,
            birth_city: quizData.birthCity,
            gender: quizData.gender,
            life_area: quizData.lifeArea,
            relationship_status: quizData.relationshipStatus,
            cosmic_signs: quizData.cosmicSigns,
            generation_status: "generating",
          },
        ])
        .select("id")
        .single();

      if (insertError) {
        throw new Error(`Insert failed: ${insertError.message}`);
      }

      readingId = newRecord.id;
    }

    console.log(`[WHOP] Processing reading for ${email} (ID: ${readingId})`);

    // Generate reading via Claude
    let readingContent;
    let lifePathNumber;
    let sunSign;
    let personalYear2026;

    try {
      readingContent = await generateReading(quizData);
      lifePathNumber = readingContent.lifePathNumber;
      sunSign = readingContent.sunSign;
      personalYear2026 = readingContent.personalYear2026;
    } catch (genError) {
      console.error(`[GENERATE] Error for ${email}:`, genError.message);

      // Update record with failed status
      await supabase
        .from("star_signal_readings")
        .update({ generation_status: "failed" })
        .eq("id", readingId);

      // Still return 200 to Whop so webhook doesn't retry
      return res.status(200).json({
        success: false,
        error: "Generation failed",
        readingId,
      });
    }

    // Update record with completed reading
    const { error: updateError } = await supabase
      .from("star_signal_readings")
      .update({
        generation_status: "complete",
        reading_content: readingContent,
        life_path_number: lifePathNumber,
        sun_sign: sunSign,
        personal_year_2026: personalYear2026,
      })
      .eq("id", readingId);

    if (updateError) {
      throw new Error(`Update failed: ${updateError.message}`);
    }

    // Send email with reading link
    const readingUrl = `https://starsignal.co/r/${readingId}`;
    await sendLoopsEmail(email, quizData.firstName, readingUrl, lifePathNumber);

    console.log(`[WHOP] ✅ Reading complete for ${email}`);

    return res.status(200).json({
      success: true,
      readingId,
      readingUrl,
    });
  } catch (error) {
    console.error("[WHOP] Webhook error:", error);
    // Return 200 anyway so Whop doesn't retry infinitely
    return res.status(200).json({
      success: false,
      error: error.message,
    });
  }
}
