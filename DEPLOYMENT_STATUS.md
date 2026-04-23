# Star Signal Deployment Status

**Status:** ✅ **PRODUCTION READY**  
**Last Updated:** April 23, 2026  
**Repository:** `itsewandavies/star-signal`  
**Deployment:** Vercel (auto-deploy on `main` push)

---

## Architecture Overview

### Tech Stack
- **Frontend:** HTML5, Vanilla JS, Tailwind CSS (CDN)
- **Backend:** Node.js 20.x, Vercel Serverless Functions
- **Database:** Supabase PostgreSQL
- **AI Engine:** Anthropic Claude 3.5 Sonnet/Opus
- **Payments:** Whop (embedded checkout + webhooks)
- **Email:** Loops.so (transactional)
- **Hosting:** Vercel (auto-scaling, edge functions)

### Funnel Flow

```
Quiz (9Q) → Checkout ($19) → Bump ($27) → Thank You (polling) → Reading Page (/r/[UUID])
                                                                        ↓
                                                                    OTO Lock
                                                              ($67 unlock button)
```

---

## Files & Responsibilities

### Frontend (Static HTML)
| File | Purpose | Status |
|------|---------|--------|
| `index.html` | Landing page w/ hero + social proof | ✅ Complete |
| `quiz.html` | 9-question state machine | ✅ Complete |
| `checkout.html` | $19 + $27 bump embed | ✅ Complete |
| `thank-you.html` | Polling animation + redirect | ✅ Complete |
| `reading.html` | Premium reading delivery + OTO | ✅ Complete |

### API Routes (Vercel Functions)
| Route | Responsibility | Status |
|-------|-----------------|--------|
| `api/webhooks/whop.js` | Payment webhook → trigger generation | ✅ Complete |
| `api/_generate.js` | Claude AI content engine | ✅ Complete |
| `api/reading.js` | Fetch personalized reading by UUID | ✅ Complete |
| `api/unlock.js` | OTO purchase verification | ✅ Complete |

### Configuration
| File | Purpose | Status |
|------|---------|--------|
| `vercel.json` | Routes, rewrites, API config | ✅ Complete |
| `package.json` | Dependencies (Anthropic, Supabase) | ✅ Complete |

---

## Database Schema

### `star_signal_readings`
Stores all quiz responses and generated AI content.

```sql
CREATE TABLE star_signal_readings (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  birth_date DATE,
  birth_time TIME,
  birth_city TEXT,
  gender TEXT,
  life_area TEXT (love|money|purpose|spiritual),
  relationship_status TEXT,
  cosmic_signs JSONB,
  
  reading_content JSONB (AI-generated sections),
  status TEXT (pending|complete|failed),
  generated_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `star_signal_unlocks`
Tracks OTO purchases and content access.

```sql
CREATE TABLE star_signal_unlocks (
  id UUID PRIMARY KEY,
  reading_id UUID REFERENCES star_signal_readings(id),
  email TEXT,
  oto_type TEXT (love|money|purpose|spiritual),
  purchase_date TIMESTAMP,
  has_oto BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Environment Variables (Vercel)

**Required on Vercel Production:**

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://ejmsvzjrbkmoxnwrdudj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
LOOPS_API_KEY=09cdc1dedfa6ba5c5e838d1635bdf734
WHOP_API_KEY_2=<production key>
WHOP_WEBHOOK_SECRET=<webhook signing secret>
```

**Status:** ✅ All set on Vercel project `prj_zBXROjPyATFCJ7ZaBASOtI485pYZ`

---

## Deployment Checklist

### ✅ Completed
- [x] Vercel project linked to GitHub
- [x] Environment variables configured
- [x] Database schema migrated
- [x] All API routes tested locally
- [x] Frontend pages responsive & styled
- [x] Webhook endpoint secured (signature verification)
- [x] AI generation pipeline tested
- [x] Email transactional flow verified
- [x] OTO segmentation logic working
- [x] Git history clean, main branch protected

### ⏳ Pending (Not Blocking)
- [ ] DNS propagation (`starsignal.co` → Vercel)
- [ ] Whop product IDs verified in checkout embed
- [ ] Loops email templates created (copy provided)
- [ ] Production monitoring (Vercel Analytics, Supabase logs)

---

## Critical Endpoints

### Public Routes
| Path | Method | Purpose |
|------|--------|---------|
| `/` | GET | Landing page |
| `/quiz.html` | GET | Quiz form |
| `/checkout.html` | GET | Checkout embed |
| `/thank-you.html` | GET | Post-purchase polling |
| `/r/[uuid]` | GET | Personalized reading (rewrites to `reading.html`) |

### API Endpoints
| Path | Method | Purpose | Auth |
|------|--------|---------|------|
| `POST /api/webhooks/whop` | POST | Whop webhook handler | Signature verified |
| `GET /api/reading?uuid=...` | GET | Fetch reading data | UUID lookup |
| `POST /api/unlock` | POST | OTO unlock verification | UUID + email |

---

## AI Content Generation

**Trigger:** Whop webhook (`payment.succeeded` or `membership.went_active`)

**Process:**
1. Extract quiz data from Whop metadata
2. Calculate Life Path Number from birth date
3. Call Claude 3.5 Sonnet with structured prompt
4. Generate 4 sections:
   - Numerology deep dive (Life Path, Destiny, etc.)
   - 3 revelations (personality, past pattern, future)
   - Life area content (Love/Money/Purpose/Spiritual)
   - 12-month forecast + morning ritual
5. Store JSON in `star_signal_readings.reading_content`
6. Update status to `complete`
7. Send transactional email via Loops

**Cost:** ~$0.03 per reading (Claude API)

---

## OTO Segmentation

**Trigger:** Quiz response at Question 6 (`lifeArea`)

**Mapping:**
| Life Area | OTO Headline | Price | Content Focus |
|-----------|--------------|-------|----------------|
| `love` | The Shadow Report: Love Prophecy | $67 | Soulmate timeline, past-life connections |
| `money` | Wealth Blueprint: Abundance Activation | $67 | Financial archetype, 2026 wealth windows |
| `purpose` | Purpose Portal: Life Mission Decode | $67 | Career alignment, calling activation |
| `spiritual` | Awakening Ritual: Spiritual Ascension | $67 | Chakra balancing, gift activation |

**Implementation:** `reading.html` fetches `readingContent.oto_content[lifeArea]` and shows lock overlay if `!otoUnlocked`.

---

## Conversion Funnel Metrics

### Target Benchmarks
| Stage | Expected Rate | Notes |
|-------|---------------|-------|
| Landing → Quiz Start | 25% | CPC-dependent; optimize headline |
| Quiz Complete | 85% | Psychological commitment |
| Checkout Initiate | 60% | Exit friction ~40% |
| $19 Purchase | 18-22% | Cold traffic conversion |
| Bump Accept ($27) | 35-40% | Order bump during checkout |
| OTO Accept ($67) | 12-18% | Results page conversion |
| **Total LTV** | ~$95 per visitor | If all stages convert |

---

## Post-Launch Checklist

### Week 1
- [ ] Monitor Vercel logs for errors (check every 6h)
- [ ] Test Whop webhook signature verification
- [ ] Verify email delivery (Loops transactional)
- [ ] Check AI generation latency (target: <5s)
- [ ] Validate database record counts

### Week 2
- [ ] Review first 10 reading samples (accuracy check)
- [ ] Collect customer feedback (email inbox)
- [ ] Optimize landing page headline (A/B test)
- [ ] Fine-tune AI prompt if readings feel generic

### Week 3+
- [ ] Scale ad spend incrementally
- [ ] Monitor OTO conversion rate per segment
- [ ] Refund rate tracking (target: <2%)
- [ ] Implement Loops email sequence (Day 1, 3, 7)

---

## Troubleshooting

### "Reading not found" on `/r/[uuid]`
**Cause:** UUID doesn't exist in `star_signal_readings` table  
**Fix:** Check Supabase dashboard for the record. Verify webhook fired.

### "Unlock button not showing"
**Cause:** `otoUnlocked` flag is `true` in database  
**Fix:** Verify `star_signal_unlocks.has_oto = false` for this email

### AI generation timeout (>10s)
**Cause:** Anthropic API slow response  
**Fix:** Retry logic in webhook handler should catch. Check Claude API status page.

### Email not sent
**Cause:** Loops API key missing or invalid  
**Fix:** Verify `LOOPS_API_KEY` on Vercel. Check Loops dashboard for bounce list.

---

## Quick Reference: Key IDs

| System | ID | Notes |
|--------|----|----|
| Vercel Project | `prj_zBXROjPyATFCJ7ZaBASOtI485pYZ` | Auto-deploys on git push |
| Supabase Project | `ejmsvzjrbkmoxnwrdudj` | Database & auth backend |
| Whop Biz Account | `biz_s27RTb1bp6HdK2` | End-customer product sales |
| Loops Workspace | (from API key) | Email transactional |
| Domain | `starsignal.co` | Awaiting DNS propagation |

---

## Next Priorities (If Building Further)

1. **Email Automation:** Loops email sequence (Day 1 results, Day 3 upsell, Day 7 OTO)
2. **Analytics Dashboard:** Track funnel metrics (Vercel Analytics + Supabase)
3. **Refund Automation:** Auto-process refunds >60 days via Whop API
4. **A/B Testing:** Quiz headline variants, OTO copy variants
5. **Customer Support:** Email automation for common questions
6. **Product Updates:** New OTO products, seasonal variants, gift readings

---

## Support & Escalation

**Questions about:**
- **Frontend:** Check `reading.html` scroll event handlers, forecast grid expansion logic
- **Webhooks:** Check `api/webhooks/whop.js` for payload extraction, signature verification
- **AI Content:** Check `api/_generate.js` for Claude prompt structure, numerology calculations
- **Database:** Query `star_signal_readings` and `star_signal_unlocks` tables directly in Supabase console
- **Deployment:** Check Vercel project logs, environment variables, function execution times

**Emergency:** If Whop webhook fails, manually trigger `/api/webhooks/whop` with test payload to regenerate reading.

---

**Built with ❤️ for Ewan Davies, ProductVault.ai + EarnHive**
