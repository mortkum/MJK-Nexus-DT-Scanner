/* ============================================================
   Travel Marketing Studio — content model
   ------------------------------------------------------------
   Reverse-engineered from the published Base44 app
   (appId 6ad1b02d62830e19ceea7037, bundle index-Bn8LqwiW.js).
   Copy, channels and structure mirror the original exactly;
   the writer is a local, deterministic generator standing in
   for the original's hosted LLM call.
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------------- Source of truth ---------------- */

  var SOURCE = {
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

  /* ---------------- Channels ---------------- */

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
      id: 'reddit',
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

  /* ---------------- Shared facts ---------------- */

  function facts(src) {
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

  function lines() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) out.push(arguments[i]);
    return out.join('\n\n');
  }

  /* ---------------- Per-channel writers ---------------- */

  var WRITERS = {
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

  /* ---------------- Public API ---------------- */

  global.StudioModel = {
    SOURCE: SOURCE,
    CHANNELS: CHANNELS,
    getChannel: function (id) {
      for (var i = 0; i < CHANNELS.length; i++) {
        if (CHANNELS[i].id === id) return CHANNELS[i];
      }
      return null;
    },
    generate: function (channelId, source) {
      var writer = WRITERS[channelId] || WRITERS.linkedin;
      var src = source || SOURCE;
      var piece = writer(facts(src));

      piece.channel = channelId;
      piece.createdAt = new Date().toISOString();
      piece.sourceName = src.name;

      var ch = this.getChannel(channelId);
      piece.channelName = ch ? ch.name : channelId;
      piece.channelIndex = ch ? ch.index : '';
      piece.format = ch ? ch.format : '';

      return piece;
    },
    generateAll: function (source) {
      var out = [];
      for (var i = 0; i < CHANNELS.length; i++) {
        out.push(this.generate(CHANNELS[i].id, source));
      }
      return out;
    }
  };
})(window);
