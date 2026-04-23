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

  if (event === "payment.succeeded") {
    const { email, metadata, order_id } = data;
    return {
      email,
      whopOrderId: order_id,
      firstName: metadata?.firstName || "Cosmic Traveler",
      birthDate: metadata?.birthDate,
      birthTime: metadata?.birthTime,
      birthCity: metadata?.birthCity,
      gender: metadata?.gender,
      lifeArea: metadata?.lifeArea || "love",
      relationshipStatus: metadata?.relationshipStatus,
      cosmicSigns: metadata?.cosmicSigns || [],
    };
  } else if (event === "membership.went_active") {
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

// Send email via Loops transactional API
async function sendLoopsEmail(email, firstName, readingUrl, lifePathNumber) {
  try {
    const response = await fetch("https://app.loops.so/api/v1/transactional", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LOOPS_API_KEY}`,
      },
      body: JSON.stringify({
        transactionalId: "star_signal_reading_ready",
        email,
        dataVariables: {
          firstName,
          readingUrl,
          lifePathNumber,
        },
      }),
    });

    if (!response.ok) {
      console.warn(
        `[LOOPS] Failed to send email to ${email}: ${response.status}`
      );
    }
  } catch (error) {
    console.warn(`[LOOPS] Error sending email: ${error.message}`);
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
    const readingUrl = `https://star-signal.co/reading?uuid=${readingId}`;
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
