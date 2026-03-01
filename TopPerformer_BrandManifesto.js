const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat,
        HeadingLevel, BorderStyle, WidthType, ShadingType,
        PageNumber, PageBreak } = require('docx');

// Brand Colors
const BRAND = {
  black: "000000",
  gold: "C5962F",
  darkGold: "A67C1A",
  lightGold: "F5ECD7",
  darkGray: "333333",
  medGray: "666666",
  lightGray: "F5F5F5",
  white: "FFFFFF",
  red: "C41E3A"
};

// Helper functions
const spacer = (pts = 200) => new Paragraph({ spacing: { after: pts }, children: [] });

const heading1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 200 },
  children: [new TextRun({ text, bold: true, font: "Arial", size: 36, color: BRAND.black })]
});

const heading2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 280, after: 160 },
  children: [new TextRun({ text, bold: true, font: "Arial", size: 28, color: BRAND.gold })]
});

const heading3 = (text) => new Paragraph({
  spacing: { before: 200, after: 120 },
  children: [new TextRun({ text, bold: true, font: "Arial", size: 24, color: BRAND.darkGray })]
});

const bodyText = (text, opts = {}) => new Paragraph({
  spacing: { after: 160, line: 276 },
  children: [new TextRun({ text, font: "Arial", size: 22, color: opts.color || BRAND.darkGray, ...opts })]
});

const boldBody = (label, text) => new Paragraph({
  spacing: { after: 160, line: 276 },
  children: [
    new TextRun({ text: label, font: "Arial", size: 22, color: BRAND.black, bold: true }),
    new TextRun({ text, font: "Arial", size: 22, color: BRAND.darkGray })
  ]
});

const quoteBlock = (text) => new Paragraph({
  spacing: { before: 200, after: 200 },
  indent: { left: 720, right: 720 },
  children: [new TextRun({ text: `"${text}"`, font: "Arial", size: 24, color: BRAND.gold, italics: true, bold: true })]
});

const border = { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorders = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

// Build Numbering Config
const numberingConfig = [
  {
    reference: "bullets",
    levels: [{
      level: 0, format: LevelFormat.BULLET, text: "\u2022",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } }
    }]
  },
  {
    reference: "bullets2",
    levels: [{
      level: 0, format: LevelFormat.BULLET, text: "\u2022",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } }
    }]
  },
  {
    reference: "bullets3",
    levels: [{
      level: 0, format: LevelFormat.BULLET, text: "\u2022",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } }
    }]
  },
  {
    reference: "bullets4",
    levels: [{
      level: 0, format: LevelFormat.BULLET, text: "\u2022",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } }
    }]
  },
  {
    reference: "bullets5",
    levels: [{
      level: 0, format: LevelFormat.BULLET, text: "\u2022",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } }
    }]
  },
  {
    reference: "bullets6",
    levels: [{
      level: 0, format: LevelFormat.BULLET, text: "\u2022",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } }
    }]
  },
  {
    reference: "numbers1",
    levels: [{
      level: 0, format: LevelFormat.DECIMAL, text: "%1.",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } }
    }]
  },
  {
    reference: "numbers2",
    levels: [{
      level: 0, format: LevelFormat.DECIMAL, text: "%1.",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } }
    }]
  }
];

const bullet = (text, ref = "bullets") => new Paragraph({
  numbering: { reference: ref, level: 0 },
  spacing: { after: 80, line: 276 },
  children: [new TextRun({ text, font: "Arial", size: 22, color: BRAND.darkGray })]
});

const numberedItem = (text, ref = "numbers1") => new Paragraph({
  numbering: { reference: ref, level: 0 },
  spacing: { after: 80, line: 276 },
  children: [new TextRun({ text, font: "Arial", size: 22, color: BRAND.darkGray })]
});

// ===== DOCUMENT SECTIONS =====

const titlePage = [
  spacer(2400),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "TOP PERFORMER", font: "Arial", size: 56, bold: true, color: BRAND.black })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501", font: "Arial", size: 28, color: BRAND.gold })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: "Brand Manifesto & Voice Guide", font: "Arial", size: 32, color: BRAND.gold })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: "Hustle and Motivate. The Marathon Continues.", font: "Arial", size: 24, italics: true, color: BRAND.medGray })]
  }),
  spacer(1200),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "February 2026 | Version 1.0", font: "Arial", size: 20, color: BRAND.medGray })]
  }),
  new Paragraph({ children: [new PageBreak()] })
];

const manifestoSection = [
  heading1("THE MANIFESTO"),
  spacer(100),
  quoteBlock("Life is short. Why live in regret? Why waste time worrying about the past or the future? Dominate today."),
  spacer(100),
  bodyText("Top Performer exists because we believe every single person has untapped potential buried under fear, doubt, and the weight of other people\u2019s opinions. We\u2019re not here to judge you. We\u2019re not here to sell you a fantasy. We\u2019re here to help you take control of your life, one day at a time."),
  bodyText("This is the marathon of life \u2014 a constant journey. There\u2019s no finish line, no moment where you\u2019ve \u201Cmade it\u201D and can stop. The people who win aren\u2019t the ones who were born with more talent or more luck. They\u2019re the ones who showed up every single day, did a little more than yesterday, and refused to quit."),
  bodyText("We believe in raising your floor. Not your ceiling \u2014 your floor. The minimum you\u2019re willing to accept from yourself. Because when your worst day is better than most people\u2019s best, you\u2019ve already won."),
  quoteBlock("Whatever you\u2019re doing today, add more to it. If you run, run one more minute each day. That\u2019s how you start."),
  bodyText("But here\u2019s what most people miss: the real battle isn\u2019t out there. It\u2019s in here \u2014 in your mind, in your emotions, in the noise that drowns out your ability to think clearly. Each day we see more violence, more road rage, more hate. People aren\u2019t losing because they lack talent. They\u2019re losing because they can\u2019t control themselves."),
  bodyText("Top Performer is your coach in your pocket. We help you take control of your mind and emotions so you can make rational decisions, block the noise, and realize that the only competition you\u2019re facing each day is yourself. The rest of the world is distracted \u2014 lost in the past or worried about the future. We\u2019re here to help you win today. Let\u2019s light up the scoreboard."),
  bodyText("Love yourself. Have empathy. Don\u2019t judge others. Remove hate and remorse from your soul. And do something that makes you uncomfortable to grow, every single day."),
  bodyText("We\u2019re in this together. And if you have an excuse, let\u2019s talk about it. Let\u2019s figure out how to get through it. Because excuses are just problems that haven\u2019t been solved yet."),
  new Paragraph({ children: [new PageBreak()] })
];

const missionSection = [
  heading1("MISSION & VISION"),
  heading2("Mission"),
  bodyText("To help everyday people take control of their minds, emotions, and daily actions \u2014 building the structure, self-awareness, and accountability needed to block the noise, make rational decisions, and unlock their full potential."),
  heading2("Vision"),
  bodyText("A world where people lead with empathy instead of ego, where self-love replaces self-doubt, and where anyone with the courage to look in the mirror and start can become the best version of themselves \u2014 one day at a time."),
  heading2("Core Promise"),
  quoteBlock("We will help you live your best life by taking control, building ownership, and setting goals that matter. Your marathon starts today."),
  new Paragraph({ children: [new PageBreak()] })
];

const pillarsSection = [
  heading1("BRAND PILLARS"),
  spacer(100),
  heading2("1. Dominate Today"),
  bodyText("Don\u2019t overthink it. Whatever you planned to do tomorrow, just do a little more today. If you didn\u2019t plan to go, you should go anyway. A little friction goes a long way. The people who control their day are the ones who control their life."),
  quoteBlock("Those who know what\u2019s going on tomorrow will control today."),
  spacer(100),
  heading2("2. Raise Your Floor"),
  bodyText("The moment you settle is when you lose. Top Performer isn\u2019t about massive overnight transformation \u2014 it\u2019s about doing one more rep, running one more minute, preparing one more thing the night before. Minimize your floor in everything you do. Your worst day should still be a win."),
  spacer(100),
  heading2("3. Embrace the Friction"),
  bodyText("Growth doesn\u2019t come from comfort. Do something you don\u2019t want to do. That\u2019s how you start. You need to trick your mind into believing it can handle more than it thinks it can. Run because it sucks. Wake up early because it\u2019s hard. That friction is the thing that separates you from everyone else."),
  quoteBlock("Do something you don\u2019t want to do. That\u2019s how you start. You need to trick your mind."),
  spacer(100),
  heading2("4. We\u2019re In This Together"),
  bodyText("This isn\u2019t a solo journey. Top Performer is your partner \u2014 a coach that meets you where you are. Got an excuse? Let\u2019s talk about it. Feeling stuck? Let\u2019s find another challenge. We don\u2019t judge. We help you work through it and come out stronger."),
  spacer(100),
  heading2("5. Alive Time Over Dead Time"),
  bodyText("Dead time is past, done, gone \u2014 second after second. The only way to be on alive time is to plan ahead. If you want to do anything in life, prepare for the fight. We help you stay in alive time by building structure, setting micro-goals, and making every hour count."),
  spacer(100),
  heading2("6. Master Your Mind & Emotions"),
  bodyText("The real fight isn\u2019t with the world \u2014 it\u2019s with yourself. Every day we see increases in violence, road rage, and hate. People react instead of respond. They let ego drive the car and wonder why they keep crashing. Top Performer helps you block the noise, manage your ego, and make decisions from a place of clarity \u2014 not emotion."),
  bodyText("When you control your mind, you control your relationships. When you control your emotions, you communicate better. When you remove hate and judgment from your soul, you get further in life than you ever thought possible. The only competition you\u2019re facing each day is the person in the mirror."),
  quoteBlock("Love yourself. Have empathy. Don\u2019t judge others. Remove hate and remorse from your soul. That\u2019s the foundation everything else is built on."),
  spacer(100),
  heading2("7. Light Up the Scoreboard"),
  bodyText("The rest of the world is losing \u2014 distracted by the past or worried about the future. We\u2019re here to help you win today. Not tomorrow. Not next week. Today. Every goal you hit, every challenge you complete, every uncomfortable thing you do \u2014 that\u2019s a point on the board. And when you go to bed at night, you look at that scoreboard and know you won the day."),
  quoteBlock("The rest of the world is losing. We\u2019re here to help you win today. Let\u2019s light up the scoreboard."),
  new Paragraph({ children: [new PageBreak()] })
];

const voiceSection = [
  heading1("BRAND VOICE & TONE"),
  heading2("Voice Characteristics"),
  spacer(50),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2340, 3510, 3510],
    rows: [
      new TableRow({
        children: [
          new TableCell({ borders, width: { size: 2340, type: WidthType.DXA }, margins: cellMargins,
            shading: { fill: BRAND.black, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Trait", font: "Arial", size: 20, bold: true, color: BRAND.white })] })] }),
          new TableCell({ borders, width: { size: 3510, type: WidthType.DXA }, margins: cellMargins,
            shading: { fill: BRAND.black, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "We Are", font: "Arial", size: 20, bold: true, color: BRAND.white })] })] }),
          new TableCell({ borders, width: { size: 3510, type: WidthType.DXA }, margins: cellMargins,
            shading: { fill: BRAND.black, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "We Are Not", font: "Arial", size: 20, bold: true, color: BRAND.white })] })] }),
        ]
      }),
      ...([
        ["Direct", "Straight talk, no fluff. Get to the point.", "Preachy, condescending, or academic"],
        ["Motivating", "A coach who believes in you harder than you believe in yourself", "Toxic positivity or empty hype"],
        ["Real", "Honest about struggle. Growth hurts. We own that.", "Fake, filtered, or performative"],
        ["Inclusive", "Everyone can grow. We meet you where you are.", "Elitist or gatekeeping"],
        ["Action-Oriented", "Less talk, more work. Do the thing.", "Passive, wishy-washy, theoretical"],
        ["Relatable", "Real stories, real people, real challenges", "Corporate, stiff, or robotic"],
      ]).map(([trait, weAre, weNot], i) => new TableRow({
        children: [
          new TableCell({ borders, width: { size: 2340, type: WidthType.DXA }, margins: cellMargins,
            shading: { fill: i % 2 === 0 ? BRAND.lightGray : BRAND.white, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: trait, font: "Arial", size: 20, bold: true, color: BRAND.black })] })] }),
          new TableCell({ borders, width: { size: 3510, type: WidthType.DXA }, margins: cellMargins,
            shading: { fill: i % 2 === 0 ? BRAND.lightGray : BRAND.white, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: weAre, font: "Arial", size: 20, color: BRAND.darkGray })] })] }),
          new TableCell({ borders, width: { size: 3510, type: WidthType.DXA }, margins: cellMargins,
            shading: { fill: i % 2 === 0 ? BRAND.lightGray : BRAND.white, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: weNot, font: "Arial", size: 20, color: BRAND.medGray })] })] }),
        ]
      }))
    ]
  }),
  spacer(200),
  heading2("Tone by Channel"),
  bullet("Social Media: Bold, punchy, conversational. Like texting your most fired-up friend.", "bullets"),
  bullet("In-App Coaching: Warm, encouraging, specific. Like a trainer who knows your name.", "bullets"),
  bullet("Email: Personal, story-driven, with one clear call to action.", "bullets"),
  bullet("Landing Page: Confident, aspirational, proof-heavy. Show the transformation.", "bullets"),
  spacer(200),
  heading2("Language Rules"),
  bullet("Use \u201Cyou\u201D and \u201Cwe\u201D \u2014 never \u201Cusers\u201D or \u201Ccustomers\u201D", "bullets2"),
  bullet("Short sentences. Punch. Impact. Then breathe.", "bullets2"),
  bullet("Lead with action verbs: Run. Push. Build. Own. Dominate.", "bullets2"),
  bullet("Real metaphors: boxing, marathons, car engines, weight rooms", "bullets2"),
  bullet("Name the fear, then kill it: \u201CScared to start? Good. That means it matters.\u201D", "bullets2"),
  bullet("Never shame. Always challenge: \u201CYou can do this. Let\u2019s go.\u201D", "bullets2"),
  new Paragraph({ children: [new PageBreak()] })
];

const audienceSection = [
  heading1("AUDIENCE PROFILES & MESSAGING"),
  heading2("Primary: The Ambitious Achiever"),
  bodyText("Sales professionals, entrepreneurs, competitive athletes, and high-energy personalities. They\u2019re already winning but know they can do more. They talk loud, move fast, and thrive on challenges. They\u2019re the ones who ran a half marathon, benched 315, and bowled 284 in the same week. Social media is their stage."),
  heading3("How to reach them:"),
  bullet("Challenge content: \u201CYou hit the gym today? Cool. Now go again tomorrow and add 5 more pounds.\u201D", "bullets3"),
  bullet("Competitive hooks: \u201CToo many critics, not enough creators. Which one are you?\u201D", "bullets3"),
  bullet("Viral potential: These people SHARE content that makes them feel seen", "bullets3"),
  spacer(100),
  heading2("Secondary: The Stuck Starter"),
  bodyText("They know they need to change but can\u2019t get moving. Maybe they got burned before. Maybe nobody believed in them. They\u2019ve been told their whole life they\u2019re not good enough, and somewhere along the way, they started to believe it. They need someone in their corner."),
  heading3("How to reach them:"),
  bullet("Permission content: \u201CYou don\u2019t need to be the best. You just need to start.\u201D", "bullets4"),
  bullet("Empathy hooks: \u201CWe\u2019ve all been there. The difference is what you do next.\u201D", "bullets4"),
  bullet("Micro-win framing: \u201C30 minutes. That\u2019s all we\u2019re asking for today.\u201D", "bullets4"),
  spacer(100),
  heading2("Tertiary: The Community Builder"),
  bodyText("Sorority members, team leaders, coaches, group fitness communities. They don\u2019t just want to grow themselves \u2014 they want to lift everyone around them. They\u2019re the ones who pass the ball so the whole team can win."),
  heading3("How to reach them:"),
  bullet("Ambassador content: \u201CKnow someone who needs a push? Send them this.\u201D", "bullets5"),
  bullet("Team challenges: \u201CBring your squad. The team that grows together, wins together.\u201D", "bullets5"),
  bullet("Referral rewards: Turn their natural network into growth engine", "bullets5"),
  spacer(100),
  heading2("Emerging: The Health-Conscious"),
  bodyText("People whose entry point is physical health \u2014 wanting to move more, eat better, feel stronger. They may not realize yet that physical health is just the first domino. When you start moving 30 minutes a day, everything else follows. We help them see that."),
  heading3("How to reach them:"),
  bullet("Health hooks: \u201CFind out how many steps you took today. Tomorrow, do 100 more.\u201D", "bullets6"),
  bullet("Science-backed: \u201CStress spikes cortisol. Movement fights it. Simple math.\u201D", "bullets6"),
  bullet("Progressive challenges: Start with walking, graduate to running, then running one more minute each day", "bullets6"),
  new Paragraph({ children: [new PageBreak()] })
];

const messagingFramework = [
  heading1("CORE MESSAGING FRAMEWORK"),
  heading2("The Salt to a Slug Framework"),
  bodyText("Every person you talk to has a different starting point, a different wound, and a different way they need to hear the message. Top Performer adapts. Here\u2019s how we speak to each:"),
  spacer(100),
  heading3("Confident Achievers (Positive Past Experience)"),
  bodyText("They have confidence. They\u2019ve won before. Pump them up and remind them how smart they are for making informed decisions. Show them that Top Performer is the tool that matches their intensity."),
  quoteBlock("You\u2019re already putting in the work. Imagine what happens when you add structure to that fire."),
  spacer(100),
  heading3("Burned & Cautious (Negative Past Experience)"),
  bodyText("They got hurt. They tried before and it didn\u2019t work. They need proof, data, and someone who believes in them. Commend them for still being in the fight. Show them they\u2019re not alone."),
  quoteBlock("You got knocked down. That doesn\u2019t mean you\u2019re out. We\u2019re here to help you get back up \u2014 with a better plan this time."),
  spacer(100),
  heading3("Emotional & Uncertain (Low Self-Esteem)"),
  bodyText("The largest group. Low confidence, high potential. They need to be heard, not yelled at. Build them up with warmth. Don\u2019t scare them \u2014 inspire them. Every interaction should make them feel like they just got a hug and a game plan."),
  quoteBlock("You don\u2019t have to have it all figured out. You just need to take one step. We\u2019ll figure out the rest together."),
  spacer(100),
  heading3("Controllers & Skeptics"),
  bodyText("They think they know everything. They test boundaries and challenge authority. Don\u2019t fight them \u2014 let them discover. Use questions, not commands. \u201CI\u2019m sure you already know about...\u201D \u201CWhat\u2019s your take on...\u201D Let them feel like the idea was theirs."),
  quoteBlock("You\u2019re clearly sharp. Let\u2019s put that energy to work on something that compounds."),
  new Paragraph({ children: [new PageBreak()] })
];

const keyPhrases = [
  heading1("KEY PHRASES & HOOKS"),
  heading2("Manifesto Lines (Use in Hero Content)"),
  bullet("Life is short. Why live in regret?", "bullets"),
  bullet("Dominate today. That\u2019s the only day that matters.", "bullets"),
  bullet("Don\u2019t overthink it. Just do a little more.", "bullets"),
  bullet("The marathon of life is a constant journey. Are you running or watching?", "bullets"),
  bullet("Too many critics, not enough creators.", "bullets"),
  bullet("Minimize your floor. The moment you settle is when you lose.", "bullets"),
  bullet("Whatever you\u2019re doing today, add more to it. Each and every day.", "bullets"),
  bullet("Do something you don\u2019t want to do. That\u2019s how you start.", "bullets"),
  bullet("We\u2019re in this together. Got an excuse? Let\u2019s talk about it.", "bullets"),
  bullet("If you run, run one more minute each day. That\u2019s the game.", "bullets"),
  spacer(200),
  heading2("Challenge Hooks (Use in Social Posts)"),
  bullet("You hit the gym today? Good. Now go again tomorrow.", "bullets2"),
  bullet("Name one thing you\u2019re avoiding. Now go do it.", "bullets2"),
  bullet("Everyone wants to make it to the league, but nobody wants to put in the work.", "bullets2"),
  bullet("Alive time or dead time \u2014 which one are you living in right now?", "bullets2"),
  bullet("Preparation isn\u2019t sexy. But results are.", "bullets2"),
  bullet("Your mind will quit before your body does. Don\u2019t let it.", "bullets2"),
  spacer(200),
  heading2("Empathy Hooks (Use for Retention & Onboarding)"),
  bullet("We\u2019ve all been told we\u2019re not good enough. Let\u2019s prove them wrong.", "bullets3"),
  bullet("You don\u2019t need to be perfect. You just need to start.", "bullets3"),
  bullet("Struggling doesn\u2019t mean you\u2019re failing. It means you\u2019re growing.", "bullets3"),
  bullet("Most people aren\u2019t prepared for the day because they have zero structure. That changes today.", "bullets3"),
  bullet("If you can control yourself, you\u2019ll know how everyone else reacts.", "bullets3"),
  spacer(200),
  heading2("Mind & Emotions Hooks (Use for Deeper Engagement)"),
  bullet("The only competition you\u2019re facing today is yourself. The rest of the world is losing.", "bullets4"),
  bullet("Violence, road rage, hate \u2014 it\u2019s all noise. Block it. Control your mind. Win the day.", "bullets4"),
  bullet("Your ego is the biggest thing standing between you and every relationship you want.", "bullets4"),
  bullet("Love yourself first. Everything else \u2014 empathy, patience, growth \u2014 flows from that.", "bullets4"),
  bullet("Stop reacting. Start responding. That one shift changes everything.", "bullets4"),
  bullet("Remove hate from your soul. Remove remorse. What\u2019s left is clarity. And clarity wins.", "bullets4"),
  bullet("When you master your emotions, you master your communication. When you master communication, you master life.", "bullets4"),
  bullet("Let\u2019s light up the scoreboard. Every goal hit is a point. Go to bed knowing you won today.", "bullets4"),
  new Paragraph({ children: [new PageBreak()] })
];

const contestSection = [
  heading1("THE MARATHON CHALLENGE"),
  heading2("Contest Concept: 30-Day Top Performer Challenge"),
  bodyText("Inspired by the marathon mindset and the Nipsey Hussle \u201CHustle and Motivate\u201D ethos. This isn\u2019t a giveaway \u2014 it\u2019s a proving ground. Participants earn their spot."),
  spacer(100),
  heading3("How It Works"),
  numberedItem("Download Top Performer and set your first daily goal", "numbers1"),
  numberedItem("Complete your goal every day for 30 days straight", "numbers1"),
  numberedItem("Earn points for consistency, daily progress, and positive interactions", "numbers1"),
  numberedItem("Earn bonus points for referring friends who also complete goals", "numbers1"),
  numberedItem("Top 1% of performers at the end of each quarter win prizes", "numbers1"),
  spacer(100),
  heading3("Prizes"),
  bullet("Grand Prize (Year 1): 1% equity in Top Performer \u2014 you literally become an owner", "bullets4"),
  bullet("Quarterly Winners: Cash prizes, exclusive merch, featured story on our platform", "bullets4"),
  bullet("Monthly Recognition: Top performers get spotlighted in the community", "bullets4"),
  spacer(100),
  heading3("Referral Game Mechanics"),
  bodyText("Users earn significant bonus points for referring friends. The contest creates a natural viral loop: you want to win, so you invite your squad. Your squad starts winning, so they invite theirs. The referral becomes the growth engine."),
  quoteBlock("The first year we\u2019re giving away 1% of equity to the top performer who wins the contest. It\u2019s a contest to help anyone you know be their best self."),
  spacer(100),
  heading3("Sprint Challenges (In-App)"),
  bodyText("Shorter burst challenges between quarterly contests to maintain engagement:"),
  bullet("7-Day Friction Challenge: Do something uncomfortable every day for a week", "bullets5"),
  bullet("Run More Challenge: Add 1 minute to your run every day for 14 days", "bullets5"),
  bullet("Accountability Sprint: Check in with a partner daily for 21 days", "bullets5"),
  bullet("Mind Over Matter: Complete a goal you\u2019ve been putting off for 30+ days", "bullets5"),
  new Paragraph({ children: [new PageBreak()] })
];

const visualIdentity = [
  heading1("VISUAL IDENTITY DIRECTION"),
  heading2("Theme: The Marathon"),
  bodyText("Inspired by the Nipsey Hussle marathon flag aesthetic \u2014 a checkered flag that represents not a finish line, but a constant state of running. The marathon continues. Every day is a new mile."),
  spacer(100),
  heading3("Visual Themes for Content"),
  bullet("Marathon/running imagery \u2014 finish lines, mile markers, roads stretching into the horizon", "bullets"),
  bullet("Boxing/fighting metaphors \u2014 gloves up, training montages, the ring as a metaphor for daily life", "bullets"),
  bullet("Car/engine themes \u2014 revving up, tuning the machine, fuel for the journey", "bullets"),
  bullet("Before/after transformation stories \u2014 real people, real progress", "bullets"),
  bullet("The accountability mirror \u2014 facing yourself, owning your reflection", "bullets"),
  spacer(100),
  heading2("Color Palette"),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2340, 2340, 4680],
    rows: [
      new TableRow({
        children: [
          new TableCell({ borders, width: { size: 2340, type: WidthType.DXA }, margins: cellMargins,
            shading: { fill: BRAND.black, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Color", font: "Arial", size: 20, bold: true, color: BRAND.white })] })] }),
          new TableCell({ borders, width: { size: 2340, type: WidthType.DXA }, margins: cellMargins,
            shading: { fill: BRAND.black, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Hex", font: "Arial", size: 20, bold: true, color: BRAND.white })] })] }),
          new TableCell({ borders, width: { size: 4680, type: WidthType.DXA }, margins: cellMargins,
            shading: { fill: BRAND.black, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Usage", font: "Arial", size: 20, bold: true, color: BRAND.white })] })] }),
        ]
      }),
      ...([
        ["Black", "#000000", "Primary \u2014 headlines, backgrounds, power moments"],
        ["Gold", "#C5962F", "Accent \u2014 CTAs, highlights, achievement markers"],
        ["White", "#FFFFFF", "Clean space, contrast, breathing room"],
        ["Red", "#C41E3A", "Urgency \u2014 challenge CTAs, deadlines, fire moments"],
        ["Dark Gray", "#333333", "Body text, supporting content"],
      ]).map(([color, hex, usage], i) => new TableRow({
        children: [
          new TableCell({ borders, width: { size: 2340, type: WidthType.DXA }, margins: cellMargins,
            shading: { fill: i % 2 === 0 ? BRAND.lightGray : BRAND.white, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: color, font: "Arial", size: 20, bold: true, color: BRAND.black })] })] }),
          new TableCell({ borders, width: { size: 2340, type: WidthType.DXA }, margins: cellMargins,
            shading: { fill: i % 2 === 0 ? BRAND.lightGray : BRAND.white, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: hex, font: "Arial", size: 20, color: BRAND.darkGray })] })] }),
          new TableCell({ borders, width: { size: 4680, type: WidthType.DXA }, margins: cellMargins,
            shading: { fill: i % 2 === 0 ? BRAND.lightGray : BRAND.white, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: usage, font: "Arial", size: 20, color: BRAND.darkGray })] })] }),
        ]
      }))
    ]
  }),
  spacer(200),
  heading2("Typography"),
  bullet("Headlines: Bold, uppercase when punchy. Impact or heavy sans-serif.", "bullets2"),
  bullet("Body: Clean, readable sans-serif (Arial, Inter, or Helvetica)", "bullets2"),
  bullet("Quotes/Callouts: Italic, gold accent, slightly larger", "bullets2"),
  new Paragraph({ children: [new PageBreak()] })
];

const executionPlaybook = [
  heading1("WEEK 1 EXECUTION PLAYBOOK"),
  heading2("Day 1-2: Foundation"),
  bullet("Set up Instagram, TikTok, and X (Twitter) accounts with consistent branding", "bullets"),
  bullet("Bio: \u201CYour coach in your pocket. Dominate today. \uD83C\uDFC1 The marathon continues.\u201D", "bullets"),
  bullet("Pin post: The manifesto \u2014 \u201CLife is short. Why live in regret?\u201D", "bullets"),
  bullet("Landing page live with email capture: TopPerformerApp.com", "bullets"),
  spacer(100),
  heading2("Day 3-5: Content Launch"),
  bodyText("Drop the first 5 social posts (see Social Media Content Pack). Post cadence: 1 post per day across all platforms. Alternate between:"),
  bullet("Challenge posts (\u201CDo something you don\u2019t want to do today\u201D)", "bullets2"),
  bullet("Story posts (Real stories of overcoming doubt)", "bullets2"),
  bullet("Micro-win posts (\u201C30 minutes. That\u2019s all.\u201D)", "bullets2"),
  bullet("Quote posts (Key phrases from the manifesto)", "bullets2"),
  spacer(100),
  heading2("Day 5-7: Outreach"),
  bullet("DM 20 micro-influencers in fitness, sales, and personal development", "bullets3"),
  bullet("Reach out to 5 sorority chapters with ambassador program", "bullets3"),
  bullet("Email first newsletter to captured leads: \u201CThe Marathon Starts Now\u201D", "bullets3"),
  bullet("Start engaging in comments on relevant accounts (add value, don\u2019t spam)", "bullets3"),
  spacer(200),
  heading2("Content Calendar: First 10 Posts"),
  spacer(100),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [600, 1600, 5160, 2000],
    rows: [
      new TableRow({
        children: ["#", "Type", "Content Hook", "CTA"].map((text, ci) =>
          new TableCell({ borders, width: { size: [600, 1600, 5160, 2000][ci], type: WidthType.DXA }, margins: cellMargins,
            shading: { fill: BRAND.black, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 18, bold: true, color: BRAND.white })] })] })
        )
      }),
      ...([
        ["1", "Manifesto", "Life is short. Why live in regret? Dominate today.", "Download link"],
        ["2", "Challenge", "Name one thing you\u2019re avoiding. Now go do it. Tag someone who needs this.", "Tag a friend"],
        ["3", "Story", "I ran because it sucks and I hate it. That\u2019s exactly why I do it. Friction = growth.", "Share your friction"],
        ["4", "Micro-Win", "30 minutes. That\u2019s all we\u2019re asking. Move your body. Clear your mind. Start today.", "Set a timer now"],
        ["5", "Quote", "Whatever you\u2019re doing today, add more to it. If you run, run one more minute each day.", "Screenshot & share"],
        ["6", "Challenge", "Too many critics, not enough creators. Post what YOU created today.", "Post yours"],
        ["7", "Story", "Everyone wants to make it. Nobody wants to put in the work. The difference? Structure.", "Download link"],
        ["8", "Proof", "Real person. Real progress. 30 days of showing up changed everything. [User story]", "Start your 30 days"],
        ["9", "Mindset", "Your mind will quit before your body does. Trick it. Outsmart it. Show up anyway.", "DM us your trick"],
        ["10", "Community", "Know someone stuck in a rut? Someone who needs a push? Send them this. We\u2019re in this together.", "Share with 1 person"],
      ]).map(([num, type, content, cta], i) => new TableRow({
        children: [num, type, content, cta].map((text, ci) =>
          new TableCell({ borders, width: { size: [600, 1600, 5160, 2000][ci], type: WidthType.DXA }, margins: cellMargins,
            shading: { fill: i % 2 === 0 ? BRAND.lightGray : BRAND.white, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 18, color: BRAND.darkGray })] })] })
        )
      }))
    ]
  }),
];

// ===== BUILD DOCUMENT =====

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: BRAND.black },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: BRAND.gold },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
    ]
  },
  numbering: { config: numberingConfig },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: "TOP PERFORMER", font: "Arial", size: 16, bold: true, color: BRAND.gold }),
            new TextRun({ text: "  |  Brand Manifesto & Voice Guide", font: "Arial", size: 16, color: BRAND.medGray }),
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "The Marathon Continues  |  Page ", font: "Arial", size: 16, color: BRAND.medGray }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: BRAND.medGray }),
          ]
        })]
      })
    },
    children: [
      ...titlePage,
      ...manifestoSection,
      ...missionSection,
      ...pillarsSection,
      ...voiceSection,
      ...audienceSection,
      ...messagingFramework,
      ...keyPhrases,
      ...contestSection,
      ...visualIdentity,
      ...executionPlaybook,
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/sessions/serene-peaceful-hamilton/mnt/Project MJ/TopPerformer_BrandManifesto.docx", buffer);
  console.log("Brand Manifesto created successfully!");
});
