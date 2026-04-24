/**
 * OTO UNLOCK API
 * Handles OTO ($67) unlock when customer pays for full reading access
 */

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { maxDuration: 10 };

async function unlockRecord(uuid, email) {
  let query = supabase.from("star_signal_readings");

  if (uuid) {
    const { error } = await query
      .update({ oto_unlocked: true, oto_unlocked_at: new Date().toISOString() })
      .eq("id", uuid);
    if (error) throw new Error(`Unlock failed: ${error.message}`);
  } else if (email) {
    const { error } = await query
      .update({ oto_unlocked: true, oto_unlocked_at: new Date().toISOString() })
      .eq("email", email);
    if (error) throw new Error(`Unlock failed: ${error.message}`);
  } else {
    throw new Error("uuid or email required");
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;

    // Check if this is a Whop webhook
    if (body.action === "payment_succeeded" && body.data?.metadata?.readingUuid) {
      // Whop OTO payment webhook
      const { readingUuid, email } = body.data.metadata;

      try {
        await unlockRecord(readingUuid, email);
        console.log(`[UNLOCK] OTO unlocked for ${email} (UUID: ${readingUuid})`);
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error("[UNLOCK] Error unlocking:", error.message);
        // Still return 200 so Whop doesn't retry
        return res.status(200).json({
          success: false,
          error: error.message,
        });
      }
    }

    // Direct API call: { uuid, email }
    const { uuid, email } = body;

    if (!uuid && !email) {
      return res.status(400).json({ error: "uuid or email required" });
    }

    try {
      await unlockRecord(uuid, email);
      console.log(`[UNLOCK] OTO unlocked via direct API: ${uuid || email}`);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("[UNLOCK] Error:", error.message);
      return res.status(500).json({ error: error.message });
    }
  } catch (error) {
    console.error("[UNLOCK] Handler error:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
