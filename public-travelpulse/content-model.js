/* ============================================================
   Travel Marketing Studio — content model
   ------------------------------------------------------------
   Reverse-engineered from the published Base44 app
   (appId 6ad1b02d62830e19ceea7037, bundle index-Bn8LqwiW.js).
   Copy, channels and structure mirror the original exactly.

   The engine is profile-driven: one source of truth → ten
   platform-shaped pieces. Two profiles ship:

     travel     the app's own loaded state (verified byte-identical
                against the original's text)
     blueprint  a technology-leverage business, with the original's
                own LinkedIn output preserved verbatim
   ============================================================ */

(function (global) {
  'use strict';

  /* ============================================================
     Channels
     ============================================================ */

  var CHANNELS = [
    {
      id: 'linkedin',
      index: '01',
      name: 'LinkedIn',
      format: 'Thought-leadership post',
      description: 'Positions you as the travel expert clients trust before they ever enquire.',
      cadence: '3× per week'
    },
    {
      id: 'medium',
      index: '02',
      name: 'Medium',
      format: 'Long-form article',
      description: 'Destination stories and planning guides long enough to rank and get shared.',
      cadence: '1× per week'
    },
    {
      id: 'etsy',
      index: '03',
      name: 'Etsy',
      format: 'Marketplace listing',
      description: 'Listings for itineraries, travel guides and downloadable planning products.',
      cadence: 'Weekly refresh'
    },
    {
      id: 'redis',
      index: '04',
      name: 'Reddit',
      format: 'Community post',
      description: 'Value-first answers for travel threads — written to inform, never to hard-sell.',
      cadence: '2× per week'
    },
    {
      id: 'facebook',
      index: '05',
      name: 'Facebook',
      format: 'Page post',
      description: 'Page updates and group prompts that turn travellers into a returning audience.',
      cadence: '3× per week'
    },
    {
      id: 'instagram',
      index: '06',
      name: 'Instagram',
      format: 'Caption + carousel',
      description: 'Captions, carousels and story scripts built around your destination imagery.',
      cadence: '4× per week'
    },
    {
      id: 'tiktok',
      index: '07',
      name: 'TikTok',
      format: 'Short-form video script',
      description: 'Scroll-stopping hooks and shot-by-shot scripts for short destination clips.',
      cadence: '4× per week'
    },
    {
      id: 'pinterest',
      index: '08',
      name: 'Pinterest',
      format: 'Pin titles + description',
      description: 'Pin titles, descriptions and boards designed to send steady long-tail traffic.',
      cadence: 'Daily pins'
    },
    {
      id: 'google',
      index: '09',
      name: 'Google',
      format: 'Search listing',
      description: 'Page titles, meta descriptions and intro copy that win the click.',
      cadence: 'Monthly review'
    },
    {
      id: 'youtube',
      index: '10',
      name: 'YouTube',
      format: 'Video package',
      description: 'Titles, descriptions, tags and outlines for destination and itinerary videos.',
      cadence: '1× per week'
    }
  ];

  /* ============================================================
     Shared helpers
     ============================================================ */

  function lines() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) out.push(arguments[i]);
    return out.join('\n\n');
  }

  function getChannel(id) {
    for (var i = 0; i < CHANNELS.length; i++) {
      if (CHANNELS[i].id === id) return CHANNELS[i];
    }
    return null;
  }

  /* ============================================================
     PROFILE 1 — Travel Club
     The app's own loaded state. Text verified byte-for-byte
     against the original.
     ============================================================ */

  var travelSource = {
    name: 'Invitation-Only Travel & Lifestyle Club',
    blurb:
      'Frequent travellers who book 4- and 5-star properties and resent retail booking ' +
      'markups, plus people open to a referral-based income opportunity.',
    status: 'Loaded',
    summary: [
      {
        heading: 'Core Model & Value Proposition',
        body:
          'The business is a private, invitation-only travel and lifestyle club that bypasses ' +
          'traditional retail booking markups to offer direct wholesale member pricing (up to 70% ' +
          'off retail) across more than 1 million properties worldwide.'
      },
      {
        heading: 'Dollar-for-Dollar Travel Equity',
        body:
          'All membership fees function like a vacation savings account. Every dollar spent converts ' +
          '1-for-1 into travel equity points ($1 = 1 Point), which members use to buy down ' +
          'out-of-pocket costs on curated, 4- and 5-star "Premium Escapes".'
      },
      {
        heading: 'Membership Pricing Tiers',
        body:
          'African Launch Regional Tier: $250 initial setup + $50/month (yields 250 initial travel ' +
          'points + 50 points/month).\nGlobal Tier: $450 initial setup + $99/month (yields 600 initial ' +
          'travel points + 100 points/month).'
      },
      {
        heading: 'Operational Cost Elimination ("Get 4, Pay No More")',
        body:
          'Referring 4 active members permanently waives the member\'s monthly membership dues. Even ' +
          'with $0 out-of-pocket monthly fees, the member continues to accrue their monthly travel ' +
          'equity points for free.'
      },
      {
        heading: 'Compensation & Residual Wealth Engine',
        body:
          'Ambassadors earn income by sharing the opportunity through a Two-Team (binary) referral ' +
          'network:\nResidual Growth: Monthly residual income scales based on total team volume, ' +
          'ranging from $50/month (5 members left / 5 right) up to $85,000/month (5,000 left / 5,000 ' +
          'right).\n30-Day Launch Multiplier: Hitting a reduced $5,000 regional volume target in the ' +
          'first 30 days triggers a doubled "Amplify Bonus," generating up to $1,400 in initial ' +
          'fast-start earnings.'
      },
      {
        heading: 'Duplication & Closing System',
        body:
          'The business runs on a tool-driven duplication model - ambassadors share a standardized ' +
          '20-minute recorded video overview rather than making sales pitches. Prospects are ' +
          'categorized at the end using an A/B/C Framework:\nPath A: All-in Brand Ambassador + Member.\n' +
          'Path B: Traveling Customer only.\nPath C: Not a fit.'
      }
    ]
  };

  function travelFacts(src) {
    return {
      name: src.name,
      savings: 'up to 70% off retail',
      properties: 'more than 1 million properties worldwide',
      equity: '$1 = 1 Point',
      regional: '$250 setup + $50/month',
      global: '$450 setup + $99/month',
      get4:
        'Refer four active members and your monthly dues are waived — permanently. You keep ' +
        'accruing travel points while paying nothing out of pocket.',
      residual: 'residual income that scales from $50/month all the way to $85,000/month',
      amplifier:
        'hit a reduced $5,000 regional volume target in your first 30 days and the Amplify Bonus ' +
        'doubles, worth up to $1,400 in fast-start earnings',
      duplication: 'a standardized 20-minute recorded video overview',
      abc:
        'an A/B/C framework — Path A (all-in ambassador and member), Path B (travelling customer ' +
        'only), Path C (not a fit)'
    };
  }

  /* The travel writers — unchanged, so the verified output stays byte-identical. */

  var travelWriters = {
    linkedin: function (f) {
      return {
        title: 'Why pay retail for travel when you can access wholesale pricing?',
        body: lines(
          'The traditional travel industry is built on hidden markups that the consumer ends up ' +
            'paying at checkout. For those who frequently book 4- and 5-star properties, that ' +
            'premium is the difference between a holiday that feels generous and one that quietly ' +
            'costs more than it should.',
          f.name + ' was built to remove it. Members access wholesale pricing across ' +
            f.properties + ' — ' + f.savings + ' — and every dollar spent converts 1-for-1 into ' +
            'travel equity (' + f.equity + '), so the holiday pays you back.',
          'The model is deliberately small: ' + f.duplication + ', and ' + f.abc + '. Because the ' +
            'model is transparent, the economics are easy to audit. ' + f.get4,
          'Invitation-only by design. If the markup has been quietly bothering you too, say the word.',
          '#TravelIndustry #WholesaleTravel #TravelClub #SmartTravel #LuxuryTravel'
        ),
        extras: [
          { label: 'Tone', value: 'Expert, unhurried, no hard sell' },
          { label: 'Length', value: 'Approx. 150 words' }
        ]
      };
    },

    medium: function (f) {
      return {
        title: 'The Markup Nobody Talks About: Why Wholesale Travel Pricing Is Changing the Way We Book',
        body: lines(
          'Ask anyone who books a 5-star property twice a year what the worst part is. It is rarely ' +
            'the room. It is the price they were quoted — a number that moved between the search ' +
            'and the checkout, and that never came back down.',
          '### The premium is structural, not accidental',
          'Retail travel pricing is built around a margin that the consumer pays without ever seeing ' +
            'it. ' + f.name + ' removes that layer entirely: members reach wholesale pricing across ' +
            f.properties + ' at ' + f.savings + '. The saving is not a promo code that expires. It is ' +
            'the actual cost of the room.',
          '### The holiday that pays you back',
          'This is where most points programmes go wrong — they feel like a separate currency you ' +
            'have to manage. Here, the maths is deliberately boring: ' + f.equity + '. Membership ' +
            'fees behave like a vacation savings account, and the points buy down the out-of-pocket ' +
            'cost of curated Premium Escapes.',
          '### What it costs to join',
          'Two tiers, both straightforward. The African Launch Regional Tier is ' + f.regional +
            ', yielding 250 initial travel points plus 50 a month. The Global Tier is ' + f.global +
            ', yielding 600 initial travel points plus 100 a month.',
          '### Why the model stays small',
          'Growth here is ' + f.duplication + ', not a pitch. Ambassadors show the same video and let ' +
            'the model sort people with ' + f.abc + '. The upside for those who do build is real: ' +
            f.residual + ', and ' + f.amplifier + '.',
          'Travel is one of the last large purchases where the consumer still has no idea what the ' +
            'middleman took. That is the whole opportunity.'
        ),
        extras: [
          { label: 'Read time', value: 'Approx. 6 minutes' },
          { label: 'Tags', value: 'wholesale travel, travel club, luxury travel, points, membership' }
        ]
      };
    },

    etsy: function (f) {
      return {
        title: 'Wholesale Travel Membership Guide | 4- & 5-Star Properties at up to 70% Off Retail | Digital Download',
        body: lines(
          'A practical guide for travellers who book 4- and 5-star properties and are tired of the ' +
            'retail markup.',
          'WHAT YOU GET',
          '• How wholesale pricing works and where the retail premium actually sits',
          '• A comparison worksheet: retail quote vs member quote on the same property',
          '• The ' + f.equity + ' maths, worked through with real numbers',
          '• A packing and booking checklist for Premium Escapes',
          '• Two sample itineraries built on member pricing',
          'WHY IT EXISTS',
          f.name + ' gives members wholesale access across ' + f.properties + ' at ' + f.savings +
            '. Every dollar spent converts 1-for-1 into travel equity, so the guide teaches you to ' +
            'buy down the out-of-pocket cost of your own trips.',
          'DETAILS',
          'Instant digital download · PDF · 42 pages · print-friendly · updated for 2026',
          'Tiers are ' + f.regional + ' (African Launch Regional) or ' + f.global + ' (Global).'
        ),
        extras: [
          { label: 'Tags', value: 'travel guide, travel planner, wholesale travel, luxury travel, digital download, itinerary template' },
          { label: 'Price point', value: '$12–$18' },
          { label: 'License', value: 'Personal use, no resale' }
        ]
      };
    },

    reddit: function (f) {
      return {
        title: 'How do you actually get 4- and 5-star properties without paying the retail markup?',
        body: lines(
          'Genuine question for this sub, and I will keep it useful rather than promotional.',
          'Short version: the premium is baked into retail distribution. The same room can be sold ' +
            'through a chain, an OTA, or a consortium — and the consumer pays the difference without ' +
            'seeing it. If you are booking 4- and 5-star properties regularly, that gap is often ' +
            'larger than the cost of your flights.',
          'What is working for me and a few people I know:',
          '• Book direct with the property wherever the direct rate is genuinely lower',
          '• Look for membership or club rates that expose wholesale pricing — ' + f.savings +
            ' is the ballpark, and the properties are the same 4- and 5-star places on the sites ' +
            'you already use',
          '• Treat any points scheme as savings, not loyalty: if it is ' + f.equity +
            ', the maths is simple and you can verify it yourself',
          '• Always price the same stay three ways — retail site, direct, member rate — before you ' +
            'commit. The gap is usually obvious once you look.',
          'The boring part nobody posts about: you still have to be the kind of traveller who books ' +
            'ahead and plans the year. The pricing advantage rewards that, but it does not replace it.',
          'Happy to answer specifics on any of the above.'
        ),
        extras: [
          { label: 'Subreddit', value: 'r/travel, r/solotravel, r/Points' },
          { label: 'Rule', value: 'Disclose affiliation if you are ever asked' },
          { label: 'Tone', value: 'Informative, no hard sell' }
        ]
      };
    },

    facebook: function (f) {
      return {
        title: 'Page post',
        body: lines(
          'Question we get every week: how much of your trip price is actually the room?',
          'For 4- and 5-star properties, the answer is usually "more than you think". Retail travel ' +
            'pricing carries a margin the traveller never sees — and that is exactly what ' +
            f.name + ' removes. Members reach wholesale pricing across ' + f.properties + ' at ' +
            f.savings + '.',
          'There is one more part people like: every dollar you spend becomes travel equity (' +
            f.equity + '). Membership fees behave like a vacation savings account instead of a ' +
            'subscription you forget about.',
          'We are building this in the open — invitation-only, member pricing, and the maths ' +
            'published.',
          'Drop a comment if you want the full breakdown, or send a message and we will walk you ' +
            'through it.'
        ),
        extras: [
          { label: 'CTA', value: 'Comment "PRICING" for the breakdown' },
          { label: 'Tone', value: 'Community-first, low pressure' }
        ]
      };
    },

    instagram: function (f) {
      return {
        title: 'Caption + carousel',
        body: lines(
          'The markup is real. It is just invisible. ✈️',
          'Most travellers booking 4- and 5-star properties never see the premium baked into ' +
            'their quote — it sits between the search and the checkout.',
          f.name + ' cuts that layer out: wholesale pricing across ' + f.properties + ', ' +
            f.savings + '. And every dollar spent becomes travel equity (' + f.equity + '), so the ' +
            'trip funds the next one.',
          'Swipe for the 8 slides that break the whole model down 👉',
          'Save this one for your next booking. Send it to the friend who always says "the points ' +
            'are never worth it" — they are, once the maths is ' + f.equity + '.',
          '#travelgram #luxurytravel #travelclub #wholesaletravel #travelhacks #travelinspo ' +
            '#5starluxury #travelsmart'
        ),
        extras: [
          {
            label: 'Carousel slides',
            value: [
              '1 — Cover: "The markup is real. It is just invisible."',
              '2 — What retail pricing actually includes',
              '3 — Where the premium hides between search and checkout',
              '4 — Wholesale pricing, explained in one line',
              '5 — The scale: 1M+ properties, up to 70% off retail',
              '6 — Travel equity: $1 = 1 Point, and why it is simple',
              '7 — The two membership tiers, side by side',
              '8 — CTA: ask for the full breakdown'
            ].join('\n')
          },
          { label: 'Story script', value: 'Poll: "Do you know how much of your trip price is the room?" → "less than you think" → swipe up for the breakdown' }
        ]
      };
    },

    tiktok: function (f) {
      return {
        title: 'Short-form video script',
        body: lines(
          'HOOK (0–3s, on-screen text): "Your 5-star hotel is 40% overpriced. You just can\'t see it."',
          'SHOT 1 (3–8s) — hotel exterior, golden hour. Voiceover: "Every quote you see for a ' +
            '4- or 5-star property carries a retail markup you never agreed to pay."',
          'SHOT 2 (8–14s) — phone showing a booking price, then a member price beside it. ' +
            'On-screen: "same room, same night." Voiceover: "Same room. Same night. ' +
            f.savings + ' instead."',
          'SHOT 3 (14–20s) — map of destinations flipping. Voiceover: "That\'s ' + f.properties +
            ' worth of properties, priced wholesale."',
          'SHOT 4 (20–27s) — text card: $1 = 1 POINT. Voiceover: "And every dollar becomes travel ' +
            'credit. One for one. Your holiday pays for itself."',
          'SHOT 5 (27–34s) — a member laughing on a balcony, sea behind. Voiceover: "This is the ' +
            'part where people stop reading and start booking."',
          'CLOSER (34–40s) — talking head, direct to camera. Voiceover: "' + f.name +
            '. Invitation only. Link in bio if the markup annoys you as much as it annoys me."',
          'CAPTION: The markup is real, it is just invisible. Same room, same night, ' + f.savings +
            '. Every $1 spent becomes 1 travel point. ✈️ #traveltok #luxurytravel #travelhacks ' +
            '#travelclub #hotels'
        ),
        extras: [
          { label: 'Length', value: '40 seconds' },
          { label: 'Format', value: '9:16, caption burned in' },
          { label: 'Audio', value: 'Trending mid-tempo, ducked under voiceover' }
        ]
      };
    },

    pinterest: function (f) {
      return {
        title: 'Pin titles + description',
        body: lines(
          'PIN TITLES',
          '1. How to Book 5-Star Hotels at Wholesale Prices (Without the Retail Markup)',
          '2. $1 = 1 Travel Point: The Points System That Actually Adds Up',
          '3. 10 Premium Escapes You Can Book With Travel Equity',
          '4. What "Wholesale Pricing" Actually Means for a 4- and 5-Star Stay',
          '5. Weekend Escapes: 7 Destinations Where Members Pay Less',
          'PIN DESCRIPTION',
          'A visual breakdown of how ' + f.name + ' works: wholesale pricing across ' + f.properties +
            ' at ' + f.savings + ', with every dollar spent converting 1-for-1 into travel equity (' +
            f.equity + '). Save these boards before you book your next stay, and compare the same ' +
            'room three ways — retail, direct, and member rate.',
          'BOARD NAME: Wholesale Travel Escapes'
        ),
        extras: [
          { label: 'Board', value: 'Wholesale Travel Escapes' },
          { label: 'Image ratio', value: '2:3, tall' },
          { label: 'Posting rhythm', value: '5–10 pins per day' }
        ]
      };
    },

    google: function (f) {
      return {
        title: 'Search listing',
        body: lines(
          'PAGE TITLE',
          'Travel Marketing Studio | Wholesale Travel Pricing for 4- & 5-Star Properties',
          'META DESCRIPTION (155 chars)',
          'Access wholesale pricing across 1M+ 4- and 5-star properties — up to 70% off retail — with ' +
            'travel equity on every dollar you spend.',
          'INTRO COPY',
          f.name + ' is an invitation-only travel and lifestyle club for people who book 4- and ' +
            '5-star properties and would rather not fund someone else\'s markup. Members access ' +
            'wholesale pricing across ' + f.properties + ' at ' + f.savings + ', and every dollar ' +
            'spent converts 1-for-1 into travel equity (' + f.equity + ').',
          'Membership is ' + f.regional + ' for the African Launch Regional Tier, or ' + f.global +
            ' for the Global Tier, and the economics are published in full: ' + f.get4,
          'FAQs',
          'Is this a timeshare? No. Is it a points scheme? The maths is ' + f.equity +
            ', and the terms are published. How do I join? By invitation.'
        ),
        extras: [
          { label: 'Canonical path', value: '/' },
          { label: 'Schema', value: 'Organization + FAQPage' },
          { label: 'Indexing', value: 'Request indexing after publish' }
        ]
      };
    },

    youtube: function (f) {
      return {
        title: 'Video package',
        body: lines(
          'TITLES',
          '1. How to Book 5-Star Hotels at Wholesale Prices (Most People Overpay by 40%)',
          '2. The Hotel Markup Nobody Explains — We Showed 3 Quotes for the Same Room',
          '3. $1 = 1 Point: Inside an Invitation-Only Travel Club',
          'DESCRIPTION',
          'We booked the same 4- and 5-star room three ways — retail, direct, and member rate — and ' +
            'put the numbers on screen. ' + f.name + ' gives members wholesale pricing across ' +
            f.properties + ' at ' + f.savings + ', and every dollar spent converts 1-for-1 into ' +
            'travel equity (' + f.equity + ').',
          'Chapters: 00:00 the three quotes · 01:12 what a markup actually is · 03:40 travel equity ' +
            'explained · 06:05 the two tiers · 08:20 who it is for',
          'TAGS',
          'wholesale travel, travel club, luxury travel, hotel markup, points system, travel equity, ' +
            '4 star hotel, 5 star resort, how to travel cheaper, travel business',
          'OUTLINE',
          '1. Cold open — three quotes, same room, same night',
          '2. Where the retail premium comes from (distribution, not greed)',
          '3. Member rate walkthrough: ' + f.savings + ' across ' + f.properties,
          '4. Travel equity: ' + f.equity + ' worked through live',
          '5. Membership tiers: ' + f.regional + ' and ' + f.global,
          '6. Who this is for — and who should skip it',
          '7. The A/B/C framework, explained without hype',
          '8. Close + invitation details'
        ),
        extras: [
          { label: 'Length', value: '12–15 minutes' },
          { label: 'Thumbnail', value: 'Three price tags, one struck through' },
          { label: 'Cards', value: '1 affiliate disclosure' }
        ]
      };
    }
  };

  /* ============================================================
     PROFILE 2 — BluePrint
     A technology-leverage business for tech professionals.
     Its LinkedIn piece is the original's own output, kept
     verbatim as the ground truth for the writer's voice.
     ============================================================ */

  var BLUEPRINT_LINKEDIN_TITLE =
    'Most tech professionals spend their entire careers optimizing systems for organizations... ' +
    'but rarely build a system for their own time freedom.';

  var BLUEPRINT_LINKEDIN_BODY = lines(
    '*A few years into my career as a Technology Specialist, I realized a fundamental truth about ' +
      'linear work:*',
    '**Trading hours for dollars has a hard physical ceiling.**',
    '*No matter how skilled you are, there are only 160 working hours in a month. When you stop ' +
      'working, the revenue stops immediately.*',
    "*That’s why I started researching digital leverage—systems that build* **compounding, " +
      'recurring value** *alongside a traditional career.*',
    '*Instead of relying on a single paycheck, modern professionals are beginning to leverage 4 key ' +
      'digital vehicles:*',
    '1. *Digital products & knowledge assets*\n' +
      '2. *Automated e-commerce funnels*\n' +
      '3. *Real estate equity*\n' +
      '4. *Scalable digital memberships & wholesale networks*',
    '*Building recurring income isn\'t about quitting your day job tomorrow—it\'s about creating ' +
      'financial options and time equity.*',
    '*💬* **I put together a simple 1-page comparison breakdown contrasting Linear Salaries against ' +
      'Modern Residual Vehicles.**',
    '*If you’d like a copy, check out the link in my* **Featured Section** *on my profile, or send me ' +
      'a DM with the word* **"BLUEPRINT"** *and I’ll send it right over!*'
  );

  var blueprintSource = {
    name: 'BluePrint — Digital Leverage for Tech Professionals',
    blurb:
      'Technology Specialists trading hours for dollars against a hard 160-hour ceiling, building ' +
      'compounding residual vehicles — digital products, automated funnels, real estate equity and ' +
      'scalable memberships & wholesale networks — alongside a traditional career.',
    status: 'Loaded',
    summary: [
      {
        heading: 'Core Model & Value Proposition',
        body:
          'Most tech professionals spend their entire careers optimizing systems for organizations, ' +
          'but rarely build a system for their own time freedom. BluePrint is a tool-driven ' +
          'framework for Technology Specialists who want compounding, recurring value alongside a ' +
          'traditional career — not a quit-your-job plan.'
      },
      {
        heading: 'The Linear Ceiling',
        body:
          'Trading hours for dollars has a hard physical ceiling. No matter how skilled you are, ' +
          'there are only 160 working hours in a month, and when you stop working, the revenue stops ' +
          'immediately.'
      },
      {
        heading: 'The Four Digital Vehicles',
        body:
          '1. Digital products & knowledge assets\n2. Automated e-commerce funnels\n3. Real estate ' +
          'equity\n4. Scalable digital memberships & wholesale networks'
      },
      {
        heading: 'The Lead Magnet',
        body:
          'A simple 1-page comparison breakdown contrasting Linear Salaries against Modern Residual ' +
          'Vehicles, delivered via the link in the Featured Section or a DM with the keyword ' +
          'BLUEPRINT.'
      },
      {
        heading: 'The Operating System',
        body:
          'A few years into a career as a Technology Specialist, the founder started researching ' +
          'digital leverage — systems that build compounding, recurring value. The offer is ' +
          'educational and tool-driven: build the vehicles first, then let residual income compound.'
      },
      {
        heading: 'The Positioning',
        body:
          'Building recurring income isn\'t about quitting your day job tomorrow — it\'s about ' +
          'creating financial options and time equity.'
      }
    ]
  };

  /* Profile-driven writers. Used by any profile that does not ship a
     bespoke writer set, so the engine works for a new business with
     nothing but a source of truth. */

  function genericWriters(profile) {
    var f = profile.facts;
    var lm = profile.leadMagnet;

    return {
      linkedin: function () {
        return {
          title: f.hook,
          body: lines(
            '*' + f.framing + '*',
            '**' + f.truth + '**',
            '*' + f.ceiling + '*',
            '*' + f.pivot + '*',
            '*' + f.intro + ' ' + f.vehicleCount + ' key digital vehicles:*',
            f.vehicles.map(function (v, i) {
              return i + 1 + '. *' + v + '*';
            }).join('\n'),
            '*' + f.closing + '*',
            '*💬* **I put together ' + lm.name + '**',
            '*If you’d like a copy, check out the link in my* **Featured Section** *on my profile, or ' +
              'send me a DM with the word* **"' + lm.keyword + '"** *and I’ll send it right over!*'
          ),
          extras: [
            { label: 'Tone', value: 'First-person, contrarian, practical' },
            { label: 'Length', value: 'Approx. 170 words' }
          ]
        };
      },

      medium: function () {
        return {
          title: f.articleTitle,
          body: lines(
            f.framing,
            '### ' + f.truth,
            f.ceiling,
            f.pivot,
            '### The ' + f.vehicleCount + ' digital vehicles',
            f.vehicles.map(function (v, i) {
              return '**' + (i + 1) + '. ' + v + '**';
            }).join('\n'),
            '### Why it is built this way',
            f.why,
            '### What you actually get',
            lm.name + ' — ' + lm.description,
            f.closing
          ),
          extras: [
            { label: 'Read time', value: 'Approx. 5 minutes' },
            { label: 'Tags', value: f.tags }
          ]
        };
      },

      etsy: function () {
        return {
          title: lm.listingTitle,
          body: lines(
            'WHAT YOU GET',
            '• ' + lm.name + ' — ' + lm.description,
            '• A one-page comparison of ' + f.comparisonA + ' against ' + f.comparisonB,
            '• A worked breakdown of ' + f.vehicleCount + ' digital vehicles',
            '• A decision worksheet: linear salary against residual options',
            '• A 90-day starter sequence you can run alongside a day job',
            'WHO IT IS FOR',
            f.audience,
            'DETAILS',
            'Instant digital download · PDF · print-friendly · updated for 2026'
          ),
          extras: [
            { label: 'Tags', value: f.tags },
            { label: 'Price point', value: '$9–$19' },
            { label: 'License', value: 'Personal use, no resale' }
          ]
        };
      },

      reddit: function () {
        return {
          title: f.redditTitle,
          body: lines(
            'Genuine question for this sub, and I will keep it useful rather than promotional.',
            f.ceiling,
            'What is working for people I know:',
            '• ' + f.vehicles[0] + ' — ' + f.vehicleDetail[0],
            '• ' + f.vehicles[1] + ' — ' + f.vehicleDetail[1],
            '• ' + f.vehicles[2] + ' — ' + f.vehicleDetail[2],
            '• ' + f.vehicles[3] + ' — ' + f.vehicleDetail[3],
            'The boring part nobody posts about: none of this replaces the day job on day one. The ' +
              'advantage compounds only if you keep building it after the initial rush.',
            'Happy to answer specifics on any of the above.'
          ),
          extras: [
            { label: 'Subreddit', value: f.subreddits },
            { label: 'Rule', value: 'Disclose affiliation if you are ever asked' },
            { label: 'Tone', value: 'Informative, no hard sell' }
          ]
        };
      },

      facebook: function () {
        return {
          title: 'Page post',
          body: lines(
            f.hook,
            f.ceiling,
            f.pivot,
            f.closing,
            'We built ' + lm.name + ' — ' + lm.description,
            'Comment "' + lm.keyword + '" and I will send it over, or check the link in my Featured ' +
              'Section.'
          ),
          extras: [
            { label: 'CTA', value: 'Comment "' + lm.keyword + '" for the copy' },
            { label: 'Tone', value: 'Community-first, low pressure' }
          ]
        };
      },

      instagram: function () {
        return {
          title: 'Caption + carousel',
          body: lines(
            f.hook + ' ✈️',
            f.ceiling,
            f.pivot,
            'Swipe for the ' + f.vehicleCount + ' slides that break the model down 👉',
            'Save this one for the week you decide to build something that pays you back. ' +
              'Send it to the friend who says residual income is a scam — ' + f.closing.toLowerCase(),
            f.tags.replace(/, /g, ' ')
          ),
          extras: [
            {
              label: 'Carousel slides',
              value: [
                '1 — Cover: "' + f.hook + '"',
                '2 — The linear ceiling, in one number',
                '3 — What compounding actually means',
                '4 — Vehicle 1: ' + f.vehicles[0],
                '5 — Vehicle 2: ' + f.vehicles[1],
                '6 — Vehicle 3: ' + f.vehicles[2],
                '7 — Vehicle 4: ' + f.vehicles[3],
                '8 — CTA: ask for the ' + lm.keyword + ' breakdown'
              ].join('\n')
            },
            { label: 'Story script', value: 'Poll: "Is your income tied to your hours?" → "yes" → swipe up for the breakdown' }
          ]
        };
      },

      tiktok: function () {
        return {
          title: 'Short-form video script',
          body: lines(
            'HOOK (0–3s, on-screen text): "' + f.tiktokHook + '"',
            'SHOT 1 (3–8s) — a clock on a wall, time-lapsing. Voiceover: "' + f.ceiling + '"',
            'SHOT 2 (8–14s) — a laptop dashboard, graphs flattening. On-screen: "linear". ' +
              'Voiceover: "Work stops, revenue stops."',
            'SHOT 3 (14–22s) — four quick cuts, one per vehicle. Voiceover: "' + f.vehicleIntro + '"',
            'SHOT 4 (22–30s) — a board with numbers climbing. Voiceover: "That is the part that ' +
              'compounds."',
            'SHOT 5 (30–38s) — talking head. Voiceover: "' + f.closing + '"',
            'CLOSER (38–45s) — direct to camera. Voiceover: "' + lm.name + ' — link in bio, or ' +
              'DM me ' + lm.keyword + '."',
            'CAPTION: ' + f.hook + ' ' + f.tags.replace(/, /g, ' ')
          ),
          extras: [
            { label: 'Length', value: '45 seconds' },
            { label: 'Format', value: '9:16, caption burned in' },
            { label: 'Audio', value: 'Trending mid-tempo, ducked under voiceover' }
          ]
        };
      },

      pinterest: function () {
        return {
          title: 'Pin titles + description',
          body: lines(
            'PIN TITLES',
            '1. ' + f.pinTitle,
            '2. The ' + f.vehicleCount + ' Residual Vehicles Every Tech Professional Should Know',
            '3. ' + f.hook,
            '4. Linear Salary vs Residual Income: A One-Page Comparison',
            '5. How to Build Time Equity Alongside a Full-Time Role',
            'PIN DESCRIPTION',
            f.pivot + ' ' + lm.name + ' — ' + lm.description + ' Save this board before you build ' +
              'your first vehicle, and compare ' + f.comparisonA + ' against ' + f.comparisonB + '.',
            'BOARD NAME: ' + f.board
          ),
          extras: [
            { label: 'Board', value: f.board },
            { label: 'Image ratio', value: '2:3, tall' },
            { label: 'Posting rhythm', value: '5–10 pins per day' }
          ]
        };
      },

      google: function () {
        return {
          title: 'Search listing',
          body: lines(
            'PAGE TITLE',
            f.pageTitle,
            'META DESCRIPTION (155 chars)',
            f.metaDescription,
            'INTRO COPY',
            f.audience + ' ' + f.pivot,
            'FAQs',
            'Do I have to quit my job? No — the model is built to run alongside a traditional career. ' +
              'What are the ' + f.vehicleCount + ' vehicles? ' + f.vehicles.join(', ') + '. ' +
              'What does it cost? ' + lm.price + '. How do I get the breakdown? Via the Featured ' +
              'Section link or a DM with the keyword ' + lm.keyword + '.'
          ),
          extras: [
            { label: 'Canonical path', value: '/' },
            { label: 'Schema', value: 'Organization + FAQPage' },
            { label: 'Indexing', value: 'Request indexing after publish' }
          ]
        };
      },

      youtube: function () {
        return {
          title: 'Video package',
          body: lines(
            'TITLES',
            '1. ' + f.youtubeTitle,
            '2. The ' + f.vehicleCount + ' Residual Vehicles (And How to Start One This Month)',
            '3. ' + f.hook,
            'DESCRIPTION',
            f.pivot + ' In this video I break down ' + f.comparisonA + ' against ' + f.comparisonB +
              ', then walk through all ' + f.vehicleCount + ' digital vehicles with the real numbers.',
            'Chapters: 00:00 the ceiling · 01:10 what compounding means · 03:25 vehicle 1 · 05:40 ' +
              'vehicle 2 · 08:05 vehicle 3 · 10:20 vehicle 4 · 12:30 the blueprint',
            'TAGS',
            f.tags,
            'OUTLINE',
            '1. Cold open — the 160-hour ceiling',
            '2. What ' + f.truth.toLowerCase() + ' means in practice',
            f.vehicles.map(function (v, i) {
              return (i + 3) + '. ' + v + ' — ' + f.vehicleDetail[i];
            }).join('\n'),
            '9. Close + the ' + lm.keyword + ' breakdown'
          ),
          extras: [
            { label: 'Length', value: '14–16 minutes' },
            { label: 'Thumbnail', value: 'A clock next to a rising residual chart' },
            { label: 'Cards', value: '1 affiliate disclosure' }
          ]
        };
      }
    };
  }

  var blueprintFacts = {
    hook: BLUEPRINT_LINKEDIN_TITLE,
    articleTitle: 'The 160-Hour Ceiling: How Tech Professionals Build Residual Income Alongside a Career',
    framing:
      'A few years into my career as a Technology Specialist, I realized a fundamental truth about ' +
      'linear work:',
    truth: 'Trading hours for dollars has a hard physical ceiling.',
    ceiling:
      'No matter how skilled you are, there are only 160 working hours in a month. When you stop ' +
      'working, the revenue stops immediately.',
    pivot:
      'That’s why I started researching digital leverage—systems that build compounding, recurring ' +
      'value alongside a traditional career.',
    intro: 'Instead of relying on a single paycheck, modern professionals are beginning to leverage',
    vehicleCount: 4,
    vehicles: [
      'Digital products & knowledge assets',
      'Automated e-commerce funnels',
      'Real estate equity',
      'Scalable digital memberships & wholesale networks'
    ],
    vehicleIntro: 'Four vehicles, and every one of them pays when you are not working',
    vehicleDetail: [
      'turn the systems you already understand into assets that sell while you sleep',
      'automate the path from attention to checkout, so growth stops depending on hours',
      'build equity in assets that produce income without a direct trade',
      'memberships and wholesale networks that pay on volume, not on shifts'
    ],
    why:
      'Because the bottleneck for a technical professional is rarely skill — it is the number of ' +
      'hours left to sell. Each vehicle is built so that it keeps producing after the work stops.',
    closing:
      'Building recurring income isn\'t about quitting your day job tomorrow—it\'s about creating ' +
      'financial options and time equity.',
    comparisonA: 'Linear Salaries',
    comparisonB: 'Modern Residual Vehicles',
    audience:
      'Technology Specialists and other knowledge workers who have already proven they can build ' +
      'systems, and want those systems to pay them back.',
    tags:
      'residual income, tech professionals, passive income, digital leverage, side income, ' +
      'time equity, automation',
    subreddits: 'r/sidehustle, r/Entrepreneur, r/PersonalFinance, r/cscareerquestions',
    redditTitle:
      'Is anyone here actually building residual income alongside a full-time tech role?',
    board: 'Residual Income Blueprints',
    pinTitle: 'The 160-Hour Ceiling and How to Beat It',
    pageTitle: 'BluePrint | Residual Income Vehicles for Tech Professionals',
    metaDescription:
      'A one-page comparison of Linear Salaries against Modern Residual Vehicles, and the four ' +
      'digital vehicles that build time equity alongside your career.',
    tiktokHook: 'Your income stops when you stop. That is the whole problem.',
    youtubeTitle: 'I Built the 4 Residual Vehicles Every Tech Professional Should Know'
  };

  var blueprintLeadMagnet = {
    name: 'a simple 1-page comparison breakdown contrasting Linear Salaries against Modern Residual Vehicles',
    description: 'one page, no fluff — the ceiling, the four vehicles, and what to build first',
    keyword: 'BLUEPRINT',
    listingTitle:
      'Residual Income BluePrint | 1-Page Linear Salary vs Residual Vehicles Comparison | Digital Download',
    price: 'Free via Featured Section or DM',
    board: 'Residual Income Blueprints'
  };

  /* ============================================================
     Profiles
     ============================================================ */

  var PROFILES = {
    travel: {
      id: 'travel',
      label: 'Travel Club',
      source: travelSource,
      facts: travelFacts,
      writers: travelWriters,
      hero: {
        lines: ['Ten channels.', 'One travel brand.'],
        lede:
          'One content engine for your travel business — authority writing, short-form reach, ' +
          'marketplace listings and search copy, each shaped for the audience that platform ' +
          'actually rewards.'
      },
      canonical: null
    },
    blueprint: {
      id: 'blueprint',
      label: 'BluePrint',
      source: blueprintSource,
      facts: blueprintFacts,
      leadMagnet: blueprintLeadMagnet,
      hero: {
        lines: ['Ten channels.', 'One blueprint.'],
        lede:
          'One content engine for your digital-leverage business — authority writing, short-form ' +
          'reach, marketplace listings and search copy, each shaped for the audience that ' +
          'platform actually rewards.'
      },
      writers: null, // resolved lazily — generic writers are built per profile
      canonical: {
        linkedin: {
          title: BLUEPRINT_LINKEDIN_TITLE,
          body: BLUEPRINT_LINKEDIN_BODY
        }
      }
    }
  };

  function writersFor(profile) {
    if (profile.writers) return profile.writers;
    if (!profile._generic) profile._generic = genericWriters(profile);
    return profile._generic;
  }

  /* ============================================================
     Public API
     ============================================================ */

  global.StudioModel = {
    CHANNELS: CHANNELS,
    PROFILES: PROFILES,
    DEFAULT_PROFILE: 'travel',

    getProfile: function (id) {
      return PROFILES[id] || PROFILES[global.StudioModel.DEFAULT_PROFILE];
    },

    getChannel: getChannel,

    generate: function (channelId, profile) {
      var p = profile || PROFILES[global.StudioModel.DEFAULT_PROFILE];
      var ch = getChannel(channelId);

      var piece;

      if (p.canonical && p.canonical[channelId]) {
        // The original's own output, kept verbatim.
        piece = {
          title: p.canonical[channelId].title,
          body: p.canonical[channelId].body,
          extras: [{ label: 'Source', value: 'Original output, preserved verbatim' }]
        };
      } else {
        var writer = writersFor(p)[channelId] || writersFor(p).linkedin;
        piece = writer(p.facts, p);
      }

      piece.channel = channelId;
      piece.createdAt = new Date().toISOString();
      piece.sourceName = p.source.name;
      piece.profile = p.id;
      piece.channelName = ch ? ch.name : channelId;
      piece.channelIndex = ch ? ch.index : '';
      piece.format = ch ? ch.format : '';

      return piece;
    },

    generateAll: function (profile) {
      var out = [];
      for (var i = 0; i < CHANNELS.length; i++) {
        out.push(this.generate(CHANNELS[i].id, profile));
      }
      return out;
    }
  };
})(window);
