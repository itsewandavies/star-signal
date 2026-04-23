/**
 * READING FETCH API
 * Serves personalized reading data by UUID or email
 */

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { uuid, email } = req.query;

    if (!uuid && !email) {
      return res.status(400).json({ error: "uuid or email required" });
    }

    let query = supabase.from("star_signal_readings").select("*");

    if (uuid) {
      query = query.eq("id", uuid);
    } else {
      query = query.eq("email", email);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return res.status(404).json({ error: "Reading not found" });
      }
      throw error;
    }

    // Update accessed_at (fire and forget, don't await)
    supabase
      .from("star_signal_readings")
      .update({ accessed_at: new Date().toISOString() })
      .eq("id", data.id)
      .catch((err) => console.warn("[READING] Failed to update accessed_at:", err));

    // If still generating, don't include full content yet
    if (data.generation_status !== "complete") {
      return res.status(200).json({
        uuid: data.id,
        email: data.email,
        firstName: data.first_name,
        status: data.generation_status,
        ready: false,
      });
    }

    // Return full reading
    return res.status(200).json({
      uuid: data.id,
      email: data.email,
      firstName: data.first_name,
      birthDate: data.birth_date,
      birthCity: data.birth_city,
      birthTime: data.birth_time,
      gender: data.gender,
      lifeArea: data.life_area,
      relationshipStatus: data.relationship_status,
      lifePathNumber: data.life_path_number,
      sunSign: data.sun_sign,
      personalYear2026: data.personal_year_2026,
      otoUnlocked: data.oto_unlocked,
      status: data.generation_status,
      ready: true,
      readingContent: data.reading_content,
    });
  } catch (error) {
    console.error("[READING] Error:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
