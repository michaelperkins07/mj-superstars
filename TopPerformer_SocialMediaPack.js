const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat,
        HeadingLevel, BorderStyle, WidthType, ShadingType,
        PageNumber, PageBreak } = require('docx');

const BRAND = { black: "000000", gold: "C5962F", darkGold: "A67C1A", lightGold: "F5ECD7", darkGray: "333333", medGray: "666666", lightGray: "F5F5F5", white: "FFFFFF", red: "C41E3A" };

const border = { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" };
const borders = { top: border, bottom: border, left: border, right: border };
const cm = { top: 80, bottom: 80, left: 120, right: 120 };

const spacer = (pts = 200) => new Paragraph({ spacing: { after: pts }, children: [] });

const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 }, children: [new TextRun({ text, bold: true, font: "Arial", size: 36, color: BRAND.black })] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 160 }, children: [new TextRun({ text, bold: true, font: "Arial", size: 28, color: BRAND.gold })] });
const h3 = (text) => new Paragraph({ spacing: { before: 200, after: 120 }, children: [new TextRun({ text, bold: true, font: "Arial", size: 24, color: BRAND.darkGray })] });
const body = (text) => new Paragraph({ spacing: { after: 160, line: 276 }, children: [new TextRun({ text, font: "Arial", size: 22, color: BRAND.darkGray })] });
const boldLabel = (label, text) => new Paragraph({ spacing: { after: 100, line: 276 }, children: [new TextRun({ text: label, font: "Arial", size: 22, color: BRAND.black, bold: true }), new TextRun({ text, font: "Arial", size: 22, color: BRAND.darkGray })] });

// Social Media Posts
const posts = [
  { num: 1, platform: "Instagram / TikTok / X", type: "Manifesto Launch", caption: "Life is short.\nWhy live in regret?\nWhy waste time worrying about the past or the future?\n\nDominate today. That's the only day that matters.\n\nTop Performer is your coach in your pocket. We help you build structure, set goals, and take control of your life \u2014 one day at a time.\n\nThe marathon continues. Are you running or watching?\n\n#TopPerformer #DominateToday #TheMarathonContinues #PersonalGrowth #HustleAndMotivate", visual: "Bold black background with gold text: 'DOMINATE TODAY.' Marathon flag checkered pattern at bottom.", cta: "Link in bio \u2192 Download free" },
  { num: 2, platform: "Instagram / TikTok", type: "Challenge Post", caption: "Name one thing you've been avoiding.\n\nThat thing you keep pushing to tomorrow.\nThat conversation you don't want to have.\nThat workout you keep skipping.\nThat call you don't want to make.\n\nNow go do it.\n\nNot tomorrow. Today. Right now.\n\nA little friction goes a long way. That's how you grow.\n\nTag someone who needs this push \ud83d\udc47\n\n#DoTheHardThing #TopPerformer #FrictionEqualsGrowth #NoExcuses #DominateToday", visual: "Split screen: comfort zone (dim, couch, phone scrolling) vs. action (gym, running, working). Bold text overlay: 'GO DO IT.'", cta: "Tag someone + save this post" },
  { num: 3, platform: "Instagram / X", type: "Story / Mindset", caption: "I ran because it sucks and I hate it.\n\nThat's exactly why I do it.\n\nDo something you don't want to do. Every. Single. Day.\n\nThat's how you trick your mind into believing it can handle more than it thinks it can.\n\nYour mind will quit before your body does. Don't let it win.\n\nThe friction is the point. The discomfort IS the growth.\n\n#EmbraceTheFriction #MindOverMatter #TopPerformer #RunTheMarathon #DoWhatYouHate", visual: "Runner pushing through rain or early morning darkness. Raw, gritty. Text overlay: 'THE FRICTION IS THE POINT.'", cta: "Share your friction moment in the comments" },
  { num: 4, platform: "Instagram / TikTok", type: "Micro-Win", caption: "30 minutes.\n\nThat's all we're asking for today.\n\nMove your body. Clear your mind. Start somewhere.\n\nYou don't need to run a marathon tomorrow.\nYou don't need to bench 315.\nYou don't need to have it all figured out.\n\nYou just need 30 minutes.\n\nFind out how many steps you took today. Tomorrow, do 100 more. That's the game.\n\n#StartSmall #30Minutes #TopPerformer #JustStart #RaiseYourFloor", visual: "Timer showing 30:00 on clean background. Person lacing up shoes. Text: '30 MINUTES. THAT'S ALL.'", cta: "Set a timer right now. Go." },
  { num: 5, platform: "Instagram / X", type: "Quote / Philosophy", caption: "Whatever you're doing today, add more to it.\n\nIf you run, run one more minute each day.\nIf you read, read one more page.\nIf you make calls, make one more call.\nIf you study, study 10 more minutes.\n\nThe compound effect of 1% daily improvement is unstoppable.\n\nThat's how you raise your floor. That's how you minimize the chance of settling.\n\nBecause the moment you settle is when you lose.\n\n#RaiseYourFloor #1PercentBetter #TopPerformer #CompoundEffect #TheMarathonContinues", visual: "Graph showing exponential growth of 1% daily improvement. Gold line on black background. Clean, striking.", cta: "Screenshot this. Set it as your wallpaper." },
  { num: 6, platform: "Instagram / TikTok / X", type: "Challenge / Viral", caption: "Too many critics.\nNot enough creators.\n\nEveryone's got an opinion on what YOU should be doing.\nBut how many of them are actually doing something themselves?\n\nStop watching. Start creating.\nStop judging. Start building.\nStop waiting. Start moving.\n\nPost what YOU created today.\nYour workout. Your business idea. Your first step.\n\n#TooManyCritics #BeACreator #TopPerformer #StopWatching #GetInTheArena", visual: "Bold typography on black: 'TOO MANY CRITICS. NOT ENOUGH CREATORS.' Audience watching vs. one person in the spotlight.", cta: "Drop what you created today in the comments" },
  { num: 7, platform: "Instagram", type: "Carousel (5 slides)", caption: "5 RULES FOR DOMINATING YOUR DAY:\n\nSwipe through and screenshot the one that hits hardest \ud83d\udc47\n\n#TopPerformer #DominateToday #DailyDiscipline #MindsetMatters #TheMarathonContinues", visual: "Slide 1: 'PREPARE THE NIGHT BEFORE \u2014 Put your pre-workout in a cup by your shoes. Know the plan before you sleep.'\nSlide 2: 'ADD MORE TO EVERYTHING \u2014 Whatever you did yesterday, do a little more today. Every. Single. Day.'\nSlide 3: 'DO SOMETHING YOU HATE \u2014 Run because it sucks. Wake up early because it's hard. The friction IS the growth.'\nSlide 4: 'CONTROL YOUR DAY \u2014 Most people wait for the day to control them. You're not most people.'\nSlide 5: 'ALIVE TIME OVER DEAD TIME \u2014 Dead time is gone. Plan ahead. Make every hour count.'", cta: "Save this + share with your squad" },
  { num: 8, platform: "Instagram / TikTok", type: "Proof / Social Proof", caption: "Real person. Real progress. 30 days of showing up.\n\nThey didn't transform overnight.\nThey didn't have some magic secret.\n\nThey showed up every single day and did a little more than yesterday.\n\nDay 1: Walked 15 minutes.\nDay 7: Ran a full mile.\nDay 14: Ran 2 miles without stopping.\nDay 30: Completed a 5K.\n\nThat's the power of raising your floor.\n\nYour 30 days start when you're ready. We'll be here.\n\n#30DayChallenge #TopPerformer #ShowUp #RaiseYourFloor #TransformationStory", visual: "Timeline progression visual. Before/after energy (not just physical \u2014 show confidence, posture, light in eyes). Day markers.", cta: "Start your 30 days \u2192 Link in bio" },
  { num: 9, platform: "Instagram / X", type: "Mindset / Deep", caption: "Your mind will quit before your body does.\n\nThat's the game. Learning to override the voice that says 'stop' when you know you've got more in the tank.\n\nTrick it. Outsmart it. Show up anyway.\n\nThe people who made it didn't have more talent.\nThey didn't have more time.\nThey just worked harder. They controlled their day while everyone else waited for the day to control them.\n\nPreparation isn't sexy. But results are.\n\n#MindOverMatter #TopPerformer #OutworkEveryone #Preparation #TheMarathonContinues", visual: "Person at the gym, head down, breathing hard, but not stopping. Raw moment. Text: 'YOUR MIND WILL QUIT FIRST. DON'T LET IT.'", cta: "DM us your mind trick for pushing through" },
  { num: 10, platform: "Instagram / TikTok", type: "Community / Referral", caption: "Know someone stuck in a rut?\n\nSomeone who keeps saying 'I'll start Monday'?\nSomeone who has the talent but not the structure?\nSomeone carrying the weight of everyone else's opinions?\n\nSend them this.\n\nWe're not going to yell at them. We're not going to judge them. We're going to meet them where they are and help them take one step forward.\n\nBecause we're in this together. And the marathon is better when you run with people who believe in you.\n\n#SendThisToSomeone #TopPerformer #WeAreInThisTogether #LiftSomebodyUp #TheMarathonContinues", visual: "Two people running together at sunrise. Not posed \u2014 real. Supporting each other. Text: 'WE'RE IN THIS TOGETHER.'", cta: "Tag someone who needs to see this \u2764\uFE0F" },
  { num: 11, platform: "TikTok / Instagram Reels", type: "Video Script: Founder Story", caption: "[VOICEOVER SCRIPT]\n\n'I've been a top performer everywhere I've been. Sales, athletics, you name it.\n\nBut I was also told my whole life that I wasn't good enough.\n\nSo I built something for people like us.\n\nPeople who know they can do more. People who refuse to settle. People who want to dominate today \u2014 not wait for tomorrow.\n\nTop Performer is your coach in your pocket. We help you set goals, build structure, and create the accountability to actually follow through.\n\nBecause everyone wants to make it to the league. But nobody wants to put in the work.\n\nWe do. Let's go.'\n\n#TopPerformer #FounderStory #HustleAndMotivate #TheMarathonContinues", visual: "Founder speaking directly to camera. Cut between personal footage (gym, work, family). Raw, authentic. End with app screens.", cta: "Download free \u2192 Link in bio" },
  { num: 12, platform: "Instagram / X", type: "Health / Science", caption: "Stress spikes cortisol.\nCortisol causes inflammation.\nInflammation compounds over time.\n\nYou know what fights all of it?\n\nMovement.\n\n30 minutes a day. Walking, running, lifting, swimming \u2014 it doesn't matter. Just move.\n\nWhen your body moves, your mind clears. When your mind clears, you make better decisions. When you make better decisions, everything else follows.\n\nIt starts with health. Everything else is built on top of it.\n\n#MoveYourBody #CortisolKills #TopPerformer #HealthFirst #30MinutesADay", visual: "Clean infographic: Stress \u2192 Cortisol \u2192 Inflammation \u2192 Decline vs. Movement \u2192 Clarity \u2192 Better Decisions \u2192 Growth. Gold and black.", cta: "How many steps did you take today? Comment below." },
  { num: 13, platform: "Instagram / TikTok", type: "Challenge: 7-Day Friction", caption: "7-DAY FRICTION CHALLENGE \ud83d\udd25\n\nDay 1: Wake up 30 minutes earlier than normal\nDay 2: Do a workout you've never tried\nDay 3: Have a conversation you've been avoiding\nDay 4: Put your phone down for 2 hours\nDay 5: Help someone without being asked\nDay 6: Run for 10 minutes straight (no walking)\nDay 7: Write down 3 things you're grateful for and mean it\n\nSmall friction. Big growth.\n\nTag your accountability partner and do this together.\n\n#FrictionChallenge #TopPerformer #7DayChallenge #GrowthMindset #DoTheHardThing", visual: "Checklist graphic with each day. Bold, clean design. Gold checkmarks. Space for users to screenshot and mark off.", cta: "Screenshot this. Start tomorrow. Tag your partner." },
  { num: 14, platform: "Instagram / X", type: "Accountability Mirror", caption: "The hardest conversation you'll ever have is with yourself.\n\nLook in the mirror.\nOwn your faults.\nAdmit where you messed up.\nStop carrying it as baggage.\n\nWhen you can be honest with yourself \u2014 really honest \u2014 that's when everything changes.\n\nMost people would rather live in a fantasy world than face reality. They hide behind a mask instead of being the grown-up version of their younger self.\n\nBe brave enough to look. Then be brave enough to change.\n\n#AccountabilityMirror #OwnIt #TopPerformer #FaceYourself #NoMoreExcuses", visual: "Person looking in mirror, intense. Reflection shows younger version of themselves. Gold frame. Text: 'OWN IT.'", cta: "What's one thing you need to own? Comment below." },
  { num: 15, platform: "Instagram", type: "Carousel: Salt to a Slug", caption: "HOW TO TALK TO ANYONE (AND WIN THEM OVER) \ud83e\udde0\n\nSwipe through for 4 types of people and exactly how to connect with each one.\n\nThis works in sales, relationships, friendships, and leadership.\n\n#Communication #TopPerformer #SaltToASlug #ReadTheRoom #EmotionalIntelligence", visual: "Slide 1: Title card 'SALT TO A SLUG: READ THE ROOM'\nSlide 2: 'THE CONFIDENT ONE \u2014 They've won before. Pump them up. Ask how they make decisions. Match their energy.'\nSlide 3: 'THE BURNED ONE \u2014 They got hurt. They need proof. Commend them for still trying. Show them they're not alone.'\nSlide 4: 'THE EMOTIONAL ONE \u2014 Low confidence, high potential. Don't yell. Build them up. Every interaction should feel like a hug and a game plan.'\nSlide 5: 'THE SKEPTIC \u2014 They think they know everything. Don't fight them. Ask questions. Let them feel like the idea was theirs.'", cta: "Save this for your next tough conversation" },
  { num: 16, platform: "TikTok / Instagram Reels", type: "Video: Preparation Routine", caption: "[VOICEOVER SCRIPT]\n\n'Here's my secret weapon.\n\nEvery single night before I go to sleep, I prepare one thing for tomorrow.\n\nI put my pre-workout by my shoes.\nI write down my top 3 priorities.\nI visualize the hardest conversation I'll have.\n\nBy the time I wake up, I've already won the morning.\n\nMost people aren't prepared for the day because they have zero structure. That's why they're anxious. That's why they can't sleep.\n\nWhen you know what's coming, you control it. When you don't, it controls you.\n\nPrepare tonight. Dominate tomorrow.'\n\n#NightRoutine #PrepareToWin #TopPerformer #Structure #DominateToday", visual: "Evening routine footage: laying out clothes, writing list, setting up gym bag. Calm, focused. Text overlays for key phrases.", cta: "Try this tonight. Report back tomorrow." },
  { num: 17, platform: "Instagram / X", type: "Marathon Theme", caption: "It's literally a marathon we're running.\n\nNot a sprint. Not a quick fix. Not a 30-day transformation gimmick.\n\nA marathon.\n\nSome days you'll cruise.\nSome days you'll hit a wall.\nSome days you'll want to quit.\n\nBut you don't quit. Because quitting means you've accepted that this is as good as it gets.\n\nAnd you know \u2014 deep down \u2014 that you've got more in the tank.\n\nKeep running. The marathon continues.\n\n#TheMarathonContinues #HustleAndMotivate #TopPerformer #NeverQuit #KeepRunning", visual: "Long road stretching into the distance. Single runner, small in frame but powerful. Gold marathon flag icon. Text: 'THE MARATHON CONTINUES.'", cta: "Share your marathon moment" },
  { num: 18, platform: "Instagram / TikTok", type: "Relatable / Humor", caption: "You: 'I'll start Monday.'\nAlso you on Monday: 'I'll start next Monday.'\n\nStop it.\n\nThere's no perfect day to start. There's no perfect plan. There's no sign from the universe.\n\nThere's just right now.\n\nAnd right now, you can do ONE thing:\n- Take a walk\n- Set a goal in the app\n- Do 10 pushups\n- Call someone you've been avoiding\n\nThat's it. That's the whole secret.\n\nStart ugly. Start small. Just start.\n\n#StopWaiting #StartNow #TopPerformer #NoMoreMondays #JustStart", visual: "Meme-style top/bottom format. Calendar with every Monday circled, then ripped in half. Text: 'THERE IS NO MONDAY. THERE IS ONLY NOW.'", cta: "What's YOUR one thing today? Drop it below." },
  { num: 19, platform: "Instagram / X", type: "Leadership / Wisdom", caption: "The best leaders talk last in meetings.\n\nThey ask questions. They let the team figure it out. And then they celebrate like the team did it.\n\nBecause they did.\n\nYou don't need to be the loudest voice. You need to be the most prepared.\n\nAsk 'how' and 'what if.' Understand the why. Compare your options.\n\nThat's not just leadership. That's life.\n\n#LeadFromBehind #TopPerformer #AskQuestions #Leadership #PreparedToWin", visual: "Boardroom scene. One person leaning back, listening, while others present. Calm confidence. Text: 'TALK LAST. WIN FIRST.'", cta: "Try this in your next meeting. Let us know how it goes." },
  { num: 20, platform: "Instagram / TikTok", type: "Contest Launch", caption: "THE 30-DAY TOP PERFORMER CHALLENGE IS HERE \ud83c\udfc1\n\nHere's how it works:\n\n1\uFE0F\u20E3 Download Top Performer (free)\n2\uFE0F\u20E3 Set your first daily goal\n3\uFE0F\u20E3 Show up every day for 30 days\n4\uFE0F\u20E3 Earn points for consistency + referrals\n5\uFE0F\u20E3 Top 1% wins prizes each quarter\n\nYear 1 Grand Prize: 1% EQUITY in Top Performer.\n\nYou don't just win a trophy. You become an owner.\n\nThis is a contest to help anyone you know be their best self. The more friends you bring, the more points you earn.\n\nThe marathon starts now. Are you in?\n\n#30DayChallenge #TopPerformer #WinEquity #TheMarathonContinues #CompeteWithYourself", visual: "Animated: Marathon flag waving. Contest details appearing one by one. Gold and black. Trophy transforming into equity certificate. Confetti.", cta: "Download link in bio. Tag 3 friends to join you." },
  { num: 21, platform: "Instagram / X", type: "Mind & Emotions", caption: "The only competition you're facing today is yourself.\n\nNot your coworker. Not your ex. Not that person on social media with the perfect life.\n\nYou.\n\nThe rest of the world is losing \u2014 distracted by the past, worried about the future, drowning in noise they can't control.\n\nYou? You're going to block that noise today.\nYou're going to make one rational decision instead of reacting.\nYou're going to choose clarity over chaos.\n\nThat's how you win. That's how you light up the scoreboard.\n\n#BlockTheNoise #TopPerformer #MasterYourMind #YouVsYou #DominateToday", visual: "Person standing calm in the center while chaos swirls around them (blurred, fast motion). They're still. Focused. Gold light on them. Text: 'BLOCK THE NOISE.'", cta: "What noise are you blocking today? Tell us below." },
  { num: 22, platform: "Instagram / TikTok", type: "Emotional Intelligence", caption: "Road rage.\nArguments over nothing.\nSnapping at the people you love.\n\nThat's not strength. That's an ego with no leash.\n\nReal strength is:\n\u2022 Pausing before you react\n\u2022 Listening before you speak\n\u2022 Choosing empathy when it's hard\n\u2022 Loving yourself enough to not need to tear others down\n\nWhen you manage your ego, you build better relationships. You communicate clearly. You remove the noise. And you get further in life than anger ever could.\n\nTop Performer helps you master the inside game.\n\n#ManageYourEgo #TopPerformer #EmotionalIntelligence #StopReacting #InnerStrength", visual: "Split screen: Left side red/angry (road rage, yelling, chaos). Right side calm/gold (deep breath, focused, at peace). Text: 'REAL STRENGTH IS QUIET.'", cta: "Save this for when you need a reminder" },
  { num: 23, platform: "Instagram / X", type: "Self-Love / Depth", caption: "Love yourself.\n\nNot the Instagram version of self-love where you buy candles and take baths.\n\nReal self-love.\n\nThe kind where you:\n\u2022 Look in the mirror and own your faults\n\u2022 Stop carrying hate that's only hurting you\n\u2022 Forgive yourself for yesterday\n\u2022 Set a standard for how you'll show up today\n\u2022 Remove remorse from your soul because it's dead weight\n\nWhen you truly love yourself, empathy becomes natural. Judging others becomes pointless. And growth becomes inevitable.\n\nThat's the foundation. Everything else is built on top of it.\n\n#LoveYourselfFirst #TopPerformer #RemoveTheHate #SelfLove #GrowthStartsWithin", visual: "Person looking in mirror with warm gold light. Reflection shows them smiling, at peace. Minimal, emotional. Text: 'LOVE YOURSELF. THE REST FOLLOWS.'", cta: "Tag someone who needs to hear this today" },
  { num: 24, platform: "TikTok / Instagram Reels", type: "Video: The Noise", caption: "[VOICEOVER SCRIPT]\n\n'Every day the world gets louder.\n\nMore violence. More hate. More people losing their minds over things they can't control.\n\nAnd here's the thing \u2014 you can't fix any of that.\n\nBut you can fix you.\n\nYou can choose to respond instead of react.\nYou can choose empathy over anger.\nYou can choose to compete with yourself instead of tearing someone else down.\n\nThe rest of the world is losing. They're distracted. They're emotional. They're making decisions from fear.\n\nNot you.\n\nYou're going to take control of your mind today. You're going to make rational decisions. You're going to light up the scoreboard.\n\nThat's what Top Performers do.'\n\n#BlockTheNoise #TopPerformer #MasterYourMind #TheMarathonContinues #ControlYourDay", visual: "Start with chaotic news footage/social media scroll (blurred). Transition to person putting phone down, taking a breath, stepping outside into sunlight. Calm. Focused. Gold filter. End with app screen.", cta: "Download free \u2192 Link in bio" },
  { num: 25, platform: "Instagram", type: "Carousel: Inner Game", caption: "THE INNER GAME: 5 WAYS TO WIN BEFORE YOU LEAVE THE HOUSE\n\nSwipe through \u2192 Screenshot the one you need most today.\n\n#InnerGame #TopPerformer #MindsetFirst #BlockTheNoise #WinTheDay", visual: "Slide 1: Title card 'WIN THE INNER GAME FIRST'\nSlide 2: 'REMOVE HATE \u2014 Hate is dead weight. Every ounce of it slows you down. Let it go. You don't need it where you're going.'\nSlide 3: 'STOP REACTING \u2014 Pause. Breathe. Then respond. That 3-second gap between emotion and action is where winners live.'\nSlide 4: 'LOVE YOURSELF FIRST \u2014 Not ego. Not arrogance. Real love. The kind that makes you better to everyone around you.'\nSlide 5: 'COMPETE WITH YOURSELF \u2014 The only scoreboard that matters is yours. Did you do more than yesterday? That's all that counts.'\nSlide 6: 'HAVE EMPATHY \u2014 Everyone is fighting something. When you stop judging and start understanding, doors open that force could never break.'", cta: "Save + share with someone who's going through it" },
];

// Build posts as doc content
const postSections = [];
posts.forEach((post, i) => {
  if (i > 0) postSections.push(new Paragraph({ children: [new PageBreak()] }));

  // Post header
  postSections.push(new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `POST #${post.num}`, font: "Arial", size: 28, bold: true, color: BRAND.gold }),
      new TextRun({ text: `  |  ${post.type}`, font: "Arial", size: 24, color: BRAND.medGray }),
    ]
  }));

  postSections.push(boldLabel("Platform: ", post.platform));
  postSections.push(spacer(80));

  // Caption
  postSections.push(h3("Caption"));
  // Split caption by \n for proper paragraphs
  const lines = post.caption.split('\n');
  lines.forEach(line => {
    postSections.push(new Paragraph({
      spacing: { after: 60, line: 276 },
      indent: { left: 360 },
      children: [new TextRun({ text: line || " ", font: "Arial", size: 21, color: BRAND.darkGray })]
    }));
  });

  postSections.push(spacer(100));

  // Visual Direction
  postSections.push(h3("Visual Direction"));
  const visLines = post.visual.split('\n');
  visLines.forEach(line => {
    postSections.push(new Paragraph({
      spacing: { after: 60, line: 276 },
      indent: { left: 360 },
      children: [new TextRun({ text: line, font: "Arial", size: 21, color: BRAND.medGray, italics: true })]
    }));
  });

  postSections.push(spacer(100));

  // CTA
  postSections.push(boldLabel("Call to Action: ", post.cta));
});

// ===== INFLUENCER OUTREACH SECTION =====
const outreachSection = [
  new Paragraph({ children: [new PageBreak()] }),
  h1("INFLUENCER OUTREACH TEMPLATES"),
  spacer(100),

  h2("Template 1: Fitness Micro-Influencer DM"),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "Hey [Name]! \ud83d\udc4b", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "Love what you're doing with [specific content they posted]. That's real and people can feel it.", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "I built an app called Top Performer \u2014 it's a free personal coaching app that helps people set daily goals, build structure, and actually follow through. Think of it as a coach in your pocket.", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "I think your audience would love it. Would you be down to try it and share your honest take? No pressure, no script \u2014 just real.", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 120, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "The marathon continues \ud83c\udfc1", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  spacer(200),

  h2("Template 2: Sales / Business Leader"),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "Hey [Name] \u2014", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "Saw your post about [topic]. Hit different. Especially the part about [specific detail].", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "I built Top Performer \u2014 a free app for people who refuse to settle. Daily goal setting, accountability coaching, and structure for people who want to dominate their day instead of letting it control them.", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "I think this is right in your lane. Would love to get your take on it. If it resonates, maybe your audience would dig it too.", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 120, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "Too many critics, not enough creators. Let's be creators. \ud83d\udcaa", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  spacer(200),

  h2("Template 3: Sorority / Community Leader"),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "Hey [Name]! \ud83d\udc9b", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "I love the community you've built with [sorority/org name]. That kind of sisterhood/brotherhood is exactly what more people need.", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "I created Top Performer \u2014 a free coaching app designed to help people take control of their personal growth through daily goals and accountability. We believe the marathon of life is better when you run with people who believe in you.", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "We're launching an Ambassador Program and I think your chapter would be an incredible fit. Members get early access, exclusive challenges, and the chance to compete for real prizes (including equity in the company).", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 120, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "Would love to chat about it. We're in this together \u2764\uFE0F", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  spacer(200),

  h2("Template 4: Health & Wellness Creator"),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "Hey [Name] \u2014", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "Your content on [topic] is exactly the kind of real talk people need to hear. No BS, just truth.", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "I built Top Performer because I believe it all starts with health. Move 30 minutes a day. Clear your mind. The rest follows. But most people don't have the structure to make it happen.", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 60, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "That's what the app does \u2014 helps people set daily health goals, track progress, and build the habit of showing up. Free, no gimmicks.", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
  new Paragraph({
    spacing: { after: 120, line: 300 },
    shading: { fill: BRAND.lightGray, type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: "Would you be open to trying it? If it vibes, share it. If not, no hard feelings. Keep doing what you're doing \ud83d\udcaa", font: "Arial", size: 21, color: BRAND.darkGray })]
  }),
];

// ===== BUILD DOC =====
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, font: "Arial", color: BRAND.black }, paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: "Arial", color: BRAND.gold }, paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
    ]
  },
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
        new TextRun({ text: "TOP PERFORMER", font: "Arial", size: 16, bold: true, color: BRAND.gold }),
        new TextRun({ text: "  |  Social Media & Outreach Pack", font: "Arial", size: 16, color: BRAND.medGray }),
      ] })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: "The Marathon Continues  |  Page ", font: "Arial", size: 16, color: BRAND.medGray }),
        new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: BRAND.medGray }),
      ] })] })
    },
    children: [
      // Title page
      spacer(2400),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "TOP PERFORMER", font: "Arial", size: 56, bold: true, color: BRAND.black })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501", font: "Arial", size: 28, color: BRAND.gold })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: "Social Media Content Pack & Influencer Outreach", font: "Arial", size: 32, color: BRAND.gold })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "25 Ready-to-Post Pieces + 4 Outreach Templates", font: "Arial", size: 24, italics: true, color: BRAND.medGray })] }),
      spacer(1200),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "February 2026 | Version 1.0", font: "Arial", size: 20, color: BRAND.medGray })] }),
      new Paragraph({ children: [new PageBreak()] }),

      // Posts
      h1("SOCIAL MEDIA CONTENT PACK"),
      body("25 ready-to-post pieces of content across Instagram, TikTok, and X (Twitter). Each post includes the caption, visual direction, and call to action. Posts 21-25 focus on the emotional intelligence and inner game messaging. Copy, customize, and post."),
      spacer(100),
      ...postSections,

      // Outreach
      ...outreachSection,
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/sessions/serene-peaceful-hamilton/mnt/Project MJ/TopPerformer_SocialMediaPack.docx", buffer);
  console.log("Social Media Pack + Outreach created successfully!");
});
