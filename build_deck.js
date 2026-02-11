const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const { FaBrain, FaRocket, FaTrophy, FaChartLine, FaUsers, FaBell, FaLock, FaCrown, FaFire, FaBolt, FaMoneyBillWave, FaMobileAlt, FaStar, FaShieldAlt, FaGlobeAmericas, FaHandshake, FaChartBar, FaHeartbeat, FaClipboardCheck, FaDumbbell } = require("react-icons/fa");

// ============================================================
// ICON UTILITIES
// ============================================================
function renderIconSvg(IconComponent, color, size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}

async function iconToBase64Png(IconComponent, color, size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}

// ============================================================
// COLOR PALETTE - "Top Performer" Bold Dark Premium
// ============================================================
const C = {
  black: "0A0A0A",
  darkBg: "111111",
  charcoal: "1A1A2E",
  navy: "16213E",
  deepBlue: "0F3460",
  gold: "D4A017",
  brightGold: "FFD700",
  electric: "00D4FF",
  accent: "E94560",
  white: "FFFFFF",
  offWhite: "F0F0F0",
  gray: "888888",
  lightGray: "CCCCCC",
  green: "00C853",
  purple: "7C3AED",
  gradientStart: "0F3460",
  gradientEnd: "E94560",
};

// Helper: fresh shadow every time
const mkShadow = (opts = {}) => ({
  type: "outer",
  blur: opts.blur || 6,
  offset: opts.offset || 2,
  angle: opts.angle || 135,
  color: opts.color || "000000",
  opacity: opts.opacity || 0.4
});

// ============================================================
// MAIN BUILD
// ============================================================
async function buildDeck() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "MJ Superstars / Top Performer";
  pres.title = "Top Performer - Executive Sales Pitch";

  // Pre-render icons
  const icons = {
    brain: await iconToBase64Png(FaBrain, "#FFD700"),
    rocket: await iconToBase64Png(FaRocket, "#00D4FF"),
    trophy: await iconToBase64Png(FaTrophy, "#FFD700"),
    chart: await iconToBase64Png(FaChartLine, "#00C853"),
    users: await iconToBase64Png(FaUsers, "#00D4FF"),
    bell: await iconToBase64Png(FaBell, "#E94560"),
    lock: await iconToBase64Png(FaLock, "#D4A017"),
    crown: await iconToBase64Png(FaCrown, "#FFD700"),
    fire: await iconToBase64Png(FaFire, "#E94560"),
    bolt: await iconToBase64Png(FaBolt, "#FFD700"),
    money: await iconToBase64Png(FaMoneyBillWave, "#00C853"),
    mobile: await iconToBase64Png(FaMobileAlt, "#00D4FF"),
    star: await iconToBase64Png(FaStar, "#FFD700"),
    shield: await iconToBase64Png(FaShieldAlt, "#00D4FF"),
    globe: await iconToBase64Png(FaGlobeAmericas, "#00D4FF"),
    handshake: await iconToBase64Png(FaHandshake, "#FFD700"),
    chartBar: await iconToBase64Png(FaChartBar, "#00C853"),
    heart: await iconToBase64Png(FaHeartbeat, "#E94560"),
    clipboard: await iconToBase64Png(FaClipboardCheck, "#00D4FF"),
    dumbbell: await iconToBase64Png(FaDumbbell, "#FFD700"),
  };

  // ============================================================
  // SLIDE 1: TITLE - "TOP PERFORMER"
  // ============================================================
  let s1 = pres.addSlide();
  s1.background = { color: C.black };

  // Gold top accent bar
  s1.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: C.brightGold }
  });

  // Crown icon
  s1.addImage({ data: icons.crown, x: 4.25, y: 0.7, w: 1.5, h: 1.5 });

  // Main title
  s1.addText("TOP PERFORMER", {
    x: 0.5, y: 2.3, w: 9, h: 1,
    fontSize: 54, fontFace: "Arial Black",
    color: C.white, align: "center",
    charSpacing: 8, bold: true, margin: 0
  });

  // TP 1% badge
  s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 3.5, y: 3.4, w: 3, h: 0.7,
    fill: { color: C.brightGold },
    rectRadius: 0.15
  });
  s1.addText("TP 1%", {
    x: 3.5, y: 3.4, w: 3, h: 0.7,
    fontSize: 30, fontFace: "Arial Black",
    color: C.black, align: "center", valign: "middle",
    bold: true, charSpacing: 4, margin: 0
  });

  // Tagline
  s1.addText("The Mental Coach You Always Needed", {
    x: 1, y: 4.3, w: 8, h: 0.5,
    fontSize: 20, fontFace: "Calibri",
    color: C.gold, align: "center", italic: true, margin: 0
  });

  // AI + EI tagline
  s1.addText([
    { text: "Artificial Intelligence", options: { color: C.electric, bold: true } },
    { text: "  +  ", options: { color: C.gray } },
    { text: "Emotional Intelligence", options: { color: C.accent, bold: true } },
  ], {
    x: 1, y: 4.85, w: 8, h: 0.4,
    fontSize: 15, fontFace: "Calibri",
    align: "center", margin: 0
  });

  // Gold bottom accent bar
  s1.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.565, w: 10, h: 0.06,
    fill: { color: C.brightGold }
  });

  // ============================================================
  // SLIDE 2: THE PROBLEM - "MOST PEOPLE ARE STUCK"
  // ============================================================
  let s2 = pres.addSlide();
  s2.background = { color: C.darkBg };

  s2.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: C.accent }
  });

  s2.addText("THE PROBLEM", {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 14, fontFace: "Calibri",
    color: C.accent, align: "center",
    charSpacing: 6, bold: true, margin: 0
  });

  s2.addText("99% of People Are Underperforming", {
    x: 0.5, y: 0.85, w: 9, h: 0.7,
    fontSize: 34, fontFace: "Arial Black",
    color: C.white, align: "center", margin: 0
  });

  // Problem stats - big numbers
  const problems = [
    { stat: "77%", label: "of adults experience\nstress that affects\ntheir physical health", color: C.accent },
    { stat: "$322B", label: "lost annually to\nstress-related\nworkplace issues", color: C.gold },
    { stat: "1 in 5", label: "adults experience\na mental illness\neach year", color: C.electric },
  ];

  problems.forEach((p, i) => {
    const x = 0.8 + i * 3.1;
    s2.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.8, w: 2.7, h: 2.8,
      fill: { color: "1A1A1A" },
      shadow: mkShadow()
    });
    s2.addText(p.stat, {
      x, y: 2.0, w: 2.7, h: 1.0,
      fontSize: 42, fontFace: "Arial Black",
      color: p.color, align: "center", valign: "middle",
      bold: true, margin: 0
    });
    s2.addText(p.label, {
      x, y: 3.1, w: 2.7, h: 1.2,
      fontSize: 13, fontFace: "Calibri",
      color: C.lightGray, align: "center", valign: "top", margin: 0
    });
  });

  s2.addText("They don't need another meditation app. They need a COACH.", {
    x: 0.5, y: 4.85, w: 9, h: 0.5,
    fontSize: 18, fontFace: "Calibri",
    color: C.gold, align: "center", italic: true, bold: true, margin: 0
  });

  // ============================================================
  // SLIDE 3: THE SOLUTION - "TOP PERFORMER"
  // ============================================================
  let s3 = pres.addSlide();
  s3.background = { color: C.black };

  s3.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: C.brightGold }
  });

  s3.addText("THE SOLUTION", {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 14, fontFace: "Calibri",
    color: C.gold, align: "center",
    charSpacing: 6, bold: true, margin: 0
  });

  s3.addImage({ data: icons.brain, x: 1.0, y: 1.1, w: 0.7, h: 0.7 });

  s3.addText("Your AI Mental Performance Coach", {
    x: 1.9, y: 1.15, w: 7, h: 0.6,
    fontSize: 30, fontFace: "Arial Black",
    color: C.white, margin: 0
  });

  s3.addText("Top Performer uses advanced AI to deliver personalized coaching that was previously only available to elite athletes, CEOs, and top-tier executives.", {
    x: 1.0, y: 2.0, w: 8, h: 0.7,
    fontSize: 14, fontFace: "Calibri",
    color: C.lightGray, margin: 0
  });

  // Features grid - 2x3
  const features = [
    { icon: icons.brain, title: "AI Therapy Sessions", desc: "On-demand cognitive behavioral coaching" },
    { icon: icons.fire, title: "Daily Performance Drills", desc: "Gamified challenges that build resilience" },
    { icon: icons.chart, title: "Mood Intelligence", desc: "Track patterns, predict triggers, optimize" },
    { icon: icons.trophy, title: "Achievement System", desc: "XP, streaks, levels that keep you locked in" },
    { icon: icons.users, title: "Community of Winners", desc: "Social feed with people who refuse to lose" },
    { icon: icons.bolt, title: "Smart Notifications", desc: "AI-timed push alerts for peak moments" },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 3.1;
    const y = 2.9 + row * 1.35;

    s3.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.8, h: 1.15,
      fill: { color: "1A1A1A" },
      shadow: mkShadow({ blur: 4, offset: 1, opacity: 0.3 })
    });
    s3.addImage({ data: f.icon, x: x + 0.15, y: y + 0.2, w: 0.4, h: 0.4 });
    s3.addText(f.title, {
      x: x + 0.65, y: y + 0.12, w: 2.0, h: 0.35,
      fontSize: 12, fontFace: "Calibri",
      color: C.white, bold: true, margin: 0
    });
    s3.addText(f.desc, {
      x: x + 0.65, y: y + 0.5, w: 2.0, h: 0.5,
      fontSize: 10, fontFace: "Calibri",
      color: C.gray, margin: 0
    });
  });

  // ============================================================
  // SLIDE 4: CORE FEATURES DEEP DIVE
  // ============================================================
  let s4 = pres.addSlide();
  s4.background = { color: C.darkBg };

  s4.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: C.electric }
  });

  s4.addText("WHAT'S INSIDE", {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 14, fontFace: "Calibri",
    color: C.electric, align: "center",
    charSpacing: 6, bold: true, margin: 0
  });

  s4.addText("9 Screens. Zero Fluff. All Performance.", {
    x: 0.5, y: 0.75, w: 9, h: 0.6,
    fontSize: 30, fontFace: "Arial Black",
    color: C.white, align: "center", margin: 0
  });

  // Feature detail cards - left column
  const leftFeatures = [
    { icon: icons.brain, title: "AI Chat Coach", desc: "Real-time CBT, motivational interviewing, and Socratic questioning. Context-aware. Remembers your story.", color: C.electric },
    { icon: icons.heart, title: "Mood Tracker", desc: "Log moods, energy, sleep. AI detects patterns and predicts your best/worst days before they happen.", color: C.accent },
    { icon: icons.dumbbell, title: "Daily Challenges", desc: "Flash challenges, streak bonuses, XP multipliers. Gamification that drives habit formation.", color: C.gold },
    { icon: icons.clipboard, title: "Journal + Prompts", desc: "AI-generated reflection prompts based on YOUR patterns. Private, encrypted, powerful.", color: C.green },
  ];

  const rightFeatures = [
    { icon: icons.users, title: "Social Feed", desc: "Share wins, support others, see the leaderboard. Positive accountability from day one.", color: C.electric },
    { icon: icons.star, title: "Vision Board", desc: "Photo-powered goal visualization. Upload dreams, track progress, stay obsessed.", color: C.brightGold },
    { icon: icons.bell, title: "Smart Alerts", desc: "AI-optimized push notifications. Right message, right time. Based on your behavior patterns.", color: C.accent },
    { icon: icons.lock, title: "Premium Paywall", desc: "Freemium model with $9.99/mo or $79.99/yr tiers. High-value features behind the gate.", color: C.gold },
  ];

  const drawFeatureList = (feats, startX) => {
    feats.forEach((f, i) => {
      const y = 1.5 + i * 1.0;
      s4.addImage({ data: f.icon, x: startX, y: y + 0.05, w: 0.35, h: 0.35 });
      s4.addText(f.title, {
        x: startX + 0.5, y, w: 4.0, h: 0.35,
        fontSize: 13, fontFace: "Calibri",
        color: f.color, bold: true, margin: 0
      });
      s4.addText(f.desc, {
        x: startX + 0.5, y: y + 0.35, w: 4.0, h: 0.5,
        fontSize: 10, fontFace: "Calibri",
        color: C.gray, margin: 0
      });
    });
  };

  drawFeatureList(leftFeatures, 0.5);
  drawFeatureList(rightFeatures, 5.2);

  // Divider line
  s4.addShape(pres.shapes.LINE, {
    x: 5.0, y: 1.5, w: 0, h: 3.7,
    line: { color: "333333", width: 1 }
  });

  // ============================================================
  // SLIDE 5: MARKET OPPORTUNITY
  // ============================================================
  let s5 = pres.addSlide();
  s5.background = { color: C.black };

  s5.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: C.green }
  });

  s5.addText("MARKET OPPORTUNITY", {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 14, fontFace: "Calibri",
    color: C.green, align: "center",
    charSpacing: 6, bold: true, margin: 0
  });

  s5.addText("This Market Is Exploding", {
    x: 0.5, y: 0.75, w: 9, h: 0.6,
    fontSize: 34, fontFace: "Arial Black",
    color: C.white, align: "center", margin: 0
  });

  // Market size cards
  const markets = [
    { value: "$13.5B", label: "Mental Health\nApp Market\n(2025)", sub: "Growing 15%+ CAGR", color: C.green },
    { value: "$5.1B", label: "Meditation &\nWellness Apps\n(2025)", sub: "Headspace, Calm, etc.", color: C.electric },
    { value: "$1.2T", label: "Global Wellness\nEconomy", sub: "Mental wellness fastest", color: C.brightGold },
  ];

  markets.forEach((m, i) => {
    const x = 0.6 + i * 3.2;
    s5.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.6, w: 2.8, h: 2.4,
      fill: { color: "111111" },
      shadow: mkShadow()
    });
    s5.addImage({ data: icons.money, x: x + 1.05, y: 1.75, w: 0.5, h: 0.5 });
    s5.addText(m.value, {
      x, y: 2.35, w: 2.8, h: 0.7,
      fontSize: 36, fontFace: "Arial Black",
      color: m.color, align: "center", bold: true, margin: 0
    });
    s5.addText(m.label, {
      x, y: 3.05, w: 2.8, h: 0.65,
      fontSize: 12, fontFace: "Calibri",
      color: C.lightGray, align: "center", margin: 0
    });
    s5.addText(m.sub, {
      x, y: 3.65, w: 2.8, h: 0.3,
      fontSize: 10, fontFace: "Calibri",
      color: C.gray, align: "center", italic: true, margin: 0
    });
  });

  // Why now section
  s5.addText("WHY NOW?", {
    x: 0.5, y: 4.2, w: 9, h: 0.4,
    fontSize: 16, fontFace: "Arial Black",
    color: C.gold, align: "center", margin: 0
  });

  s5.addText("Post-pandemic mental health awareness at all-time high  |  AI technology finally capable of real coaching  |  Gen Z spending 2x more on mental wellness  |  Employer wellness budgets expanding 25% YoY", {
    x: 0.5, y: 4.6, w: 9, h: 0.8,
    fontSize: 11, fontFace: "Calibri",
    color: C.gray, align: "center", margin: 0
  });

  // ============================================================
  // SLIDE 6: COMPETITIVE ADVANTAGE
  // ============================================================
  let s6 = pres.addSlide();
  s6.background = { color: C.darkBg };

  s6.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: C.accent }
  });

  s6.addText("COMPETITIVE EDGE", {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 14, fontFace: "Calibri",
    color: C.accent, align: "center",
    charSpacing: 6, bold: true, margin: 0
  });

  s6.addText("Why Top Performer Wins", {
    x: 0.5, y: 0.75, w: 9, h: 0.6,
    fontSize: 34, fontFace: "Arial Black",
    color: C.white, align: "center", margin: 0
  });

  // Comparison table
  const compHeaders = [
    [
      { text: "Feature", options: { fill: { color: C.brightGold }, color: C.black, bold: true, fontSize: 12, fontFace: "Calibri" } },
      { text: "Top Performer", options: { fill: { color: C.brightGold }, color: C.black, bold: true, fontSize: 12, fontFace: "Calibri", align: "center" } },
      { text: "Headspace", options: { fill: { color: "333333" }, color: C.lightGray, bold: true, fontSize: 12, fontFace: "Calibri", align: "center" } },
      { text: "BetterHelp", options: { fill: { color: "333333" }, color: C.lightGray, bold: true, fontSize: 12, fontFace: "Calibri", align: "center" } },
      { text: "Calm", options: { fill: { color: "333333" }, color: C.lightGray, bold: true, fontSize: 12, fontFace: "Calibri", align: "center" } },
    ]
  ];

  const compRows = [
    ["AI Coaching (Real Conversations)", "YES", "No", "No", "No"],
    ["Gamification (XP, Levels, Streaks)", "YES", "Limited", "No", "Limited"],
    ["Mood Intelligence + Prediction", "YES", "No", "No", "No"],
    ["Social Community & Accountability", "YES", "No", "Forum only", "No"],
    ["Vision Board & Goal Tracking", "YES", "No", "No", "No"],
    ["Personalized Smart Notifications", "YES", "Generic", "Generic", "Generic"],
    ["Price (Monthly)", "$9.99", "$12.99", "$80+", "$14.99"],
  ];

  const tableRows = compHeaders.concat(compRows.map(row => {
    return row.map((cell, ci) => {
      const isTP = ci === 1;
      const isYes = cell === "YES";
      return {
        text: cell,
        options: {
          fill: { color: isTP ? "0D2137" : "1A1A1A" },
          color: isYes ? C.green : (isTP ? C.electric : C.gray),
          bold: isYes || ci === 0,
          fontSize: 11,
          fontFace: "Calibri",
          align: ci === 0 ? "left" : "center",
          valign: "middle"
        }
      };
    });
  }));

  s6.addTable(tableRows, {
    x: 0.5, y: 1.5, w: 9, h: 3.5,
    colW: [2.8, 1.6, 1.4, 1.4, 1.4],
    border: { pt: 0.5, color: "333333" },
    rowH: [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4],
    autoPage: false
  });

  s6.addText("Top Performer doesn't compete with meditation apps. It REPLACES your need for a $200/hr performance coach.", {
    x: 0.5, y: 5.0, w: 9, h: 0.4,
    fontSize: 14, fontFace: "Calibri",
    color: C.gold, align: "center", italic: true, bold: true, margin: 0
  });

  // ============================================================
  // SLIDE 7: MONETIZATION / REVENUE MODEL
  // ============================================================
  let s7 = pres.addSlide();
  s7.background = { color: C.black };

  s7.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: C.green }
  });

  s7.addText("REVENUE MODEL", {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 14, fontFace: "Calibri",
    color: C.green, align: "center",
    charSpacing: 6, bold: true, margin: 0
  });

  s7.addText("Multiple Revenue Streams Built In", {
    x: 0.5, y: 0.75, w: 9, h: 0.6,
    fontSize: 32, fontFace: "Arial Black",
    color: C.white, align: "center", margin: 0
  });

  // Revenue streams
  const revenue = [
    { icon: icons.crown, title: "Premium Subscription", desc: "$9.99/mo or $79.99/yr\nUnlimited AI coaching, advanced analytics,\npremium challenges, priority support", amount: "Primary Revenue", color: C.brightGold },
    { icon: icons.users, title: "Referral Engine", desc: "Built-in viral referral system\n100pts referrer + 50pts referred\nLeaderboard gamification drives organic growth", amount: "Viral Growth", color: C.electric },
    { icon: icons.globe, title: "Enterprise / B2B", desc: "Employer wellness packages\nTeam performance dashboards\nBulk licensing for organizations", amount: "Enterprise Upsell", color: C.green },
    { icon: icons.chartBar, title: "Data Insights", desc: "Anonymized wellness trends\nWorkplace mental health analytics\nPartnership opportunities", amount: "Future Revenue", color: C.purple },
  ];

  revenue.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 4.8;
    const y = 1.5 + row * 1.9;

    s7.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.5, h: 1.7,
      fill: { color: "151515" },
      shadow: mkShadow({ blur: 4, offset: 1, opacity: 0.3 })
    });

    // Accent left bar
    s7.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.06, h: 1.7,
      fill: { color: r.color }
    });

    s7.addImage({ data: r.icon, x: x + 0.25, y: y + 0.15, w: 0.4, h: 0.4 });
    s7.addText(r.title, {
      x: x + 0.8, y: y + 0.1, w: 2.5, h: 0.35,
      fontSize: 14, fontFace: "Calibri",
      color: C.white, bold: true, margin: 0
    });
    s7.addText(r.amount, {
      x: x + 3.0, y: y + 0.15, w: 1.3, h: 0.3,
      fontSize: 9, fontFace: "Calibri",
      color: r.color, align: "right", bold: true, margin: 0
    });
    s7.addText(r.desc, {
      x: x + 0.3, y: y + 0.55, w: 4.0, h: 1.0,
      fontSize: 10, fontFace: "Calibri",
      color: C.gray, margin: 0
    });
  });

  // ============================================================
  // SLIDE 8: TECH STACK / WHAT'S BUILT
  // ============================================================
  let s8 = pres.addSlide();
  s8.background = { color: C.darkBg };

  s8.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: C.electric }
  });

  s8.addText("BUILT. SHIPPED. LIVE.", {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 14, fontFace: "Calibri",
    color: C.electric, align: "center",
    charSpacing: 6, bold: true, margin: 0
  });

  s8.addText("This Isn't a Mockup. It's LIVE.", {
    x: 0.5, y: 0.75, w: 9, h: 0.6,
    fontSize: 34, fontFace: "Arial Black",
    color: C.white, align: "center", margin: 0
  });

  // Stats bar
  const techStats = [
    { num: "150+", label: "API\nEndpoints" },
    { num: "9", label: "Core\nScreens" },
    { num: "14", label: "Database\nTables" },
    { num: "12", label: "Engineering\nPhases Complete" },
  ];

  techStats.forEach((t, i) => {
    const x = 0.5 + i * 2.4;
    s8.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.5, w: 2.1, h: 1.2,
      fill: { color: "1A1A1A" },
      shadow: mkShadow({ blur: 3, offset: 1, opacity: 0.25 })
    });
    s8.addText(t.num, {
      x, y: 1.55, w: 2.1, h: 0.6,
      fontSize: 32, fontFace: "Arial Black",
      color: C.electric, align: "center", bold: true, margin: 0
    });
    s8.addText(t.label, {
      x, y: 2.2, w: 2.1, h: 0.45,
      fontSize: 10, fontFace: "Calibri",
      color: C.gray, align: "center", margin: 0
    });
  });

  // Tech bullets
  const techLeft = [
    "React.js Progressive Web App (iOS + Android)",
    "Express.js + PostgreSQL backend on Render",
    "Claude AI (Anthropic) for conversational coaching",
    "Socket.IO real-time messaging",
    "Apple Push Notification Service (APNS)",
    "Sentry error monitoring + Mixpanel analytics",
  ];

  const techRight = [
    "Apple App Store ready (Bundle ID registered)",
    "RevenueCat subscription management",
    "Redis caching for performance",
    "End-to-end encryption for messages",
    "Automated email campaigns (SendGrid)",
    "Feature flags for staged rollouts",
  ];

  techLeft.forEach((t, i) => {
    s8.addText(t, {
      x: 0.7, y: 2.95 + i * 0.38, w: 4.3, h: 0.35,
      fontSize: 11, fontFace: "Calibri",
      color: C.lightGray, bullet: true, margin: 0
    });
  });

  techRight.forEach((t, i) => {
    s8.addText(t, {
      x: 5.3, y: 2.95 + i * 0.38, w: 4.3, h: 0.35,
      fontSize: 11, fontFace: "Calibri",
      color: C.lightGray, bullet: true, margin: 0
    });
  });

  s8.addText("Live now: mj-superstars-app.onrender.com", {
    x: 0.5, y: 5.1, w: 9, h: 0.35,
    fontSize: 12, fontFace: "Calibri",
    color: C.gold, align: "center", italic: true, margin: 0
  });

  // ============================================================
  // SLIDE 9: REBRAND STRATEGY - "TOP PERFORMER / TP 1%"
  // ============================================================
  let s9 = pres.addSlide();
  s9.background = { color: C.black };

  s9.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: C.brightGold }
  });

  s9.addText("BRAND STRATEGY", {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 14, fontFace: "Calibri",
    color: C.gold, align: "center",
    charSpacing: 6, bold: true, margin: 0
  });

  s9.addText("Brand Identity + Logo Concepts", {
    x: 0.5, y: 0.8, w: 9, h: 0.6,
    fontSize: 30, fontFace: "Arial Black",
    color: C.white, align: "center", bold: true, margin: 0
  });

  // Logo concept badges - 3 options side by side
  // Option A: "TP 1%"
  const logoY = 1.5;
  s9.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: logoY, w: 2.6, h: 2.0,
    fill: { color: "151515" },
    shadow: mkShadow({ blur: 4, offset: 1, opacity: 0.3 })
  });
  s9.addText("Option A", {
    x: 0.6, y: logoY + 0.05, w: 2.6, h: 0.25,
    fontSize: 9, fontFace: "Calibri",
    color: C.gray, align: "center", margin: 0
  });
  s9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 1.1, y: logoY + 0.4, w: 1.6, h: 0.65,
    fill: { color: C.brightGold },
    rectRadius: 0.1
  });
  s9.addText("TP 1%", {
    x: 1.1, y: logoY + 0.4, w: 1.6, h: 0.65,
    fontSize: 26, fontFace: "Arial Black",
    color: C.black, align: "center", valign: "middle",
    bold: true, charSpacing: 3, margin: 0
  });
  s9.addText("Classic badge mark", {
    x: 0.6, y: logoY + 1.2, w: 2.6, h: 0.3,
    fontSize: 10, fontFace: "Calibri",
    color: C.lightGray, align: "center", margin: 0
  });
  s9.addText("Compact. Iconic. Merch-ready.", {
    x: 0.6, y: logoY + 1.5, w: 2.6, h: 0.3,
    fontSize: 9, fontFace: "Calibri",
    color: C.gray, align: "center", italic: true, margin: 0
  });

  // Option B: "1%" large + "Top Performer" underneath
  s9.addShape(pres.shapes.RECTANGLE, {
    x: 3.7, y: logoY, w: 2.6, h: 2.0,
    fill: { color: "151515" },
    shadow: mkShadow({ blur: 4, offset: 1, opacity: 0.3 })
  });
  s9.addText("Option B", {
    x: 3.7, y: logoY + 0.05, w: 2.6, h: 0.25,
    fontSize: 9, fontFace: "Calibri",
    color: C.gray, align: "center", margin: 0
  });
  s9.addText([
    { text: "1%", options: { fontSize: 36, color: C.brightGold, bold: true, breakLine: true } },
    { text: "TOP PERFORMER", options: { fontSize: 11, color: C.white, bold: true, charSpacing: 4 } },
  ], {
    x: 3.7, y: logoY + 0.3, w: 2.6, h: 1.0,
    fontFace: "Arial Black", align: "center", margin: 0
  });
  s9.addText("Stacked wordmark", {
    x: 3.7, y: logoY + 1.2, w: 2.6, h: 0.3,
    fontSize: 10, fontFace: "Calibri",
    color: C.lightGray, align: "center", margin: 0
  });
  s9.addText("Bold hierarchy. Premium feel.", {
    x: 3.7, y: logoY + 1.5, w: 2.6, h: 0.3,
    fontSize: 9, fontFace: "Calibri",
    color: C.gray, align: "center", italic: true, margin: 0
  });

  // Option C: Just "1%"
  s9.addShape(pres.shapes.RECTANGLE, {
    x: 6.8, y: logoY, w: 2.6, h: 2.0,
    fill: { color: "151515" },
    shadow: mkShadow({ blur: 4, offset: 1, opacity: 0.3 })
  });
  s9.addText("Option C", {
    x: 6.8, y: logoY + 0.05, w: 2.6, h: 0.25,
    fontSize: 9, fontFace: "Calibri",
    color: C.gray, align: "center", margin: 0
  });
  s9.addText("1%", {
    x: 6.8, y: logoY + 0.35, w: 2.6, h: 0.9,
    fontSize: 48, fontFace: "Arial Black",
    color: C.brightGold, align: "center", valign: "middle",
    bold: true, margin: 0
  });
  s9.addText("Minimalist icon", {
    x: 6.8, y: logoY + 1.2, w: 2.6, h: 0.3,
    fontSize: 10, fontFace: "Calibri",
    color: C.lightGray, align: "center", margin: 0
  });
  s9.addText("App icon. Wearable. Statement.", {
    x: 6.8, y: logoY + 1.5, w: 2.6, h: 0.3,
    fontSize: 9, fontFace: "Calibri",
    color: C.gray, align: "center", italic: true, margin: 0
  });

  // AI + EI positioning on brand slide
  s9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 2.0, y: 3.65, w: 6.0, h: 0.55,
    fill: { color: "1A1A2E" },
    rectRadius: 0.1,
    shadow: mkShadow({ blur: 3, offset: 1, opacity: 0.2 })
  });
  s9.addText([
    { text: "AI", options: { color: C.electric, bold: true, fontSize: 16 } },
    { text: " (Artificial Intelligence)  +  ", options: { color: C.gray, fontSize: 12 } },
    { text: "EI", options: { color: C.accent, bold: true, fontSize: 16 } },
    { text: " (Emotional Intelligence)", options: { color: C.gray, fontSize: 12 } },
  ], {
    x: 2.0, y: 3.65, w: 6.0, h: 0.55,
    fontFace: "Calibri", align: "center", valign: "middle", margin: 0
  });

  // Brand positioning cards
  const brandPoints = [
    { title: "Name Power", desc: "\"Top Performer\" is aspirational, universal, and SEO-friendly. It speaks to athletes, executives, students, and anyone who refuses to settle. The name IS the promise.", color: C.electric, icon: icons.crown },
    { title: "Market Position", desc: "Not a \"mental health app\" (stigma kills downloads). It's a PERFORMANCE tool. The 1% advantage that separates winners from everyone else. Think Nike for the mind.", color: C.brightGold, icon: icons.trophy },
  ];

  brandPoints.forEach((b, i) => {
    const col = i % 2;
    const x = 0.5 + col * 4.8;
    const y = 4.35;

    s9.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.5, h: 1.45,
      fill: { color: "151515" },
      shadow: mkShadow({ blur: 4, offset: 1, opacity: 0.3 })
    });
    s9.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.06, h: 1.45,
      fill: { color: b.color }
    });
    s9.addImage({ data: b.icon, x: x + 0.25, y: y + 0.15, w: 0.35, h: 0.35 });
    s9.addText(b.title, {
      x: x + 0.7, y: y + 0.1, w: 3.5, h: 0.35,
      fontSize: 14, fontFace: "Calibri",
      color: b.color, bold: true, margin: 0
    });
    s9.addText(b.desc, {
      x: x + 0.25, y: y + 0.5, w: 4.0, h: 0.85,
      fontSize: 10, fontFace: "Calibri",
      color: C.gray, margin: 0
    });
  });

  // ============================================================
  // SLIDE 10: MARKETING IDEAS
  // ============================================================
  let s10 = pres.addSlide();
  s10.background = { color: C.darkBg };

  s10.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: C.accent }
  });

  s10.addText("GO-TO-MARKET", {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 14, fontFace: "Calibri",
    color: C.accent, align: "center",
    charSpacing: 6, bold: true, margin: 0
  });

  s10.addText("Marketing Strategies That Print Money", {
    x: 0.5, y: 0.75, w: 9, h: 0.6,
    fontSize: 32, fontFace: "Arial Black",
    color: C.white, align: "center", margin: 0
  });

  const mktgIdeas = [
    { title: "\"Are You In The 1%?\" Campaign", desc: "Social media quiz funnel. Users take a 60-second \"mental performance\" assessment. Results show their score and invite them to join the TP 1%. Viral shareability built in.", color: C.accent },
    { title: "Influencer Athlete Partnerships", desc: "Partner with fitness influencers, MMA fighters, entrepreneurs. \"This is my secret weapon.\" Authenticity sells. Target micro-influencers (10K-100K) for better ROI.", color: C.electric },
    { title: "Corporate Wellness Packages", desc: "Pitch to HR departments: \"Reduce burnout, increase productivity.\" Offer team dashboards and bulk pricing. $5/user/mo at scale = massive B2B revenue.", color: C.green },
    { title: "TikTok/Reels Content Engine", desc: "Daily 30-second \"mental performance tips\" from the app. Quick wins, motivation, transformation stories. Hook: \"What the top 1% do every morning that you don't.\"", color: C.brightGold },
    { title: "Referral Competitions", desc: "Monthly referral leaderboard with prizes. Top referrers get free lifetime access, merch, or cash rewards. Creates army of brand ambassadors.", color: C.purple },
    { title: "Launch Day Scarcity", desc: "\"First 1,000 users get Founding Member status + lifetime 50% discount.\" Create urgency. Limited badges. Exclusive community access. FOMO drives downloads.", color: C.accent },
  ];

  mktgIdeas.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 4.8;
    const y = 1.5 + row * 1.35;

    s10.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.5, h: 1.15,
      fill: { color: "151515" },
      shadow: mkShadow({ blur: 3, offset: 1, opacity: 0.25 })
    });
    s10.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.06, h: 1.15,
      fill: { color: m.color }
    });
    s10.addText(m.title, {
      x: x + 0.2, y: y + 0.08, w: 4.1, h: 0.3,
      fontSize: 12, fontFace: "Calibri",
      color: m.color, bold: true, margin: 0
    });
    s10.addText(m.desc, {
      x: x + 0.2, y: y + 0.4, w: 4.1, h: 0.7,
      fontSize: 9.5, fontFace: "Calibri",
      color: C.gray, margin: 0
    });
  });

  // ============================================================
  // SLIDE 11: LAUNCH ROADMAP
  // ============================================================
  let s11 = pres.addSlide();
  s11.background = { color: C.black };

  s11.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: C.electric }
  });

  s11.addText("LAUNCH ROADMAP", {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 14, fontFace: "Calibri",
    color: C.electric, align: "center",
    charSpacing: 6, bold: true, margin: 0
  });

  s11.addText("From Here to Market Domination", {
    x: 0.5, y: 0.75, w: 9, h: 0.6,
    fontSize: 32, fontFace: "Arial Black",
    color: C.white, align: "center", margin: 0
  });

  // Timeline
  const phases = [
    { phase: "NOW", title: "App Store Submission", items: "Apple Developer setup, TestFlight beta,\nApp Store metadata, screenshots", color: C.green, icon: icons.mobile },
    { phase: "WEEK 2-4", title: "Beta Launch", items: "100 beta testers, gather feedback,\nfix bugs, optimize onboarding flow", color: C.electric, icon: icons.clipboard },
    { phase: "MONTH 2", title: "Public Launch", items: "App Store live, social media blitz,\ninfluencer partnerships, PR campaign", color: C.brightGold, icon: icons.rocket },
    { phase: "MONTH 3-6", title: "Scale & Optimize", items: "ASO optimization, A/B pricing tests,\nApple Watch, HealthKit integration", color: C.accent, icon: icons.chart },
    { phase: "MONTH 6+", title: "Enterprise & Growth", items: "B2B wellness packages, Android version,\nAPI marketplace, international expansion", color: C.purple, icon: icons.globe },
  ];

  // Draw timeline line
  s11.addShape(pres.shapes.LINE, {
    x: 1.0, y: 1.8, w: 8, h: 0,
    line: { color: "333333", width: 2 }
  });

  phases.forEach((p, i) => {
    const x = 0.4 + i * 1.9;
    // Node circle
    s11.addShape(pres.shapes.OVAL, {
      x: x + 0.6, y: 1.65, w: 0.3, h: 0.3,
      fill: { color: p.color }
    });
    // Phase label
    s11.addText(p.phase, {
      x: x, y: 2.1, w: 1.7, h: 0.3,
      fontSize: 10, fontFace: "Calibri",
      color: p.color, align: "center", bold: true, margin: 0
    });
    // Card
    s11.addShape(pres.shapes.RECTANGLE, {
      x: x, y: 2.45, w: 1.7, h: 2.5,
      fill: { color: "151515" },
      shadow: mkShadow({ blur: 3, offset: 1, opacity: 0.25 })
    });
    s11.addImage({ data: p.icon, x: x + 0.55, y: 2.55, w: 0.45, h: 0.45 });
    s11.addText(p.title, {
      x: x + 0.1, y: 3.1, w: 1.5, h: 0.5,
      fontSize: 11, fontFace: "Calibri",
      color: C.white, align: "center", bold: true, margin: 0
    });
    s11.addText(p.items, {
      x: x + 0.1, y: 3.6, w: 1.5, h: 1.2,
      fontSize: 9, fontFace: "Calibri",
      color: C.gray, align: "center", margin: 0
    });
  });

  // ============================================================
  // SLIDE 12: FINANCIAL PROJECTIONS
  // ============================================================
  let s12 = pres.addSlide();
  s12.background = { color: C.darkBg };

  s12.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: C.green }
  });

  s12.addText("FINANCIAL PROJECTIONS", {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 14, fontFace: "Calibri",
    color: C.green, align: "center",
    charSpacing: 6, bold: true, margin: 0
  });

  s12.addText("The Numbers Don't Lie", {
    x: 0.5, y: 0.75, w: 9, h: 0.6,
    fontSize: 34, fontFace: "Arial Black",
    color: C.white, align: "center", margin: 0
  });

  // Revenue chart
  s12.addChart(pres.charts.BAR, [{
    name: "Monthly Revenue",
    labels: ["Month 3", "Month 6", "Month 9", "Month 12", "Month 18", "Month 24"],
    values: [5000, 25000, 75000, 150000, 400000, 800000]
  }], {
    x: 0.5, y: 1.5, w: 5.5, h: 3.5,
    barDir: "col",
    chartColors: [C.brightGold],
    chartArea: { fill: { color: "1A1A1A" }, roundedCorners: true },
    catAxisLabelColor: C.gray,
    valAxisLabelColor: C.gray,
    valGridLine: { color: "333333", size: 0.5 },
    catGridLine: { style: "none" },
    showValue: true,
    dataLabelPosition: "outEnd",
    dataLabelColor: C.brightGold,
    dataLabelFontSize: 9,
    showLegend: false,
    valAxisNumFmt: "$#,##0",
  });

  // Key metrics on right
  const projections = [
    { metric: "Year 1 Users", value: "50,000+", color: C.electric },
    { metric: "Conversion Rate", value: "8-12%", color: C.green },
    { metric: "Monthly ARPU", value: "$8.50", color: C.brightGold },
    { metric: "Year 1 ARR", value: "$1.8M", color: C.accent },
    { metric: "Year 2 ARR", value: "$9.6M", color: C.brightGold },
    { metric: "LTV:CAC Ratio", value: "5:1", color: C.green },
  ];

  projections.forEach((p, i) => {
    const y = 1.6 + i * 0.55;
    s12.addText(p.metric, {
      x: 6.5, y, w: 2.0, h: 0.4,
      fontSize: 11, fontFace: "Calibri",
      color: C.gray, margin: 0
    });
    s12.addText(p.value, {
      x: 8.3, y, w: 1.5, h: 0.4,
      fontSize: 14, fontFace: "Arial Black",
      color: p.color, align: "right", margin: 0
    });
  });

  s12.addText("Conservative estimates based on 2% market penetration in target demographic", {
    x: 0.5, y: 5.1, w: 9, h: 0.35,
    fontSize: 10, fontFace: "Calibri",
    color: C.gray, align: "center", italic: true, margin: 0
  });

  // ============================================================
  // SLIDE 13: CLOSING - THE ASK
  // ============================================================
  let s13 = pres.addSlide();
  s13.background = { color: C.black };

  s13.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: C.brightGold }
  });

  s13.addImage({ data: icons.crown, x: 4.25, y: 0.5, w: 1.5, h: 1.5 });

  s13.addText("JOIN THE 1%", {
    x: 0.5, y: 2.1, w: 9, h: 0.8,
    fontSize: 48, fontFace: "Arial Black",
    color: C.white, align: "center",
    charSpacing: 6, margin: 0
  });

  // Gold TP 1% badge
  s13.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 3.5, y: 3.0, w: 3, h: 0.7,
    fill: { color: C.brightGold },
    rectRadius: 0.15
  });
  s13.addText("TOP PERFORMER", {
    x: 3.5, y: 3.0, w: 3, h: 0.7,
    fontSize: 22, fontFace: "Arial Black",
    color: C.black, align: "center", valign: "middle",
    bold: true, charSpacing: 2, margin: 0
  });

  s13.addText("The app is built. The market is ready. The only question is:", {
    x: 1, y: 3.9, w: 8, h: 0.4,
    fontSize: 16, fontFace: "Calibri",
    color: C.lightGray, align: "center", margin: 0
  });

  s13.addText("Are you in?", {
    x: 1, y: 4.35, w: 8, h: 0.5,
    fontSize: 28, fontFace: "Arial Black",
    color: C.gold, align: "center", italic: true, margin: 0
  });

  // Contact info
  s13.addText("Mike  |  michaelperkins07@gmail.com  |  mj-superstars-app.onrender.com", {
    x: 1, y: 5.0, w: 8, h: 0.35,
    fontSize: 11, fontFace: "Calibri",
    color: C.gray, align: "center", margin: 0
  });

  // Gold bottom bar
  s13.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.565, w: 10, h: 0.06,
    fill: { color: C.brightGold }
  });

  // ============================================================
  // SAVE
  // ============================================================
  const outputPath = "/sessions/serene-peaceful-hamilton/mnt/Project MJ/Top_Performer_Executive_Pitch.pptx";
  await pres.writeFile({ fileName: outputPath });
  console.log("Presentation saved to: " + outputPath);
}

buildDeck().catch(err => {
  console.error("Error building deck:", err);
  process.exit(1);
});
