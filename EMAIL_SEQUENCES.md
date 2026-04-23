# Star Signal Email Sequences (Loops.so)

These emails are triggered automatically by the Whop webhook after purchase. Set up in Loops.so dashboard using the templates below.

---

## Email 1: Transactional Receipt + Reading Delivery
**Trigger:** `payment.succeeded` (immediately after checkout)  
**Subject:** ✨ Your Cosmic Blueprint Is Ready — [FIRST_NAME]  
**Send:** Immediately (0 seconds)

```
Subject: ✨ Your Cosmic Blueprint Is Ready — [FIRST_NAME]

Hi [FIRST_NAME],

Your $19 Cosmic Blueprint has been unlocked.

Your personalized reading is now live and waiting for you:

🔮 [READING_URL]

What you'll find inside:
✨ Your Life Path Number & what it means for 2026
✨ The "Awakening Revelation" (3 things your birth date reveals)
✨ Your Soulmate's Initial (or Wealth Timeline, depending on your focus)
✨ Your Threshold Event date — when destiny knocks
✨ Your personalized Morning Ritual & 12-month forecast

Most readers spend 15-20 minutes with their Blueprint. You might want to grab coffee, find somewhere quiet, and really sit with it.

This reading is yours to keep forever. Download it, share it (though it's custom to YOUR birth data), and come back to it anytime.

If you have any trouble accessing your reading, reply to this email and I'll help you get in.

To your cosmic awakening,

Ewan  
Star Signal

P.S. — If this resonates with you, there's a deeper reading available inside your portal. More on that in a few days.

---
[Footer: Unsubscribe link]
```

**Dynamic Variables:**
- `[FIRST_NAME]` = `firstName` from quiz
- `[READING_URL]` = `https://starsignal.co/r/[UUID]`

---

## Email 2: Day 3 — Share & Social Proof
**Trigger:** 3 days after `payment.succeeded`  
**Subject:** Have you seen page 7 of your Blueprint yet?  
**Send:** 9:00 AM (recipient's timezone if available, else UTC)

```
Subject: Have you seen page 7 of your Blueprint yet?

Hi [FIRST_NAME],

Quick question: have you read through your cosmic blueprint yet?

If you have, I'd love to know — what part hit you hardest?

The "Awakening Revelation" section? The Threshold Event timeline? Your soulmate's initial? 

Our readers tell us they usually get hit by something between pages 7-14 that makes them go "wait… how did they know that?"

Here's the thing: that accuracy isn't luck. Your reading is custom-generated from your exact birth coordinates using the same astrological system that's been refined for 4,000 years.

The reason most people never get clarity on their lives is that generic horoscopes can't see *you*. But your Blueprint can.

If you haven't opened it yet, here's your link again:

🔮 [READING_URL]

(No pressure. But if you're feeling stuck or uncertain about 2026, it's worth 20 minutes of your time.)

And if you loved it — have you shared it? Your friends might be wondering the same things you were.

Talk soon,

Ewan  
Star Signal

P.S. — If you want an even deeper dive into your specific life area (love, money, purpose, or spiritual gifts), we have specialized reports available. More on that next email.

---
[Footer: Unsubscribe link]
```

**Notes:**
- Gentle social proof ("our readers tell us")
- FOMO-lite ("the reason most people never get clarity")
- Implied OTO in P.S. (prepares for email 3)

---

## Email 3: Day 7 — OTO Pitch (Segmented by Life Area)
**Trigger:** 7 days after `payment.succeeded`  
**Subject:** [LIFE_AREA] — The Next Level (Segmented per option below)  
**Send:** 7:00 PM

### Variant A: Love Path
```
Subject: [Love] The Next Level

Hi [FIRST_NAME],

Your Blueprint revealed something critical: your soulmate's initial and the month you're most likely to meet them.

But here's what most readers miss:

There's a "cosmic block" — a pattern from your past — that's been keeping your true match at a distance.

It might be an old heartbreak. A limiting belief about love. A relationship habit that doesn't serve you.

And until you decode it, you might walk right past your person without recognizing them.

We created "The Shadow Report: Love Prophecy" to go deeper.

It includes:

✨ The 3 "false matches" you've been attracted to (and why they never worked)
✨ Your Venus placement and what it means for your type
✨ The specific ritual to clear the cosmic block
✨ A month-by-month love forecast for 2026 (not generic)
✨ The exact traits of your soulmate (beyond the initial)

It's a $67 one-time investment that most of our readers tell us was worth 10x more.

Ready to go deeper?

🔮 [OTO_LINK]

This offer is only available to people who've unlocked their Cosmic Blueprint. And it's only held at this price through the end of this week.

After that, it goes back to $97.

So if you felt seen by your reading, and you want to actually DO something with that clarity?

Now's the moment.

To your destiny,

Ewan  
Star Signal

P.S. — This is not for everyone. It's for people who are genuinely ready for the answer to "when will I meet the one?" and brave enough to look at what's been blocking it.

---
[Footer: Unsubscribe link]
```

### Variant B: Money Path
```
Subject: [Money] The Next Level

Hi [FIRST_NAME],

Your Blueprint revealed your Wealth Archetype — the specific way money is meant to flow to you.

But here's what changes everything:

Most people are operating AGAINST their natural wealth design.

You might have a "Creator" archetype but you're working a "Giver" job. Or you're a "Strategist" stuck in "Survivor" energy. And that misalignment costs you tens of thousands every year.

We created "The Wealth Blueprint: Abundance Activation" to show you:

✨ Your exact Wealth Archetype and what it means
✨ The 3-month "Abundance Portal" in 2026 when wealth opens (with precise dates)
✨ The hidden money block inherited from your family line (and how to clear it)
✨ Your ideal income path based on pure numerology (not trends)
✨ The exact amount you're "coded" to earn (this shocks people)

It's a $67 one-time investment. Most readers tell us they made that back in the first 30 days after aligning with their design.

Ready to earn what you're actually capable of?

🔮 [OTO_LINK]

This offer is only available to Blueprint holders. And only at this price through Friday.

After that, $97.

If your current income doesn't match your potential, and you're ready to find out WHY?

This is it.

To abundance,

Ewan  
Star Signal

P.S. — The money block section alone is worth the price. Most people are unknowingly reenacting their parent's financial trauma. Seeing it is the first step to breaking it.

---
[Footer: Unsubscribe link]
```

### Variant C: Purpose Path
```
Subject: [Purpose] The Next Level

Hi [FIRST_NAME],

Your Blueprint revealed your Life Path Number — the core archetype that defines your purpose.

But here's what most people never discover:

You were born with a SPECIFIC MISSION. Not a generic "follow your passion" kind of thing. A real, encoded-in-your-numbers, meant-for-only-you kind of mission.

And most people spend their whole life in the wrong field because they never decoded it.

We created "The Purpose Portal: Life Mission Decode" for people ready to know:

✨ Your true Life Purpose (in one sentence)
✨ The 3 signs you're currently misaligned (and why you feel stuck)
✨ The exact year your "Purpose Portal" opens (it might already be open)
✨ The specific career/business path that matches your design
✨ Your 2026 alignment plan (month by month)

It's a $67 one-time investment. Most readers tell us it was the permission they needed to finally make the leap.

Ready to stop drifting and start designing?

🔮 [OTO_LINK]

This offer is only available to Blueprint holders. Only at this price through Friday.

If you've ever felt like you were meant for more, and you want to know what that is?

This is the answer.

To your calling,

Ewan  
Star Signal

P.S. — The "alignment signs" section will make you go "oh my god, that's exactly what's been happening." Clarity changes everything.

---
[Footer: Unsubscribe link]
```

### Variant D: Spiritual Path
```
Subject: [Spiritual] The Next Level

Hi [FIRST_NAME],

Your Blueprint revealed that you're in the middle of a "Quantum Awakening" — a rare period when your spiritual gifts are rapidly expanding.

But here's what most people miss:

You have 3 dominant spiritual gifts. But most people only ever discover 1 (if they're lucky).

And without knowing all three, you're operating at 30% of your potential power.

We created "The Awakening Ritual: Spiritual Ascension" to guide you through:

✨ Your 3 dominant spiritual gifts (intuition, healing, channeling, etc.)
✨ The chakra imbalance that's slowing your progress (and the exact ritual to rebalance)
✨ Your past-life signature and the karmic lessons you're here to learn
✨ The specific practices to accelerate your awakening in 2026
✨ The protection ritual (critical for empaths and sensitive people)

It's a $67 one-time investment that most readers tell us felt like a spiritual initiation.

Ready to activate what's been dormant inside you?

🔮 [OTO_LINK]

This offer is only available to Blueprint holders. Only at this price through Friday.

If you've felt the call but weren't sure what you were being called TO?

This is it.

To your ascension,

Ewan  
Star Signal

P.S. — The chakra rebalancing ritual is worth doing daily. People tell us they feel different within 3 days. Calmer. More connected. More themselves.

---
[Footer: Unsubscribe link]
```

---

## Setup Instructions (Loops.so)

1. **Create Automation Sequence:**
   - Go to Loops.so dashboard → Automations → New
   - Set trigger: `email` event with property `event_type` = `reading_purchased`

2. **Email 1 (Immediate):**
   - Add email template
   - Paste content above
   - Set delay: **0 seconds**
   - Map variables: `first_name`, `reading_url`

3. **Email 2 (Day 3):**
   - Add email template
   - Paste content above
   - Set delay: **3 days**
   - Time optimization: Send at 9 AM (user timezone if available)

4. **Email 3 (Day 7):**
   - Add **4 conditional branches** (one per life area)
   - Branch on: `life_area` attribute
   - Set delay: **7 days**
   - Time optimization: Send at 7 PM
   - Map `[OTO_LINK]` to the correct payment link for that segment

5. **Test:**
   - Send test email to yourself with life_area = "love"
   - Verify variables rendered correctly
   - Verify links work

---

## Variable Mapping

| Loops Variable | Source | Example |
|---|---|---|
| `first_name` | `star_signal_readings.first_name` | "Sarah" |
| `reading_url` | Construct as `https://starsignal.co/r/[UUID]` | `https://starsignal.co/r/abc-123-def` |
| `life_area` | `star_signal_readings.life_area` | "love", "money", "purpose", "spiritual" |
| `oto_link` | Whop checkout link (varies per segment) | Provided by Whop dashboard |

---

## OTO Link Format

The OTO links should be Whop checkout embeds or direct links:

```
Love OTO: https://whop.com/checkout/[PLAN_ID]?email=[EMAIL]
Money OTO: https://whop.com/checkout/[PLAN_ID]?email=[EMAIL]
Purpose OTO: https://whop.com/checkout/[PLAN_ID]?email=[EMAIL]
Spiritual OTO: https://whop.com/checkout/[PLAN_ID]?email=[EMAIL]
```

Replace `[PLAN_ID]` with the actual Whop product plan IDs from your Whop dashboard.

---

## Unsubscribe & Compliance

All emails must include unsubscribe link (Loops handles this automatically).  
Footer should read:

```
© 2026 Star Signal. All rights reserved.
This email was sent to [EMAIL] because you purchased a Cosmic Blueprint.
[Unsubscribe link]
```

---

**Ready to set up?** Log into Loops.so and create the automation sequence. Estimated setup time: 15 minutes.
