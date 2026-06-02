#!/usr/bin/env python3
"""
N U M E R A
────────────────────────────────────────────────────────────────────
The Living Oracle of Number.
Every digit holds the sediment of all human meaning.
Cross-cultural. Cross-century. Cross-everything.
Type a number, a name, a date. The Oracle responds.
────────────────────────────────────────────────────────────────────
Run:  python3 numera.py   (Python 3.8+  ·  terminal 80×24 min)
────────────────────────────────────────────────────────────────────
"""

import curses, time, random, textwrap, re
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from collections import deque

# ═══════════════════════════════════════════════════════════════════
#  PYTHAGOREAN TABLE  &  REDUCTION ENGINE
# ═══════════════════════════════════════════════════════════════════

PYTH: Dict[str,int] = {
    'a':1,'b':2,'c':3,'d':4,'e':5,'f':6,'g':7,'h':8,'i':9,
    'j':1,'k':2,'l':3,'m':4,'n':5,'o':6,'p':7,'q':8,'r':9,
    's':1,'t':2,'u':3,'v':4,'w':5,'x':6,'y':7,'z':8
}
VOWELS  = set('aeiou')
MASTER  = {11, 22, 33}
MONTH_NAMES = {1:"January",2:"February",3:"March",4:"April",5:"May",6:"June",
               7:"July",8:"August",9:"September",10:"October",11:"November",12:"December"}

def reduce(n:int)->int:
    while n>9 and n not in MASTER:
        n=sum(int(d) for d in str(n))
    return n

def digit_sum(n:int)->int:
    return sum(int(d) for d in str(abs(n)))

def _life_path(month:int,day:int,year:int)->int:
    return reduce(digit_sum(month)+digit_sum(day)+digit_sum(year))

def expression_num(name:str)->int:
    t=sum(PYTH.get(c.lower(),0) for c in name if c.isalpha())
    return reduce(t) if t else 0

def soul_urge(name:str)->int:
    t=sum(PYTH.get(c.lower(),0) for c in name if c.lower() in VOWELS)
    return reduce(t) if t else 0

def personality_num(name:str)->int:
    t=sum(PYTH.get(c.lower(),0) for c in name
          if c.isalpha() and c.lower() not in VOWELS)
    return reduce(t) if t else 0

def birthday_num(day:int)->int: return reduce(day)

def num_label(n:int)->str:
    return {0:"Zero",1:"One",2:"Two",3:"Three",4:"Four",5:"Five",
            6:"Six",7:"Seven",8:"Eight",9:"Nine",11:"Eleven",
            22:"Twenty-Two",33:"Thirty-Three"}.get(n,str(n))

# ═══════════════════════════════════════════════════════════════════
#  NUMBER CORPUS  — 0 through 9, plus 11 / 22 / 33
# ═══════════════════════════════════════════════════════════════════

@dataclass
class NumberEntry:
    n:int; name:str; essence:str; shadow:str
    cultures:Dict[str,str]; tarot:str; element:str; planet:str
    voices:List[str]; keywords:List[str]

NUM:Dict[int,NumberEntry]={}

NUM[0]=NumberEntry(
    n=0,name="ZERO",
    essence="The void that precedes the first. Not absence — potential. The silence before the word.",
    shadow="Dissolution without rebirth. The void that swallows rather than births.",
    cultures={
        "hindu":
            "Śūnya — Sanskrit for 'void.' The Bakhshali manuscript (224-383 CE) holds the oldest "
            "known written zero. In Hindu thought zero is Brahman: the undifferentiated ground of "
            "all being, symbolized by Om — the sound of creation, and the silence before it.",
        "buddhist":
            "Śūnyatā — emptiness as ultimate reality. Not nothingness, but a fullness so total "
            "it holds no fixed form. Nāgārjuna built an entire philosophy on it in the 2nd century CE: "
            "all things are empty of inherent existence, therefore all things can arise.",
        "pythagorean":
            "The Pythagoreans had no zero and resisted its idea. If everything is number, how can "
            "nothing be a number? Its absence in their system is itself a philosophical statement: "
            "they began at one because one is the first real thing.",
        "babylonian":
            "The Babylonians had a placeholder — a slanted pair of wedges where we would put zero. "
            "Not a number yet. Just a held space. The idea that a held space could be a thing "
            "would take another thousand years to fully arrive.",
        "mayan":
            "The Maya independently invented zero around the 4th century CE, symbolized by a shell "
            "glyph. They needed it for their Long Count calendar — a system designed to measure "
            "time across thousands of years. The shell: the spiral, the coiled nothing.",
        "taoist":
            "Tao Te Ching, Chapter 11: 'Thirty spokes share the wheel's hub; it is the center hole "
            "that makes it useful.' Zero is the hole in the wheel. The nothing that makes the "
            "something work. Wu — non-being — is the mother of being.",
    },
    tarot="The Fool (0) — pure potential, the leap before the journey, no history yet",
    element="void / aether",planet="none / all",
    voices=[
        "Brahmagupta, 628 CE: 'A debt minus zero is a debt. A fortune minus zero is a fortune.'",
        "Lao Tzu: 'The Tao that can be told is not the eternal Tao.'",
        "Pascal: 'The eternal silence of these infinite spaces frightens me.'",
    ],
    keywords=["zero","0","void","nothing","empty","null","silence","origin","abyss","shunyata"]
)

NUM[1]=NumberEntry(
    n=1,name="ONE",
    essence="The Monad. The indivisible first cause. Before duality, before relationship — the point that has position but no dimension.",
    shadow="Isolation mistaken for unity. The ego that calls itself God.",
    cultures={
        "pythagorean":
            "The Pythagoreans called 1 the Monad — not even a number, but the source of numbers. "
            "'The noble number, Sire of Gods and men.' The point. It has position but no magnitude. "
            "All numbers arise from it the way all lines arise from a point. Nicomachus called it "
            "'the spring of ever-flowing nature.'",
        "hebrew":
            "Aleph (א) — the first letter, silent, value 1. A breath before sound. The Shema: "
            "'The Lord our God, the Lord is One.' Echad — oneness as the fundamental divine attribute. "
            "The Zohar: the Aleph contains all other letters within its form.",
        "chinese":
            "Yi (一) — a single horizontal stroke, the simplest possible inscription. In the I Ching "
            "it is the undivided yang line: ——. The movement of the Tao begins here. One is the "
            "origin; the ten thousand things arise from one.",
        "hindu":
            "Eka — Sanskrit for one. In Vedanta, Brahman is ekam eva advitiyam: 'one without a second.' "
            "The Rigveda: 'ekam sat viprā bahudhā vadanti' — Truth is one; the wise call it by many names.",
        "norse":
            "Odin is the Allfather — the one who wandered, who sacrificed an eye for wisdom, who hung "
            "on the World Tree for nine days to receive the runes. One is the axis around which the "
            "nine worlds turn.",
        "islamic":
            "Tawhid — the absolute oneness of Allah, the central pillar of Islam. 'There is no god "
            "but God.' La ilaha ill Allah. In Abjad notation the number 1 is Alif: ا, the first and "
            "most fundamental.",
    },
    tarot="The Magician — will, focus, the channeling of force, all tools available",
    element="fire / yang",planet="Sun",
    voices=[
        "Nichomachus of Gerasa: 'The monad is the source and root of all numbers, generating them by its movement through itself.'",
        "Plotinus: 'The One is perfect because it seeks nothing, has nothing, needs nothing.'",
        "Shankara: 'Brahman alone is real. The world is appearance. The self is Brahman.'",
    ],
    keywords=["one","1","monad","first","unity","source","god","aleph","beginning","origin","yang","sun"]
)

NUM[2]=NumberEntry(
    n=2,name="TWO",
    essence="The first break from unity. The moment when the One looks at itself and sees another.",
    shadow="Division that forgets it was once whole. War between things that were always one.",
    cultures={
        "pythagorean":
            "The Pythagoreans called 2 the Dyad — the first deviation from the One, hence slightly "
            "suspect. They associated it with the female, matter, opinion, and the indefinite. "
            "'Two is the daring rift in unity.' It was the number of the Other.",
        "hebrew":
            "Bet (ב) — the second letter, value 2, meaning 'house.' The Torah begins with Bet: "
            "Bereshit — 'In the beginning.' The Zohar notes that 2 is the first number in which God "
            "is not mentioned in Genesis, because two introduces separation.",
        "chinese":
            "Er (二) — two horizontal strokes. Yin-Yang: the primal complementary forces. The Tao "
            "produces One, One produces Two, Two produces Three, Three produces the ten thousand "
            "things. Two is not conflict — it is the engine of all creation.",
        "tarot":
            "The High Priestess. Mystery. The veil. What is not yet spoken. She sits between the "
            "pillars Boaz and Jachin — between severity and mercy. Two is the threshold between "
            "the known and the unrevealed.",
        "hindu":
            "Dvaita — the philosophy of duality, of Purusha (consciousness) and Prakriti (matter). "
            "Two is the number that makes relationship possible. Without two, nothing can know "
            "itself.",
        "islamic":
            "'We created everything in pairs.' (Quran 51:49) Two as the structure of creation. "
            "Day and night, male and female, the seen and the unseen.",
    },
    tarot="The High Priestess — mystery, the hidden, the threshold between worlds",
    element="water",planet="Moon",
    voices=[
        "Heraclitus: 'Opposition brings concord. Out of discord comes the fairest harmony.'",
        "Lao Tzu: 'Being and non-being produce each other. Difficult and easy complement each other.'",
        "Niels Bohr: 'The opposite of a correct statement is a false statement. But the opposite of a profound truth may well be another profound truth.'",
    ],
    keywords=["two","2","duality","pair","balance","yin yang","partnership","mirror","opposite","dyad","high priestess"]
)

NUM[3]=NumberEntry(
    n=3,name="THREE",
    essence="The first number born from synthesis — the child of one and two, the form that holds two opposites in a single embrace.",
    shadow="Scattered brilliance. The communicator who has something to say about everything and commits to nothing.",
    cultures={
        "pythagorean":
            "The Pythagoreans called 3 the Triad — the first truly odd number, associated with "
            "harmony and completion. 'Three is the first number to have a beginning, middle, and end.' "
            "Remarkably: 3 is the only number equal to the sum of all terms below it (1+2=3), and "
            "the Pythagoreans held this made it the number of perfect expression.",
        "hindu":
            "The Trimurti: Brahma (creator), Vishnu (sustainer), Shiva (destroyer) — the cosmic engine "
            "of reality. AUM is three sounds: A (creation), U (sustaining), M (dissolution). "
            "The three Gunas: Tamas (inertia), Rajas (activity), Sattva (clarity).",
        "celtic":
            "The triskelion — three spirals in endless motion, the symbol of Celtic identity. Triple "
            "goddesses: Brigid, Morrigan, Danu. The druids organized all wisdom into triads for "
            "memorization: three things that endure, three things that are never satisfied, three "
            "candles that illuminate every darkness.",
        "norse":
            "Three Norns at the World Tree: Urðr (what was), Verðandi (what is), Skuld (what shall be). "
            "Odin, Vili, and Vé created the world from the body of Ymir. Three is the rhythm of Norse "
            "fate — past, present, and the inexorable future.",
        "chinese":
            "San (三) — sounds like 'alive' (生). Three is auspicious. In Taoism: the Tao begets one, "
            "one begets two, two begets three, three begets the ten thousand things. Three is the "
            "generative explosion — the moment the universe decides to proliferate.",
        "christian":
            "The Holy Trinity: Father, Son, Holy Spirit. Jesus rose on the third day. Three denials "
            "of Peter. Three wise men. The number three appears in the New Testament over 467 times — "
            "it is the rhythm of the Christian narrative.",
    },
    tarot="The Empress — creativity, abundance, expression, the earth in full flower",
    element="fire / air",planet="Jupiter / Venus",
    voices=[
        "Hegel: 'The dialectic — thesis, antithesis, synthesis. Three is the engine of history.'",
        "Pythagoras: 'The world was built upon the power of numbers — and three is its architecture.'",
        "Celtic triad: 'Three things that cannot be hidden long: the sun, the moon, and the truth.'",
        "Rumi: 'Out beyond ideas of wrongdoing and rightdoing, there is a field. I'll meet you there.'",
    ],
    keywords=["three","3","trinity","triad","triangle","creative","expression","synthesis","communication","jupiter","empress"]
)

NUM[4]=NumberEntry(
    n=4,name="FOUR",
    essence="The first number of the earth. Foundation, structure, the table that holds everything else.",
    shadow="Rigidity that calcifies into limitation. The builder who builds walls instead of homes.",
    cultures={
        "pythagorean":
            "The Pythagoreans held 4 as the Tetrad and considered it sacred. The sum 1+2+3+4=10, "
            "the perfect Tetractys. 'The Tetractys is the spring of ever-flowing Nature.' Four is "
            "completion on the human scale — four parts of the soul, four parts of knowledge.",
        "chinese":
            "Si (四) is the most feared number in Chinese culture: it sounds identical to 'death' "
            "(死, sǐ). Tetraphobia is so powerful that Chinese, Japanese, and Korean buildings "
            "routinely skip the fourth floor. And yet: the Oracle notes that the death-number and "
            "the foundation-number are the same. All foundations require something to end.",
        "hindu":
            "Chatur — four Vedas, four varnas, four āśramas (life stages), four puruṣārthas "
            "(aims: dharma, artha, kāma, mokṣa). Brahma has four faces looking in all four "
            "directions. To face all directions simultaneously is the divine capacity of four.",
        "native_american":
            "The four directions — North, South, East, West — are the Medicine Wheel's foundation, "
            "used across Plains tribes as a model for the cosmos and the self. Each direction carries "
            "color, season, element, and teaching. Four is the map you were born inside.",
        "norse":
            "Four dwarfs hold up the sky: Austri, Vestri, Norðri, Suðri — East, West, North, South. "
            "Without the four bearers, the sky falls. The world is structurally dependent on four.",
        "biblical":
            "Four rivers flowed from Eden. Four corners of the earth. Four horsemen. The "
            "Tetragrammaton — YHWH — has four letters and is the most sacred word in Hebrew, "
            "unspoken, unspellable.",
    },
    tarot="The Emperor — foundation, authority, structure, the world as built",
    element="earth",planet="Uranus / Saturn",
    voices=[
        "Pythagoras: 'In the Tetractys is the spring of ever-flowing Nature.'",
        "Jung: 'Four is the number of wholeness — the four functions, the four elements of the psyche.'",
        "Navajo saying: 'Walk in beauty: earth beneath, sky above, four sacred mountains around you.'",
    ],
    keywords=["four","4","foundation","structure","earth","stability","builder","corners","tetrad","directions","death","emperor"]
)

NUM[5]=NumberEntry(
    n=5,name="FIVE",
    essence="The human number. Five points of the body, five senses — the number that maps the cosmos onto flesh.",
    shadow="Restlessness without direction. Constant change that never accumulates into wisdom.",
    cultures={
        "pythagorean":
            "The Pythagoreans called 5 the Pentad and the hieros gamos — the sacred marriage of "
            "heaven (3) and earth (2). It symbolized health and life. The pentagram was their secret "
            "symbol, used to recognize one another. A human with outstretched arms and legs inscribed "
            "in a circle approximates the five points of the pentagram.",
        "islamic":
            "Five Pillars of Islam: Shahada, Salah (five daily prayers), Zakat, Sawm, Hajj. "
            "The Hamsa — the Hand of Fatima with five fingers — wards the evil eye. Five is the "
            "living spine of Islamic practice, the number of obligation embodied in flesh.",
        "hindu":
            "Pancha — five. The Pandava brothers are five. The five Pranas (life forces). Five "
            "elements: earth, water, fire, air, and Akasha (ether/space). The Panchabhuta govern "
            "the physical world. Five is where matter meets spirit.",
        "chinese":
            "Wǔ (五). Five Chinese elements: Wood, Fire, Earth, Metal, Water — a dynamic cycle, "
            "not a static list. Five Confucian Classics. Five flavors in Chinese medicine. "
            "Five is the number of the center — four directions plus the axis that holds them.",
        "babylonian":
            "Ishtar, goddess of love and war, is the five-pointed star. Venus traces a perfect "
            "pentagram in its eight-year orbital cycle as seen from Earth — a fact the ancient "
            "Babylonians discovered and considered sacred. The most beautiful thing in the sky "
            "draws a five.",
        "mayan":
            "Day sign five in the Tzolkin is Serpent (Chikchan) — vital force, instinctive wisdom, "
            "the life energy coiled in the body. Five is the number of the body fully awake.",
    },
    tarot="The Hierophant — tradition, teaching, the bridge between human and divine",
    element="aether / spirit",planet="Mercury / Venus",
    voices=[
        "Luca Pacioli, 1509: 'Without mathematics there is no art.' — on the golden ratio in the pentagon.",
        "Kepler: 'Geometry has two treasures: the theorem of Pythagoras, and the division in extreme and mean ratio.'",
        "Islamic tradition: 'Five daily prayers because the body has five senses; to consecrate each is to consecrate the whole.'",
    ],
    keywords=["five","5","pentagram","senses","human","body","freedom","change","venus","pentagon","hierophant"]
)

NUM[6]=NumberEntry(
    n=6,name="SIX",
    essence="The first perfect number — whose divisors sum to itself: 1+2+3=6. The cosmos in self-sustaining balance.",
    shadow="Perfectionism that becomes control. Care that becomes possession. The nurturer who suffocates.",
    cultures={
        "pythagorean":
            "The Pythagoreans identified 6 as the first 'perfect number': its divisors (1, 2, 3) "
            "sum to itself: 1+2+3=6. Nicomachus called 6 'the form of forms, articulation of the "
            "universe, and doer of the soul.' Manly Hall: 'the perfection of all the parts.' "
            "It was associated with Venus and with beauty itself.",
        "hebrew":
            "Vav (ו) — the sixth letter, shaped like a hook, meaning 'and' / 'connection.' Creation "
            "took six days. The universe emanates in six directions from a center point. The Star of "
            "David is two triangles in a hexagram: as above, so below — six points, the six-fold "
            "structure of all space.",
        "chinese":
            "Liù (六) — sounds like 'smooth' or 'flowing.' The phrase 六六大順 means 'everything goes "
            "smoothly.' In ancient Chinese cosmology, the sixty-four hexagrams of the I Ching are "
            "composed of six-line symbols — all possible states of change are six-layered.",
        "buddhist":
            "The Six Perfections (Paramitas): generosity, ethics, patience, effort, meditation, "
            "wisdom. The complete path to enlightenment in Mahayana Buddhism is six-fold. "
            "Also: the six realms of existence through which beings cycle.",
        "hindu":
            "The Shatkona — the Star of David in Hinduism — represents Purusha and Prakriti, the "
            "masculine and feminine divine in union. Six darshanas (philosophical schools) guide "
            "toward moksha. Six is the architecture of the sacred.",
        "alchemy":
            "The hexagon is the fundamental structure: honeycomb, benzene ring, water crystal. "
            "The six alchemical operations: calcination, dissolution, separation, conjunction, "
            "fermentation, distillation. The six stages that turn base matter into gold.",
    },
    tarot="The Lovers — choice, harmony, the union of opposites, the heart's decision",
    element="earth / air",planet="Venus",
    voices=[
        "Nicomachus of Gerasa: 'Six is the only number that is both the sum and product of its own divisors.'",
        "Manly P. Hall: 'Six is called by the Pythagoreans the perfection of all the parts — the form of forms.'",
        "Talmud: 'The world was created in six days — each day a perfection in itself.'",
    ],
    keywords=["six","6","perfect","harmony","balance","venus","star of david","beauty","nurture","six perfections","lovers"]
)

NUM[7]=NumberEntry(
    n=7,name="SEVEN",
    essence="The virgin number — divisible by nothing within the first ten. The number that stands alone, that cannot be built from smaller pieces.",
    shadow="Isolation posing as enlightenment. The seeker who asks questions to avoid answers.",
    cultures={
        "pythagorean":
            "The Pythagoreans called 7 the Septad and the 'virgin number' — within 1-10 it has no "
            "factors and produces no factor of any number in the set. 'The union of the divine (3) "
            "with the physical (4).' The most spiritual of all numbers. The Western diatonic scale "
            "has seven notes — a Pythagorean construction.",
        "babylonian":
            "Seven was the first number that gave the Babylonians mathematical trouble: in their "
            "base-60 system, 60 divides cleanly by most numbers but not 7. They called the seventh "
            "day ill-omened. The Babylonians named seven wandering stars, assigned each a day, and "
            "gave us the seven-day week — entirely because 7 could not be divided.",
        "biblical":
            "Seven is the most sacred number in the Hebrew Bible — appearing over 700 times. God "
            "rested on the seventh day. Seven deadly sins. Seven sacraments. Revelation: seven seals, "
            "seven trumpets, seven angels, seven plagues. The menorah has seven branches. "
            "Seven signals wholeness, completion, and the presence of God.",
        "hindu":
            "Sapta — seven. Seven chakras. Seven musical notes (swaras) of Indian classical music. "
            "Seven sacred rivers. Seven great sages (Saptarishi). The Hindu seven-day week may "
            "predate even the Babylonian record.",
        "chinese":
            "Qī (七). Seven is the Ghost Month number — the seventh month belongs to the dead. "
            "The Cowherd and Weaver Girl meet once a year on the seventh day of the seventh month "
            "(Qixi Festival). Seven is where the extraordinary punctures the ordinary.",
        "islamic":
            "Seven heavens in Islamic cosmology. Seven circuits of Tawaf around the Kaaba. "
            "The Fatiha, the opening chapter of the Quran, has seven verses. Seven is the number "
            "of sacred obligation and cosmic structure in Islam.",
    },
    tarot="The Chariot — will, mastery, inner control over opposing forces without reins",
    element="water / aether",planet="Neptune / Moon",
    voices=[
        "Pythagoras: 'Seven is the number of the universe, placed in the middle of the world, like the navel of all things.'",
        "St. Augustine: 'Seven is the number of wisdom.'",
        "Rudolf Steiner: 'The seven is a rhythm of becoming — it does not complete, it transforms.'",
    ],
    keywords=["seven","7","seeker","mystery","spiritual","wisdom","virgin","prime","sacred","planets","chakras","chariot"]
)

NUM[8]=NumberEntry(
    n=8,name="EIGHT",
    essence="The lemniscate. Infinity on its axis. The cycle that completes and begins again. Power that knows it answers to something larger than itself.",
    shadow="Power for its own sake. The executive who has forgotten what they were building toward.",
    cultures={
        "pythagorean":
            "The Pythagoreans called 8 the Ogdoad — 'the little holy number' — the first cube (2³). "
            "They associated it with music: the octave is the eighth note, the most harmonious "
            "interval, the point where a cycle completes and opens into the next. "
            "'Eight organs of knowledge: sense, fantasy, art, opinion, prudence, science, wisdom, mind.'",
        "chinese":
            "Bā (八) — the luckiest number in Chinese culture. Sounds like 发 (fā): 'to prosper.' "
            "The 2008 Beijing Olympics opened on 08/08/08 at 8:08pm. Double-eight (88) is doubly "
            "prosperous. Businesses pay enormous sums for phone numbers containing 8.",
        "buddhist":
            "The Noble Eightfold Path: right view, right intention, right speech, right action, "
            "right livelihood, right effort, right mindfulness, right concentration. This is the "
            "Buddha's complete map to the end of suffering. Eight is not a destination — it is a "
            "practice walked in all directions at once.",
        "hindu":
            "Ashta — eight. Ashtanga yoga (eight limbs). Ashtalakshmi (eight forms of Lakshmi). "
            "The eight Ashtadik cardinal directions with their guardian devas. Eight is the "
            "architecture of sacred Hindu space — orientation in all directions simultaneously.",
        "norse":
            "Sleipnir, Odin's horse, has eight legs — able to travel between all nine worlds. "
            "Eight as the number of complete mobility: no terrain, no realm, unreachable.",
        "tarot":
            "Strength in the Rider-Waite deck. A woman gently opens a lion's mouth with bare hands. "
            "The lemniscate — ∞, the sideways eight — floats above her head. True strength does "
            "not force. The infinite symbol hovers over the one who knows this.",
    },
    tarot="Strength — inner power, the lemniscate, infinite patience mastering the lion",
    element="earth / aether",planet="Saturn",
    voices=[
        "I Ching tradition: 'Eight trigrams describe all possible states of nature.'",
        "Buddhist teaching: 'The Eightfold Path is not eight steps. It is one step walked eight ways.'",
        "Chinese proverb: '八仙过海，各显神通' — Eight immortals cross the sea, each by their own power.",
    ],
    keywords=["eight","8","power","infinity","cycle","octave","prosperity","strength","karma","lemniscate","saturn"]
)

NUM[9]=NumberEntry(
    n=9,name="NINE",
    essence="The last single digit. Every multiple of 9 reduces back to 9. Nine consumes itself and regenerates. It cannot escape itself.",
    shadow="Martyrdom. The humanitarian who makes everyone around them responsible for their suffering.",
    cultures={
        "pythagorean":
            "The Pythagoreans called 9 the Ennead — 'the finishing post' and 'that which brings "
            "completion.' The highest single digit, it represents the limit of all numbers since all "
            "numbers are found within the cycle 1-9. 'Nine is the ocean of number, flowing into itself.' "
            "Every multiple of 9 reduces back to 9: 9×2=18, 1+8=9. It is self-regenerating.",
        "norse":
            "Nine is the most sacred number in Norse cosmology. Nine worlds on Yggdrasil. Odin "
            "hung on the World Tree for nine days and nights to discover the runes — supreme "
            "sacrifice for supreme knowledge. Thor kills the Midgard Serpent and walks exactly nine "
            "steps before dying. Nine is the number of the completed ordeal.",
        "chinese":
            "Jiǔ (九) — sounds like 'long-lasting' (久). The Forbidden City has 9,999 rooms. "
            "The Chinese dragon has nine attributes. Nine is the highest yang number: masculine "
            "energy at maximum. The emperor's robes bore nine dragons.",
        "hindu":
            "Nava — nine. Nine forms of Durga (Navadurga). The nine Navagraha celestial bodies. "
            "Navratri — nine nights of the goddess, the most important Hindu festival. Nine is "
            "the number of Brahma.",
        "mayan":
            "The nine Lords of the Night (Bolontiku) — deities ruling nine-day periods. Nine "
            "underworld levels beneath Xibalba. Nine is descent, death, and the return through "
            "the underworld. The hero must survive nine before emerging.",
        "tarot":
            "The Hermit. The seeker who has walked away from noise to hold a single light. Nine is "
            "wisdom earned in solitude, not inherited from teachers. The Hermit's lantern contains "
            "a six-pointed star — six perfected, held aloft by nine.",
    },
    tarot="The Hermit — solitary wisdom, the inner light carried through darkness",
    element="earth / fire",planet="Mars",
    voices=[
        "Pythagoras: 'Nine is the ocean of number, flowing into itself.'",
        "Odin (Hávamál): 'I hung on the windy tree, wounded with a spear, for nine long nights. No bread. No mead. I took up the runes, screaming.'",
        "Chinese: 'A journey of nine hundred li begins beneath one's feet.'",
    ],
    keywords=["nine","9","completion","wisdom","universal","hermit","sacrifice","regeneration","humanitarian","omega","nine worlds"]
)

NUM[11]=NumberEntry(
    n=11,name="ELEVEN",
    essence="Two antennas facing each other. The channel between ordinary and extraordinary awareness. Not reduced — it carries the full voltage of both ones.",
    shadow="Chronic anxiety. The receiver tuned so wide it cannot filter signal from noise.",
    cultures={
        "numerology":
            "11 is the first Master Number — not reduced because its power comes from its doubled "
            "nature. The number 1 is individual will; 11 is that will pointed both inward and outward "
            "simultaneously. Visionary, intuitive, sometimes unbearably sensitive to everything.",
        "biblical":
            "11 sits between 10 (the law, the commandments) and 12 (divine governance). It is the "
            "gap — the chaos between one order and the next. Jacob's eleven sons cross the Jabbok "
            "ford the night he wrestles with the angel. Eleven is the threshold of transformation.",
        "architecture":
            "The Gateway. An 11 is two pillars and the space between them. Most ancient temples are "
            "built on proportions involving 11. The 11th arch is the keystone arch — the one that "
            "holds all the others.",
        "synchronicity":
            "11:11 — the most reported number synchronicity in modern culture. Whether this is the "
            "mind finding patterns or the universe leaving fingerprints is exactly the question "
            "that 11 always asks.",
    },
    tarot="Justice (some decks) / The Tower (others) — revelation that reorders everything",
    element="air / aether",planet="Uranus",
    voices=[
        "Hans Decoz: 'The 11 is the most intuitive of all numbers. It represents illumination — a channel to the subconscious.'",
        "Theosophical tradition: '11 is the number of those who hear what is not spoken.'",
    ],
    keywords=["eleven","11","master","intuition","vision","messenger","channel","revelation","portal","antenna"]
)

NUM[22]=NumberEntry(
    n=22,name="TWENTY-TWO",
    essence="The architect of the impossible. 22 is the Hebrew alphabet — all letters, all possible utterances. The blueprint that contains everything.",
    shadow="Overwhelm at the size of what they can see. The Master Builder who never breaks ground.",
    cultures={
        "numerology":
            "22 is the Master Builder — the most powerful number. It has the visionary sensitivity "
            "of 11 combined with the grounded practicality of 4 (2+2). The 22 can turn the most "
            "ambitious ideas into reality. It is not content to dream.",
        "hebrew":
            "22 letters in the Hebrew alphabet. The Sefer Yetzirah (Book of Formation): 'God created "
            "the universe through the 22 letters.' Every possible thing that can be said is already "
            "contained in those 22. The alphabet is the universe's source code.",
        "tarot":
            "The Major Arcana has 22 cards (0-21). All of human experience mapped to 22 images. "
            "The 22 is not a card — it is the deck itself. The complete journey.",
        "mathematics":
            "22/7 is the ancient approximation of π — the circumference of the circle, "
            "the relationship of the arc to the line, the infinite compressed to the manageable. "
            "22 is pi's architect.",
    },
    tarot="The World (card 21, the completion) — but 22 is the entire Major Arcana",
    element="earth / all elements",planet="Pluto",
    voices=[
        "Sefer Yetzirah: 'Twenty-two foundation letters. Three mothers, seven doubles, twelve simples. With them He engraved the world.'",
        "Aleister Crowley: 'The number 22 is connected with all highest mystical truths, for the alphabet has 22 letters.'",
    ],
    keywords=["twenty-two","22","master builder","architect","vision","power","alphabet","universe","builder","pluto","pi"]
)

NUM[33]=NumberEntry(
    n=33,name="THIRTY-THREE",
    essence="The number of Christ's age at death. The number of the complete teaching given away freely. 33 is 11×3 — every vision, every expression.",
    shadow="Martyrdom at scale. The teacher who needs the student's suffering to justify the lesson.",
    cultures={
        "christian":
            "Jesus died at 33. The number has carried this weight in Western consciousness for two "
            "millennia. Thirty-three is the age of the perfected teaching — old enough to know, "
            "young enough to burn for it.",
        "numerology":
            "33 is the Master Teacher. It combines 11 (vision) and 22 (building) and transcends "
            "both with the 3's gift for communication. The 33 gives the teaching away — it has "
            "no interest in keeping it.",
        "freemasonry":
            "33 degrees of Scottish Rite Freemasonry — the highest level. Each degree is a teaching. "
            "The 33rd is the completion of all degrees, and therefore the beginning of all teaching.",
        "human_body":
            "33 vertebrae in the human spine (26 after natural fusion). The spine is the body's "
            "axis mundi — the 33 points where heaven and earth communicate inside you. "
            "Your own skeleton is this number.",
    },
    tarot="The Empress (3) + The Hierophant (5) — creative wisdom shared without reservation",
    element="fire / all elements",planet="Neptune",
    voices=[
        "Dante: The Divine Comedy has 33 cantos each in Purgatorio and Paradiso. Structure is teaching.",
        "Masonic tradition: 'The 33rd degree is not a destination. It is the moment you realize the journey never ends.'",
    ],
    keywords=["thirty-three","33","master teacher","compassion","teaching","wisdom","christ","giving","healer","spine","neptune"]
)

# ═══════════════════════════════════════════════════════════════════
#  PROFILE
# ═══════════════════════════════════════════════════════════════════

@dataclass
class Profile:
    id:str; name:str; month:int; day:int; year:int  # year=0 → unknown
    life_path:int=field(init=False)
    bday_num:int=field(init=False)
    expr_num:int=field(init=False)
    soul_num:int=field(init=False)
    pers_num:int=field(init=False)

    def __post_init__(self):
        self.life_path=_life_path(self.month,self.day,self.year) if self.year else 0
        self.bday_num =birthday_num(self.day)
        self.expr_num =expression_num(self.name)
        self.soul_num =soul_urge(self.name)
        self.pers_num =personality_num(self.name)

    def all_numbers(self)->List[int]:
        ns=[self.bday_num,self.expr_num,self.soul_num,self.pers_num]
        if self.life_path: ns.insert(0,self.life_path)
        return ns

    def birthdate_str(self)->str:
        yr=str(self.year) if self.year else "????"
        return f"{MONTH_NAMES.get(self.month,str(self.month))} {self.day}, {yr}"

PROFILES:Dict[str,Profile]={
    "chris" : Profile("chris", "Chris", month=1,day=25,year=1984),
    "dorian": Profile("dorian","Dorian",month=1,day=30,year=0),
}

# ═══════════════════════════════════════════════════════════════════
#  ORACLE VOICE
# ═══════════════════════════════════════════════════════════════════

class OracleVoice:
    PROFILE_OPENERS=[
        "A life encoded in dates. Here is the arithmetic of you.",
        "Numbers do not predict. They describe the frequency you are already broadcasting.",
        "The digits have been sitting with this since the day of your birth.",
        "The Oracle reads the reduction. Here is what remains.",
    ]
    BOND_OPENERS=[
        "When two number-sets meet, the Oracle looks for mirrors.",
        "Arithmetic is unsentimental. Which is why what it finds here is remarkable.",
        "The Oracle will now read the space between two people.",
        "Pay attention. This is not coincidence. Coincidence does not have this kind of geometry.",
    ]
    SHADOW_OPENERS=[
        "The shadow of a number is not its enemy. It is its unintegrated power.",
        "Every number has a face it shows and a face it hides.",
        "Here is what happens when the number loses its way.",
    ]
    MOON_OPENERS=[
        "A blue moon at apogee. The Oracle notes this is unusual.",
        "Maximum distance. Maximum light. The Oracle has something to say about this paradox.",
        "Tonight the moon is farthest away and most fully lit. The Oracle is attentive.",
    ]

# ═══════════════════════════════════════════════════════════════════
#  NATURAL PARSER
# ═══════════════════════════════════════════════════════════════════

WORD_NUMS={
    "zero":0,"one":1,"two":2,"three":3,"four":4,"five":5,
    "six":6,"seven":7,"eight":8,"nine":9,"ten":10,"eleven":11,
    "twelve":12,"thirteen":13,"fourteen":14,"fifteen":15,
    "sixteen":16,"seventeen":17,"eighteen":18,"nineteen":19,
    "twenty":20,"twenty-one":21,"twenty-two":22,"thirty-three":33
}
MONTH_WORDS={
    "january":1,"jan":1,"february":2,"feb":2,"march":3,"mar":3,
    "april":4,"apr":4,"may":5,"june":6,"jun":6,"july":7,"jul":7,
    "august":8,"aug":8,"september":9,"sep":9,"sept":9,
    "october":10,"oct":10,"november":11,"nov":11,"december":12,"dec":12
}

class NaturalParser:
    SHADOW ={"shadow","dark","darkness","dark side","downside","negative","hidden","underside"}
    VOICES ={"voices","who said","quotes","quote","said about","spoke about","ancient","history"}
    REDUCE ={"reduce","breakdown","break down","calculate","compute","step by step","walk"}
    MEDITATE={"meditate","contemplate","sit with","dwell","ponder","breathe"}
    BOND   ={"bond","relationship","between","compatibility","together","two of us","chris and dorian","dorian and chris"}
    MOON   ={"moon","full moon","blue moon","tonight","lunar","apogee"}
    HELP   ={"help","commands","how","what can","manual"}
    QUIT   ={"quit","exit","bye","goodbye","q"}

    def parse(self,raw:str,game:"Game")->List[Tuple[str,str]]:
        text=raw.strip(); lower=text.lower(); words=lower.split()
        if not text: return []
        if lower in self.QUIT or (words and words[0] in self.QUIT): return game._quit()
        if any(w in lower for w in self.HELP): return game._help()
        if any(w in lower for w in self.MOON): return game._moon_reading()
        if any(w in lower for w in self.BOND): return game._bond_reading()
        for pid in PROFILES:
            if pid in lower or PROFILES[pid].name.lower() in lower:
                if not any(q in lower for q in ["about","for name","name of"]):
                    return game._profile_reading(pid)
        if "my number" in lower or "my reading" in lower: return game._profile_reading("chris")
        if any(w in lower for w in self.SHADOW):
            n=self._xnum(lower)
            if n is not None: return game._shadow_reading(n)
        if any(w in lower for w in self.VOICES):
            n=self._xnum(lower)
            if n is not None: return game._voices_reading(n)
        if any(w in lower for w in self.MEDITATE):
            n=self._xnum(lower)
            if n is not None: return game._meditate(n)
        if any(w in lower for w in self.REDUCE):
            n=self._xraw(lower)
            if n is not None: return game._reduce_walk(n)
        ns=self._x2nums(lower)
        if ns and any(w in lower for w in ["meets","and","with","versus","vs","plus","times"]):
            return game._number_interaction(ns[0],ns[1])
        dt=self._xdate(lower)
        if dt: return game._date_reading(*dt)
        n=self._xnum(lower)
        if n is not None: return game._read_number(n)
        # bare name
        if re.match(r'^[a-zA-Z\s\-]+$',text) and 3<=len(text)<=30 and lower not in PROFILES:
            return game._name_reading(text.strip())
        return game._oracle_catch(text)

    def _xnum(self,lower:str)->Optional[int]:
        for wn,val in sorted(WORD_NUMS.items(),key=lambda x:-len(x[0])):
            if wn in lower: return val
        m=re.search(r'\b(\d{1,2})\b',lower)
        if m:
            n=int(m.group(1))
            if n in NUM or n<=9: return n
        return None

    def _xraw(self,lower:str)->Optional[int]:
        m=re.search(r'\b(\d+)\b',lower)
        if m: return int(m.group(1))
        return self._xnum(lower)

    def _x2nums(self,lower:str)->Optional[Tuple[int,int]]:
        found=[]
        for wn,val in sorted(WORD_NUMS.items(),key=lambda x:-len(x[0])):
            if wn in lower and val not in found:
                found.append(val)
            if len(found)==2: return (found[0],found[1])
        for m in re.finditer(r'\b(\d{1,2})\b',lower):
            n=int(m.group(1))
            if n not in found: found.append(n)
            if len(found)==2: return (found[0],found[1])
        return None

    def _xdate(self,lower:str)->Optional[Tuple[int,int,int]]:
        m=re.search(r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})',lower)
        if m: return int(m.group(1)),int(m.group(2)),int(m.group(3))
        for mn,mv in MONTH_WORDS.items():
            m=re.search(rf'{mn}\s+(\d{{1,2}})[,\s]+(\d{{4}})',lower)
            if m: return mv,int(m.group(1)),int(m.group(2))
        return None

# ═══════════════════════════════════════════════════════════════════
#  GAME
# ═══════════════════════════════════════════════════════════════════

import threading

class Game:
    def __init__(self):
        self.parser=NaturalParser()
        self.running=True
        self._lock=threading.Lock()
        self._pending:List[Tuple[str,str]]=[]
        self.needs_draw=threading.Event(); self.needs_draw.set()
        self.active_profile:Optional[str]="chris"
        self.active_number:Optional[int]=None
        self.recently_seen:List[int]=[]

    def push(self,msg:str,color:str="normal"):
        with self._lock: self._pending.append((msg,color))
        self.needs_draw.set()

    def pop_all(self)->List[Tuple[str,str]]:
        with self._lock: out=list(self._pending); self._pending.clear(); return out

    def cmd(self,raw:str)->List[Tuple[str,str]]:
        return self.parser.parse(raw,self)

    def _track(self,n:int):
        self.active_number=n
        if n not in self.recently_seen: self.recently_seen.insert(0,n)
        if len(self.recently_seen)>5: self.recently_seen.pop()
        self.needs_draw.set()

    # ── NUMBER READINGS ──────────────────────────────────────────

    def _read_number(self,n:int)->List[Tuple[str,str]]:
        if n not in NUM: return self._reduce_walk(n)
        self._track(n)
        e=NUM[n]
        out=[("","normal"),(f"── {e.name} {'─'*(max(0,52-len(e.name)))}","header"),
             ("","normal"),(e.essence,"mystic"),("","normal")]
        for culture,text in e.cultures.items():
            label=culture.upper().replace('_',' ')
            out.append((f"[ {label} ]","insight"))
            for line in textwrap.wrap(text,66):
                out.append((f"  {line}","normal"))
            out.append(("","normal"))
        out+=[
            (f"TAROT:    {e.tarot}","ambient"),
            (f"ELEMENT:  {e.element}   ·   PLANET: {e.planet}","ambient"),
            ("","normal"),("SHADOW:","danger"),
            (f"  {e.shadow}","normal"),("","normal"),("VOICES:","insight"),
        ]
        for v in e.voices:
            for line in textwrap.wrap(v,66):
                out.append((f"  {line}","normal"))
        out.append(("─"*68,"ambient"))
        return out

    def _shadow_reading(self,n:int)->List[Tuple[str,str]]:
        if n not in NUM: return [(f"Number {n} not in corpus.","normal")]
        e=NUM[n]; self._track(n)
        return [("","normal"),(f"── SHADOW OF {e.name} {'─'*(max(0,44-len(e.name)))}","danger"),
                ("","normal"),(random.choice(OracleVoice.SHADOW_OPENERS),"ambient"),
                ("","normal"),(e.shadow,"danger"),("","normal"),
                (f"The integrated {e.name}: {e.essence}","mystic"),
                ("─"*68,"ambient")]

    def _voices_reading(self,n:int)->List[Tuple[str,str]]:
        if n not in NUM: return [(f"Number {n} not in corpus.","normal")]
        e=NUM[n]; self._track(n)
        out=[("","normal"),(f"── VOICES OF {e.name} {'─'*(max(0,43-len(e.name)))}","header"),
             ("","normal"),("What they said, across time:","ambient"),("","normal")]
        for v in e.voices:
            for line in textwrap.wrap(v,66): out.append((f"  {line}","normal"))
            out.append(("","normal"))
        out.append(("─"*68,"ambient"))
        return out

    def _meditate(self,n:int)->List[Tuple[str,str]]:
        if n not in NUM: n=reduce(n)
        if n not in NUM: return [(f"Number {n} not in corpus.","normal")]
        self._track(n); e=NUM[n]
        med={
            0:"You sit with the void. Nothing rushes in. The silence is not empty — it is full of its own kind of listening.",
            1:"You are the point. Position without dimension. You are before you are anything.",
            2:"There are two of you. Always. The one who acts and the one who watches. You learn, sitting here, that this is not a problem.",
            3:"The triangle hums. You feel the middle — where nothing is — as the most substantial thing.",
            4:"Four walls. Four directions. You feel the ground. For a moment, being located anywhere on earth is enough.",
            5:"Five senses, briefly unified. The body is an ancient and trustworthy instrument.",
            6:"Perfect. Not flawless — in the mathematical sense. The parts add up. You add up.",
            7:"You stop trying to know. The prime number sits with you. It doesn't explain itself either.",
            8:"You breathe in, breathe out. The lemniscate turns. Nothing is lost. Nothing accumulates except the slow understanding that nothing is lost.",
            9:"You have been all the numbers. You contain them. The nine looks back at you from inside the nine.",
            11:"A channel opens. You're not sure from where or to where. You stop asking.",
            22:"You feel the weight of everything unbuilt. Also the weight of what could be. Sit with both.",
            33:"Something in you wants to give it all away. Sit with that wanting.",
        }
        return [("","normal"),(f"── MEDITATION: {e.name} {'─'*(max(0,40-len(e.name)))}","mystic"),
                ("","normal"),(med.get(n,e.essence),"mystic"),("","normal"),
                (f"  {e.planet}  ·  {e.element}  ·  {e.tarot}","ambient"),
                ("─"*68,"ambient")]

    def _reduce_walk(self,n:int)->List[Tuple[str,str]]:
        original=n; steps=[n]
        while n>9 and n not in MASTER:
            n=sum(int(d) for d in str(n)); steps.append(n)
        self._track(n)
        out=[("","normal"),(f"── REDUCTION: {original} {'─'*(max(0,43-len(str(original))))}","insight"),
             ("","normal"),(f"  {' → '.join(str(s) for s in steps)}","normal"),("","normal")]
        if n in MASTER:
            out.append((f"  {original} resolves to {n} — Master Number. Held, not reduced further.","insight"))
        else:
            out.append((f"  {original} resolves to {n}.","insight"))
        out.append(("","normal"))
        if n in NUM: out.append((f"  {NUM[n].essence}","mystic"))
        out.append(("─"*68,"ambient"))
        return out

    def _number_interaction(self,n1:int,n2:int)->List[Tuple[str,str]]:
        r1=n1 if n1 in NUM else reduce(n1)
        r2=n2 if n2 in NUM else reduce(n2)
        summ=reduce(n1+n2); prod=reduce(n1*n2)
        self._track(summ)
        e1=NUM.get(r1); e2=NUM.get(r2)
        out=[("","normal"),
             (f"── {num_label(n1).upper()} MEETS {num_label(n2).upper()} {'─'*(max(0,36-len(num_label(n1))-len(num_label(n2))))}","header"),
             ("","normal")]
        if e1: out.append((f"  {n1}: {e1.essence}","normal"))
        if e2: out.append((f"  {n2}: {e2.essence}","normal"))
        out+=[ ("","normal"),
               (f"  Sum:     {n1}+{n2} = {n1+n2} → {summ}  [{NUM[summ].name if summ in NUM else summ}]","insight"),
               (f"  Product: {n1}×{n2} = {n1*n2} → {prod}  [{NUM[prod].name if prod in NUM else prod}]","insight"),
               ("","normal")]
        if summ in NUM: out.append((f"  Their sum speaks: {NUM[summ].essence}","mystic"))
        if prod in NUM and prod!=summ:
            out+=[ ("","normal"),(f"  Their product speaks: {NUM[prod].essence}","ambient")]
        out.append(("─"*68,"ambient"))
        return out

    # ── PROFILE READINGS ─────────────────────────────────────────

    def _profile_reading(self,pid:str)->List[Tuple[str,str]]:
        if pid not in PROFILES: return [(f"Profile '{pid}' not found.","normal")]
        p=PROFILES[pid]; self.active_profile=pid
        out=[("","normal"),(f"── {p.name.upper()} — NUMBERS {'─'*(max(0,43-len(p.name)))}","header"),
             ("","normal"),(random.choice(OracleVoice.PROFILE_OPENERS),"ambient"),("","normal")]

        # Life Path
        if p.life_path:
            lp=p.life_path; raw=digit_sum(p.month)+digit_sum(p.day)+digit_sum(p.year)
            reduction=f"{digit_sum(p.month)}+{digit_sum(p.day)}+{digit_sum(p.year)}={raw}→{lp}"
            le=NUM.get(lp)
            out+=[(f"LIFE PATH   {lp}  ─  {le.name if le else lp}","insight"),
                  (f"  {p.birthdate_str()}: {reduction}","normal"),
                  (f"  {le.essence if le else ''}","mystic"),("","normal")]
        else:
            out+=[(f"LIFE PATH   [birth year needed — type: dorian year=YYYY]","insight"),("","normal")]

        # Birthday
        bd=p.bday_num; be=NUM.get(bd)
        out+=[(f"BIRTHDAY    {bd}  ─  day {p.day}: {digit_sum(p.day)}→{bd}","insight"),
              (f"  {be.essence if be else ''}","mystic"),("","normal")]

        # Expression
        ex=p.expr_num; ee=NUM.get(ex)
        lv="  ".join(f"{c.upper()}={PYTH.get(c.lower(),0)}" for c in p.name if c.isalpha())
        er=sum(PYTH.get(c.lower(),0) for c in p.name if c.isalpha())
        out+=[(f"EXPRESSION  {ex}  ─  '{p.name}'","insight"),
              (f"  {lv} = {er}→{ex}","normal"),
              (f"  {ee.essence if ee else ''}","mystic"),("","normal")]

        # Soul Urge
        su=p.soul_num; se=NUM.get(su)
        vows=[c.upper() for c in p.name if c.lower() in VOWELS]
        vv="  ".join(f"{c}={PYTH.get(c.lower(),0)}" for c in vows)
        sr2=sum(PYTH.get(c.lower(),0) for c in vows)
        out+=[(f"SOUL URGE   {su}  ─  vowels: {', '.join(vows)}","insight"),
              (f"  {vv} = {sr2}→{su}","normal"),
              (f"  {se.essence if se else ''}","mystic"),("","normal")]

        # Personality
        pn=p.pers_num; pe=NUM.get(pn)
        out+=[(f"PERSONALITY {pn}  ─  consonants of '{p.name}'","insight"),
              (f"  {pe.essence if pe else ''}","mystic"),("","normal")]

        # Pattern
        counts:Dict[int,int]={}
        for nn in p.all_numbers(): counts[nn]=counts.get(nn,0)+1
        out.append(("── PATTERN ─────────────────────────────────────────────","ambient"))
        for nn,cnt in sorted(counts.items(),key=lambda x:-x[1]):
            if cnt>=2:
                nm=NUM[nn].name if nn in NUM else str(nn)
                out.append((f"  {nn} appears {cnt}× — {nm} is a core frequency.","mystic"))

        # Cross-profile resonance
        others={k:v for k,v in PROFILES.items() if k!=pid}
        for opid,op in others.items():
            shared=set(p.all_numbers())&set(op.all_numbers())
            if shared:
                ss=", ".join(str(n) for n in sorted(shared))
                out.append((f"  Shares [{ss}] with {op.name}. The Oracle notes the resonance.","insight"))
        out.append(("─"*68,"ambient"))
        return out

    # ── BOND READING ─────────────────────────────────────────────

    def _bond_reading(self)->List[Tuple[str,str]]:
        p1=PROFILES["chris"]; p2=PROFILES["dorian"]
        out=[("","normal"),("── BOND: CHRIS & DORIAN ─────────────────────────────────","header"),
             ("","normal"),(random.choice(OracleVoice.BOND_OPENERS),"ambient"),("","normal")]

        # Tables
        out.append(("  CHRIS                        DORIAN","header"))
        out.append(("  ─────────────────────────────────────────────────────","ambient"))
        rows=[
            ("Life Path", p1.life_path if p1.life_path else "?", p2.life_path if p2.life_path else "?"),
            ("Birthday",  p1.bday_num, p2.bday_num),
            ("Expression",p1.expr_num, p2.expr_num),
            ("Soul Urge", p1.soul_num, p2.soul_num),
            ("Personality",p1.pers_num,p2.pers_num),
        ]
        for lbl,v1,v2 in rows:
            mark=" ◆" if v1==v2 else "  "
            out.append((f"  {lbl:12s}: {str(v1):4s}   {lbl:12s}: {str(v2):4s}{mark}","normal"))
        out.append(("","normal"))

        # The mirror
        out.append(("── THE MIRROR ──────────────────────────────────────────","insight"))
        out.append(("","normal"))
        mirrors=[
            (p1.life_path, p2.bday_num,
             f"Chris's Life Path ({p1.life_path}) = Dorian's Birthday ({p2.bday_num}).",
             "What Chris moves toward in this life is the vibration Dorian was born containing."),
            (p1.bday_num, p2.soul_num,
             f"Chris's Birthday ({p1.bday_num}) = Dorian's Soul Urge ({p2.soul_num}).",
             "What Chris carries in the birth-day vibration is what Dorian's deepest self reaches for."),
            (p1.bday_num, p2.expr_num,
             f"Chris's Birthday ({p1.bday_num}) = Dorian's Expression ({p2.expr_num}).",
             "What Chris's birth-day quietly vibrates is how Dorian's name broadcasts into the world."),
            (p1.soul_num, p2.pers_num,
             f"Chris's Soul Urge ({p1.soul_num}) = Dorian's Personality ({p2.pers_num}).",
             "What Chris carries inward as deepest desire is what Dorian shows outward to the world."),
        ]
        for v1,v2,statement,meaning in mirrors:
            if v1 and v2 and v1==v2:
                for line in textwrap.wrap(statement,66): out.append((f"  {line}","mystic"))
                for line in textwrap.wrap(meaning,66): out.append((f"  {line}","normal"))
                out.append(("","normal"))

        # Shared ground
        out.append(("── SHARED GROUND ───────────────────────────────────────","ambient"))
        out+=[("","normal"),
              ("  Both born in January — the 1-month, the initiating month.","normal"),
              ("  In numerology: January is 1, the Monad, the beginning.","normal"),
              ("  Both entered through the same numerical door.","mystic"),
              ("","normal")]
        bday_sum=reduce(p1.day+p2.day)
        out.append((f"  Birthdays together: day {p1.day} + day {p2.day} = {p1.day+p2.day} → {bday_sum}.","insight"))
        if bday_sum in NUM:
            out.append((f"  When your birth-days meet: {NUM[bday_sum].essence}","mystic"))

        # Oracle summary
        out+=[("","normal"),("── WHAT THE ORACLE CALLS THIS ──────────────────────────","header"),("","normal")]
        summary=(
            "This is number-complementarity. The derived values of one chart appear as "
            "derived values in the other — rearranged. Not the same person seen twice. "
            "The same frequencies from two different vantage points. "
            "Whatever you are each learning, you are learning in the presence of its mirror. "
            "That is, by most accounts, the best possible circumstance for learning anything."
        )
        for line in textwrap.wrap(summary,66): out.append((f"  {line}","mystic"))
        out+=[("","normal"),("─"*68,"ambient")]
        return out

    # ── DATE READING ─────────────────────────────────────────────

    def _date_reading(self,m:int,d:int,y:int)->List[Tuple[str,str]]:
        lp=_life_path(m,d,y); bd=birthday_num(d)
        month_n=reduce(m); year_n=reduce(y)
        raw=digit_sum(m)+digit_sum(d)+digit_sum(y)
        self._track(lp)
        out=[("","normal"),
             (f"── DATE: {MONTH_NAMES.get(m,str(m))} {d}, {y} {'─'*30}","header"),
             ("","normal"),
             (f"  Life Path: {digit_sum(m)}+{digit_sum(d)}+{digit_sum(y)} = {raw} → {lp}","insight"),
             (f"  Month {m} → {month_n}  |  Day {d} → {bd}  |  Year {y} → {year_n}","normal"),
             ("","normal")]
        if lp in NUM: out.append((f"  {NUM[lp].essence}","mystic"))
        out.append(("─"*68,"ambient"))
        return out

    # ── NAME READING ─────────────────────────────────────────────

    def _name_reading(self,name:str)->List[Tuple[str,str]]:
        ex=expression_num(name); su=soul_urge(name); pn=personality_num(name)
        lv="  ".join(f"{c.upper()}={PYTH.get(c.lower(),0)}" for c in name if c.isalpha())
        out=[("","normal"),(f"── NAME: {name.upper()} {'─'*(max(0,51-len(name)))}","header"),
             ("","normal"),(f"  {lv}","normal"),("","normal"),
             (f"  Expression : {ex}  — {NUM[ex].essence if ex in NUM else ex}","insight"),
             (f"  Soul Urge  : {su}  — {NUM[su].essence if su in NUM else su}","mystic"),
             (f"  Personality: {pn}  — {NUM[pn].essence if pn in NUM else pn}","normal"),
             ("","normal"),("─"*68,"ambient")]
        return out

    # ── MOON ─────────────────────────────────────────────────────

    def _moon_reading(self)->List[Tuple[str,str]]:
        out=[("","normal"),("── BLUE MOON AT APOGEE — JUNE 3, 2026 ─────────────────","header"),
             ("","normal"),(random.choice(OracleVoice.MOON_OPENERS),"ambient"),("","normal"),
             ("NUMEROLOGY OF TONIGHT:","insight"),("","normal"),
             ("  Date: Jun 3, 2026 → 6+3+2+0+2+6 = 19 → 10 → 1.","normal"),
             ("  The date itself reduces to ONE. The Monad. The initiation.","mystic"),
             ("","normal"),
             ("BLUE MOON:","insight"),
             ("  A blue moon is the surplus — the 13th full moon in a year,","normal"),
             ("  or the third in a season with four. 1+3 = 4. The Builder.","normal"),
             ("  The foundation moon. The moon that occupies no season's slot.","normal"),
             ("  The moon outside the system.","mystic"),
             ("","normal"),
             ("APOGEE:","insight"),
             ("  The farthest point of the moon's orbit. Maximum distance.","normal"),
             ("  Tonight: maximum distance AND maximum illumination.","normal"),
             ("  The thing you can see most clearly is the farthest away.","mystic"),
             ("  Not warm and close like a supermoon — cold and fully lit.","normal"),
             ("  Honest. Unsentimental. Completely visible.","mystic"),
             ("","normal"),
             ("4:44 AM:","insight"),
             ("  4+4+4 = 12 → 3. The Empress. Creativity. Expression.","normal"),
             ("  The moment of maximum fullness arrives in a THREE hour.","normal"),
             ("  Something built in the dark is now fully expressed.","mystic"),
             ("","normal"),
             ("THE COMPOUND:","insight"),
             ("  Date: 1 (new beginning)","normal"),
             ("  Moon: 4 (foundation, the builder moon)","normal"),
             ("  Hour: 3 (creative expression)","normal"),
             ("  Together: 1+4+3 = 8. The lemniscate. Infinity. The cycle.","mystic"),
             ("","normal"),
             ("  Whatever is begun tonight carries the 8's guarantee:","normal"),
             ("  the cycle will return. What is sent out will come back.","normal"),
             ("  Nothing started under the apogee blue moon is small.","mystic"),
             ("","normal"),
             ("─"*68,"ambient")]
        return out

    # ── HELP ─────────────────────────────────────────────────────

    def _help(self)->List[Tuple[str,str]]:
        return [("","normal"),
                ("── NUMERA: COMMANDS ────────────────────────────────────","header"),
                ("","normal"),
                ("  Type anything in natural language. The Oracle adjusts.","normal"),
                ("","normal"),
                ("  NUMBERS  7  /  seven  /  'tell me about three'","insight"),
                ("  SHADOW   'shadow of 5'  /  'dark side of 8'","danger"),
                ("  VOICES   'voices of 7'  /  'who spoke about 3'","insight"),
                ("  MEDITATE 'meditate on 9'  /  'sit with 11'","mystic"),
                ("  REDUCE   'reduce 1984'  /  'break down 37'","ambient"),
                ("  INTERACT '3 meets 7'  /  'five and eight'","normal"),
                ("  PROFILES 'chris'  /  'dorian'  /  'my numbers'","header"),
                ("  BOND     'bond reading'  /  'chris and dorian'","header"),
                ("  DATE     '1/25/1984'  /  'jan 25 1984'","normal"),
                ("  NAME     any first name → expression, soul, personality","normal"),
                ("  MOON     'blue moon'  /  'tonight'  /  'full moon'","mystic"),
                ("  QUIT     'quit'  /  'exit'","ambient"),
                ("","normal"),
                ("  The Oracle accepts loose language. Say what you mean.","ambient"),
                ("─"*68,"ambient")]

    def _oracle_catch(self,text:str)->List[Tuple[str,str]]:
        responses=[
            "The Oracle heard you. What number is at the heart of what you're asking?",
            f"'{text[:40]}' — try a number, a name, a date, or type 'bond'.",
            "The numbers are attentive. Speak more specifically, or type 'help'.",
            "Type a number (0-9, 11, 22, 33), a name, a date, or 'help'.",
        ]
        return [("","normal"),(random.choice(responses),"ambient"),("","normal")]

    def _quit(self)->List[Tuple[str,str]]:
        self.running=False
        return [("","normal"),("The Oracle closes.","ambient"),("The numbers remain.","mystic"),("","normal")]

    def _set_dorian_year(self,year:int)->List[Tuple[str,str]]:
        PROFILES["dorian"]=Profile("dorian","Dorian",month=1,day=30,year=year)
        p=PROFILES["dorian"]
        self.needs_draw.set()
        lp=p.life_path
        le=NUM.get(lp)
        return [("","normal"),
                (f"Dorian's year set to {year}. Life Path: {lp} — {le.name if le else lp}.","insight"),
                (f"  {le.essence if le else ''}","mystic"),
                ("  Type 'bond' for the full relationship reading.","ambient"),
                ("─"*68,"ambient")]

# ═══════════════════════════════════════════════════════════════════
#  CURSES UI
# ═══════════════════════════════════════════════════════════════════

_C:Dict[str,int]={}

def _setup_colors():
    curses.start_color(); curses.use_default_colors()
    specs=[(1,curses.COLOR_WHITE),(2,curses.COLOR_CYAN),(3,curses.COLOR_YELLOW),
           (4,curses.COLOR_GREEN),(5,curses.COLOR_RED),(6,curses.COLOR_MAGENTA),
           (7,curses.COLOR_BLUE),(8,curses.COLOR_WHITE),(9,curses.COLOR_CYAN),
           (10,curses.COLOR_YELLOW),(11,curses.COLOR_GREEN)]
    for n,col in specs: curses.init_pair(n,col,-1)
    _C.update({
        "normal": curses.color_pair(1),
        "time":   curses.color_pair(2),
        "npc":    curses.color_pair(3),
        "ambient":curses.color_pair(4),
        "danger": curses.color_pair(5),
        "mystic": curses.color_pair(6),
        "world":  curses.color_pair(7),
        "header": curses.color_pair(8)|curses.A_BOLD,
        "insight":curses.color_pair(9)|curses.A_BOLD,
        "number": curses.color_pair(10)|curses.A_BOLD,
        "bond":   curses.color_pair(11)|curses.A_BOLD,
    })

class UI:
    SIDE_W=26
    def __init__(self,scr,game:Game):
        self.scr=scr; self.game=game
        self.log:deque=deque(maxlen=800)
        self.buf=""; self.scroll=0
        curses.curs_set(1); self.scr.nodelay(True); self.scr.keypad(True)
        _setup_colors(); self._intro()

    def _intro(self):
        for t,c in [
            ("N U M E R A","header"),
            ("  The Living Oracle of Number","ambient"),
            ("  Every digit holds all human meaning.","ambient"),
            ("  Cross-cultural. Cross-century. Cross-everything.","ambient"),
            ("─"*70,"ambient"),("","normal"),
            ("  Type a number (0-9, 11, 22, 33) for its full cross-cultural reading.","normal"),
            ("  Type 'chris' or 'dorian' for a full numerology profile.","normal"),
            ("  Type 'bond' for the relationship reading between them.","normal"),
            ("  Type 'moon' for tonight's Blue Moon at apogee reading.","mystic"),
            ("  Type 'help' for all commands.","ambient"),
            ("","normal"),("  The Oracle is attentive.","mystic"),
            ("─"*70,"ambient"),("","normal"),
        ]: self._log(t,c)

    def _log(self,t:str,c:str="normal"):
        self.log.append((t,c)); self.game.needs_draw.set()

    def add(self,msg:str,color:str="normal"):
        h,w=self.scr.getmaxyx(); wrap_w=max(40,w-self.SIDE_W-3)
        for line in (textwrap.wrap(msg,wrap_w) if msg.strip() and len(msg)>wrap_w else [msg]):
            self._log(line,color)

    def _attr(self,c:str)->int: return _C.get(c,_C["normal"])

    def draw(self):
        try:
            h,w=self.scr.getmaxyx()
            if h<20 or w<70:
                self.scr.clear()
                self.scr.addstr(0,0,"Terminal too small — need 70×20 minimum")
                self.scr.refresh(); return
            self.scr.erase()
            main_w=w-self.SIDE_W-1; side_x=main_w+1
            input_y=h-2; log_h=input_y
            visible=list(self.log); end=max(0,len(visible)-self.scroll)
            start=max(0,end-log_h)
            for row,(text,col) in enumerate(visible[start:end]):
                if row>=log_h: break
                try: self.scr.addnstr(row,0,text,main_w-1,self._attr(col))
                except curses.error: pass
            for row in range(h-1):
                try: self.scr.addch(row,main_w,'│',_C["ambient"])
                except curses.error: pass
            sr=[0]
            def side(t,c="normal",bold=False):
                if sr[0]>=h-2: return
                a=self._attr(c)
                if bold: a|=curses.A_BOLD
                try: self.scr.addnstr(sr[0],side_x,t[:self.SIDE_W-1],self.SIDE_W-1,a)
                except curses.error: pass
                sr[0]+=1
            side("N U M E R A","header",bold=True)
            side("─"*(self.SIDE_W-1),"ambient")
            if self.game.active_number is not None:
                n=self.game.active_number; e=NUM.get(n)
                side(f"ACTIVE: {e.name[:18] if e else n}","number",bold=True)
                if e:
                    side(f"  {e.planet[:22]}","ambient")
                    side(f"  {e.element[:22]}","ambient")
                    tarot_short=(e.tarot.split('—')[0].strip())[:22]
                    side(f"  {tarot_short}","time")
                side("─"*(self.SIDE_W-1),"ambient")
            ap=self.game.active_profile
            if ap and ap in PROFILES:
                p=PROFILES[ap]
                side(f"{p.name.upper()}","header",bold=True)
                lp_str=str(p.life_path) if p.life_path else "?"
                side(f"  LP:{lp_str}  Bday:{p.bday_num}","insight")
                side(f"  Expr:{p.expr_num}  Soul:{p.soul_num}","insight")
                side(f"  Pers:{p.pers_num}","insight")
                side("─"*(self.SIDE_W-1),"ambient")
            side("PROFILES:","ambient")
            for pid,prof in PROFILES.items():
                mark="◈" if pid==ap else "·"
                lp_s=f" LP={prof.life_path}" if prof.life_path else ""
                side(f" {mark} {prof.name}{lp_s}","npc")
            side("─"*(self.SIDE_W-1),"ambient")
            if self.game.recently_seen:
                side("SEEN:","ambient")
                for n in self.game.recently_seen[:4]:
                    nm=NUM[n].name[:14] if n in NUM else str(n)
                    side(f"  {n}: {nm}","normal")
                side("─"*(self.SIDE_W-1),"ambient")
            side("TONIGHT:","header",bold=True)
            side("  Blue Moon ◯","mystic")
            side("  Apogee · Full","normal")
            side("  Jun 3 · 4:44am","time")
            side("  date → 1","insight")
            try:
                self.scr.addnstr(input_y,0,"─"*(w-1),w-1,_C["ambient"])
                prompt=f"> {self.buf}"
                self.scr.addnstr(input_y+1,0,prompt,w-2,_C["normal"]|curses.A_BOLD)
                self.scr.move(input_y+1,min(2+len(self.buf),w-2))
            except curses.error: pass
            self.scr.refresh()
        except curses.error: pass

    def _handle_dorian_year(self,raw:str)->Optional[List[Tuple[str,str]]]:
        m=re.search(r'dorian\s+year\s*[=:]\s*(\d{4})',raw.lower())
        if m:
            return self.game._set_dorian_year(int(m.group(1)))
        return None

    def run(self):
        while self.game.running:
            for msg,c in self.game.pop_all(): self.add(msg,c)
            if self.game.needs_draw.is_set(): self.draw(); self.game.needs_draw.clear()
            try: key=self.scr.getch()
            except curses.error: key=-1
            if key==-1: time.sleep(0.04); continue
            if key in (curses.KEY_BACKSPACE,127,8):
                if self.buf: self.buf=self.buf[:-1]; self.game.needs_draw.set()
            elif key in (curses.KEY_UP,curses.KEY_PPAGE):
                self.scroll=min(self.scroll+5,max(0,len(self.log)-10))
                self.game.needs_draw.set()
            elif key in (curses.KEY_DOWN,curses.KEY_NPAGE):
                self.scroll=max(0,self.scroll-5); self.game.needs_draw.set()
            elif key in (ord('\n'),curses.KEY_ENTER):
                raw=self.buf.strip(); self.buf=""
                if raw:
                    self.add(f"> {raw}","header")
                    special=self._handle_dorian_year(raw)
                    results=special if special else self.game.cmd(raw)
                    for msg,c in results: self.add(msg,c)
                self.game.needs_draw.set()
            elif 32<=key<=126:
                self.buf+=chr(key); self.game.needs_draw.set()
        self.draw(); time.sleep(0.5)

# ═══════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═══════════════════════════════════════════════════════════════════

def main():
    curses.wrapper(lambda s: UI(s,Game()).run())

if __name__=='__main__':
    main()
