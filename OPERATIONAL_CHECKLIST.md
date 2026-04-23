# Star Signal Operational Checklist

## Pre-Launch (This Week)

### Infrastructure & Deployment
- [x] Vercel project created and linked to GitHub
- [x] Environment variables configured on Vercel
- [x] Supabase project initialized with schema
- [x] GitHub repository set up with auto-deploy
- [ ] **DNS Setup:** Point `starsignal.co` to Vercel nameservers (via GoDaddy)
  - Vercel NS records: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`, etc.
  - Timeline: 24-48 hours for propagation
  - Verification: `nslookup starsignal.co` should return Vercel IPs

### Whop Integration
- [ ] **Get Live Plan IDs:** From Whop dashboard → Products
  - $19 Base Blueprint Plan ID: `_______________`
  - $27 Bump Plan ID: `_______________`
  - $67 Love OTO Plan ID: `_______________`
  - $67 Money OTO Plan ID: `_______________`
  - $67 Purpose OTO Plan ID: `_______________`
  - $67 Spiritual OTO Plan ID: `_______________`
- [ ] Replace placeholders in `checkout.html` with live IDs
- [ ] **Webhook Setup:** Whop Dashboard → Webhooks
  - Endpoint: `https://starsignal.co/api/webhooks/whop`
  - Events: `payment.succeeded`, `membership.went_active`, `membership.went_invalid`
  - Signing secret: Copy to Vercel env var `WHOP_WEBHOOK_SECRET`
- [ ] Test webhook with Whop's webhook tester (send test payload)
- [ ] Verify webhook signature validation working

### Email (Loops.so)
- [ ] Create Loops account (or add new workspace)
- [ ] Get API key → add to Vercel env: `LOOPS_API_KEY`
- [ ] Create automation sequence (see `EMAIL_SEQUENCES.md`)
  - Email 1: Transactional receipt (immediate)
  - Email 2: Day 3 engagement
  - Email 3: Day 7 OTO pitch (4 variants)
- [ ] Test email delivery with test purchase
- [ ] Configure unsubscribe list sync

### Payment & Compliance
- [ ] Terms of Service page (link in footer)
- [ ] Privacy Policy page (link in footer)
- [ ] 60-day refund guarantee T&Cs
- [ ] Copyright notice for AI-generated content
- [ ] GDPR compliance check (if EU traffic expected)

### Analytics & Monitoring
- [ ] Enable Vercel Analytics (dashboard → Settings → Analytics)
- [ ] Set up Supabase performance monitoring
- [ ] Create Vercel uptime alerts (webhook failure detection)
- [ ] Configure email bounce handling in Loops

---

## Launch Day

### Verification (Morning)
- [ ] Visit `https://starsignal.co` in incognito browser
  - Landing page loads ✓
  - All images render ✓
  - Social proof bar visible ✓
  - CTA buttons clickable ✓

- [ ] Complete quiz flow end-to-end
  - All 9 questions load ✓
  - Answers persist on page reload ✓
  - Thank you page shows ✓
  - Polling animation runs ✓

- [ ] Test checkout (use Whop test mode if available)
  - $19 product appears ✓
  - $27 bump visible ✓
  - Pricing math correct ✓
  - Checkout redirects to thank you ✓

### Testing (Pre-Ads)
- [ ] **Test Payment Flow (Whop Test Mode):**
  - Make $1 test purchase
  - Verify webhook fires (check Vercel logs)
  - Check Supabase for new record in `star_signal_readings`
  - Verify status progresses: `pending` → `complete`
  - Receive transactional email ✓
  - Check `/r/[UUID]` landing with full reading ✓

- [ ] **Test OTO Flow:**
  - Verify OTO lock overlay shows on reading page
  - Click OTO link
  - Simulate $67 purchase
  - Check `star_signal_unlocks.has_oto` flips to `true`
  - Refresh reading page, verify locked content unlocks ✓

- [ ] **Test Email Sequence:**
  - Email 1: Should arrive within 60 seconds
  - Email 2: Scheduled for day 3 (check queue in Loops)
  - Email 3: Verify correct variant for life_area ✓

- [ ] **Monitor Logs:**
  - Vercel function logs (check for errors)
  - Supabase activity (check inserts/updates)
  - Loops.so delivery status (check sent/bounced)
  - Claude API cost (verify ~$0.03 per read)

### Go-Live Checklist
- [ ] DNS verified (ping starsignal.co)
- [ ] SSL certificate active (green lock in browser)
- [ ] All environment variables confirmed on Vercel
- [ ] Whop webhook tested and receiving events
- [ ] Email sequence running (test email received)
- [ ] Supabase backups enabled
- [ ] Vercel uptime monitoring active
- [ ] Slack/Discord webhook set up for critical alerts (optional)

---

## Week 1 Operations

### Daily (9 AM)
- [ ] Check Vercel uptime dashboard (zero downtime target)
- [ ] Review function execution times (target: <5s for generation)
- [ ] Check error rate (target: <1% failed purchases)
- [ ] Scan email inbox for customer complaints

### Daily (6 PM)
- [ ] Check Supabase connection status
- [ ] Verify Loops email delivery (check bounces)
- [ ] Review Anthropic API usage (budget tracking)
- [ ] Monitor Whop dashboard for refunds/chargebacks

### Weekly (Friday)
- [ ] Generate metrics report:
  - Total purchases (breakout by product)
  - OTO conversion rate per segment (Love/Money/Purpose/Spiritual)
  - Average refund rate (target: <2%)
  - Email open/click rates
  - API cost vs. revenue
- [ ] Review customer feedback (email + Whop reviews)
- [ ] Identify any broken features or bugs
- [ ] Plan optimizations for next week

### Ongoing
- [ ] **Reading Quality Audit:** Spot-check 2-3 generated readings
  - Do they feel personalized? ✓
  - Are numerology calculations correct? ✓
  - Does the Threshold Event date make sense? ✓
  - Are there any AI hallucinations or weird phrasing? ✓
- [ ] **Refund Requests:** If >2%, analyze why
  - Generic-feeling reading? → Adjust Claude prompt
  - Technical issue? → Fix the bug
  - Objection-based? → Update email copy
- [ ] **Performance Tuning:** If generation takes >8s
  - Consider caching (for repeated birth dates)
  - Switch to Claude 3.5 Haiku for faster inference (cheaper too)

---

## Week 2-4: Optimization Phase

### Landing Page A/B Test
- [ ] Test 2 headline variations in Meta ads
  - Control: "Your Birth Date Hides A Secret"
  - Variant: "What The Cosmos Encoded Into Your Birth Date"
- [ ] Run 50% traffic each for 3 days
- [ ] Pick winner, pause loser
- [ ] Document CTR and quiz start rate

### Quiz Optimization
- [ ] Review drop-off by question
  - If >20% drop at Q4 (birth time), consider making it optional earlier
  - If >20% drop at Q6 (life area), add reassurance copy
- [ ] A/B test Q1 copy (commitment opener)
  - Control: Current version
  - Variant: Softer opening ("Do you believe in signs?")

### Checkout Optimization
- [ ] Test bump position (before vs. after payment)
- [ ] A/B test bump copy (emotional vs. logical)
- [ ] Monitor bump accept rate (target: 35-40%)
- [ ] If <25%, revisit order bump product (too expensive?)

### OTO Optimization
- [ ] Track conversion rate per segment
  - Love: Should be highest (~18-22%)
  - Money: Should be ~12-15%
  - Purpose: Should be ~8-12%
  - Spiritual: Should be ~10-14%
- [ ] If any segment <8%, revise email copy for that variant
- [ ] Test OTO price elasticity ($67 vs. $87 vs. $97)

### Email Sequence Optimization
- [ ] Monitor open rates per email
  - Email 1: Should be >80% (transactional)
  - Email 2: Target >40% (engagement)
  - Email 3: Target >25-30% (OTO pitch)
- [ ] If Email 2 opens <40%, test new subject line
- [ ] If Email 3 clicks <5%, revise OTO copy
- [ ] Set up automation to resend unopened emails after 7 days

---

## Scaling Phase (Week 4+)

### Budget Allocation
- [ ] If ROAS > 3:1 on Meta ads:
  - Increase daily budget by 20%
  - Test new audience segments
  - Expand to TikTok/Pinterest (if profitable)
- [ ] If ROAS < 2:1:
  - Pause low-performing creatives
  - Test new landing page
  - Reduce bid aggressively
  - Consider tightening audience targeting

### Product Expansion
- [ ] Consider additional OTO products:
  - "2026 Year Forecast" ($47, delivered as PDF)
  - "Karmic Healing Ritual" ($37, video course)
  - "Soulmate Activation" ($197, premium 1-on-1 consultation)
- [ ] Launch seasonal products (New Year, Full Moon, etc.)
- [ ] Survey customers: "What would you pay for next?"

### Automation & Support
- [ ] Set up auto-responder for common questions
  - "How do I access my reading?" → Link + FAQ
  - "Can I get a refund?" → Policy + process
  - "How accurate is this?" → Testimonials + science
- [ ] Consider hiring VA to handle email support (outsource to EarnHive)
- [ ] Document all support responses in knowledge base

### Data & Analytics
- [ ] Connect Meta ads to Vercel (UTM tracking)
  - Source, medium, campaign → `star_signal_readings`
  - Track which ads drive highest LTV
- [ ] Build custom Supabase dashboard
  - Daily revenue
  - OTO rate by segment
  - Cohort retention (refund rate by day of purchase)
- [ ] Monthly P&L report (send to Ewan)

---

## Critical Alerts & Thresholds

### Red Flags (Immediate Action)
- [ ] **Webhook failures:** If >5% of purchases fail to generate reading
  - Action: Manually trigger `/api/webhooks/whop` with test data
  - Check Anthropic API status
  - Verify Supabase connection
- [ ] **Email delivery failure:** If >10% bounce rate
  - Action: Check Loops sender reputation
  - Verify email list quality
  - Review spam folder
- [ ] **Function timeout:** If generation takes >30s
  - Action: Check Claude API latency
  - Consider switching to faster model (Haiku)
  - Implement caching layer
- [ ] **Database errors:** If Supabase insert fails
  - Action: Check row limits
  - Verify schema matches
  - Check authentication token
- [ ] **High refund rate:** If >5% of customers request refund
  - Action: Sample 5 refund requests
  - Identify common complaint
  - Adjust product/copy accordingly

### Yellow Flags (Monitor)
- [ ] OTO conversion drops below 10%
- [ ] Email open rate drops below 35%
- [ ] Average generation time exceeds 7 seconds
- [ ] Anthropic API cost exceeds $500/month
- [ ] Whop checkout error rate >2%

---

## Disaster Recovery

### If Vercel is Down
1. Check Vercel status page (vercel.com/status)
2. If Vercel issue, wait for resolution
3. If local issue, SSH into Vercel logs, check error
4. Rollback to last known good commit: `git revert HEAD`
5. Re-deploy: `git push origin main`

### If Supabase is Down
1. Check Supabase status (status.supabase.com)
2. If Supabase issue, wait for resolution
3. If local issue, verify auth token in Vercel env vars
4. Test query directly in Supabase console
5. Restart Vercel function: Re-deploy code

### If Whop Webhook Stops Firing
1. Check Whop dashboard → Webhook logs
2. Verify endpoint is `https://starsignal.co/api/webhooks/whop`
3. Check for signature mismatches (logs show 401)
4. Verify webhook secret matches `WHOP_WEBHOOK_SECRET` on Vercel
5. Test with Whop webhook tester (send manual event)
6. If still failing, create new webhook endpoint

### If AI Generation Gets Stuck
1. Check Anthropic API status (status.anthropic.com)
2. Verify `ANTHROPIC_API_KEY` is valid on Vercel
3. Test API directly: `curl -H "Authorization: Bearer $KEY" https://api.anthropic.com/v1/models`
4. If API is slow, switch to faster model (Claude 3.5 Haiku)
5. Implement timeout: <30s, else return generic reading + notify Ewan

### If Email Isn't Sending
1. Check Loops.so dashboard for delivery status
2. Verify `LOOPS_API_KEY` is correct on Vercel
3. Check email bounce list (spam flagged?)
4. Test email manually: Send test from Loops dashboard
5. If bounced, remove from list and resend manually

---

## Monthly Review Template

**Date:** ___________  
**Reporting Period:** ___________

### Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Total Revenue | $5,000 | $_____ | ⚪/🟢/🔴 |
| Front-end Conversion (Quiz → $19) | 18-22% | ____% | ⚪/🟢/🔴 |
| Bump Accept Rate | 35-40% | ____% | ⚪/🟢/🔴 |
| OTO Conversion | 12-18% | ____% | ⚪/🟢/🔴 |
| Refund Rate | <2% | ____% | ⚪/🟢/🔴 |
| Email Open Rate | >40% | ____% | ⚪/🟢/🔴 |
| Uptime | 99.9% | ____% | ⚪/🟢/🔴 |
| API Cost | <$300 | $_____ | ⚪/🟢/🔴 |

### Wins This Month
- 
- 
- 

### Issues Encountered
- 
- 
- 

### Next Month's Priorities
- [ ] 
- [ ] 
- [ ] 

### Budget Adjustment
- Current daily ad spend: $____
- Recommended next month: $____ (reason: _________)

---

**Document Owner:** Jarvis (Chief of Staff)  
**Last Updated:** April 23, 2026  
**Review Cycle:** Weekly check-in, Monthly deep dive
