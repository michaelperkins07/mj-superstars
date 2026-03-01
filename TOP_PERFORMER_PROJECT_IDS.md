# Top Performer Coach — Project IDs & Credentials Reference

> **Location**: This file is saved in your selected project folder: `Project MJ/TOP_PERFORMER_PROJECT_IDS.md`

---

## 🔑 Tracking & Analytics

| Service | ID / Key | Notes |
|---------|----------|-------|
| **Meta Pixel** | `1468379540284208` | "Ads Pixel for Shopify Facebook Ad" — deployed on all 14 sites |
| **Google Ads Tag** | `AW-813046676` | Google tag (gtag.js) — deployed on all 14 sites |
| **Google Ads Account** | `793-936-3439` | Account ID |
| **Google Search Console** | `sc-domain:topperformer.ai` | Verified, sitemap submitted (23 URLs) |

---

## ☁️ Cloudflare

| Item | Value |
|------|-------|
| **Account ID** | `8cf00845f119a5bc053b8acaed027037` |
| **API Token** | `VrVKGpZLe3TwbcyRepKDCv0_A_E4vJOnFtUPegit` |
| **Zone ID (topperformer.ai)** | `07aa3869b49fa4bf4dacfe0a01970c02` |

---

## 🗄️ Supabase

| Item | Value |
|------|-------|
| **Project ID** | `ioxidarwheoohkaglbkw` |
| **Org ID** | `ofuamppdhrrnsfiwtnvx` |
| **Region** | `us-east-1` |
| **URL** | `https://ioxidarwheoohkaglbkw.supabase.co` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveGlkYXJ3aGVvb2hrYWdsYmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDUzMTIsImV4cCI6MjA4NjU4MTMxMn0.jmSG_LmVZj0fVpxsvBYpHUKc9iT_YXz__-GDMHAA4HA` |

---

## 📧 Resend (Email)

| Item | Value |
|------|-------|
| **API Key** | `re_WcX8z2eJ_FBoq7fWL7FuweomHYdMa5PQk` |
| **Domain ID** | `3e2f2062-169b-4f70-8310-74a018f8309e` |
| **Domain** | `topperformer.ai` (pending verification — DNS records are live, awaiting Resend polling) |
| **Fallback Sender** | `onboarding@resend.dev` (only sends to account owner until domain verifies) |

---

## 📱 App Store

| Item | Value |
|------|-------|
| **App ID** | `6759122798` |
| **Provider Token** | `125636456` |
| **Status** | NOT yet released |
| **Smart Banner Meta** | `<meta name="apple-itunes-app" content="app-id=6759122798, app-argument=athlete/{slug}">` |
| **App Store URL** | `https://apps.apple.com/app/id6759122798?pt=125636456&ct={project}_{location}&mt=8` |

---

## 🎨 Brand

| Color | Hex |
|-------|-----|
| Black | `#000` |
| Gold | `#C5962F` |
| Dark Gold | `#A67C1A` |
| Light Gold | `#F5ECD7` |
| Red | `#C41E3A` |

---

## 🌐 All 14 Sites

| Project Name | Domain | Cloudflare Pages |
|--------------|--------|------------------|
| topperformer | topperformer.ai | ✅ Deployed |
| belikebrady | belikebrady.com | ✅ Deployed |
| belikegoggins | belikegoggins.com | ✅ Deployed |
| belikejocko | belikejocko.com | ✅ Deployed |
| belikelebron | belikelebron.com | ✅ Deployed |
| belikemessi | belikemessi.com | ✅ Deployed |
| belikeshohei | belikeshohei.com | ✅ Deployed |
| beliketyson | beliketyson.com | ✅ Deployed |
| belikeperk | belikeperk.com | ✅ Deployed |
| belikekim | belikekimk.com | ✅ Deployed |
| belikeselena | belikeselena.com | ✅ Deployed |
| beliketaylor | beliketaylor.com | ✅ Deployed |
| belikebeyonce | belikebey.com | ✅ Deployed |
| belikebarack | belikebarack.com | ✅ Deployed |

---

## 📊 Tracking Events Configured

All 14 sites fire these events automatically:

### Meta Pixel Events
- `PageView` — on every page load
- `Lead` — on waitlist signup
- `InitiateCheckout` — on App Store link click
- `AddToCart` — on CTA button click (join/waitlist/get early access)
- `ReferralShare` (custom) — on share/refer button click
- `ScrollDepth` (custom) — at 25%, 50%, 75%, 90%
- `TimeOnPage` (custom) — after 30 seconds

### Google Ads Events
- `conversion` (waitlist_signup) — on waitlist form submission
- `conversion` (app_store_click) — on App Store link click
- `cta_click` — on CTA button click
- `referral_share` — on share/refer button click
- `scroll_depth` — at 25%, 50%, 75%, 90%
- `engaged_visit` — after 30 seconds on page

---

## 🔧 Deployment Command Reference

```bash
# Deploy a single site
cd /sessions/serene-peaceful-hamilton/deploy/<project-name>
CLOUDFLARE_API_TOKEN="VrVKGpZLe3TwbcyRepKDCv0_A_E4vJOnFtUPegit" npx wrangler pages deploy . --project-name=<project-name>

# Countdown timer target
2025-04-01T00:00:00Z
```

---

*Last updated: February 13, 2026*
