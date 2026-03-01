const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
        BorderStyle, WidthType, ShadingType, PageNumber, PageBreak } = require('docx');

// Color palette
const BRAND_BLUE = "1A73E8";
const DARK = "1A1A2E";
const ACCENT = "FF6B35";
const LIGHT_BG = "F0F4FF";
const WHITE = "FFFFFF";
const GRAY = "666666";
const LIGHT_GRAY = "E8E8E8";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function headerCell(text, width) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: { fill: BRAND_BLUE, type: ShadingType.CLEAR },
    margins: cellMargins, verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: WHITE, font: "Arial", size: 20 })] })]
  });
}

function cell(text, width, opts = {}) {
  const runs = typeof text === 'string' 
    ? [new TextRun({ text, font: "Arial", size: 20, ...opts })]
    : text;
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({ children: runs })]
  });
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 36, color: DARK })] });
}

function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 28, color: BRAND_BLUE })] });
}

function h3(text) {
  return new Paragraph({ spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 24, color: DARK })] });
}

function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: opts.color || "333333", ...opts })] });
}

function boldP(label, text) {
  return new Paragraph({ spacing: { after: 120 },
    children: [
      new TextRun({ text: label, bold: true, font: "Arial", size: 22, color: DARK }),
      new TextRun({ text, font: "Arial", size: 22, color: "333333" })
    ]
  });
}

function spacer() { return new Paragraph({ spacing: { after: 60 }, children: [] }); }

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: DARK },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: BRAND_BLUE },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1440, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers2",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "TOP PERFORMER COACH  |  Marketing Campaign Plan", font: "Arial", size: 16, color: GRAY, italics: true })] })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Page ", font: "Arial", size: 16, color: GRAY }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: GRAY })] })] })
    },
    children: [

      // === TITLE PAGE ===
      spacer(), spacer(), spacer(), spacer(), spacer(), spacer(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
        children: [new TextRun({ text: "TOP PERFORMER COACH", font: "Arial", size: 52, bold: true, color: BRAND_BLUE })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
        children: [new TextRun({ text: "Go-To-Market Campaign Plan", font: "Arial", size: 36, color: DARK })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
        children: [new TextRun({ text: '"Unleash Your Potential" Launch Campaign', font: "Arial", size: 26, color: ACCENT, italics: true })] }),
      spacer(), spacer(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
        children: [new TextRun({ text: "February 2026  |  Prepared for Mike Perkins", font: "Arial", size: 22, color: GRAY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Phase 1: Free Launch & Community Building", font: "Arial", size: 22, color: GRAY })] }),

      // === PAGE BREAK ===
      new Paragraph({ children: [new PageBreak()] }),

      // === 1. CAMPAIGN OVERVIEW ===
      h1("1. Campaign Overview"),
      boldP("Campaign Name: ", '"Unleash Your Potential" - Top Performer Coach Launch'),
      boldP("Summary: ", "Drive organic downloads and build an engaged community of ambitious professionals, fitness enthusiasts, and students through social media virality, influencer partnerships, and a user-generated content strategy that turns early adopters into brand ambassadors."),
      boldP("Primary Objective: ", "10,000 downloads in first 90 days with 30% Day-7 retention"),
      boldP("Secondary Objectives: ", "Build email list of 5,000+, achieve 4.5+ App Store rating, create foundation for viral contest at official launch"),
      boldP("Timeline: ", "12-week rolling campaign starting at App Store approval"),
      boldP("Budget: ", "Lean/bootstrap - prioritizing $0 organic channels with optional paid amplification"),
      spacer(),

      // === 2. TARGET AUDIENCE ===
      h1("2. Target Audience"),

      h2("Primary Segments (ROI-Ranked)"),

      h3("Segment A: Salespeople & Outgoing Professionals"),
      p("High-energy, goal-driven individuals in sales, business development, and entrepreneurship. They already track quotas and KPIs - Top Performer Coach gives them a system to track the habits behind their numbers. They're vocal on LinkedIn and Instagram, love sharing wins, and naturally become brand ambassadors."),
      boldP("Where they are: ", "LinkedIn, Instagram, X/Twitter, sales podcasts, Clubhouse rooms"),
      boldP("Pain points: ", "Inconsistent performance, burnout cycles, no system for personal development beyond work metrics"),
      boldP("Viral potential: ", "VERY HIGH - they love public accountability and celebrating wins"),
      spacer(),

      h3("Segment B: Up-and-Coming Health & Fitness Influencers"),
      p("Micro-influencers (1K-50K followers) in wellness, fitness, and self-improvement who are building their own brands. They need content ideas and authentic partnerships. Top Performer Coach becomes part of their daily routine content."),
      boldP("Where they are: ", "TikTok, Instagram Reels, YouTube Shorts, fitness communities"),
      boldP("Pain points: ", "Need fresh content angles, want to differentiate from other fitness creators"),
      boldP("Viral potential: ", "EXTREMELY HIGH - they create content daily and their audiences trust their recommendations"),
      spacer(),

      h3("Segment C: Sorority & Greek Life Communities"),
      p("Sorority members are hyper-connected, brand-loyal, and socially active. They share everything with their chapters and have built-in distribution networks across campuses nationwide. A single adoption by chapter leadership can mean 50-200 downloads overnight."),
      boldP("Where they are: ", "Instagram, TikTok, GroupMe, chapter meetings, campus events"),
      boldP("Pain points: ", "Academic-social balance, wellness accountability, wanting to stand out professionally post-graduation"),
      boldP("Viral potential: ", "EXTREMELY HIGH - built-in sharing networks, competitive culture, social proof driven"),
      boldP("How to reach them: ", "Partner with Panhellenic councils, sponsor sisterhood events, recruit chapter wellness chairs as ambassadors, connect through campus wellness programs and Greek life Instagram pages"),
      spacer(),

      h3("Segment D: Broad Self-Improvement Seekers"),
      p("Students, early-career professionals, and anyone actively investing in personal growth. They consume self-help content, follow productivity influencers, and are looking for a practical tool to turn inspiration into action."),
      boldP("Where they are: ", "Reddit (r/selfimprovement, r/getdisciplined), YouTube, podcasts, TikTok"),
      boldP("Pain points: ", "Information overload, can't stick to habits, want AI-personalized guidance"),
      spacer(),

      // === 3. KEY MESSAGES ===
      h1("3. Key Messages"),

      boldP("Core Message: ", '"Top Performer Coach is the AI-powered habit system that adapts to YOUR style - not a one-size-fits-all approach."'),
      spacer(),

      h2("Supporting Messages by Audience"),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2200, 3580, 3580],
        rows: [
          new TableRow({ children: [
            headerCell("Audience", 2200), headerCell("Message", 3580), headerCell("Proof Point", 3580)
          ]}),
          new TableRow({ children: [
            cell("Salespeople", 2200, { bold: true }),
            cell("Track the habits behind your numbers. Your quota has a formula - we help you find it.", 3580),
            cell("AI coaching adapts to your energy, schedule, and goals in real-time", 3580)
          ]}),
          new TableRow({ children: [
            cell("Health Influencers", 2200, { bold: true, fill: LIGHT_BG }),
            cell("Show your audience the full picture. Fitness is just one piece - track all your growth.", 3580, { fill: LIGHT_BG }),
            cell("Shareable progress dashboards and streak visualizations for content", 3580, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("Sororities", 2200, { bold: true }),
            cell("Level up together. Track goals as a chapter and hold each other accountable.", 3580),
            cell("Personal coaching that balances academics, wellness, social life, and career prep", 3580)
          ]}),
          new TableRow({ children: [
            cell("Self-Improvement", 2200, { bold: true, fill: LIGHT_BG }),
            cell("Stop reading about habits. Start building them with AI that knows you.", 3580, { fill: LIGHT_BG }),
            cell("Personalized daily coaching vs generic habit trackers", 3580, { fill: LIGHT_BG })
          ]}),
        ]
      }),
      spacer(),

      // === 4. CHANNEL STRATEGY ===
      h1("4. Channel Strategy (ROI-Ranked)"),
      p("Channels ranked by estimated ROI considering cost, automation potential, and impact for a bootstrapped launch:"),
      spacer(),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [520, 1700, 1100, 1100, 1100, 1540, 2300],
        rows: [
          new TableRow({ children: [
            headerCell("#", 520), headerCell("Channel", 1700), headerCell("Cost", 1100),
            headerCell("Effort", 1100), headerCell("ROI", 1100), headerCell("Automate?", 1540), headerCell("Why", 2300)
          ]}),
          new TableRow({ children: [
            cell("1", 520, { bold: true }), cell("App Store Optimization", 1700, { bold: true }),
            cell("$0", 1100), cell("Medium", 1100), cell("HIGHEST", 1100, { bold: true, color: "008000" }),
            cell("Set & refine", 1540), cell("65% of downloads come from search. One-time setup with ongoing tweaks.", 2300)
          ]}),
          new TableRow({ children: [
            cell("2", 520, { bold: true, fill: LIGHT_BG }), cell("TikTok/Reels", 1700, { bold: true, fill: LIGHT_BG }),
            cell("$0", 1100, { fill: LIGHT_BG }), cell("High", 1100, { fill: LIGHT_BG }), cell("VERY HIGH", 1100, { bold: true, color: "008000", fill: LIGHT_BG }),
            cell("Batch create", 1540, { fill: LIGHT_BG }), cell("Viral potential is unmatched. One hit = thousands of downloads overnight.", 2300, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("3", 520, { bold: true }), cell("Influencer Seeding", 1700, { bold: true }),
            cell("$0-500", 1100), cell("Medium", 1100), cell("HIGH", 1100, { bold: true, color: "008000" }),
            cell("Templated outreach", 1540), cell("Micro-influencers often post for free product access. Authentic > paid.", 2300)
          ]}),
          new TableRow({ children: [
            cell("4", 520, { bold: true, fill: LIGHT_BG }), cell("Sorority/Campus", 1700, { bold: true, fill: LIGHT_BG }),
            cell("$0-200", 1100, { fill: LIGHT_BG }), cell("Medium", 1100, { fill: LIGHT_BG }), cell("HIGH", 1100, { bold: true, color: "008000", fill: LIGHT_BG }),
            cell("Ambassador program", 1540, { fill: LIGHT_BG }), cell("Built-in networks. One chapter = 50-200 downloads. Scales with each campus.", 2300, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("5", 520, { bold: true }), cell("LinkedIn Organic", 1700, { bold: true }),
            cell("$0", 1100), cell("Medium", 1100), cell("HIGH", 1100, { bold: true, color: "008000" }),
            cell("Schedule posts", 1540), cell("Salespeople live here. Thought leadership + app mention = qualified downloads.", 2300)
          ]}),
          new TableRow({ children: [
            cell("6", 520, { bold: true, fill: LIGHT_BG }), cell("Referral Program", 1700, { bold: true, fill: LIGHT_BG }),
            cell("$0", 1100, { fill: LIGHT_BG }), cell("Low (in-app)", 1100, { fill: LIGHT_BG }), cell("HIGH", 1100, { bold: true, color: "008000", fill: LIGHT_BG }),
            cell("Fully automated", 1540, { fill: LIGHT_BG }), cell("Users invite users. Compound growth. Can tie into contest mechanics.", 2300, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("7", 520, { bold: true }), cell("Email/Newsletter", 1700, { bold: true }),
            cell("$0-50/mo", 1100), cell("Low", 1100), cell("MEDIUM", 1100, { bold: true }),
            cell("Fully automated", 1540), cell("Nurture signups, announce features, drive re-engagement. Drip sequences work while you sleep.", 2300)
          ]}),
          new TableRow({ children: [
            cell("8", 520, { bold: true, fill: LIGHT_BG }), cell("Reddit/Communities", 1700, { bold: true, fill: LIGHT_BG }),
            cell("$0", 1100, { fill: LIGHT_BG }), cell("Medium", 1100, { fill: LIGHT_BG }), cell("MEDIUM", 1100, { bold: true, fill: LIGHT_BG }),
            cell("No (authentic only)", 1540, { fill: LIGHT_BG }), cell("r/selfimprovement, r/sales, r/getdisciplined. Must add value, not spam.", 2300, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("9", 520, { bold: true }), cell("Landing Page", 1700, { bold: true }),
            cell("$0-20/mo", 1100), cell("One-time", 1100), cell("MEDIUM", 1100, { bold: true }),
            cell("Set & forget", 1540), cell("SEO long game + email capture + social proof hub. Foundation for everything else.", 2300)
          ]}),
          new TableRow({ children: [
            cell("10", 520, { bold: true, fill: LIGHT_BG }), cell("Apple Search Ads", 1700, { bold: true, fill: LIGHT_BG }),
            cell("$5-20/day", 1100, { fill: LIGHT_BG }), cell("Low", 1100, { fill: LIGHT_BG }), cell("MEDIUM", 1100, { bold: true, fill: LIGHT_BG }),
            cell("Fully automated", 1540, { fill: LIGHT_BG }), cell("60%+ conversion rate. Best paid channel for apps. Start small, scale what works.", 2300, { fill: LIGHT_BG })
          ]}),
        ]
      }),
      spacer(),

      // === 5. CONTENT CALENDAR ===
      new Paragraph({ children: [new PageBreak()] }),
      h1("5. Content Calendar (12-Week Rollout)"),

      h2("Phase 1: Launch Week (Weeks 1-2)"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1000, 3180, 2000, 3180],
        rows: [
          new TableRow({ children: [
            headerCell("Day", 1000), headerCell("Content", 3180), headerCell("Channel", 2000), headerCell("Notes", 3180)
          ]}),
          new TableRow({ children: [
            cell("Day 1", 1000, { bold: true }), cell("Launch announcement post + App Store link", 3180),
            cell("All social", 2000), cell("Personal accounts first for authenticity", 3180)
          ]}),
          new TableRow({ children: [
            cell("Day 2", 1000, { bold: true, fill: LIGHT_BG }), cell('"Why I built this" story video (60-90 sec)', 3180, { fill: LIGHT_BG }),
            cell("TikTok, Reels, LinkedIn", 2000, { fill: LIGHT_BG }), cell("Founder story drives connection. Be real.", 3180, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("Day 3", 1000, { bold: true }), cell("First influencer posts go live", 3180),
            cell("Instagram, TikTok", 2000), cell("Coordinate with 3-5 micro-influencers", 3180)
          ]}),
          new TableRow({ children: [
            cell("Day 4", 1000, { bold: true, fill: LIGHT_BG }), cell("App walkthrough / demo video", 3180, { fill: LIGHT_BG }),
            cell("YouTube, TikTok", 2000, { fill: LIGHT_BG }), cell("Show the AI coaching in action", 3180, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("Day 5", 1000, { bold: true }), cell("User testimonial (early beta feedback)", 3180),
            cell("Instagram Stories, LinkedIn", 2000), cell("Social proof from TestFlight users", 3180)
          ]}),
          new TableRow({ children: [
            cell("Days 6-7", 1000, { bold: true, fill: LIGHT_BG }), cell("Reddit posts in r/selfimprovement, r/productivity", 3180, { fill: LIGHT_BG }),
            cell("Reddit", 2000, { fill: LIGHT_BG }), cell("Value-first: share insights, mention app naturally", 3180, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("Week 2", 1000, { bold: true }), cell("Daily social content + email welcome sequence live + ASO refinement", 3180),
            cell("All channels", 2000), cell("Analyze Day 1-7 data, double down on what works", 3180)
          ]}),
        ]
      }),
      spacer(),

      h2("Phase 2: Community Building (Weeks 3-6)"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1200, 3160, 2000, 3000],
        rows: [
          new TableRow({ children: [
            headerCell("Week", 1200), headerCell("Content Focus", 3160), headerCell("Channel", 2000), headerCell("Goal", 3000)
          ]}),
          new TableRow({ children: [
            cell("Week 3", 1200, { bold: true }), cell('"7-Day Challenge" launch - daily habit challenge with app', 3160),
            cell("TikTok, Instagram", 2000), cell("Drive engagement + UGC with #TopPerformerChallenge", 3000)
          ]}),
          new TableRow({ children: [
            cell("Week 4", 1200, { bold: true, fill: LIGHT_BG }), cell("Sorority outreach begins - wellness chair partnerships", 3160, { fill: LIGHT_BG }),
            cell("Instagram DMs, email", 2000, { fill: LIGHT_BG }), cell("Secure 5-10 chapter ambassadors", 3000, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("Week 5", 1200, { bold: true }), cell("Sales performance content series - \"Habits of Top Closers\"", 3160),
            cell("LinkedIn, X/Twitter", 2000), cell("Attract salespeople with value-first content", 3000)
          ]}),
          new TableRow({ children: [
            cell("Week 6", 1200, { bold: true, fill: LIGHT_BG }), cell("First monthly recap + user spotlight features", 3160, { fill: LIGHT_BG }),
            cell("All channels, email", 2000, { fill: LIGHT_BG }), cell("Social proof + retention push + review requests", 3000, { fill: LIGHT_BG })
          ]}),
        ]
      }),
      spacer(),

      h2("Phase 3: Scale & Contest Prep (Weeks 7-12)"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1200, 3160, 2000, 3000],
        rows: [
          new TableRow({ children: [
            headerCell("Week", 1200), headerCell("Content Focus", 3160), headerCell("Channel", 2000), headerCell("Goal", 3000)
          ]}),
          new TableRow({ children: [
            cell("Weeks 7-8", 1200, { bold: true }), cell("Double down on top-performing content formats + expand influencer roster", 3160),
            cell("Best-performing channels", 2000), cell("Optimize based on data from Weeks 1-6", 3000)
          ]}),
          new TableRow({ children: [
            cell("Weeks 9-10", 1200, { bold: true, fill: LIGHT_BG }), cell("Pre-contest hype - tease the upcoming challenge/giveaway", 3160, { fill: LIGHT_BG }),
            cell("All channels", 2000, { fill: LIGHT_BG }), cell("Build anticipation, grow email list for contest launch", 3000, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("Weeks 11-12", 1200, { bold: true }), cell("CONTEST LAUNCH (see Section 8) + paid amplification if budget allows", 3160),
            cell("All channels + paid", 2000), cell("Viral spike targeting 5,000+ downloads in 2 weeks", 3000)
          ]}),
        ]
      }),
      spacer(),

      // === 6. INFLUENCER STRATEGY ===
      new Paragraph({ children: [new PageBreak()] }),
      h1("6. Influencer & Ambassador Strategy"),

      h2("Micro-Influencer Playbook"),
      p("Target up-and-coming health, fitness, and self-improvement influencers with 1K-50K followers. They're more authentic, more affordable (often free), and their audiences are highly engaged."),
      spacer(),

      h3("Outreach Template"),
      p('"Hey [Name], I love your content about [specific topic]. We just launched Top Performer Coach - an AI-powered habit coaching app. I think your audience would genuinely benefit from it. Would you be open to trying it free and sharing your honest experience? No strings attached."', { italics: true }),
      spacer(),

      h3("What We Offer Influencers"),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "Free premium access for life", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "Custom referral code for their audience to track impact", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "Feature on our social channels (cross-promotion)", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "Early access to new features", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 120 },
        children: [new TextRun({ text: "Revenue share / affiliate commission when premium launches", font: "Arial", size: 22 })] }),
      spacer(),

      h2("Sorority Ambassador Program"),
      p("Recruit 1-2 ambassadors per chapter (target wellness chairs, VP of standards, or social chairs). They introduce the app at chapter meetings and create accountability groups within the sisterhood."),
      spacer(),

      h3("How to Reach Sorority Chapters"),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "DM sorority chapter Instagram accounts directly with a tailored pitch", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "Contact Panhellenic councils at target universities about wellness programming", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "Sponsor sisterhood/wellness events (low cost: branded stickers, premium access codes)", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "Partner with campus wellness centers who can recommend the app", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "Run inter-chapter challenges (chapter with most streaks wins a prize)", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 120 },
        children: [new TextRun({ text: 'Create "Greek Life" content angle - "How Top Sorority Women Build Winning Habits"', font: "Arial", size: 22 })] }),
      spacer(),

      // === 7. ASO STRATEGY ===
      h1("7. App Store Optimization Strategy"),
      p("65% of App Store downloads come from search. This is the highest-ROI channel and should be perfected before anything else."),
      spacer(),

      h3("Keyword Targets"),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: 'Primary: "habit tracker", "AI coach", "personal development", "daily habits"', font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: 'Secondary: "goal tracker", "self improvement", "performance coach", "habit coach"', font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: 'Long-tail: "AI habit coaching app", "personalized habit tracker", "daily routine planner"', font: "Arial", size: 22 })] }),
      spacer(),

      h3("ASO Action Items"),
      new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "Optimize subtitle and keyword field with top-searched terms", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "A/B test screenshots (feature-focused vs lifestyle-focused)", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "Add app preview video showing AI coaching in action", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "Prompt for ratings after positive interactions (Day 3-5 in-app)", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 120 },
        children: [new TextRun({ text: "Update keywords monthly based on App Store Connect analytics", font: "Arial", size: 22 })] }),
      spacer(),

      // === 8. CONTEST CONCEPT ===
      new Paragraph({ children: [new PageBreak()] }),
      h1('8. Contest Concept: "30-Day Top Performer Challenge"'),
      p("Designed for the official release or once a strong free user base is established. This is the viral engine."),
      spacer(),

      h2("Contest Structure"),
      boldP("Duration: ", "30 days"),
      boldP("Mechanic: ", "Users compete to build the longest streak and highest performance scores in the app. Share daily progress on social media with #TopPerformerChallenge for bonus entries."),
      boldP("Entry: ", "Download the app (free) + opt in via email"),
      spacer(),

      h3("Prize Tiers"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2000, 3680, 3680],
        rows: [
          new TableRow({ children: [
            headerCell("Tier", 2000), headerCell("Prize", 3680), headerCell("How to Win", 3680)
          ]}),
          new TableRow({ children: [
            cell("Grand Prize (1)", 2000, { bold: true }),
            cell("$500 cash + 1 year premium + featured on all channels", 3680),
            cell("Highest overall score (streaks + engagement + referrals)", 3680)
          ]}),
          new TableRow({ children: [
            cell("Runner Up (5)", 2000, { bold: true, fill: LIGHT_BG }),
            cell("$100 gift card + 6 months premium", 3680, { fill: LIGHT_BG }),
            cell("Top 5 overall scores", 3680, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("Viral Star (1)", 2000, { bold: true }),
            cell("$250 cash + lifetime premium", 3680),
            cell("Most creative/viral social post about the app", 3680)
          ]}),
          new TableRow({ children: [
            cell("Referral King (1)", 2000, { bold: true, fill: LIGHT_BG }),
            cell("$250 cash + lifetime premium", 3680, { fill: LIGHT_BG }),
            cell("Most successful referrals", 3680, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("Chapter Champ (1)", 2000, { bold: true }),
            cell("Pizza party + premium for entire chapter", 3680),
            cell("Sorority/frat chapter with most active members", 3680)
          ]}),
          new TableRow({ children: [
            cell("Everyone (all)", 2000, { bold: true, fill: LIGHT_BG }),
            cell("Exclusive badge + 1 month premium free", 3680, { fill: LIGHT_BG }),
            cell("Complete the 30-day challenge", 3680, { fill: LIGHT_BG })
          ]}),
        ]
      }),
      spacer(),

      h2("Viral Mechanics"),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "Referral bonus entries: Each friend who joins = 5 extra points", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "Daily social sharing: Post progress screenshot with hashtag = 1 bonus entry/day", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "Leaderboard: Public rankings drive competition (salespeople LOVE this)", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 },
        children: [new TextRun({ text: "Team/chapter mode: Groups compete against each other for bragging rights", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 120 },
        children: [new TextRun({ text: "Influencer amplification: Partners promote the challenge to their audiences", font: "Arial", size: 22 })] }),
      spacer(),

      h3("Estimated Contest Budget"),
      p("Total: ~$1,500-2,500 (prizes + minor promotion costs). Expected return: 5,000-15,000 downloads if viral mechanics work. Cost per download: $0.10-0.50 (vs $2-5 industry average for paid installs)."),
      spacer(),

      h3("Recommended Contest Tools"),
      p("SweepWidget (free plan available), Gleam (free tier), or Viral Loops for referral tracking. All integrate with email and social platforms."),
      spacer(),

      // === 9. SUCCESS METRICS ===
      h1("9. Success Metrics & KPIs"),
      
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2500, 2200, 2360, 2300],
        rows: [
          new TableRow({ children: [
            headerCell("KPI", 2500), headerCell("90-Day Target", 2200), headerCell("Tracking Method", 2360), headerCell("Cadence", 2300)
          ]}),
          new TableRow({ children: [
            cell("Total Downloads", 2500, { bold: true }), cell("10,000", 2200),
            cell("App Store Connect Analytics", 2360), cell("Daily", 2300)
          ]}),
          new TableRow({ children: [
            cell("Day-7 Retention", 2500, { bold: true, fill: LIGHT_BG }), cell("30%+", 2200, { fill: LIGHT_BG }),
            cell("Firebase/Mixpanel", 2360, { fill: LIGHT_BG }), cell("Weekly", 2300, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("App Store Rating", 2500, { bold: true }), cell("4.5+ stars", 2200),
            cell("App Store Connect", 2360), cell("Weekly", 2300)
          ]}),
          new TableRow({ children: [
            cell("Email List Size", 2500, { bold: true, fill: LIGHT_BG }), cell("5,000 subscribers", 2200, { fill: LIGHT_BG }),
            cell("Email platform (Mailchimp/Beehiiv)", 2360, { fill: LIGHT_BG }), cell("Weekly", 2300, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("Social Followers", 2500, { bold: true }), cell("2,500 combined", 2200),
            cell("Platform analytics", 2360), cell("Weekly", 2300)
          ]}),
          new TableRow({ children: [
            cell("Influencer Partners", 2500, { bold: true, fill: LIGHT_BG }), cell("20 active", 2200, { fill: LIGHT_BG }),
            cell("CRM/spreadsheet", 2360, { fill: LIGHT_BG }), cell("Monthly", 2300, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("Referral Rate", 2500, { bold: true }), cell("15% of users refer 1+", 2200),
            cell("In-app referral tracking", 2360), cell("Weekly", 2300)
          ]}),
          new TableRow({ children: [
            cell("Sorority Chapters", 2500, { bold: true, fill: LIGHT_BG }), cell("10 active chapters", 2200, { fill: LIGHT_BG }),
            cell("Ambassador tracking", 2360, { fill: LIGHT_BG }), cell("Monthly", 2300, { fill: LIGHT_BG })
          ]}),
        ]
      }),
      spacer(),

      // === 10. RISKS ===
      h1("10. Risks & Mitigations"),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2800, 2200, 4360],
        rows: [
          new TableRow({ children: [
            headerCell("Risk", 2800), headerCell("Likelihood", 2200), headerCell("Mitigation", 4360)
          ]}),
          new TableRow({ children: [
            cell("Low initial downloads", 2800, { bold: true }), cell("Medium", 2200),
            cell("Diversify channels early. Don't rely on one. Have 3-5 influencers queued for launch week.", 4360)
          ]}),
          new TableRow({ children: [
            cell("Poor retention", 2800, { bold: true, fill: LIGHT_BG }), cell("Medium", 2200, { fill: LIGHT_BG }),
            cell("Monitor Day-1 and Day-7 retention daily. Ship UX improvements fast. Push notifications for re-engagement.", 4360, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("App Store rejection / delays", 2800, { bold: true }), cell("Low", 2200),
            cell("Already submitted. Have TestFlight ready as backup distribution channel for beta users.", 4360)
          ]}),
          new TableRow({ children: [
            cell("Negative reviews early on", 2800, { bold: true, fill: LIGHT_BG }), cell("Medium", 2200, { fill: LIGHT_BG }),
            cell("Respond to every review. Fix reported bugs within 48 hours. Ask happy users to rate.", 4360, { fill: LIGHT_BG })
          ]}),
          new TableRow({ children: [
            cell("Contest doesn't go viral", 2800, { bold: true }), cell("Medium", 2200),
            cell("Seed with influencer participation. Have 500+ users before launching contest. Set realistic floor expectations.", 4360)
          ]}),
        ]
      }),
      spacer(),

      // === 11. NEXT STEPS ===
      h1("11. Immediate Next Steps"),
      p("Actions to take THIS WEEK while the app is in review:"),
      spacer(),

      new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 100 },
        children: [
          new TextRun({ text: "Set up social media accounts ", font: "Arial", size: 22 }),
          new TextRun({ text: "(Instagram, TikTok, LinkedIn, X) with consistent branding", font: "Arial", size: 22 })
        ] }),
      new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 100 },
        children: [new TextRun({ text: "Build landing page with email capture (Carrd.co, Framer, or custom)", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 100 },
        children: [new TextRun({ text: "Draft first 10 social media posts (batch create for launch week)", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 100 },
        children: [new TextRun({ text: "Identify and DM 20 micro-influencers in health/fitness/self-improvement", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 100 },
        children: [new TextRun({ text: "Research target sorority chapters at 5-10 universities near you", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 100 },
        children: [new TextRun({ text: "Set up email marketing (Beehiiv free tier or Mailchimp) with welcome sequence", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 100 },
        children: [new TextRun({ text: "Record your founder story video for launch day", font: "Arial", size: 22 })] }),
      new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 100 },
        children: [new TextRun({ text: "Set up App Store Connect analytics and daily review monitoring", font: "Arial", size: 22 })] }),
      spacer(), spacer(),

      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 },
        children: [new TextRun({ text: "Ready to start executing. Let's make Top Performer Coach go viral.", font: "Arial", size: 24, bold: true, color: BRAND_BLUE, italics: true })] }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/sessions/serene-peaceful-hamilton/mnt/Project MJ/TopPerformer_CampaignPlan.docx", buffer);
  console.log("Campaign plan created successfully!");
});
