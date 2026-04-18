import { Scenario } from '../types'

export const scenarios: Scenario[] = [
  {
    id: 'coffee-shop-spill',
    venue: 'Coffee Shop',
    setup:
      'You reach for the last oat milk at the same time as a suspiciously attractive stranger. Your hands touch. The universe holds its breath.',
    line: '"Oh — sorry, you take it. I can drink my coffee black and cry about it."',
    options: [
      {
        id: 'cs-safe',
        text: '"Ha, no please — you go ahead."',
        style: 'Safe',
        feedback:
          'You handed them the oat milk and the entire conversation. They smiled politely. You went home and made tea.',
        score: 15,
      },
      {
        id: 'cs-clever',
        text: '"Bold strategy. Black coffee builds character. I\'ll take the oat milk and the moral high ground."',
        style: 'Clever',
        feedback:
          'They laughed — an actual laugh, not a courtesy one. You split the oat milk like civilized adults negotiating a peace treaty.',
        score: 65,
      },
      {
        id: 'cs-bold',
        text: '"We clearly have the same taste. In oat milk. And, I suspect, other things."',
        style: 'Bold',
        feedback:
          'They raised an eyebrow. Then gave you their number along with the oat milk. Risk-reward ratio: excellent.',
        score: 82,
      },
      {
        id: 'cs-unhinged',
        text: '"This is already our first fight and I\'m not even a little sorry."',
        style: 'Unhinged',
        feedback:
          'They stared for three full seconds. Then: "You are either insane or perfect." Reader — they were right on both counts.',
        score: 91,
      },
    ],
  },

  {
    id: 'elevator-stuck',
    venue: 'Elevator',
    setup:
      "The elevator doors close. It's just you and someone who smells genuinely amazing — not aggressively, just correctly. Twelve floors of potential.",
    line: '"What floor?"',
    options: [
      {
        id: 'el-safe',
        text: '"Seven, thanks."',
        style: 'Safe',
        feedback: 'The elevator did its job. So did you. Peak efficiency. Zero sparks.',
        score: 5,
      },
      {
        id: 'el-clever',
        text: '"Whichever one you\'re getting off at. I suddenly have no plans."',
        style: 'Clever',
        feedback: 'They pressed their floor. Then they pressed yours. The universe winked.',
        score: 78,
      },
      {
        id: 'el-bold',
        text: '"Honestly? Whatever floor has the best view of you in better lighting."',
        style: 'Bold',
        feedback: 'Extremely forward. Somehow completely worked. They suggested the roof.',
        score: 85,
      },
      {
        id: 'el-unhinged',
        text: '"I was going to say seven but now I kind of want to see how long this elevator can hold us both."',
        style: 'Unhinged',
        feedback:
          'There was a pause. Then they pressed the emergency stop button — as a joke. Probably.',
        score: 93,
      },
    ],
  },

  {
    id: 'bar-drink-order',
    venue: 'Bar',
    setup:
      "You're both waiting for the bartender. They order something absurdly specific — triple-filtered, room temp, botanically sourced. You've never felt more basic.",
    line: '"You can laugh. I know it\'s a ridiculous drink order."',
    options: [
      {
        id: 'bar-safe',
        text: '"No, no — I\'m sure it\'s great."',
        style: 'Safe',
        feedback: 'You lied smoothly. They knew. You both pretended. Respect, technically.',
        score: 12,
      },
      {
        id: 'bar-clever',
        text: '"I\'m not laughing. I\'m taking notes. Clearly you have opinions and I respect the commitment."',
        style: 'Clever',
        feedback:
          'They beamed. You spent the next hour debating the ethics of artisanal ice. Strangely romantic.',
        score: 72,
      },
      {
        id: 'bar-bold',
        text: '"Ridiculous is my favorite quality in a drink order. And in a person, if we\'re being honest."',
        style: 'Bold',
        feedback:
          'Direct shot. Landed clean. They bought you a round of whatever they were having. You liked it.',
        score: 88,
      },
      {
        id: 'bar-unhinged',
        text: '"I was about to order a domestic lager and now I\'m reconsidering my entire identity. You\'ve ruined me in six seconds."',
        style: 'Unhinged',
        feedback:
          'They absolutely lost it. The bartender witnessed the whole thing and quietly cheered. You are now a story they tell at parties.',
        score: 96,
      },
    ],
  },

  {
    id: 'party-rooftop',
    venue: 'Rooftop Party',
    setup:
      "Loud music. Fairy lights. Somebody walks up next to you at the railing. You're both staring at the city below, pretending you're not acutely aware of each other.",
    line: '"Do you know anyone here or are you also just vibing near strangers?"',
    options: [
      {
        id: 'rt-safe',
        text: '"A few people. You?"',
        style: 'Safe',
        feedback:
          'A perfectly reasonable answer. The vibes remained ambient and unaccelerated. Later you learned they had been trying to flirt.',
        score: 10,
      },
      {
        id: 'rt-clever',
        text: '"I knew one person, but I\'ve been standing here long enough that I think I qualify as \'vibing near strangers\' now. So. Hi."',
        style: 'Clever',
        feedback:
          'Honest and calibrated. They laughed and leaned on the railing toward you, which in rooftop body language means yes.',
        score: 74,
      },
      {
        id: 'rt-bold',
        text: '"I didn\'t until thirty seconds ago. Now I\'m specifically vibing near you."',
        style: 'Bold',
        feedback:
          "Zero ambiguity. Maximum confidence. They absolutely clocked that it was a line and didn't care. They're into it.",
        score: 87,
      },
      {
        id: 'rt-unhinged',
        text: '"I came alone, I\'ve been out here for twenty minutes, and you\'re the first person I\'ve wanted to talk to all night — which either means I should go home or stay forever. I\'m genuinely unsure."',
        style: 'Unhinged',
        feedback:
          'They stared at the city for a second. Then: "Stay forever is objectively the better option." You stayed until 3am.',
        score: 97,
      },
    ],
  },

  {
    id: 'bookstore-final-boss',
    venue: 'Bookstore',
    setup:
      "You reach for the same book at the same time. It's a poetry collection. The irony is not lost on either of you. The universe has fully stopped pretending to be subtle.",
    line: '"You have good taste. In books, at least. I\'ll withhold judgment on the rest."',
    options: [
      {
        id: 'bk-safe',
        text: '"Ha, thank you. It\'s a good one."',
        style: 'Safe',
        feedback:
          'A polite acknowledgment. You both bought your own copies and went home to read alone. The poetry wept.',
        score: 8,
      },
      {
        id: 'bk-clever',
        text: '"I\'ll accept partial credit. The rest of my taste is either inspired or deeply suspicious — depends on the day."',
        style: 'Clever',
        feedback: 'They tilted their head. Then: "What kind of day is today?" Reader, it was a very good day.',
        score: 79,
      },
      {
        id: 'bk-bold',
        text: '"Tell you what — buy the book, give me your number, and report back in a week. By then you\'ll have enough data to issue a full verdict."',
        style: 'Bold',
        feedback:
          "Audacious. Structured. Delivered with the confidence of someone who's never been told no by a bookshelf. They bought the book. Then they texted you from three feet away.",
        score: 90,
      },
      {
        id: 'bk-unhinged',
        text: '"I\'m going to need you to withhold that judgment for at least one coffee, possibly a walk, and a brief argument about whether prose poetry counts as real poetry. Are you available Thursday?"',
        style: 'Unhinged',
        feedback:
          '"Wednesday actually." You handed them the book. They handed you their heart. Metaphorically. For now.',
        score: 99,
      },
    ],
  },
]
