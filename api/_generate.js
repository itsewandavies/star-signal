/**
 * CLAUDE OPUS READING GENERATOR
 * The core engine for generating personalized cosmic blueprint readings
 * Called by the Whop webhook after purchase
 */

const Anthropic = require("@anthropic-ai/sdk");

// Numerological constants
const SOULMATE_INITIALS = {
  1: ["J", "A", "S"],
  2: ["M", "L", "D"],
  3: ["C", "R", "T"],
  4: ["N", "B", "P"],
  5: ["K", "E", "H"],
  6: ["D", "M", "J"],
  7: ["A", "S", "C"],
  8: ["R", "N", "G"],
  9: ["T", "W", "A"],
  11: ["J", "M", "C"],
  22: ["A", "D", "R"],
  33: ["S", "L", "T"],
};

const SUN_SIGNS = {
  "03-21": "Aries",
  "04-20": "Taurus",
  "05-21": "Gemini",
  "06-21": "Cancer",
  "07-23": "Leo",
  "08-23": "Virgo",
  "09-23": "Libra",
  "10-23": "Scorpio",
  "11-22": "Sagittarius",
  "12-22": "Capricorn",
  "01-20": "Aquarius",
  "02-19": "Pisces",
};

// Helper: Reduce to single digit or master number
function reduceToNumber(str) {
  let sum = 0;
  for (const char of str) {
    if (!isNaN(char)) sum += parseInt(char);
  }
  if (sum >= 10 && sum !== 11 && sum !== 22 && sum !== 33) {
    return reduceToNumber(sum.toString());
  }
  return sum;
}

// Calculate Life Path Number from birth date (YYYYMMDD)
function calculateLifePath(birthDate) {
  const cleaned = birthDate.replace(/-/g, "");
  return reduceToNumber(cleaned);
}

// Calculate Personal Year for 2026
function calculatePersonalYear(birthDate) {
  const [year, month, day] = birthDate.split("-");
  const daySum = reduceToNumber(`${month}${day}`);
  const yearSum = reduceToNumber("2026");
  return reduceToNumber(`${daySum}${yearSum}`);
}

// Get sun sign from birth month/day
function getSunSign(birthDate) {
  const [, month, day] = birthDate.split('-');
  const m = parseInt(month);
  const d = parseInt(day);
  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 'Aries';
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 'Taurus';
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return 'Gemini';
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return 'Cancer';
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 'Leo';
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 'Virgo';
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return 'Libra';
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return 'Scorpio';
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return 'Sagittarius';
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 'Capricorn';
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 'Aquarius';
  return 'Pisces';
}

// Get soulmate initial (deterministic from birth data)
function getSoulmateInitial(lifePathNumber, birthDate) {
  const [, , day] = birthDate.split("-");
  const dayNum = parseInt(day);
  const initials = SOULMATE_INITIALS[lifePathNumber] || ["J", "M", "S"];
  return initials[dayNum % 3];
}

// Get threshold event month (2-4 months from now)
function getThresholdMonth(personalYear, birthMonth) {
  const currentMonth = new Date().getMonth() + 1;
  const monthOffset = (personalYear % 4) + 2; // 2-5 month offset
  const targetMonth =
    ((currentMonth + monthOffset - 1) % 12) + 1;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[targetMonth - 1];
}

// Main generation function
async function generateReading(quizData) {
  const client = new Anthropic();

  // Destructure quiz data
  const {
    firstName,
    email,
    birthDate,
    birthTime,
    birthCity,
    lifeArea,
    relationshipStatus,
    cosmicSigns,
    gender,
  } = quizData;

  // Calculate all numerological data
  const lifePathNumber = calculateLifePath(birthDate);
  const personalYear2026 = calculatePersonalYear(birthDate);
  const sunSign = getSunSign(birthDate);
  const soulmateInitial = getSoulmateInitial(lifePathNumber, birthDate);
  const thresholdMonth = getThresholdMonth(
    personalYear2026,
    parseInt(birthDate.split("-")[1])
  );

  // Determine Life Path archetype
  const lifePathNames = {
    1: "The Leader",
    2: "The Diplomat",
    3: "The Creator",
    4: "The Builder",
    5: "The Adventurer",
    6: "The Nurturer",
    7: "The Seeker",
    8: "The Manifestor",
    9: "The Humanitarian",
    11: "The Visionary",
    22: "The Master Builder",
    33: "The Master Teacher",
  };

  const lifePathName = lifePathNames[lifePathNumber] || "The Seeker";

  // Build Claude prompt
  const prompt = `You are a world-class astrologer and numerologist. Generate a deeply personalized cosmic blueprint reading for a customer.

CUSTOMER DATA:
- Name: ${firstName}
- Birth Date: ${birthDate}
- Birth City: ${birthCity}
- Gender: ${gender}
- Relationship Status: ${relationshipStatus}
- Life Area Focus: ${lifeArea}

NUMEROLOGICAL CALCULATIONS (use these, they are accurate):
- Life Path Number: ${lifePathNumber} (${lifePathName})
- Personal Year 2026: ${personalYear2026}
- Sun Sign: ${sunSign}
- Soulmate Initial: ${soulmateInitial}
- Threshold Event Month: ${thresholdMonth}

CRITICAL INSTRUCTIONS:
1. Every single paragraph must feel like it could ONLY apply to this specific person. Use their birth city, sun sign, and Life Path traits throughout.
2. The reading should feel eerily accurate, making them feel deeply seen and understood.
3. Do NOT use generic horoscope language. Be specific and personal.
4. For the monthly forecasts, Personal Year ${personalYear2026} means: ${getPersonalYearMeaning(personalYear2026)}
5. The soulmate initial is ${soulmateInitial} — this is deterministic and correct.
6. All content must be written in a warm, mystical tone that respects their intelligence.

Generate and return ONLY valid JSON (no markdown, no extra text) with this exact structure:
{
  "life_path_name": "${lifePathName}",
  "life_path_description": "400+ word description of what it means to be a Life Path ${lifePathNumber} person, specifically for someone born on ${birthDate} in ${birthCity} with Sun sign ${sunSign}. Make it feel written just for them.",
  "opening_revelation": "300 word opening paragraph that references their birth city, date, Life Path ${lifePathNumber}, and sun sign. Make them feel seen and understood. This should be the most compelling paragraph.",
  "personality_revelation": {
    "headline": "You've Always Felt Different — And Here's Why",
    "body": "400 word paragraph about their unique traits as a Life Path ${lifePathNumber} ${sunSign}. Reference specific psychological patterns. Make it feel eerily accurate. Everyone has felt misunderstood — describe why THEIR version of this is true."
  },
  "past_pattern_revelation": {
    "headline": "Something In The Last 18 Months Has Shifted You Forever",
    "body": "350 words about their recent transformation. Personal Year ${personalYear2026} suggests: ${getPersonalYearMeaning(personalYear2026)}. Make it feel like you know exactly what happened to them. Reference their Life Path traits in how they would process major change."
  },
  "threshold_event": {
    "month": "${thresholdMonth}",
    "month_end": "${getThresholdMonthEnd(thresholdMonth)}",
    "headline": "A Major Life Shift Is Coming In ${thresholdMonth} — You Need To Be Ready",
    "body": "300 words about the Threshold Event specifically for a ${lifeArea}-focused person with Life Path ${lifePathNumber}. Create urgency. What KIND of shift based on ${lifeArea}? (If love: relationship/soulmate arrival. If money: wealth opportunity. If purpose: career/mission clarity. If spiritual: gift activation). Make it feel inevitable and personal."
  },
  "life_area_deep_dive": {
    "${lifeArea}": "600+ words specifically for their selected life area (${lifeArea}). Make this the most compelling section. ${getLifeAreaPrompt(lifeArea, lifePathNumber, sunSign, relationshipStatus, soulmateInitial, thresholdMonth)}"
  },
  "monthly_forecasts": [
    {
      "month": "January 2026",
      "energy_type": "Portal",
      "theme": "New beginnings aligned with your Personal Year ${personalYear2026} energy",
      "detailed_forecast": "150 word forecast explaining what January 2026 means specifically for a Personal Year ${personalYear2026} person",
      "power_days": ["Jan 3", "Jan 11", "Jan 19"],
      "caution_days": ["Jan 7", "Jan 24"],
      "focus_area": "Love",
      "affirmation": "I welcome the new energies entering my life in 2026"
    },
    {
      "month": "February 2026",
      "energy_type": "Growth",
      "theme": "Integration and deepening of January's themes",
      "detailed_forecast": "150 word forecast for February based on Personal Year ${personalYear2026}",
      "power_days": ["Feb 2", "Feb 14", "Feb 22"],
      "caution_days": ["Feb 8", "Feb 20"],
      "focus_area": "Love",
      "affirmation": "My heart is open to unexpected blessings"
    },
    {
      "month": "March 2026",
      "energy_type": "Portal",
      "theme": "Portal opening — the Threshold Event window begins",
      "detailed_forecast": "150 word forecast highlighting the Threshold Event arrival window. This is the climactic month. Make it feel significant.",
      "power_days": ["Mar 3", "Mar 14", "Mar 21"],
      "caution_days": ["Mar 6", "Mar 28"],
      "focus_area": "${lifeArea === 'love' ? 'Love' : lifeArea === 'money' ? 'Finances' : lifeArea === 'purpose' ? 'Career' : 'Spirituality'}",
      "affirmation": "I am ready to recognize and embrace my Threshold Event"
    },
    {
      "month": "April 2026",
      "energy_type": "Acceleration",
      "theme": "Momentum from the Threshold Event",
      "detailed_forecast": "150 word forecast",
      "power_days": ["Apr 4", "Apr 11", "Apr 25"],
      "caution_days": ["Apr 9", "Apr 22"],
      "focus_area": "${lifeArea === 'love' ? 'Love' : lifeArea === 'money' ? 'Finances' : lifeArea === 'purpose' ? 'Career' : 'Spirituality'}",
      "affirmation": "My momentum is unstoppable"
    },
    {
      "month": "May 2026",
      "energy_type": "Growth",
      "theme": "Consolidation and integration",
      "detailed_forecast": "150 word forecast",
      "power_days": ["May 5", "May 15", "May 23"],
      "caution_days": ["May 7", "May 26"],
      "focus_area": "Health",
      "affirmation": "I integrate my growth with grace"
    },
    {
      "month": "June 2026",
      "energy_type": "Release",
      "theme": "Letting go of what no longer serves",
      "detailed_forecast": "150 word forecast",
      "power_days": ["Jun 3", "Jun 12", "Jun 21"],
      "caution_days": ["Jun 8", "Jun 25"],
      "focus_area": "Relationships",
      "affirmation": "I release with love and trust"
    },
    {
      "month": "July 2026",
      "energy_type": "Portal",
      "theme": "Summer rebirth and new direction",
      "detailed_forecast": "150 word forecast",
      "power_days": ["Jul 1", "Jul 11", "Jul 19"],
      "caution_days": ["Jul 6", "Jul 27"],
      "focus_area": "Creativity",
      "affirmation": "My authentic self is emerging"
    },
    {
      "month": "August 2026",
      "energy_type": "Growth",
      "theme": "Building on new foundations",
      "detailed_forecast": "150 word forecast",
      "power_days": ["Aug 8", "Aug 16", "Aug 24"],
      "caution_days": ["Aug 5", "Aug 23"],
      "focus_area": "Career",
      "affirmation": "I build my dreams with confidence"
    },
    {
      "month": "September 2026",
      "energy_type": "Acceleration",
      "theme": "Harvest and manifestation",
      "detailed_forecast": "150 word forecast",
      "power_days": ["Sep 3", "Sep 12", "Sep 21"],
      "caution_days": ["Sep 7", "Sep 26"],
      "focus_area": "Finances",
      "affirmation": "Abundance flows to me naturally"
    },
    {
      "month": "October 2026",
      "energy_type": "Pause",
      "theme": "Reflection and integration",
      "detailed_forecast": "150 word forecast",
      "power_days": ["Oct 1", "Oct 10", "Oct 19"],
      "caution_days": ["Oct 8", "Oct 28"],
      "focus_area": "Spirituality",
      "affirmation": "I trust the wisdom of the pause"
    },
    {
      "month": "November 2026",
      "energy_type": "Release",
      "theme": "Completing cycles and gratitude",
      "detailed_forecast": "150 word forecast",
      "power_days": ["Nov 2", "Nov 11", "Nov 20"],
      "caution_days": ["Nov 6", "Nov 24"],
      "focus_area": "Family",
      "affirmation": "I am grateful for all that I've become"
    },
    {
      "month": "December 2026",
      "energy_type": "Portal",
      "theme": "Completion and new beginnings",
      "detailed_forecast": "150 word forecast closing out 2026 and opening to 2027",
      "power_days": ["Dec 3", "Dec 12", "Dec 21"],
      "caution_days": ["Dec 8", "Dec 25"],
      "focus_area": "Celebration",
      "affirmation": "I celebrate the person I've become"
    }
  ],
  "oto_content": {
    "${lifeArea}": {
      "headline": "${getOTOHeadline(lifeArea)}",
      ${lifeArea === "love" ? `"soulmate_initial": "${soulmateInitial}", "soulmate_arrival_window": "${thresholdMonth}", "false_matches": ["Pattern 1: ${getFalseMatchPattern1(lifePathNumber)}", "Pattern 2: ${getFalseMatchPattern2(lifePathNumber)}", "Pattern 3: ${getFalseMatchPattern3(lifePathNumber)}"], "cosmic_block": "300 words about the specific energetic block for Life Path ${lifePathNumber} with status ${relationshipStatus}. What is keeping them from their soulmate? Make it deeply personal.", "clearing_ritual": "250 words specific ritual to clear the block. Moon phase recommendations, crystal, breathwork.",` : ""}
      ${lifeArea === "money" ? `"wealth_archetype": "The ${getWealthArchetype(lifePathNumber)}", "abundance_window": "${getAbundanceWindow(personalYear2026)}", "family_money_block": "300 words about inherited money patterns for Life Path ${lifePathNumber}. What did they learn about money from their family?", "ideal_income_path": "200 words about the income path aligned with Life Path ${lifePathNumber}", "activation_ritual": "200 words specific money ritual"` : ""}
      ${lifeArea === "purpose" ? `"mission_statement": "A powerful one-sentence Life Mission for Life Path ${lifePathNumber}", "misalignment_signs": ["Sign 1: ${getMisalignmentSign1(lifePathNumber)}", "Sign 2: ${getMisalignmentSign2(lifePathNumber)}", "Sign 3: ${getMisalignmentSign3(lifePathNumber)}"], "alignment_steps": "400 words actionable steps", "purpose_affirmations": "150 words with 5 specific affirmations"` : ""}
      ${lifeArea === "spiritual" ? `"spiritual_gifts": ["Gift 1: ${getSpiritualGift1(lifePathNumber)}", "Gift 2: ${getSpiritualGift2(lifePathNumber)}", "Gift 3: ${getSpiritualGift3(lifePathNumber)}"], "acceleration_practices": "400 words specific practices", "past_life_signature": "300 words about past life patterns", "chakra_focus": "200 words about chakra imbalance"` : ""}
    }
  },
  "morning_ritual": {
    "duration": "8 minutes",
    "affirmation": "A personalized daily affirmation for Life Path ${lifePathNumber}",
    "breathwork": "150 words specific breathwork aligned with Life Path ${lifePathNumber} energy",
    "crystal": "A crystal aligned with Life Path ${lifePathNumber} and ${sunSign}",
    "intention_setting": "100 words how to set daily intention",
    "full_ritual": "400 words complete 8-minute morning ritual"
  },
  "numerology_deep_dive": {
    "destiny_number": ${calculateDestinyNumber(birthDate)},
    "destiny_meaning": "200 words about their Destiny Number",
    "soul_urge_number": ${calculateSoulUrgeNumber(birthDate)},
    "soul_urge_meaning": "200 words about their Soul Urge",
    "personality_number": ${calculatePersonalityNumber(birthDate)},
    "personality_meaning": "150 words about their Personality Number"
  },
  "soulmate_initial": "${soulmateInitial}",
  "threshold_month": "${thresholdMonth}",
  "personal_year_2026": ${personalYear2026},
  "life_path_number": ${lifePathNumber},
  "sun_sign": "${sunSign}"
}`;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8000,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse JSON response
    let readingContent = JSON.parse(content.text);

    // Enrich with calculated values
    readingContent = {
      ...readingContent,
      lifePathNumber,
      personalYear2026,
      sunSign,
      soulmateInitial,
      thresholdMonth,
    };

    return readingContent;
  } catch (error) {
    console.error("[_generate] Error calling Claude:", error.message);
    throw error;
  }
}

// Helper functions for cleaner prompt
function getPersonalYearMeaning(py) {
  const meanings = {
    1: "a year of new beginnings, independence, and taking bold action",
    2: "a year of partnerships, patience, and collaboration",
    3: "a year of creativity, self-expression, and joy",
    4: "a year of structure, hard work, and building foundations",
    5: "a year of change, freedom, and adventure",
    6: "a year of service, responsibility, and family",
    7: "a year of introspection, spiritual growth, and inner wisdom",
    8: "a year of abundance, power, and manifestation",
    9: "a year of completion, release, and new chapters",
  };
  return meanings[py] || "a year of transformation and growth";
}

function getThresholdMonthEnd(month) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const idx = months.indexOf(month);
  return months[(idx + 2) % 12];
}

function getLifeAreaPrompt(area, lp, sign, relationshipStatus, initial, month) {
  if (area === "love") {
    return `They are focused on LOVE. This section must reveal: their soulmate's energy (initial is ${initial}), the month they'll arrive (${month}), why they keep attracting the wrong person (based on LP ${lp} patterns), and what changes in their romantic life in 2026. Reference their ${relationshipStatus} status. Make them feel SEEN in their romantic struggles and hopes.`;
  } else if (area === "money") {
    return `They are focused on MONEY. This section must reveal: their Wealth Archetype, their 3-month abundance window in 2026, the inherited money block from their family line, and their ideal income path. For Life Path ${lp}, explain why money has felt difficult and what shifts in their financial destiny in 2026.`;
  } else if (area === "purpose") {
    return `They are focused on PURPOSE. This section must reveal: their exact Life Purpose in one sentence, the 3 signs they're currently misaligned, the year their Purpose Portal opens, and specific steps to align with their cosmic design. Life Path ${lp} has a specific mission — describe it compellingly.`;
  } else {
    return `They are focused on SPIRITUAL GROWTH. This section must reveal: their 3 dominant spiritual gifts, the practices that will accelerate their awakening in 2026, their past-life signature and how it affects them now, and the specific chakra imbalance slowing their progress. Life Path ${lp} is in the middle of a Quantum Awakening.`;
  }
}

function getOTOHeadline(area) {
  const headlines = {
    love: "Your Soulmate Activator",
    money: "Your Wealth Code Activation",
    purpose: "Your Life Mission Decoder",
    spiritual: "Your Awakening Accelerator",
  };
  return headlines[area] || "Your Cosmic Activation";
}

// Destiny number helpers (simplified from birth date)
function calculateDestinyNumber(birthDate) {
  return reduceToNumber(birthDate.replace(/-/g, ""));
}

function calculateSoulUrgeNumber(birthDate) {
  const [year, month, day] = birthDate.split("-");
  return reduceToNumber(`${month}${day}`);
}

function calculatePersonalityNumber(birthDate) {
  const [year] = birthDate.split("-");
  return reduceToNumber(year);
}

// Life area-specific helpers
function getWealthArchetype(lp) {
  const archetypes = {
    1: "Pioneer",
    2: "Steward",
    3: "Creator",
    4: "Builder",
    5: "Opportunist",
    6: "Nurturer",
    7: "Seeker",
    8: "Manifestor",
    9: "Philanthropist",
  };
  return archetypes[lp] || "Seeker";
}

function getAbundanceWindow(py) {
  const windows = {
    1: "January - March 2026",
    2: "April - June 2026",
    3: "July - August 2026",
    4: "September - October 2026",
    5: "May - July 2026",
    6: "March - May 2026",
    7: "August - October 2026",
    8: "June - August 2026",
    9: "November - December 2026",
  };
  return windows[py] || "March - May 2026";
}

function getFalseMatchPattern1(lp) {
  const patterns = {
    1: "The person who seems like a leader but is actually controlling",
    2: "The person who needs to be saved rather than standing equally",
    3: "The person who laughs but doesn't truly know you",
    4: "The person who is stable but emotionally unavailable",
    5: "The person who promises adventure but lacks depth",
    6: "The person who is kind but dependent on you for identity",
    7: "The person who is interesting but unavailable",
    8: "The person who has status but no heart",
    9: "The person who is giving but not true",
  };
  return patterns[lp] || "The person who is wrong for you";
}

function getFalseMatchPattern2(lp) {
  return "The person who triggers your deepest wound rather than healing it";
}

function getFalseMatchPattern3(lp) {
  return "The person who represents what you think you should want rather than what you truly need";
}

function getMisalignmentSign1(lp) {
  return `As a Life Path ${lp}, you're misaligned when you ignore your intuition`;
}

function getMisalignmentSign2(lp) {
  return `When you're doing work that doesn't light you up but feels safe`;
}

function getMisalignmentSign3(lp) {
  return `When you're prioritizing other people's dreams over your own calling`;
}

function getSpiritualGift1(lp) {
  const gifts = {
    1: "Natural leadership in spiritual spaces",
    2: "Intuitive empathy and healing presence",
    3: "Channeling divine inspiration through creativity",
    4: "Grounding spiritual wisdom into practical reality",
    5: "Speaking universal truths with courage",
    6: "Unconditional love and service",
    7: "Deep mystical insight and inner knowing",
    8: "Manifesting divine abundance",
    9: "Wisdom from lived experience",
  };
  return gifts[lp] || "Spiritual awareness";
}

function getSpiritualGift2(lp) {
  return "A magnetic presence that inspires others toward their truth";
}

function getSpiritualGift3(lp) {
  return "The ability to perceive what's invisible to most people";
}

module.exports = generateReading;
