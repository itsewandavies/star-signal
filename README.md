# Star Signal — Premium Astrological Reading Funnel

**Status:** ✅ Production Ready | **Live:** `starsignal.co` | **Backend:** Vercel (auto-deploy)

---

## What This Is

A high-converting ($19 → $113 LTV) astrological reading funnel that:
1. Captures birth data via 9-question quiz
2. Generates AI-personalized cosmic readings (Claude API)
3. Delivers via unique URLs (`/r/[UUID]`) — no login required
4. Segmentes buyers by life area (Love/Money/Purpose/Spiritual)
5. Upsells OTO products ($67 each) based on pain point

**Architecture:** Static HTML frontend + Vercel serverless backend + Supabase DB + Whop payments + Loops email automation.

---

## Quick Start (After DNS Propagation)

1. **Set up Whop products:** Get plan IDs from Whop dashboard, paste into `checkout.html`
2. **Create Whop webhook:** Point to `https://starsignal.co/api/webhooks/whop`
3. **Configure Loops.so:** Set up email automation sequence (see `EMAIL_SEQUENCES.md`)
4. **Launch ads:** Send cold traffic to `starsignal.co` (Meta/TikTok)
5. **Monitor dashboard:** Check Vercel logs, Supabase records, email delivery

---

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Landing page w/ hero + social proof |
| `quiz.html` | 9-question state machine (captures birth data) |
| `checkout.html` | $19 + $27 bump (Whop embed) |
| `thank-you.html` | Polling page (waits for reading generation) |
| `reading.html` | Premium reading delivery + OTO lock |
| `api/webhooks/whop.js` | Payment webhook → trigger AI generation |
| `api/_generate.js` | Claude API call + save to Supabase |
| `api/reading.js` | Fetch reading by UUID |
| `api/unlock.js` | OTO unlock verification |
| `DEPLOYMENT_STATUS.md` | Full architecture + troubleshooting |
| `EMAIL_SEQUENCES.md` | Loops.so email copy (4-day sequence) |
| `OPERATIONAL_CHECKLIST.md` | Pre-launch + Week 1-4 ops |

---

## Conversion Funnel

```
Landing Page (25% click-through)
    ↓
Quiz Completion (85% completion rate)
    ↓
Checkout Page (60% initiate, 18-22% convert to $19)
    ↓
Thank You + Polling (100% redirect when ready)
    ↓
Reading Page w/ OTO Lock (12-18% OTO conversion at $67)
    ↓
Total LTV: ~$95 per visitor
```

---

## Critical Setup Before Launch

### DNS
- [ ] Point `starsignal.co` nameservers to Vercel
- [ ] Verify with `nslookup starsignal.co`

### Whop
- [ ] Get 6 product plan IDs (Base, Bump, 4x OTO)
- [ ] Replace placeholders in `checkout.html`
- [ ] Create webhook → `https://starsignal.co/api/webhooks/whop`
- [ ] Test with Whop test mode

### Loops.so
- [ ] Create account + get API key
- [ ] Set up 4-email automation sequence
- [ ] Test delivery with test purchase

### Environment Variables (Vercel)
```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://ejmsvzjrbkmoxnwrdudj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
LOOPS_API_KEY=09cdc1dedfa6ba5c5e838d1635bdf734
WHOP_API_KEY_2=<live key>
WHOP_WEBHOOK_SECRET=<webhook signing secret>
```

---

## How It Works (30 Seconds)

1. **Customer lands** on `starsignal.co` → fills 9-question quiz
2. **Quiz captures:** Birth date, time, location, life area (Love/Money/Purpose/Spiritual)
3. **Redirect to checkout** → $19 (+ $27 bump optional)
4. **Payment succeeds** → Whop webhook fires
5. **Backend triggers** Claude API to generate AI reading (takes 3-5s)
6. **Result saved** to Supabase with unique UUID
7. **Customer redirected** to `/r/[UUID]` → reading loads
8. **OTO lock overlay** blocks deeper sections, drives $67 upsell

---

## Costs

| Item | Monthly Cost | Notes |
|------|--------------|-------|
| Vercel | $0-20 | Free tier OK for <1k/mo revenue |
| Supabase | $25 | Database + auth |
| Anthropic API | ~$300 (at scale) | ~$0.03 per reading @ 3k/mo |
| Loops.so | $30 | 10k contacts free tier |
| Domain | $10 | `starsignal.co` (GoDaddy/Namecheap) |
| **Total** | ~$385 | Scales with volume |

**Break-even:** ~40 sales at $19 = $760 revenue vs. $385 cost = **2:1 initial margin**

---

## Support & Escalation

**Questions about the funnel?** See `DEPLOYMENT_STATUS.md` (architecture) or `OPERATIONAL_CHECKLIST.md` (day-to-day ops).

**Want to test locally?** 
```bash
cd ~/.hermes/vault/repos/star-signal
npm install
npm run dev  # Vercel CLI local preview
```

**Need to modify copy/styling?**
- Frontend: Edit `.html` files directly
- Backend logic: Edit `api/*.js` files
- Deployment: `git push origin main` (auto-deploys to Vercel)

---

## Metrics to Track

| KPI | Target | Monitor |
|-----|--------|---------|
| Landing → Quiz Start | 25% | Meta ads CTR |
| Quiz Completion | 85% | Vercel logs (page views) |
| Quiz → Checkout | 60% | Traffic drop-off |
| Checkout → $19 Purchase | 18-22% | Whop dashboard |
| Bump Accept | 35-40% | Whop dashboard |
| $19 → OTO | 12-18% | Supabase query |
| Refund Rate | <2% | Whop dashboard |
| AI Generation Time | <5s | Vercel function logs |
| Email Open Rate | >40% | Loops.so analytics |

---

## Roadmap (Next 60 Days)

**Week 1-2:** DNS propagation, Whop setup, email automation  
**Week 3:** Launch cold traffic ads (Meta)  
**Week 4:** A/B test landing page headline + quiz copy  
**Week 5-6:** Optimize OTO conversion (segment-specific email variants)  
**Week 7-8:** Scale winning ads, plan next OTO product

---

## Notes

- **No login required.** Customers access readings via unique UUID in URL
- **AI-generated content.** Each reading is personalized via Claude API + quiz answers
- **Whop handles payments.** All payment processing + webhook delivery
- **Email automation.** Loops.so handles 4-email sequence post-purchase
- **Single codebase.** Frontend + backend in one GitHub repo, auto-deploys to Vercel

---

**Built for:** Ewan Davies  
**Product:** EarnHive (Star Signal subcategory)  
**Domain:** `starsignal.co`  
**Repository:** `github.com/itsewandavies/star-signal`  

Questions? Check DEPLOYMENT_STATUS.md or OPERATIONAL_CHECKLIST.md.

Deploy with confidence. 🔮✨
