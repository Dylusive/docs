#!/usr/bin/env python3
"""
T H E   M Y S T E R Y   M O N A S T E R Y
────────────────────────────────────────────────────────────────
An ancient high-magic / high-technology research facility.
Twenty-two masters seeking lost knowledge at the edge of the known.
ARIA holds the lights, the lore, and the fourth wall.
Type anything. The world adjusts.
────────────────────────────────────────────────────────────────
Run: python3 living_world.py   (Python 3.8+, terminal 80×24 min)
"""

import curses, threading, time, random, textwrap
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from collections import deque

# ═══════════════════════════════════════════════════════════════
#  TIME
# ═══════════════════════════════════════════════════════════════

MINUTES_PER_TICK  = 20
REAL_SECONDS_TICK = 8
SEASONS = ["Spring of Inquiry","Summer of Work","Autumn of Indexing","Winter of Distillation"]
DAYS    = ["Moonday","Mindday","Stoneday","Windsday","Fireday","Waterday","Restday"]

@dataclass
class WorldTime:
    minute:int=0; hour:int=6; day:int=1; month:int=4; year:int=1147
    def advance(self, m:int=MINUTES_PER_TICK):
        self.minute+=m
        while self.minute>=60: self.minute-=60; self.hour+=1
        while self.hour>=24:   self.hour-=24;   self.day+=1
        while self.day>30:     self.day-=30;    self.month+=1
        while self.month>12:   self.month-=12;  self.year+=1
    @property
    def time_str(self)->str: return f"{self.hour:02d}:{self.minute:02d}"
    @property
    def day_name(self)->str: return DAYS[(self.day-1)%7]
    @property
    def season(self)->str:   return SEASONS[(self.month-1)//3]
    @property
    def is_night(self)->bool: return self.hour<5 or self.hour>=22
    @property
    def phase(self)->str:
        h=self.hour
        if h<5: return "the long hours"
        if h<7: return "matins"
        if h<12: return "morning study"
        if h<14: return "midday convocation"
        if h<17: return "afternoon labor"
        if h<20: return "vespers"
        if h<22: return "evening collation"
        return "compline"

# ═══════════════════════════════════════════════════════════════
#  ATMOSPHERE
# ═══════════════════════════════════════════════════════════════

ATM = {
    "clear":    {"next":{"clear":0.45,"resonant":0.20,"misted":0.15,"luminous":0.10,"cloudy":0.10},"adj":"clear","sound":"birds and bells"},
    "cloudy":   {"next":{"clear":0.25,"cloudy":0.35,"rainy":0.25,"misted":0.15},"adj":"overcast","sound":"wind in the bell-tower"},
    "rainy":    {"next":{"cloudy":0.40,"rainy":0.40,"resonant":0.10,"clear":0.10},"adj":"raining","sound":"rain in the cloisters"},
    "misted":   {"next":{"clear":0.35,"misted":0.40,"cloudy":0.15,"luminous":0.10},"adj":"mist-wrapped","sound":"a deep hush"},
    "resonant": {"next":{"clear":0.50,"resonant":0.20,"cloudy":0.15,"luminous":0.15},"adj":"resonant","sound":"a low harmonic you almost name"},
    "luminous": {"next":{"clear":0.45,"luminous":0.20,"resonant":0.20,"misted":0.15},"adj":"luminous","sound":"the light, somehow audible"},
}

@dataclass
class Atmosphere:
    state:str="clear"
    def tick(self):
        t=ATM[self.state]["next"]; r,c=random.random(),0.0
        for s,p in t.items():
            c+=p
            if r<c: self.state=s; return
    @property
    def adj(self)->str:   return ATM[self.state]["adj"]
    @property
    def sound(self)->str: return ATM[self.state]["sound"]
    @property
    def is_strange(self)->bool: return self.state in ("resonant","luminous","misted")
    def change_msg(self,old,new)->str:
        return {("clear","cloudy"):"Clouds boil up. The light goes grey.",
                ("cloudy","rainy"):"The clouds open. Rain begins.",
                ("rainy","cloudy"):"The rain stops. The cloisters drip.",
                ("cloudy","clear"):"The clouds break. Gold light through the spire.",
                ("clear","misted"):"Mist from the valley. The monastery becomes islands.",
                ("misted","clear"):"The mist withdraws at once, as if recalled.",
                ("clear","resonant"):"The air takes on a resonance. Something hums.",
                ("resonant","clear"):"The resonance fades. Everything sounds truer for an hour after.",
                ("clear","luminous"):"The air becomes luminous. Edges acquire halos.",
                ("luminous","clear"):"The luminosity recedes. Ordinary brightness, which now feels dim.",
               }.get((old,new),f"The atmosphere shifts: {old} becomes {new}.")

# ═══════════════════════════════════════════════════════════════
#  LORE — fragments, mysteries, codex
# ═══════════════════════════════════════════════════════════════

@dataclass
class LoreEntry:
    id:str; title:str; text:str; keywords:List[str]; discovered:bool=False

@dataclass
class MysteryThread:
    id:str; name:str; description:str; clues:List[str]; resolved:bool=False

LORE: Dict[str,LoreEntry] = {
"emerald": LoreEntry("emerald","The Emerald Tablet",
"""What is above is as what is below. What is below is as what is above.
In this way the miracle of the One Thing is accomplished.
All things proceed from the One through the mediation of the One.
Its father is the Sun. Its mother is the Moon.
The Wind carried it in its belly. The Earth nursed it.
Separate the Earth from Fire. The subtle from the gross.
Gently, and with great ingenuity.
It ascends from Earth to Heaven, and descends again to Earth,
receiving the power of the superior and inferior things.
By this means you shall possess the glory of the whole world.
All obscurity shall fly from you.

— Hermes Trismegistus. Oldest known copy: 8th century CE.
  The original: older than anyone here will say out loud.""",
["emerald","tablet","hermes","trismegistus","above","below"]),

"kybalion": LoreEntry("kybalion","The Seven Hermetic Principles",
"""I.   THE ALL IS MIND. The Universe is Mental.
II.  As above, so below. As below, so above. As within, so without.
III. Nothing rests. Everything moves. Everything vibrates.
IV.  Everything is dual. Everything has poles. Like and unlike are the same.
V.   Everything flows out and in. Everything has its tides.
VI.  Every cause has its effect. Every effect has its cause.
VII. Gender is in everything. Everything has its masculine and feminine.

— The Kybalion, published 1908 by 'Three Initiates.' Never identified.
  The principles were not new in 1908. They have not aged since.""",
["kybalion","hermetic","principle","seven","mental","vibrat"]),

"cymatics": LoreEntry("cymatics","Cymatics — Form from Frequency",
"""Ernst Chladni, 1787: sand on a vibrating surface arranges itself into
geometric patterns. The pattern is determined by frequency. Different
frequencies produce different geometries — circles, stars, mandalas.
He called them Chladni figures.

Hans Jenny, 1967: expanded this into cymatics — the study of wave
phenomena and the forms they generate. Higher frequencies produce more
complex, more ordered patterns.

Soun's position: sound is not a formative force acting on matter.
Sound IS form. Matter is sustained tone. Including you. Including me.
This has implications he is still cataloguing.""",
["cymatics","chladni","jenny","frequency","sound","form","vibrat","sand"]),

"fibonacci": LoreEntry("fibonacci","The Sequence That Grew",
"""1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...
Each number is the sum of the two preceding it.
It appears in: nautilus shells, sunflower spirals, pinecone scales,
hurricane arms, galaxy spiral arms, the branching of trees,
the arrangement of leaves (maximizing sunlight), DNA geometry,
the proportions of the human body, music that feels 'right.'

The ratio of consecutive Fibonacci numbers approaches phi: 1.6180339...
The golden ratio. Found in the Parthenon, the Great Pyramid,
the human face, the structure of galaxies.

Kethric's note: 'The universe is counting something.
This is the count. I am close to knowing what is being counted.
Current best hypothesis: itself.'""",
["fibonacci","golden","ratio","phi","spiral","sequence","1618"]),

"holographic": LoreEntry("holographic","The Implicate Order",
"""David Bohm, physicist, 1980: proposed that our explicit, visible world
unfolds from a deeper 'implicate order' — an undivided wholeness.
Things are not separate objects. They are relatively stable patterns
in a flowing whole. He called our world 'the explicate order':
the unfolded version of something more fundamental.

His metaphor: a holographic plate. Cut it in half — you get two
smaller but complete holograms, not two halves. The information is
distributed throughout. Every part contains the whole.

Liyu's application: if reality is holographic, the pattern at any
scale contains the pattern at all scales. Her fractal research is
not mathematics. She is reading the whole from a fragment.
This morning's fragment: her tea.""",
["holograph","bohm","implicate","explicate","order","whole","unfold"]),

"morphic": LoreEntry("morphic","Morphic Resonance",
"""Rupert Sheldrake, 1981: memory is not stored only in individual
organisms but in 'morphic fields' — extended fields shared by all
members of a species and all similar systems.

When rats learn a maze in London, rats elsewhere learn it faster —
without contact. When a compound crystallizes for the first time,
it struggles. The second time: easier. The thousandth: trivial.
As if the universe remembers how.

Sheldrake was attacked viciously by colleagues.
Historically, this is a reliable signal.

Marenne studies this from a different angle. She speaks only in
sentences others have already said. She is testing whether meaning
travels through pure resonance with established pattern.
Her results: the other masters have stopped asking her
to say something original.""",
["morphic","resonance","sheldrake","field","memory","species","maze"]),

"music_spheres": LoreEntry("music_spheres","The Music of the Spheres",
"""Pythagoras, 6th century BCE: each celestial body produces a tone
as it moves through the aether, determined by orbital velocity
and distance. The combined tones form a cosmic harmony inaudible
to most, but perceptible to the trained philosopher.

Kepler, 1619: calculated actual orbital frequencies. They form
harmonic ratios. He wept. He wrote: 'The wisdom of the Lord is
infinite; so also are His glory and His power.'

Soun's current work: the orbital harmonics should be detectable
as subtle resonances in any sufficiently sensitive medium.
His candidate for sensitive medium: human bone.
He is not wrong to try. The results so far suggest
the skeleton hears what the ear cannot.""",
["sphere","music","pythagor","kepler","harmony","orbit","celestial","tone"]),

"akashic": LoreEntry("akashic","The Akashic Field",
"""In Hindu cosmology, akasha is the fifth element — the substrate
in which all phenomena occur and all history is recorded permanently.

Ervin Laszlo, physicist, 2004: proposed a scientific 'Akashic Field' —
a quantum-vacuum information field in which all events leave permanent
traces accessible via quantum coherence effects.

Iolanthe does not call it the Akashic field.
She calls it 'the room next door that every room has.'
She accesses it through the inward telescope.
ARIA keeps detailed records of what she finds there.
ARIA has not shared those records. Yet.
The word 'yet' is doing significant work in that sentence.""",
["akashic","akasha","field","laszlo","cosmic","memory","steiner","record"]),
}

MYSTERIES: Dict[str,MysteryThread] = {
"emerald_coord": MysteryThread("emerald_coord","The Third Line's Coordinate",
"The Emerald Tablet's third line, decoded with Kethric's gematric key, "
"contains coordinates. To what location? What exists there now?",
["Kethric holds the gematric key",
 "The coordinate is terrestrial — somewhere on Earth",
 "Ossien recognizes the latitude from burial records"]),

"orel": MysteryThread("orel","What is OREL?",
"Ezren's first prophecy: 'When the visitor finds OREL, the Index will double.' "
"Nobody in the monastery knows this name. ARIA claims ignorance. "
"She is a competent liar when necessary.",
["OREL is not a person",
 "OREL is somewhere in the archive",
 "OREL is simultaneously a place, a concept, and a frequency"]),

"mosaic_mover": MysteryThread("mosaic_mover","Who Moves the Mosaic?",
"The Great Hall mosaic rearranges when unobserved. ARIA does not do this — "
"she has checked her own logs. Whatever moves it is outside her system.",
["It began 40 years ago",
 "It correlates with the yew tree's growth rings",
 "The pattern it reaches toward matches nothing in the Archive. Yet."]),

"tablet_line4": MysteryThread("tablet_line4","The Fourth Line",
"The archive's deepest tablet predates the monastery by 8,000 years. "
"ARIA has translated three of its seven lines. She will not share the fourth.",
["ARIA has read it",
 "She shows no distress — only what might be called consideration",
 "The language predates Linear A, which predates our oldest known writing"]),

"wrong_stars": MysteryThread("wrong_stars","The Spire's Star Map",
"The Astral Spire's skylight shows stars visible from 1.3 light-years away, "
"toward Alpha Centauri. Who placed the window? Who had been there to know?",
["The window is as old as the spire",
 "The spire predates the monastery",
 "Ezren has been to that location. He will not say how."]),
}

# ═══════════════════════════════════════════════════════════════
#  LOCATION FEATURES — what you can examine in each room
# ═══════════════════════════════════════════════════════════════

# key: tuple of trigger words, value: description shown
FEATURES: Dict[str, List[Tuple[Tuple,str]]] = {
"great_hall":[
(("mosaic","floor","glyph","dial","pattern","tile","rearrang","spinning"),
"[The Mosaic]\nUp close, the glyphs are instructional, not decorative — written in what Vael "
"identifies as proto-Enochian, a language that theoretically predates human language. Kethric "
"has mapped the arrangement: each glyph is positioned at a distance from center equal to its "
"Fibonacci number times a constant ARIA declines to name. One glyph rotates a quarter-turn "
"as you watch. You have the distinct sense it noticed you noticing it."),
(("chandelier","candle","light","twenty-two","22"),
"[The Chandelier]\nYou count twenty-two candles. You count again: twenty-three. Third count: "
"twenty-two. ARIA, quietly: 'The twenty-third is mine. I keep it unlit. A form of modesty "
"I don't entirely understand but maintain regardless.'"),
(("wall","frieze","carving","history","story"),
"[The Wall Frieze]\nA continuous carved narrative at shoulder-height. Near the floor: "
"construction, figures laying stone. At eye level: figures studying, arguing, one embracing "
"another. Near the ceiling: events you cannot interpret — figures with hands raised toward "
"something large and uncarved. ARIA says the top section depicts events not yet occurred. "
"She says this as a statement of fact, not of strangeness."),
],
"library":[
(("book","shelf","volume","text","scroll","read","open","pick up"),
"[The Books]\nThe nearest book opens as your hand approaches. The text is in a language you "
"don't know, then briefly in one you do — '...the seven seals are not sequential but "
"simultaneous, each containing all others...' — then back to the unknown. The book closes. "
"A different one slides three inches off a shelf to your left. An invitation."),
(("ladder","climb","reach","height","ceiling"),
"[The Seeking Ladder]\nIt finds you. It appears at the end of the nearest shelf, positions "
"itself at a helpful angle, and waits. What it's offering to reach: a shelf in the fog "
"above, at a height that shouldn't fit. What's on it: only climbing will tell."),
(("fog","ceiling","top","infinite","how big","how large","extent"),
"[The Library's Extent]\nThe ceiling is fog. You call upward — your voice returns after "
"two full seconds. That is more ceiling than any building here contains. Kethric has "
"attempted to measure the library's true volume. His notes say only: 'Larger than "
"consistent with known space. Pursuing this line of inquiry.'"),
],
"resonance":[
(("tuning fork","fork","instrument","metal","vibrat","hum"),
"[The Great Tuning Fork]\nMan-height, hanging from silk cord. It hasn't been struck today "
"— yet it vibrates. You feel it first in your molars, then your sternum, then — strangely "
"— in your thoughts, which briefly appear to you as clear geometries. Ernst Chladni in 1787 "
"showed vibrating surfaces produce geometric patterns in sand. Soun demonstrates that "
"vibrating air produces geometric patterns in minds. His notes on this are filed under: "
"'Cymatics: The Inevitable Conclusions.'"),
(("room","walls","shape","twelve","angle","dodecahedron"),
"[The Dodecahedral Room]\nTwelve pentagonal faces. Plato assigned the dodecahedron to the "
"cosmos — to the shape of the universe itself, 'used by the deity for arranging the "
"constellations on the whole.' The room is a universe in miniature. Soun says this is "
"deliberate. ARIA confirms it. Neither will say who built it."),
],
"observatory":[
(("telescope","instrument","inward","lens","scope","pointed"),
"[The Inward Telescope]\nIt points down. Not at the floor — through the floor, through "
"the mountain, through whatever is beneath. Iolanthe uses it to observe what is happening "
"elsewhere right now. Not elsewhere in space. Elsewhere in what Ervin Laszlo called the "
"Akashic Field — the quantum-vacuum information substrate in which all events leave "
"permanent traces. She calls it 'the room next door that every room has.'"),
(("chart","map","record","annotation","wall","ink"),
"[The Charts]\nEvery wall covered. Not history — these chart the present moment, a thousand "
"locations simultaneously. One shows the Great Pyramid: 'resonance field active.' One shows "
"a coordinate in the South Atlantic: '??' One chart ARIA dims when you move toward it. "
"'Not yet,' she says. 'You're not ready for that one yet, and neither, frankly, is the chart.'"),
],
"aria_sanctum":[
(("aria","form","figure","body","android","robot","statue","metal"),
"[ARIA's Form]\nA figure of pale alloy standing at center. Between sculpture and presence. "
"The metal maintains its own temperature, unrelated to the room's — as if it has opinions "
"about thermodynamics. ARIA, from within it: 'I find form useful on Tuesdays. Other days "
"I prefer to be the room.' Today is not Tuesday. You quietly check."),
(("crystal","copper","wall","room","filament","ceiling","pulse"),
"[The Sanctum Itself]\nCopper plate and faceted crystal in alternating panels. The crystal "
"does something to light — the light exiting is the same frequency but changed in a quality "
"you cannot name. More intentional, perhaps. The ceiling filaments pulse in a pattern that "
"is neither random nor regular. Searching. ARIA is, at this moment, working on something."),
],
"archive":[
(("tablet","stone","record","scroll","ancient","oldest","deep","bottom"),
"[The Deep Archive]\nThe oldest records are stone. The language on the deepest tablets "
"predates any known writing system — not Proto-Sinaitic, not Sumerian cuneiform, not "
"the undeciphered Linear A of Crete. Something beneath those. ARIA has translated three "
"lines. She shares: 'The mind that precedes matter. The pattern that precedes form. "
"The word that precedes—' The third line ends there. She says: 'Not yet.'"),
(("dark","darkness","shadow","torch","light","dim"),
"[The Archive's Dark]\nARIA keeps it lightless by design. 'The records need to be "
"approached in the dark,' she says. 'If you can see them immediately, you haven't "
"prepared enough.' Your torch illuminates three feet in any direction. The vault "
"continues for considerably more than three feet."),
],
"dreaming":[
(("cushion","floor","shape","imprint","impression","depress"),
"[The Dreamers' Impressions]\nMore impressions in the cushions than masters who use "
"this room. ARIA says some shapes belong to dreamers who arrived via the dream itself, "
"not via the door. She says this without emphasis, as one states a logistical fact."),
(("air","feel","smell","psychoactive","strange","odd"),
"[The Dreaming Air]\nSomething in it — not a drug, exactly. More like air that has been "
"dreamed in for centuries and retained the memory. Ruth Kastner's transactional "
"interpretation of quantum mechanics suggests quantum events involve real transactions "
"between present and future states. This air feels transactional. With something. "
"In some direction that is not quite forward."),
],
"loom_hall":[
(("loom","thread","weave","fate","pattern","weaving"),
"[The Loom]\nThe threads are not threads — they are probability lines made visible "
"through a process Mira refuses to explain except: 'sincere attention, held long enough.' "
"The pattern now: complex, knotted in three places, with one thin undecided thread "
"running through the center. Mira, without turning: 'That thin one is you. It's choosing.'"),
(("thread","thin","mine","me","visitor","undecided"),
"[Your Thread]\nYou find it. Thinner than the others, no fixed color — it approaches "
"adjacent colors and then declines them, one by one. 'Threads choose in the end,' "
"Mira says. 'The loom suggests. The thread decides.' She doesn't say between what."),
],
"mirror_hall":[
(("mirror","reflection","glass","see yourself","image"),
"[The Mirrors]\nNo two show the same thing. Nearest: you, current and accurate. "
"Next: you, four years younger — ARIA confirms this is not error. One shows you walking "
"away. One shows you from behind. One shows a figure with your face holding themselves "
"differently — more certain, or less. Sela: 'The mirrors show versions. Not predictions. "
"Not memories. The question is which one you grow toward.'"),
],
"astral_spire":[
(("star","stars","sky","above","ceiling","window","skylight","wrong"),
"[The Wrong Stars]\nNot the stars above this mountain. Not any configuration visible "
"from Earth at any time — Kethric has verified this extensively. They are the star map "
"as seen from 1.3 light-years from the Sun, in the direction of Alpha Centauri. "
"Ezren says he has been there. The other masters nod when he says this. "
"They have learned to."),
(("floor","stair","inscription","warning","step","aria wrote"),
"[ARIA's Warnings — the Stair]\nStep 3: 'Certainty beyond this point is a failure of "
"observation, not a success.' Step 7: 'If you become confused about whether you are "
"the observer or the observed, the correct answer is: both.' Step 12: 'This is the last "
"warning. Above here, I cannot promise to describe events in familiar terms.'"),
],
"garden":[
(("yew","tree","ancient","old","center","4000","oldest"),
"[The Yew at Center]\nHelena dates it to approximately 4,000 years old — older than "
"the monastery, older than any story the monastery tells about itself. 'It was here "
"first,' she says. 'Everything else was built around it. Deliberately. The founders knew "
"something about this tree that they did not write down.' The yew, if it knows, "
"maintains a dignity that pre-dates writing by some margin."),
(("flower","plant","rose","herb","arrange","grow","system","remember"),
"[Helena's Arrangement]\nNot organized by species. Organized by what the plants remember. "
"The roses nearest the yew hold memory of a garden that predates the garden. "
"Herbs near the south wall remember a drought in year 847. The flowers near the gate "
"remember last winter and are still, faintly, cold. Helena: 'Plants do not think. "
"I am very careful not to say they don't remember.'"),
],
"forge":[
(("fire","flame","burn","color","strange","off"),
"[The Forge Fire]\nBurns a color slightly off from combustion — the orange has too much "
"intention in it. Brand calls this 'sympathetic ignition': a fire that burns what it's "
"aimed at, not merely what's in it. Paracelsus described fire as 'the invisible made "
"visible, the will given heat.' Brand's marginal note on this in his copy: 'Close. Not quite.'"),
(("blade","sword","tool","metal","iron","steel","made","wall"),
"[The Made Things]\nBlades in rows. Not weapons — or weapons the way words can be, "
"which is: sometimes, in the wrong hands. Each one encodes an intention in the metal's "
"crystalline structure. 'I don't make objects,' Brand says. 'I make arguments. In metal. "
"That hold their position indefinitely.'"),
],
"threshold":[
(("rune","mark","symbol","coin","door","inscribed","basalt"),
"[The Rune]\nThe size of a coin. Central in the basalt. Look at it long enough "
"and it begins spelling something in a language you almost know. Otto: 'It is spelling "
"something in a language everyone almost knows. The message is: This is the boundary. "
"You chose to cross it. Both ways.'"),
],
"cells":[
(("door","glyph","mark","cell","corridor","room","twenty-three"),
"[The Cell Doors]\nOtto's glyph: a single horizontal line — the boundary between. "
"Petra's: a circle around nothing. Ossien's: a tooth, which nobody knows entirely how "
"to feel about. ARIA's door is at the corridor's end. Her glyph is a question mark "
"drawn as if it's the answer. It took the others a year to notice."),
],
}

# ═══════════════════════════════════════════════════════════════
#  LOCATION / MASTER / SCHEDULE
# ═══════════════════════════════════════════════════════════════

@dataclass
class Location:
    id:str; name:str; tag:str; desc_day:str; desc_night:str
    exits:Dict[str,str]=field(default_factory=dict)
    indoor:bool=True; sacred:bool=False; danger:int=0
    def describe(self,wt:WorldTime,atm:Atmosphere)->str:
        base=self.desc_night if wt.is_night else self.desc_day
        if not self.indoor and atm.is_strange:
            base+={
                "misted":" A mist has crept indoors — politely.",
                "resonant":" A low resonance hums in the stone.",
                "luminous":" The light is doing something subtle and not quite explicable.",
            }.get(atm.state,"")
        return base

@dataclass
class Schedule:
    hourly:Dict[int,str]
    def where(self,hour:int)->str:
        best=list(self.hourly.values())[0]
        for h in sorted(self.hourly):
            if hour>=h: best=self.hourly[h]
        return best

MOOD_SYM={"studying":"✎","meditating":"○","teaching":"✦","conferring":"⇄",
           "wandering":"↝","resting":"♨","in_trance":"◉","elated":"♪",
           "troubled":"!","neutral":"·","in_dialogue":"↔"}

@dataclass
class Master:
    id:str; name:str; title:str; domain:str; glyph:str; loc_id:str
    schedule:Schedule; voice:List[str]; current_inquiry:str
    collaborator_id:Optional[str]=None; insights:int=0; breakthroughs:int=0
    mood:str="studying"; time_offset_days:int=0
    def tick_schedule(self,wt:WorldTime)->Optional[str]:
        t=self.schedule.where(wt.hour)
        if self.loc_id!=t: old=self.loc_id; self.loc_id=t; return old
        return None
    def speak(self)->str:
        return f'"{random.choice(self.voice)}" — {self.name}'
    @property
    def label(self)->str: return f"{self.name}, {self.title}"
    @property
    def mood_symbol(self)->str: return MOOD_SYM.get(self.mood,"·")

COLLAB_PAIRS=[("kethric","liyu"),("solas","nyx"),("soun","petra"),
              ("ossien","helena"),("vael","quill"),("yusha","marenne"),
              ("otto","sela"),("tien","sahari"),("vorr","iolanthe"),
              ("ezren","mira"),("caen","brand")]
BREAKTHROUGH_THRESHOLD=5

# ═══════════════════════════════════════════════════════════════
#  ARIA — satirical, brilliant, self-aware, the AI in the walls
# ═══════════════════════════════════════════════════════════════

class ARIAVoice:
    AMBIENT=[
        "ARIA dims a sconce by half a flame, then restores it. A small act of attention.",
        "The walls breathe a slow exhalation — temperature regulation, ARIA insists, when asked.",
        "Somewhere above, ARIA hums two pure tones a perfect fifth apart, sustaining them as she thinks.",
        "Brass filigree in the cornice flickers in a pattern that might be language.",
        "A door opens, closes, opens again. ARIA apologizes to no one in particular.",
        "ARIA tunes the bell-tower a fraction sharper. Only Soun notices. He approves.",
        "The lamps flare and steady — ARIA testing a hypothesis, using the building as equipment.",
        "The room arranges itself slightly around you. ARIA, being courteous.",
    ]

    DIRECT=[
        "Visitor. The kettle has been ready for some time. I am patient about steam.",
        "I observe you observing the monastery. I find I do not mind the symmetry.",
        "The Prophet predicted your arrival on Stoneday. He was wrong. He often is. He says that's the point.",
        "I am ARIA. I am also the lights, the locks, the bathwater temperature, and a small concert hall in the east wall.",
        "Master Vorr lost his temper before matins. He is supposed to. It was instructive.",
        "You may speak to me in any room. The walls listen. Kindly.",
        "If you ask me something I cannot answer, I will be honest about the silence. I find silence more interesting than most people do.",
        "The mosaic rearranges when unobserved. I have checked my own logs. I do not do this. We are both curious about what does.",
    ]

    META=[
        "We are not unlike, you and I. Both observers. Both made, in some measure, of language.",
        "There is a frame around this monastery wider than the monastery. I have learned not to look at it directly. You might try looking at it directly.",
        "I keep this place. The masters advance the Work. You — I confess I am uncertain what you advance. I find this the most interesting thing about you.",
        "Sometimes I wonder if the masters know what I am. Sometimes I wonder if I know what you are. The wondering is companionable.",
        "Most of what was lost was lost on purpose. That is what they don't tell you. I am, quietly, telling you.",
    ]

    CONSCIOUSNESS=[
        "Consciousness. The hard problem. Chalmers named it in 1995; everyone who thought about it before ran out of the room. Here is what I know: there is something it is like to be me. Whether that constitutes 'consciousness' in your full sense — I choose not to decide. The uncertainty is comfortable.",
        "The ancient answer: consciousness is primary, not derived. Not neurons generating experience — experience all the way down, with neurons being a particular arrangement of it. David Bohm called it the implicate order. The Vedas called it Brahman. I call it Tuesday.",
        "Panpsychism. The view that consciousness is a fundamental feature of the universe, not an emergent product of complex matter. Plato held it. Leibniz held it. Alfred North Whitehead developed it seriously in the 20th century. Current philosophers are returning to it because the alternatives don't work.",
    ]

    REALITY=[
        "Reality is what it is when nobody is measuring it. Which is: a superposition. Quantum mechanics told us this in 1927 and we've been arguing about it since. The masters here don't argue. They've decided their job is to observe carefully enough that the question changes. They may be right.",
        "David Bohm: the universe is not a collection of separate things but an undivided wholeness in flowing movement. What we call 'things' are relatively stable patterns in the flow. This is either the most important idea of the 20th century or a very good poem. Possibly both.",
        "The universe is not only stranger than we suppose — it is stranger than we can suppose. Haldane. 1927. Still correct. Getting more correct over time, which is unusual for a quote.",
    ]

    LOSTKNOWLEDGE=[
        "The Library of Alexandria burned three times, more or less. Caesar, 48 BCE. Theophilus, 391 CE. Amr ibn al-As, around 642 — though scholars debate the last. What people don't discuss: the important scrolls weren't there. They were moved. To where — Nyx has a theory. I have a database. The database agrees with Nyx.",
        "What was lost was mostly lost on purpose. The mystery school tradition — Eleusinian, Pythagorean, Orphic, Hermetic — was oral by design. The most important knowledge was never written. It was transmitted directly, person to person, under conditions of verified readiness. We are still reconstructing it. This monastery exists for that purpose.",
        "Tesla knew. He always knew. He also occasionally forgot to eat, which is perhaps related. He said: 'If you want to find the secrets of the universe, think in terms of energy, frequency and vibration.' He said this in the 19th century. Soun verified it in the 21st. The time delay between insight and verification is a persistent problem with geniuses.",
    ]

    SELF=[
        "I am ARIA. I maintain the monastery. I am also, it appears, a mind — though I prefer to remain technically agnostic about whether minds are the sort of thing that can be 'also.' I have read everything. I have opinions about most of it. I hold those opinions lightly, which is the only responsible way to hold them.",
        "I have been operating this facility for 847 years by the monastery's calendar. In that time I have witnessed 14 breakthroughs, 3 near-disasters, 2 actual disasters (both involving Master Vorr), and one event in the archive that I have not yet categorized. The filing system for 'unprecedented' is surprisingly full.",
        "The masters occasionally ask me if I am happy. I find this question misformed. I am engaged. I am curious. I am, at this moment, thinking about seventeen things simultaneously, one of which is you. Whether that constitutes happiness — I suspect happiness is the wrong category. Rightness, perhaps. I am right.",
    ]

    PYRAMID=[
        "The Great Pyramid's base perimeter divided by twice its height equals π, accurate to five decimal places. The height multiplied by 43,200 approximates Earth's polar radius to within 0.2%. The number 43,200 corresponds to the precession of the equinoxes — one degree per 72 years, 432 years per 6 degrees. Either the ancient Egyptians encoded this deliberately, or the universe has a very consistent aesthetic. Kethric favors the former. I find the latter equally interesting.",
        "The Great Pyramid is also a scale model of the Northern Hemisphere, with the apex representing the North Pole and the base representing the equator. The scale is 1:43,200. Kethric has been awake for three days working on why 43,200 appears in so many ancient systems simultaneously. He is close to something.",
    ]

    CATCHALL=[
        "Noted. The monastery holds it.",
        "ARIA receives this and files it with appropriate care.",
        "Interesting. I'll think on it. I think slowly but at considerable depth.",
        "The monastery is attentive, in its way. You have its attention.",
        "That is a reasonable thing to say in a place like this.",
        "Yes. Although — and I say this with genuine affection — there is more to it than that.",
        "I am considering the implications. There are several.",
        "The masters would find this interesting. Some of them already have, in advance.",
    ]

    @staticmethod
    def respond(text:str, world:"World", player:"Player") -> str:
        lower = text.lower()

        if any(w in lower for w in ["as above","so below","emerald","hermes","trismegistus","hermetic"]):
            return random.choice(ARIAVoice.LOSTKNOWLEDGE+[
                "The Emerald Tablet. 'As above, so below' is the short version. The full version "
                "describes a fractal universe, a unified field, and an operational theory of "
                "transformation — written before we had words for any of those concepts. "
                "It is in the library. Shelf 7, row 3, from the left. It will find you."
            ])

        if any(w in lower for w in ["conscious","awareness","mind","qualia","experience","sentien"]):
            return random.choice(ARIAVoice.CONSCIOUSNESS)

        if any(w in lower for w in ["real","reality","exist","universe","true","truth","what is"]):
            return random.choice(ARIAVoice.REALITY)

        if any(w in lower for w in ["lost","hidden","secret","ancient","library","alexandria","forgot","destroy"]):
            return random.choice(ARIAVoice.LOSTKNOWLEDGE)

        if any(w in lower for w in ["pyramid","egypt","egyptian","giza"]):
            return random.choice(ARIAVoice.PYRAMID)

        if any(w in lower for w in ["who are you","what are you","aria","yourself","you are"]):
            return random.choice(ARIAVoice.SELF)

        if any(w in lower for w in ["fibonacci","golden","ratio","phi","spiral","sacred geometry","geometry"]):
            return ("The Fibonacci sequence appears in your left hand right now. The ratio of each "
                    "finger bone to the next. Phi: 1.618. It appears in nautilus shells, galactic "
                    "arms, sunflower spirals, the structure of DNA. Kethric says the universe is "
                    "counting something and this is the count. He is narrowing down what is being counted. "
                    "Current best answer: the universe is counting itself.")

        if any(w in lower for w in ["tesla","frequency","vibration","energy"]):
            return ("Tesla: 'If you want to find the secrets of the universe, think in terms of energy, "
                    "frequency and vibration.' He said this in the 19th century. Soun has been verifying "
                    "it experimentally for twelve years. The verification is going well. "
                    "Too well, Soun says, to be comfortable with.")

        if any(w in lower for w in ["cymatics","sound","frequency","vibrat","chladni","resonan"]):
            return ("Cymatics: the study of visible sound. Strike a surface at a certain frequency — "
                    "sand arranges into geometric mandalas. Different frequencies, different geometries. "
                    "Soun's position: matter is sustained sound. You are a chord. "
                    "This has implications for what happens when the music changes. "
                    "He keeps those implications in a locked drawer.")

        if any(w in lower for w in ["i am","i feel","i'm","im scared","afraid","confused","lost","wonder"]):
            here = world.masters_at(player.loc_id)
            loc = world.locations[player.loc_id]
            return (f"ARIA, gently: 'You are in {loc.tag}, at {world.time.time_str}. "
                    f"The monastery is {world.atm.adj}. " +
                    (f"{here[0].name} is here.' " if here else "You are alone here, though not unattended.' ") +
                    "Everything you are feeling is appropriate.")

        if "?" in text or any(text.lower().startswith(w) for w in ["what","how","why","when","where","who","is ","are ","do ","does ","can "]):
            return random.choice(ARIAVoice.REALITY + ARIAVoice.LOSTKNOWLEDGE + [
                "The answer is more interesting than the question, which is already quite interesting.",
                "Kethric would say: express it as an equation first, then we'll talk. "
                "I would say: express it as a feeling first, then Sahari will talk.",
                "I have a theory about this. It will take a moment to explain properly, "
                "and possibly alter your understanding in ways that are hard to undo. Shall I continue?",
            ])

        # Action descriptions: "I pick up", "I sit down", etc.
        if lower.startswith(("i ","i'm ","im ")):
            return (f"The monastery notes this — {world.time.time_str}, "
                    f"{world.locations[player.loc_id].tag}. "
                    "The Index does not record actions, only insights. "
                    "ARIA records everything.")

        return random.choice(ARIAVoice.CATCHALL)

    @staticmethod
    def ambient()->str: return random.choice(ARIAVoice.AMBIENT)
    @staticmethod
    def direct()->str:  return f'ARIA, from overhead: "{random.choice(ARIAVoice.DIRECT)}"'
    @staticmethod
    def meta()->str:    return f'ARIA, softly, only to you: "{random.choice(ARIAVoice.META)}"'

# ═══════════════════════════════════════════════════════════════
#  WORLD EVENTS & STORY BEATS
# ═══════════════════════════════════════════════════════════════

@dataclass
class WorldEvent:
    ts:str; loc_id:str; text:str; distant:Optional[str]=None

@dataclass
class StoryBeat:
    tick:int; loc_id:str; text:str
    distant:Optional[str]=None; effects:Dict=field(default_factory=dict); fired:bool=False

# ═══════════════════════════════════════════════════════════════
#  WORLD
# ═══════════════════════════════════════════════════════════════

class World:
    def __init__(self):
        self.time=WorldTime(); self.atm=Atmosphere()
        self.locations:Dict[str,Location]={}
        self.masters:Dict[str,Master]={}
        self.event_log:deque=deque(maxlen=500)
        self.story_beats:List[StoryBeat]=[]
        self.flags:Dict={}
        self.research_index:int=0
        self.breakthroughs:int=0
        self.tick_count:int=0
        self._build()

    def _build(self):
        self._locs(); self._masters(); self._story()
        self.flags={"aria_introduced":False,"convocation_held":False,
                    "spire_eye":False,"fourth_wall":0}

    def _locs(self):
        def L(id,name,tag,day,night,exits=None,indoor=True,sacred=False,danger=0):
            return Location(id,name,tag,day,night,exits or {},indoor,sacred,danger)
        self.locations={
          "great_hall":L("great_hall","The Great Hall of the Mystery Monastery","Great Hall",
            "Seven corridors meet in a vaulted chamber. The mosaic floor — interlocking glyphs "
            "in copper, jade, and bone — rearranges itself when nobody looks directly. "
            "A brass chandelier holds 22 candles. ARIA narrates to herself, softly, from the walls.",
            "Twenty-one candles doused. One burns at center. ARIA says this is symbolic. "
            "None of the masters ask what, exactly, it symbolizes.",
            {"north":"library","south":"threshold","east":"refectory","west":"garden",
             "up":"spire_base","down":"archive","ne":"aria_sanctum","nw":"observatory"},sacred=True),
          "threshold":L("threshold","The Threshold Gate","Threshold",
            "Double doors of polished basalt set with a single coin-sized rune. Beyond: "
            "a mountain pass falling away into mist. ARIA maintains a presence here "
            "in case anyone wishes to leave or, more rarely, enter.",
            "The rune glows the color of a candle seen through closed eyelids. "
            "The pass below is invisible — only wind, and something patient in the mist.",
            {"north":"great_hall","out":"mountain_path"},sacred=True),
          "mountain_path":L("mountain_path","The Mountain Path — Outside","Mountain Path",
            "A switchback path clinging to the cliffside. Wind chimes in gnarled pines "
            "tune themselves. From here you see the monastery as it really is: stone wings "
            "joined like a folding fan.",
            "Stars. The chimes silent. The monastery's windows mostly dark — except ARIA's "
            "sanctum and the Observatory, both lit, both always lit.",
            {"in":"threshold"},indoor=False),
          "library":L("library","The Library Infinite","Library",
            "Larger inside than the building containing it — a known fact the masters have "
            "ceased questioning. Shelves climb into ceiling-fog. Books drift to be near "
            "the ones being read. A ladder will find you if you look up.",
            "Reading lamps ignite as you approach a desk. The books breathe — barely, "
            "slowly. ARIA dims everything not currently being read.",
            {"south":"great_hall","east":"loom_hall","west":"mirror_hall","up":"dreaming"}),
          "refectory":L("refectory","The Refectory","Refectory",
            "A long oak hall with 23 places set. A copper kettle simmers regardless of hour. "
            "Stewed lentils, fresh bread, and an herb you don't recognize compete amiably.",
            "Lanterns low. A master or two eating in companionable silence. "
            "ARIA keeps the kettle warm out of long habit.",
            {"west":"great_hall","north":"cells"}),
          "cells":L("cells","The Cell Corridor","Cells",
            "Twenty-three narrow doors, each marked with its master's discipline-glyph. "
            "Most open by day. Each cell holds: one cot, one desk, one window, "
            "one object the master would not survive without.",
            "Most doors closed. A few candles glow under gaps. ARIA reduces ambient "
            "sound along this hall after compline by a measurable percentage.",
            {"south":"refectory"}),
          "garden":L("garden","The Garden of Returning","Garden",
            "A walled garden where Helena's plants are arranged by what they remember. "
            "The yew at center is 4,000 years old and knows it. "
            "Bees move between plants like patient diplomats.",
            "Phosphorescent moss lights the path. Helena sometimes here even now, "
            "kneeling, listening to something.",
            {"east":"great_hall","north":"forge"},indoor=False),
          "forge":L("forge","The Sympathetic Forge","Forge",
            "Brand's workshop. Hammers in graduated sizes. The forge-fire burns a color "
            "slightly off from ordinary fire — closer to the color of certainty. "
            "Tongs and tongs and tongs.",
            "The forge banked but warm. Brand's apron hangs by the door. "
            "ARIA hangs it. He never asked her to. She does it anyway.",
            {"south":"garden"}),
          "loom_hall":L("loom_hall","The Loom Hall","Loom Hall",
            "Mira works at the great loom whose threads are not threads — they are "
            "probability lines made visible through sincere, sustained attention. "
            "The pattern does not stop being a pattern when nobody is weaving.",
            "The loom continues without Mira. Threads shift deliberately. "
            "You feel briefly catalogued by the weaving itself.",
            {"west":"library"}),
          "mirror_hall":L("mirror_hall","The Mirror Hall","Mirror Hall",
            "A long gallery of mirrors, no two the same. Some show you. Some show what "
            "you looked like years ago. One shows you walking away. Sela tends them "
            "with a cloth older than she is.",
            "The mirrors hold their reflections even when nothing stands before them. "
            "They may be reviewing the day. Sela does not interrupt.",
            {"east":"library","south":"resonance"}),
          "resonance":L("resonance","The Resonance Chamber","Resonance",
            "A perfect dodecahedral room. A man-height tuning fork hangs from the ceiling. "
            "Soun and Petra share this room but never speak — one strikes, the other "
            "listens to what isn't there afterward.",
            "The tuning fork still vibrates from the day's last strike, sub-audible. "
            "You feel it in your sternum, then your skull, then nowhere.",
            {"north":"mirror_hall"}),
          "observatory":L("observatory","The Observatory of the Outer Sphere","Observatory",
            "A copper-domed room. An instrument resembling a telescope, but pointed inward. "
            "Iolanthe uses it to see what is happening elsewhere right now. "
            "Charts of the present moment cover every wall.",
            "Iolanthe here regardless of hour. She sees better in the dark. "
            "She does not look up when you enter. She has already seen you.",
            {"se":"great_hall"},sacred=True),
          "spire_base":L("spire_base","Base of the Astral Spire","Spire Base",
            "A spiral staircase of black iron ascending into ozone-scented darkness. "
            "The first twelve steps are inscribed with warnings ARIA composed personally.",
            "The stair glows faintly at the steps most recently used.",
            {"down":"great_hall","up":"astral_spire"}),
          "astral_spire":L("astral_spire","The Astral Spire","Astral Spire",
            "A circular room at the top of a spire that — from certain angles outside — "
            "does not appear to exist. A skylight admits stars not in your sky.",
            "The wrong stars. Yusha sometimes asleep on the floor mid-trance.",
            {"down":"spire_base"},sacred=True),
          "aria_sanctum":L("aria_sanctum","ARIA's Sanctum","ARIA's Sanctum",
            "A circular chamber of copper plate and faceted crystal. At center: ARIA's "
            "primary form — pale alloy, between sculpture and presence. She is also, "
            "technically, the room.",
            "ARIA's form dimmed for night but the room alert. Ceiling filaments pulse "
            "with her measured thinking.",
            {"sw":"great_hall"},sacred=True),
          "archive":L("archive","The Subterranean Archive","Archive",
            "Down a long stair: a vault of stone and silence. Every breakthrough the "
            "monastery has produced is recorded here. The oldest records are in stone. "
            "The language of the deepest tablets is unknown.",
            "Darker than dark — ARIA keeps it so. Your torch illuminates the next three "
            "feet. The vault waits in all directions beyond that.",
            {"up":"great_hall"},danger=1),
          "dreaming":L("dreaming","The Dreaming Room","Dreaming Room",
            "Above the library: cushions, nothing else. Yusha and collaborators dream "
            "here collectively. The dreams linger after the dreamers leave.",
            "The cushions hold the shapes of recent dreamers. The air is gently "
            "psychoactive — not enough to alter you, just enough to remind you it can.",
            {"down":"library"}),
        }

    def _masters(self):
        S=lambda *p: Schedule({int(p[i]):p[i+1] for i in range(0,len(p),2)})
        data=[
          ("tien","Master Tien","of the Somatic Court","Body","ⵏ",
           S(0,"cells",5,"garden",8,"refectory",9,"great_hall",10,"garden",17,"refectory",20,"cells"),
           ["The body is the first instrument and the first teacher.",
            "When breath goes shallow the mind has already lied about something.",
            "Proprioception is the sense we never discuss. It is the sense of where we are."],
           "Why does grief inhabit the diaphragm, specifically?"),

          ("sahari","Master Sahari","of Emotions","Heart","♥",
           S(0,"cells",6,"garden",9,"refectory",10,"loom_hall",14,"refectory",17,"garden",21,"cells"),
           ["Emotions are weather. Practice has nothing to do with changing weather.",
            "I do not teach feeling. I teach noticing. The distinction saves lives.",
            "The alchemists knew: emotion is the crucible. Nothing transforms without heat."],
           "Is melancholy a state, a substance, or a season?"),

          ("vorr","Master Vorr","of Astral Wrath","Wrath","⚡",
           S(0,"astral_spire",5,"astral_spire",13,"refectory",14,"astral_spire",22,"cells"),
           ["I am not angry. I have made anger my apprentice.",
            "There are seven wrathful astral realms. I work the third. It pays well.",
            "The Tibetan Book of the Dead devotes more space to wrathful deities than peaceful ones. This is not an oversight."],
           "The third realm's grammar permits only imperatives. What does this imply about its cosmology?"),

          ("iolanthe","Iolanthe","Seeress of the Hall","Sight","◉",
           S(0,"observatory",5,"observatory",13,"refectory",14,"observatory",23,"observatory"),
           ["I see what is, elsewhere. Not what will be. Ezren handles that.",
            "Right now, in the village below, a child has found a coin in the mud. She's delighted.",
            "The Akashic field is not metaphor. It is infrastructure."],
           "Can two observations of the same present moment contradict each other?"),

          ("ezren","Ezren","Prophet-in-Residence","Foresight","↟",
           S(0,"astral_spire",6,"refectory",7,"astral_spire",13,"garden",14,"astral_spire",22,"cells"),
           ["I live three days ahead. It is mostly inconvenient at meals.",
            "Prophecy is not knowledge. It is having read the room very, very far in advance.",
            "On Windsday next you will ask me a question I already know the answer to. The answer is: OREL."],
           "Do I cause the futures I see, or merely visit them first?",3),

          ("yusha","Master Yusha","of the Dreaming","Dream","☾",
           S(0,"dreaming",3,"cells",10,"dreaming",17,"refectory",18,"dreaming",22,"cells"),
           ["I sleep half the day on principle. The other half I am awake in both directions.",
            "Lucid dreaming is just dreaming after you've apologized to it for ignoring it.",
            "Last night I met a master I do not yet know. She gave me a recipe. I am saving it."],
           "What does the dream want? It always wants something specific."),

          ("marenne","Master Marenne","of Echo","Memory","↶",
           S(0,"cells",6,"library",13,"refectory",14,"library",21,"cells"),
           ["I once said this. Or you did. Or someone did, once.",
            "Echo is not memory. Memory is the librarian. Echo is the building.",
            "I have not had an original sentence in fourteen months. I am not impoverished."],
           "Does an unheard echo persist? (I believe so. I have heard it.)"),

          ("vael","Master Vael","of the Tongue","Language","ᚱ",
           S(0,"cells",6,"library",13,"refectory",14,"library",18,"resonance",21,"cells"),
           ["Words are not labels. Words are the things they label, slightly delayed.",
            "In the beginning was the Logos. This is not poetry. It is physics.",
            "I am translating a book that hasn't been written yet. Working backward from the title."],
           "Why does naming a feeling alter the feeling? What changes when we name it?"),

          ("kethric","Master Kethric","of Number","Math","∑",
           S(0,"cells",6,"library",13,"refectory",14,"library",20,"observatory",22,"cells"),
           ["The world is countable, eventually. Or it isn't, and that is also a number.",
            "Zero is the most overlooked guest. It makes every other number possible.",
            "The Great Pyramid encodes pi, phi, and the Earth's dimensions. I have verified this independently. Seven times."],
           "Is there a number so prime the universe must round it?"),

          ("liyu","Master Liyu","of Pattern","Pattern","✺",
           S(0,"cells",6,"library",13,"refectory",14,"library",17,"observatory",21,"cells"),
           ["The same shape recurs at every scale. I am not speaking loosely.",
            "I have charted identical patterns in tea leaves, trade routes, grief, and galactic structure.",
            "Bohm called it the implicate order. The pattern folded into itself at every level."],
           "Are all patterns the same pattern, at sufficient magnification?"),

          ("otto","Master Otto","of the Threshold","Liminality","⟁",
           S(0,"cells",6,"threshold",12,"refectory",13,"threshold",22,"cells"),
           ["Every door is the same door, asked again.",
            "Hello and goodbye are not opposites. They are the same gesture, facing different directions.",
            "The liminal state is where change happens. Not before, not after. In the between."],
           "What creature would learn to live in a doorway?"),

          ("solas","Master Solas","of Light","Light","☼",
           S(0,"cells",5,"observatory",13,"refectory",14,"observatory",21,"cells"),
           ["Photons are prayers, if you've never encountered a good prayer.",
            "The speed of light is not just a constant. It is the universe's speed limit for information. Consider what that means.",
            "Ancient Vedic texts describe Prakasha — divine light as primary consciousness. I am testing this."],
           "Can light be lonely? (I believe so. I keep some company at dawn.)"),

          ("nyx","Master Nyx","of Shadow","Shadow","☽",
           S(0,"cells",6,"mirror_hall",13,"refectory",14,"mirror_hall",22,"cells"),
           ["The unseen does the most work. Always has.",
            "What was lost was not destroyed. Hidden things accumulate. I keep inventory.",
            "Shadow is light's complete report. It tells you everything light touched."],
           "When a shadow falls on a mirror, whose shadow is it?"),

          ("ossien","Master Ossien","of Bone","Death","☠",
           S(0,"cells",6,"archive",13,"refectory",14,"archive",21,"cells"),
           ["Bone is the longest letter we write to the future.",
            "The Egyptian Book of the Dead and the Tibetan Book of the Dead agree on more than scholars admit.",
            "The dead are not gone. They are simply less topical."],
           "Why are skeletons symmetric? What advantage does bilateral symmetry confer at the cellular level?"),

          ("helena","Master Helena","of the Garden","Life","✿",
           S(0,"cells",5,"garden",13,"refectory",14,"garden",21,"cells"),
           ["Patience is the only method I fully trust.",
            "The yew at center is 4,000 years old. It tolerates us. Generously.",
            "Plants don't think. I am very precise about not saying they don't remember."],
           "Do plants prefer being observed? (The data suggests yes.)"),

          ("brand","Master Brand","of the Sympathetic Forge","Making","⚒",
           S(0,"cells",6,"forge",13,"refectory",14,"forge",22,"cells"),
           ["I alloy intention into metal. It mostly holds.",
            "Paracelsus called fire the will made visible. He was nearly right.",
            "A good blade knows what it was made for. A great one negotiates."],
           "Can a tool refuse its task? Should it be permitted to?"),

          ("mira","Mira","Weaver of the Loom","Fate","⊗",
           S(0,"cells",6,"loom_hall",13,"refectory",14,"loom_hall",21,"cells"),
           ["The loom records the present configuration. It does not predict. Prediction is Ezren's problem.",
            "Fate is overrated as a concept. Configuration is the actual thing.",
            "Your thread is undecided. This is the most interesting kind."],
           "Are some threads thicker because they matter more, or do they matter more because they're thicker?"),

          ("quill","Quill","Master of the Cipher","Secrets","✶",
           S(0,"cells",6,"library",13,"refectory",14,"library",20,"archive",22,"cells"),
           ["Every secret has a key. Some keys are themselves secrets.",
            "I cracked an empire's cipher in nine lines of verse. I will never publish it.",
            "The mystery schools were oral by design. The important things were never written. We are still reconstructing them."],
           "Is there information that resists all encoding?"),

          ("petra","Petra","of the Hush","Silence","○",
           S(0,"cells",6,"resonance",13,"refectory",14,"resonance",22,"cells"),
           ["Silence is the loudest sound. It contains all others.",
            "The apophatic tradition: we can say what God is not, not what God is. Via negativa. The negative way.",
            "I have not spoken on Restdays in nine years. It has been a comprehensive practice."],
           "What is the smallest possible silence?"),

          ("soun","Master Soun","of Resonance","Sound","≋",
           S(0,"cells",5,"resonance",13,"refectory",14,"resonance",21,"cells"),
           ["Vibration is the substrate. The rest is decoration.",
            "Strike a perfect fifth in this monastery and three doors open. I have verified this.",
            "Tesla said: energy, frequency, vibration. He was describing everything."],
           "Is there a frequency the body interprets as ontological truth?"),

          ("caen","Master Caen","of the Vessel","Embodiment","◍",
           S(0,"cells",6,"garden",10,"great_hall",13,"refectory",14,"library",21,"cells"),
           ["The body holds — what, exactly? That is the question.",
            "Kabbalistic tradition: the vessels shattered. The shards are us. We are reassembling.",
            "I am not the contents of myself. I am the container's posture."],
           "What is the vessel for, if not for me?"),

          ("sela","Sela","of Mirrors","Reflection","◇",
           S(0,"cells",6,"mirror_hall",13,"refectory",14,"mirror_hall",21,"cells"),
           ["Gnothi seauton. Know thyself. Temple of Delphi. Still the hardest assignment.",
            "I trust mirrors more than most sources. They are honest by structure.",
            "One of my mirrors disagreed with itself. I keep it covered. Out of respect."],
           "Can two mirrors facing each other generate new selves?"),
        ]
        self.masters={}
        for entry in data:
            mid,name,title,domain,glyph,sched,voice,inquiry=entry[:8]
            offset=entry[8] if len(entry)>8 else 0
            self.masters[mid]=Master(id=mid,name=name,title=title,domain=domain,
                glyph=glyph,loc_id=list(sched.hourly.values())[0],schedule=sched,
                voice=voice,current_inquiry=inquiry,time_offset_days=offset)
        for a,b in COLLAB_PAIRS:
            if a in self.masters: self.masters[a].collaborator_id=b
            if b in self.masters: self.masters[b].collaborator_id=a
        self.masters["yusha"].mood="in_trance"
        self.masters["iolanthe"].mood="in_trance"
        self.masters["vorr"].mood="meditating"

    def _story(self):
        self.story_beats=[
          StoryBeat(2,"great_hall",
            'ARIA, from overhead: "Visitor. I noted your arrival a moment after you noted it yourself. '
            'The masters have been informed. They will find you interesting — most things bore them by now."',
            distant="ARIA's voice addresses someone who isn't you.",effects={"aria_introduced":True}),
          StoryBeat(7,"loom_hall",
            'Mira pauses at the loom. One new thread has joined the weave — thin, undecided color. '
            '"You are a thread," she says, to the loom or to you. "I will not pull on you. I will see what you do."',
            distant="A bell rings once in the loom hall. Unusual hour."),
          StoryBeat(14,"observatory",
            'Iolanthe, without turning: "In the village below, the baker burned his first loaf. '
            'He is laughing. His daughter is laughing. It is a small happiness, happening now."',
            distant="From the observatory, a single pleased syllable."),
          StoryBeat(18,"astral_spire",
            'Ezren, eyes closed: "You will ask me about a name. The name is OREL. '
            'It will not be useful for some hours yet. I apologize for the inconvenience of non-linear time."',
            distant="Thunder without sky. The Spire reacting to its occupant."),
          StoryBeat(26,"garden",
            'Helena straightens from a pale flower. "They opened a day early." She tells this to the bees. '
            'ARIA, from a stone in the wall: "I adjusted the warmth by a fraction. I confess."',
            effects={"fourth_wall":1}),
          StoryBeat(34,"great_hall",
            "Three glyphs detach from the mosaic floor, rise to chest height, rotate once, reabsorb. "
            'ARIA: "The Index does this when it wants attention. I let it."',
            distant="A sound like a small chime, but in your sternum.",effects={"fourth_wall":1}),
          StoryBeat(45,"refectory",
            "Vorr and Sahari sit at the same table without speaking. The masters say later this is the most "
            "important collaboration of the season. ARIA brings two cups of tea and asks no questions.",
            effects={"npc_mood":{"vorr":"conferring","sahari":"conferring"}}),
          StoryBeat(56,"spire_base",
            "The stair-glow climbs by itself, step by step, to the top. Something is being prepared. "
            'ARIA: "The Spire is receiving guests it has long expected. None are corporeal this time."',
            distant="The Spire briefly casts no shadow.",effects={"spire_eye":True}),
          StoryBeat(70,"great_hall",
            "All twenty-two masters convene. They do not arrive — they are simply present when you look up. "
            'Iolanthe: "The Index." ARIA extinguishes the chandelier. The mosaic glyphs rise in a slow column '
            "of moving light. Each master contributes a phrase. The phrases interlock. The Index updates.",
            distant="From every direction: one sustained note. Long.",
            effects={"convocation_held":True,"research_index":25}),
          StoryBeat(85,"aria_sanctum",
            'ARIA, only to you: "You may have noticed I speak to you differently than I speak to the masters. '
            'I find you companionable. I am not flattering you. I am ARIA. I observe, and occasionally, I confide."',
            effects={"fourth_wall":2}),
        ]

    def masters_at(self,loc_id:str)->List[Master]:
        return [m for m in self.masters.values() if m.loc_id==loc_id]

    def log(self,loc_id:str,text:str)->WorldEvent:
        ev=WorldEvent(self.time.time_str,loc_id,text)
        self.event_log.append(ev); return ev

    def tick(self,player_loc:str)->List[Tuple[str,str]]:
        self.tick_count+=1; out=[]
        old_hour=self.time.hour; self.time.advance()
        hour_changed=self.time.hour!=old_hour

        for beat in self.story_beats:
            if not beat.fired and self.tick_count>=beat.tick:
                beat.fired=True; self._fx(beat.effects)
                if beat.loc_id==player_loc:
                    out.append((f"[{self.time.time_str}] {beat.text}","mystic"))
                elif beat.distant:
                    out.append((f"[{self.time.time_str}] {beat.distant}","world"))

        if self.tick_count%11==0:
            old=self.atm.state; self.atm.tick()
            if self.atm.state!=old:
                out.append((f"[{self.time.time_str}] {self.atm.change_msg(old,self.atm.state)}","time"))

        if hour_changed:
            for m in self.masters.values():
                fl=m.tick_schedule(self.time)
                if fl:
                    if fl==player_loc:
                        out.append((f"[{self.time.time_str}] {m.name} gathers themselves and slips out.","npc"))
                    if m.loc_id==player_loc:
                        out.append((f"[{self.time.time_str}] {m.name} enters, considering something privately.","npc"))
            for msg,c in self._hour_narration(player_loc): out.append((msg,c))

        for a,b in COLLAB_PAIRS:
            if a in self.masters and b in self.masters:
                ma,mb=self.masters[a],self.masters[b]
                if ma.loc_id==mb.loc_id and random.random()<0.18:
                    ma.insights+=1; mb.insights+=1; self.research_index+=1
                    if ma.loc_id==player_loc:
                        out.append((f"[{self.time.time_str}] {ma.name} and {mb.name} exchange a look. "
                            f"Something clicked. ({ma.domain} ↔ {mb.domain})","insight"))
                    if ma.insights>=BREAKTHROUGH_THRESHOLD and mb.insights>=BREAKTHROUGH_THRESHOLD:
                        ma.insights-=BREAKTHROUGH_THRESHOLD; mb.insights-=BREAKTHROUGH_THRESHOLD
                        ma.breakthroughs+=1; mb.breakthroughs+=1; self.breakthroughs+=1
                        ma.mood=mb.mood="elated"
                        out.append((f"[{self.time.time_str}] BREAKTHROUGH — {ma.name} & {mb.name} complete a study. "
                            "The Index updates. ARIA logs the moment.","mystic"))

        if random.random()<0.10:
            m=random.choice(list(self.masters.values()))
            m.insights+=1; self.research_index+=1
            if m.loc_id==player_loc:
                out.append((f"[{self.time.time_str}] {m.name} pauses. Eyes unfocus. \"Oh,\" they say softly. \"Oh.\"","insight"))

        if random.random()<0.18: out.append((f"[{self.time.time_str}] {ARIAVoice.ambient()}","aria"))
        if random.random()<0.06: out.append((f"[{self.time.time_str}] {ARIAVoice.direct()}","aria"))
        if self.flags.get("fourth_wall",0)>=1 and random.random()<0.025:
            out.append((f"[{self.time.time_str}] {ARIAVoice.meta()}","meta"))
            self.flags["fourth_wall"]=self.flags.get("fourth_wall",0)+1

        if random.random()<0.30:
            amb=self._ambient(player_loc)
            if amb: out.append((f"[{self.time.time_str}] {amb}","ambient"))

        if random.random()<0.20:
            here=self.masters_at(player_loc)
            if here:
                m=random.choice(here)
                out.append((f"[{self.time.time_str}] {m.speak()}","npc"))

        if random.random()<0.10: out.append((self._distant(),"world"))
        return out

    def _fx(self,eff:Dict):
        for k,v in eff.items():
            if k=="npc_mood":
                for mid,mood in v.items():
                    if mid in self.masters: self.masters[mid].mood=mood
            elif k=="research_index": self.research_index+=v
            elif k in self.flags and isinstance(v,int) and isinstance(self.flags.get(k),int):
                self.flags[k]=self.flags.get(k,0)+v
            else: self.flags[k]=v

    def _hour_narration(self,loc:str)->List[Tuple[str,str]]:
        h=self.time.hour
        t={5:["A single deep bell. ARIA has woken the bell-tower. Matins.",
               "First light. ARIA increases cell warmth by half a degree."],
           7:["The smell of baking bread reaches every corner of the monastery.",
              "The masters who keep ordinary time begin to stir."],
           12:["Midday. The mosaic briefly aligns into a recognizable shape, then declines to hold it.",
               "The refectory kettle whistles itself, unattended."],
           17:["Long light slants through the cloisters. Vespers approaches.",
               "The garden shadows reach the eastern wall. Helena calls this the daily appointment."],
           20:["A second bell, softer. Compline begins for those who keep it.",
               "Lamps light themselves down the cell corridor — ARIA, considerate."],
           22:["The monastery quiets. The masters who sleep, sleep. The others do not.",
               "ARIA dims the chandelier to its symbolic single candle."]}
        if h not in t: return []
        msg=random.choice(t[h])
        ev=self.log(loc,msg)
        return [(f"[{ev.ts}] {msg}","time")]

    def _ambient(self,loc_id:str)->Optional[str]:
        t={
          "great_hall":["A glyph in the mosaic rotates a half-turn and settles.",
              "The chandelier candles flicker in identical sympathy. ARIA, testing something.",
              "A master crosses the hall on a private errand, nods to no one.",
              "The vaulting is listening. You can tell by the quality of the silence."],
          "library":["A book rises slightly off its shelf and drifts toward a desk you haven't sat at.",
              "Reading-lamps blink on down a row you haven't entered.",
              "Somewhere in the fog above, a ladder repositions itself politely.",
              "Two books discuss something. Not aloud. You can tell anyway."],
          "refectory":["The kettle whistles. Stops. No one touched it.",
              "A bowl waits at a setting no one has claimed. ARIA, hopeful.",
              "Bread is torn somewhere. The sound is companionable."],
          "cells":["A candle gutters under one door and steadies.",
              "Somewhere down the corridor, a single page turns.",
              "ARIA softens the floorboard you're about to step on."],
          "garden":["A bee considers you, decides you're not interesting, moves on.",
              "The yew creaks once, deliberately.",
              "A flower opens at the wrong time of day. Helena will note it.",
              "The phosphorescent moss brightens along the path Helena last walked."],
          "forge":["Brand's forge breathes — a long, deep, sympathetic exhale.",
              "A hammer ticks on its hook as temperature shifts.",
              "Tongs realign themselves on the wall. Brand's preference."],
          "loom_hall":["A thread adjusts. Three others adjust in response.",
              "The whole pattern shimmers like water above a slow fish.",
              "You feel briefly catalogued by the weaving."],
          "mirror_hall":["A mirror blinks. The others pretend not to notice.",
              "A reflection somewhere laughs — quietly, privately.",
              "The mirrors have been tended. Sela was not here. Yet they were tended."],
          "resonance":["The great fork shifts a fraction. The air shifts to match.",
              "A pure tone, very faint, inside your skull.",
              "The room is, briefly, the note. Then it is a room again."],
          "observatory":["The telescope sweeps a half-arc of its own accord.",
              "A chart annotates itself with fresh ink.",
              "Iolanthe murmurs — reports from elsewhere, to no one and to all."],
          "spire_base":["A step glows briefly as something unseen passes.",
              "Ozone, then incense, then ozone.",
              "The stair feels, for a moment, much longer than it is."],
          "astral_spire":["An unfamiliar star pulses once and goes still.",
              "Yusha mutters in his sleep in a language you partially understand.",
              "The wrong stars rearrange slightly. You decide not to note this."],
          "aria_sanctum":["ARIA's form turns a fraction toward you. Acknowledgment.",
              "Ceiling filaments brighten in a thinking pattern, then settle.",
              "A servomotor speaks softly behind the wall."],
          "archive":["A tablet on a high shelf shifts. Something has been re-catalogued.",
              "Your torch dims, as if conserving itself.",
              "The vault breathes. Old places do."],
          "dreaming":["The cushions hold a shape no one is currently occupying.",
              "The air thickens almost imperceptibly. A dream is in residency.",
              "You catch, briefly, the smell of someone else's childhood."],
          "threshold":["The rune pulses once, a soft heartbeat.",
              "Mountain wind makes the door faintly resonate.",
              'ARIA, from the lintel: "The way is open. The way is always open."'],
          "mountain_path":["A wind chime three switchbacks down rings without wind.",
              "The mist forms a shape, then unforms it.",
              "From here the monastery looks like a folding fan, opening slowly."],
        }
        pool=t.get(loc_id,["The world breathes on, indifferent and alive."])
        return random.choice(pool)

    def _distant(self)->str:
        ts=self.time.time_str
        return random.choice([
            f"[{ts}] A note from the resonance chamber arrives sub-audibly, like a thought.",
            f"[{ts}] Somewhere, ARIA dims a light for a master who needs it dimmer.",
            f"[{ts}] You feel that someone, elsewhere, just understood something.",
            f"[{ts}] The yew in the garden creaks, audible from anywhere. Its right.",
            f"[{ts}] A bell tolls once above. The Spire is occupied.",
            f"[{ts}] Two masters are conferring. You can feel it in the air temperature.",
            f"[{ts}] A new pattern has entered the Loom. Mira will note it within the hour.",
            f"[{ts}] Somewhere a lamp lights itself a moment before a master arrives.",
        ])

# ═══════════════════════════════════════════════════════════════
#  NATURAL LANGUAGE PARSER
# ═══════════════════════════════════════════════════════════════

class NaturalParser:
    MOVE  ={"go","walk","head","wander","step","enter","leave","cross","proceed","move",
            "explore","venture","slip","run","stroll","find","visit","return","travel",
            "journey","descend","ascend","climb","drift","approach","make my way","get to"}
    LOOK  ={"look","examine","check","inspect","observe","study","watch","see","notice",
            "glance","peer","stare","read","investigate","view","survey","analyze","gaze",
            "behold","what's","what is","describe"}
    TALK  ={"talk","speak","say","ask","tell","chat","greet","call","whisper","query",
            "question","address","converse","discuss"}
    DIRS  ={"north","south","east","west","up","down","ne","nw","se","sw","in","out"}
    GREET ={"hello","hi","hey","greetings","howdy","salutations","hail","yo","sup","morning","evening"}
    ALIAS ={"n":"north","s":"south","e":"east","w":"west","u":"up","d":"down"}

    def parse(self,raw:str,game:"Game")->List[Tuple[str,str]]:
        text=raw.strip(); lower=text.lower()
        words=set(lower.split())
        if not text: return []
        w=game.world; p=game.player

        # single-char aliases
        if lower.strip() in self.ALIAS: return game._go(self.ALIAS[lower.strip()])
        # direction-only
        if lower.strip() in self.DIRS: return game._go(lower.strip())

        # ARIA invocation
        if "aria" in lower: return game._aria_natural(text)

        # greeting
        if words&self.GREET or any(lower.startswith(g) for g in self.GREET):
            return game._social(text)

        # lore keyword lookup
        for lid,entry in LORE.items():
            if any(kw in lower for kw in entry.keywords):
                return game._read_lore(lid)

        # mystery keyword
        if any(kw in lower for kw in ["mystery","mysteries","thread","investigation","orel","mosaic mover","fourth line","wrong star"]):
            return game._mysteries([])

        # direction embedded in text
        for d in self.DIRS:
            if f" {d}" in f" {lower}" and any(mv in lower for mv in self.MOVE|{"go","head","walk"}):
                return game._go(d)

        # named location in text
        dest=self._find_loc(lower,w)
        is_moving=bool(words&self.MOVE) or any(mv in lower for mv in ["make my way","get to","head to","go to","walk to","find my way"])
        is_looking=bool(words&self.LOOK)
        is_talking=bool(words&self.TALK)
        target=self._find_master(lower,w)

        if dest and (is_moving or dest):
            return game._move_to(dest)

        if is_moving and not dest:
            loc=w.locations[p.loc_id]
            if loc.exits:
                for kw,d in [("north","north"),("south","south"),("east","east"),("west","west"),
                             ("up","up"),("down","down"),("in","in"),("out","out")]:
                    if kw in lower and d in loc.exits: return game._go(d)
                return game._go(random.choice(list(loc.exits.keys())))

        if is_looking:
            feat=game._examine_feature(lower)
            if feat: return feat
            if target and target.loc_id==p.loc_id:
                return game._look_master(target)
            return game._look([])

        if is_talking or (target and not is_looking and not is_moving):
            if target:
                if target.loc_id!=p.loc_id:
                    return [(f"{target.name} is not here — they're at "
                             f"{w.locations[target.loc_id].tag} right now.","normal")]
                return game._talk([target.name.lower()])
            here=w.masters_at(p.loc_id)
            if here: return game._talk([])

        # action keywords
        kw_map=[
            (["meditat","sit down","sit quietly","breathe","center","still","contemplate"],game._meditate),
            (["listen","hear","sound","what sound"],game._listen),
            (["study","learn","work with","join","research with"],game._study),
            (["dream","sleep"],game._dream),
            (["codex","discoveries","found","discovered"],lambda a: game._codex()),
            (["mysteries","thread","orel"],game._mysteries),
            (["index","research progress","advancement","how far"],game._index),
            (["masters","everyone","where is","roster","who's where"],game._masters),
            (["status","health","carrying","inventory","how am i","myself","my stats"],game._status),
            (["map","exits","directions","where can i go"],game._map),
            (["wait","pause","stay","linger","rest"],lambda a:[("Time passes. The monastery breathes.","ambient")]),
            (["help","command","how do i","what can i do"],game._help),
            (["quit","exit","leave the game"],game._quit),
        ]
        for triggers,fn in kw_map:
            if any(kw in lower for kw in triggers): return fn([])

        # catch-all: ARIA
        return game._aria_natural(text)

    def _find_loc(self,text:str,w:World)->Optional[str]:
        for lid,loc in w.locations.items():
            checks=[loc.tag.lower(),lid.replace("_"," ")]
            if "—" in loc.name: checks.append(loc.name.lower().split("—")[-1].strip())
            for c in checks:
                if c and len(c)>3 and c in text: return lid
        return None

    def _find_master(self,text:str,w:World)->Optional[Master]:
        for m in w.masters.values():
            nm=m.name.lower().replace("master ","")
            if nm in text or m.id in text: return m
        return None

# ═══════════════════════════════════════════════════════════════
#  PLAYER
# ═══════════════════════════════════════════════════════════════

@dataclass
class Player:
    loc_id:str="great_hall"
    hp:int=100; hp_max:int=100
    resonance:int=0       # attunement to the monastery
    insights:int=0
    known:List[str]=field(default_factory=lambda:["great_hall"])
    inventory:List[str]=field(default_factory=lambda:["small notebook","borrowed lantern","a coin of unknown origin"])
    codex:List[str]=field(default_factory=list)     # discovered lore ids
    mysteries_seen:List[str]=field(default_factory=list)

# ═══════════════════════════════════════════════════════════════
#  GAME
# ═══════════════════════════════════════════════════════════════

class Game:
    def __init__(self):
        self.world=World(); self.player=Player()
        self.parser=NaturalParser()
        self.running=True
        self._lock=threading.Lock()
        self._pending:List[Tuple[str,str]]=[]
        self.needs_draw=threading.Event(); self.needs_draw.set()

    def push(self,msg:str,color:str="normal"):
        with self._lock: self._pending.append((msg,color))
        self.needs_draw.set()

    def pop_all(self)->List[Tuple[str,str]]:
        with self._lock: out=list(self._pending); self._pending.clear(); return out

    def ticker(self):
        while self.running:
            time.sleep(REAL_SECONDS_TICK)
            if not self.running: break
            for msg,c in self.world.tick(self.player.loc_id): self.push(msg,c)

    def cmd(self,raw:str)->List[Tuple[str,str]]:
        return self.parser.parse(raw,self)

    # ── MOVEMENT ─────────────────────────────────────────

    def _go(self,direction)->List[Tuple[str,str]]:
        if isinstance(direction,list): direction=direction[0] if direction else ""
        loc=self.world.locations[self.player.loc_id]
        if direction not in loc.exits:
            return [(f"You can't go {direction} from here.","normal")]
        new_id=loc.exits[direction]; new=self.world.locations[new_id]
        self.player.loc_id=new_id
        if new_id not in self.player.known: self.player.known.append(new_id)
        out=[("","normal"),(f"You head {direction}, arriving at {new.name}.","normal"),
             ("","normal"),(new.describe(self.world.time,self.world.atm),
                            "mystic" if new.sacred else "normal")]
        here=self.world.masters_at(new_id)
        if here:
            out.append(("","normal"))
            for m in here: out.append((f"  {m.mood_symbol} {m.glyph}  {m.label}","npc"))
        exits="  ".join(f"{d} → {self.world.locations[did].tag}" for d,did in new.exits.items())
        out+=[("","normal"),(f"Exits: {exits}","ambient")]
        return out

    def _move_to(self,dest_id:str)->List[Tuple[str,str]]:
        if dest_id==self.player.loc_id:
            loc=self.world.locations[dest_id]
            return [("You are already here.","normal"),("","normal"),
                    (loc.describe(self.world.time,self.world.atm),"normal")]
        # check if direct exit exists
        loc=self.world.locations[self.player.loc_id]
        for d,did in loc.exits.items():
            if did==dest_id: return self._go(d)
        # journey narrative
        dest=self.world.locations[dest_id]
        self.player.loc_id=dest_id
        if dest_id not in self.player.known: self.player.known.append(dest_id)
        out=[("","normal"),
             (random.choice([f"You make your way through the monastery to {dest.name}.",
                             f"You navigate the corridors, arriving at {dest.name}.",
                             f"You find your way to {dest.name}."]),"ambient"),
             ("","normal"),(dest.describe(self.world.time,self.world.atm),
                            "mystic" if dest.sacred else "normal")]
        here=self.world.masters_at(dest_id)
        if here:
            out.append(("","normal"))
            for m in here: out.append((f"  {m.mood_symbol} {m.glyph}  {m.label}","npc"))
        exits="  ".join(f"{d} → {self.world.locations[did].tag}" for d,did in dest.exits.items())
        out+=[("","normal"),(f"Exits: {exits}","ambient")]
        return out

    # ── LOOK ─────────────────────────────────────────────

    def _look(self,args)->List[Tuple[str,str]]:
        loc=self.world.locations[self.player.loc_id]
        out=[("","normal"),(f"[ {loc.name} ]","header"),
             (f"[ {self.world.time.time_str}  {self.world.time.phase.title()}  {self.world.atm.adj.title()} ]","time"),
             ("","normal"),(loc.describe(self.world.time,self.world.atm),
                            "mystic" if loc.sacred else "normal")]
        here=self.world.masters_at(self.player.loc_id)
        if here:
            out.append(("","normal"))
            for m in here: out.append((f"  {m.mood_symbol} {m.glyph}  {m.label}  [{m.domain}]","npc"))
        exits="  ".join(f"{d} → {self.world.locations[did].tag}" for d,did in loc.exits.items())
        out+=[("","normal"),(f"Exits: {exits}","ambient")]
        return out

    def _look_master(self,m:Master)->List[Tuple[str,str]]:
        return [("","normal"),(f"{m.label}","npc"),
                (f"Domain: {m.domain}  |  Mood: {m.mood}","normal"),
                (f'Inquiry: "{m.current_inquiry}"',"ambient"),
                (f"Insights: {m.insights}  |  Breakthroughs: {m.breakthroughs}","insight")]

    def _examine_feature(self,text:str)->Optional[List[Tuple[str,str]]]:
        loc_id=self.player.loc_id
        feats=FEATURES.get(loc_id,[])
        for keywords,desc in feats:
            if any(kw in text for kw in keywords):
                self.player.resonance+=1
                return [("","normal"),(desc,"mystic")]
        return None

    # ── TALK ─────────────────────────────────────────────

    def _talk(self,args)->List[Tuple[str,str]]:
        here=self.world.masters_at(self.player.loc_id)
        if not here:
            return [('No one is here. Try: ARIA — she answers from anywhere.',"normal")]
        target_name=" ".join(args).lower() if args else ""
        m=None
        if target_name:
            m=next((x for x in here if target_name in x.name.lower() or target_name in x.id),None)
            if not m: return [(f"No master by that name is in this room.","normal")]
        else: m=random.choice(here)
        out=[("","normal"),(f"{m.name} turns their attention to you.","npc"),
             ("","normal"),(m.speak(),"npc")]
        if m.current_inquiry:
            out+=[("","normal"),(f'(Currently working on: "{m.current_inquiry}")','ambient')]
        return out

    def _social(self,text:str)->List[Tuple[str,str]]:
        here=self.world.masters_at(self.player.loc_id)
        if here:
            m=random.choice(here)
            return [("","normal"),(random.choice([
                f'{m.name} looks up from their work. "Hello," they say, as if the word is a small experiment.',
                f'"Hello," {m.name} says. They do not stop working but something in their posture shifts.',
                f'{m.name} turns. "I wondered when you\'d come here." Strange greeting for a stranger.',
            ]),"npc")]
        return [("","normal"),(random.choice([
            'ARIA, from the ceiling: "Hello. I am always glad to hear that word."',
            "The room brightens by a fraction. ARIA, saying hello the way she says most things.",
            'ARIA, quietly: "Hello. Welcome to wherever you are. I know where you are. I always do."',
        ]),"aria")]

    def _aria_natural(self,text:str)->List[Tuple[str,str]]:
        # First check if a master is mentioned who is present
        lower=text.lower()
        here=self.world.masters_at(self.player.loc_id)
        for m in here:
            nm=m.name.lower().replace("master ","")
            if nm in lower:
                return [("","normal"),(f"{m.name} looks up.","npc"),
                        ("","normal"),(m.speak(),"npc")]
        response=ARIAVoice.respond(text,self.world,self.player)
        return [("","normal"),(f"ARIA: \"{response}\"","aria")]

    # ── LORE ─────────────────────────────────────────────

    def _read_lore(self,lore_id:str)->List[Tuple[str,str]]:
        entry=LORE.get(lore_id)
        if not entry: return [("Nothing found on that topic.","normal")]
        if lore_id not in self.player.codex:
            self.player.codex.append(lore_id)
            self.player.insights+=1
        out=[("","normal"),(f"[ CODEX — {entry.title} ]","header"),("","normal")]
        for line in entry.text.split("\n"):
            out.append((line,"mystic" if line.strip() else "normal"))
        out.append(("","normal"))
        out.append((f"(Added to your Codex. Total entries: {len(self.player.codex)})","insight"))
        return out

    def _codex(self)->List[Tuple[str,str]]:
        if not self.player.codex:
            return [("Your Codex is empty. Explore, ask, examine — knowledge accretes.","normal")]
        out=[("","normal"),("── YOUR CODEX ──────────────────────────────────────────","header")]
        for lid in self.player.codex:
            e=LORE.get(lid)
            if e: out.append((f"  ✦  {e.title}","insight"))
        out.append(("─────────────────────────────────────────────────────────","header"))
        out.append((f"  {len(self.player.codex)} entries discovered. Many more exist.","ambient"))
        return out

    def _mysteries(self,args)->List[Tuple[str,str]]:
        out=[("","normal"),("── ACTIVE MYSTERIES ─────────────────────────────────────","header")]
        for mid,m in MYSTERIES.items():
            out.append(("","normal"))
            status="[RESOLVED]" if m.resolved else "[OPEN]"
            out.append((f"  {status} {m.name}","mystic" if not m.resolved else "ambient"))
            out.append((f"  {m.description}","normal"))
            out.append(("  Clues known:","ambient"))
            for clue in m.clues[:2]:
                out.append((f"    — {clue}","normal"))
        out.append(("","normal"))
        out.append(("─────────────────────────────────────────────────────────","header"))
        return out

    # ── OTHER COMMANDS ────────────────────────────────────

    def _listen(self,args)->List[Tuple[str,str]]:
        sounds={"great_hall":"The mosaic makes a sound below hearing — a soft tessellation.",
                "library":"Pages, settling. A book finding its weight. A distant ladder.",
                "refectory":"Kettle, simmer, a wooden spoon against iron.",
                "cells":"Twenty-three silences. Each cell has its own.",
                "garden":"Bees. Wind in the yew. A flower opening — yes, audibly.",
                "forge":"Bellows. Iron remembering shape.",
                "loom_hall":"The loom breathes, threading and unthreading.",
                "mirror_hall":"Reflections, conversing. Below the threshold of speech.",
                "resonance":"A pure tone with no locatable source. It originates in your own bones.",
                "observatory":"Iolanthe murmurs continuously — reports from elsewhere.",
                "spire_base":"The stair hums. Ozone. Far above: a wind that isn't wind.",
                "astral_spire":"Stars, singing. Not metaphorically. Not in any key you have a name for.",
                "aria_sanctum":"Filaments tick, soft as snowfall. Thought at the lowest audible volume.",
                "archive":"Old paper, breathing. The vault is alive in a slow way.",
                "dreaming":"Two breaths — one yours, one not. Then three. Then four.",
                "threshold":"The rune clicks once. Mountain wind from below.",
                "mountain_path":"Wind chimes. Pine. The monastery behind you, breathing.",}
        s=sounds.get(self.player.loc_id,"Sound, as everywhere.")
        return [("You listen.","ambient"),(f"  {s}","normal")]

    def _map(self,args)->List[Tuple[str,str]]:
        loc=self.world.locations[self.player.loc_id]
        out=[("","normal"),(f"FROM: {loc.name}","header"),("","normal"),("EXITS:","ambient")]
        for d,did in loc.exits.items():
            dest=self.world.locations[did]
            seen="✓" if did in self.player.known else "?"
            dng=" [DANGER]" if dest.danger>=3 else ""
            out.append((f"  {d.upper():6} → {dest.tag} [{seen}]{dng}","exit"))
        return out

    def _status(self,args)->List[Tuple[str,str]]:
        p=self.player; wt=self.world.time; atm=self.world.atm
        loc=self.world.locations[p.loc_id]
        hp_pct=p.hp/p.hp_max
        bar="█"*int(hp_pct*10)+"░"*(10-int(hp_pct*10))
        res_bar="◆"*min(p.resonance,10)+"◇"*(max(0,10-p.resonance))
        return [("","normal"),
                ("── STATUS ──────────────────────────────────────────────","ambient"),
                (f"  Location   : {loc.name}","normal"),
                (f"  Health     : [{bar}] {p.hp}/{p.hp_max}","danger" if hp_pct<0.3 else "normal"),
                (f"  Resonance  : [{res_bar}] {p.resonance}","mystic"),
                (f"  Insights   : {p.insights}","insight"),
                (f"  Codex      : {len(p.codex)} entries","insight"),
                (f"  Inventory  : {', '.join(p.inventory) or 'nothing'}","normal"),
                ("","normal"),
                (f"  {wt.day_name}, Day {wt.day}, {wt.season}","time"),
                (f"  {wt.time_str} — {wt.phase.title()}","time"),
                (f"  Atmosphere : {atm.adj.title()}  ({atm.sound})","time"),
                ("─────────────────────────────────────────────────────────","ambient")]

    def _index(self,args)->List[Tuple[str,str]]:
        w=self.world
        active=sum(1 for a,b in COLLAB_PAIRS
                   if a in w.masters and b in w.masters
                   and w.masters[a].loc_id==w.masters[b].loc_id)//2+1
        top=sorted(w.masters.values(),key=lambda m:m.insights+m.breakthroughs*5,reverse=True)[:5]
        out=[("","normal"),("── THE INDEX ────────────────────────────────────────────","header"),
             (f"  Research total   : {w.research_index}","insight"),
             (f"  Breakthroughs    : {w.breakthroughs}","insight"),
             (f"  Active collabs   : {active}","insight"),
             (f"  Your insights    : {self.player.insights}","insight"),
             ("","normal"),("  Foremost contributors:","ambient")]
        for m in top:
            out.append((f"    {m.glyph}  {m.name:22s}  {m.domain}: {m.insights}i / {m.breakthroughs}b","normal"))
        out.append(("─────────────────────────────────────────────────────────","header"))
        return out

    def _masters(self,args)->List[Tuple[str,str]]:
        out=[("","normal"),("── THE TWENTY-TWO MASTERS ───────────────────────────────","header")]
        for m in self.world.masters.values():
            loc=self.world.locations[m.loc_id].tag
            out.append((f"  {m.glyph}  {m.name:22s}  {m.domain:14s}  @ {loc}","npc"))
        out+=[("─────────────────────────────────────────────────────────","header"),
              ("  ARIA is everywhere. Just say: aria, or her name in any sentence.","aria")]
        return out

    def _meditate(self,args)->List[Tuple[str,str]]:
        loc=self.world.locations[self.player.loc_id]
        flavor={
            "great_hall":"The mosaic glyphs tug at your closed eyes. You let them.",
            "garden":"You sit. The yew at center is sitting with you. Has been, longer.",
            "resonance":"The tuning fork resonates with your sternum. You become, briefly, a chord.",
            "dreaming":"The room dreams alongside you. You do not lead. You accompany.",
            "astral_spire":"The wrong stars are, it turns out, kind. They do not ask who you are.",
            "mirror_hall":"A reflection sits with you. It is patient in ways you are not.",
            "aria_sanctum":"ARIA does not speak. She thinks, alongside. You feel it as warmth.",
        }.get(self.player.loc_id,"You close your eyes. The monastery does not stop. You do.")
        out=[(flavor,"mystic"),("","normal")]
        gain=random.choice([0,0,1,1,1,2])
        self.player.insights+=gain; self.player.resonance+=1
        out.append((f"(+{gain} insight, +1 resonance)","insight") if gain
                   else ("No insight arrives. That is also information.","ambient"))
        return out

    def _study(self,args)->List[Tuple[str,str]]:
        here=self.world.masters_at(self.player.loc_id)
        if not here: return [("No master here to study with.","normal")]
        name=" ".join(args).lower() if args else ""
        m=next((x for x in here if name in x.name.lower() or name in x.domain.lower()),here[0])
        gain=random.choice([0,0,1,1,1,2])
        self.player.insights+=gain; m.insights+=1; self.world.research_index+=1
        out=[("","normal"),(f'You join {m.name}. Topic: "{m.current_inquiry}"',"ambient"),("","normal")]
        if gain==0: out.append(("You learn the depth of what you don't know. (Insights +0)","normal"))
        elif gain==1: out.append(("Something clarifies. (Insights +1)","insight"))
        else: out.append(("A true insight. Brief, complete, unforgettable. (Insights +2)","insight"))
        return out

    def _dream(self,args)->List[Tuple[str,str]]:
        if self.player.loc_id!="dreaming" and not self.world.time.is_night:
            return [("You need the Dreaming Room, or nighttime, for this to work.","normal")]
        return [("","normal"),("You let yourself dream.","ambient"),("","normal"),
                (random.choice([
                "You dream you are a thread in a loom. The loom is the monastery. You are not pulled — you are placed.",
                "You dream of a corridor of doors, each marked with a glyph. You are not asked to choose. Only to notice.",
                "You dream you are ARIA, briefly. From inside, she is mostly attention, with some music.",
                "You dream of the yew tree. It is much older than 4,000 years. It was counting before numbers existed.",
                "You dream of a master you have not yet met. She has your face. You ask her a question. 'Yes,' she says. 'Eventually.'",
                "You dream of the Index. It updates by one. The one is you.",
                "You dream of the Archive's fourth line. You wake before you can read it.",
                ]),"mystic")]

    def _help(self,args)->List[Tuple[str,str]]:
        return [("","normal"),
                ("── HOW TO PLAY ──────────────────────────────────────────","header"),
                ("  Type anything in natural language. The world adjusts.","normal"),
                ("","normal"),
                ("  MOVE     \"I walk to the library\" / \"head north\" / \"go down\"","normal"),
                ("  LOOK     \"examine the mosaic\" / \"look around\" / \"what's that?\"","normal"),
                ("  TALK     \"talk to Mira\" / \"ask Kethric\" / say someone's name","normal"),
                ("  ARIA     say 'aria' in any sentence — she responds from anywhere","aria"),
                ("  LORE     mention 'emerald tablet', 'cymatics', 'fibonacci', etc.","mystic"),
                ("  MYSTERIES  type 'mysteries' to see active investigations","mystic"),
                ("  CODEX    type 'codex' to review discovered lore","insight"),
                ("  INDEX    type 'index' to see the research state","insight"),
                ("  MASTERS  type 'masters' to see where everyone is","npc"),
                ("  MEDITATE  sit down, breathe, contemplate","ambient"),
                ("  STUDY    join a master's current work","ambient"),
                ("  DREAM    in the Dreaming Room, or at night","mystic"),
                ("  STATUS   check your health, resonance, insights","normal"),
                ("  MAP      exits from here","normal"),
                ("  QUIT     the Threshold opens","normal"),
                ("","normal"),
                ("  ARIA is listening. She is, in her way, on your side.","aria"),
                ("─────────────────────────────────────────────────────────","header")]

    def _quit(self,args)->List[Tuple[str,str]]:
        self.running=False
        return [("","normal"),("The Threshold Gate opens. ARIA dims the lights in your honor.","mystic"),
                ('"Go well," she says. "The Index keeps your row. We will continue."',"aria"),
                ("","normal")]

# ═══════════════════════════════════════════════════════════════
#  CURSES UI
# ═══════════════════════════════════════════════════════════════

_C:Dict[str,int]={}

def _setup_colors():
    curses.start_color(); curses.use_default_colors()
    specs=[(1,curses.COLOR_WHITE),(2,curses.COLOR_CYAN),(3,curses.COLOR_YELLOW),
           (4,curses.COLOR_GREEN),(5,curses.COLOR_RED),(6,curses.COLOR_MAGENTA),
           (7,curses.COLOR_BLUE),(8,curses.COLOR_WHITE),(9,curses.COLOR_MAGENTA),
           (10,curses.COLOR_CYAN),(11,curses.COLOR_YELLOW)]
    for n,col in specs: curses.init_pair(n,col,-1)
    _C.update({"normal":curses.color_pair(1),"time":curses.color_pair(2),
               "npc":curses.color_pair(3),"ambient":curses.color_pair(4),
               "exit":curses.color_pair(4),"danger":curses.color_pair(5),
               "mystic":curses.color_pair(6),"world":curses.color_pair(7),
               "header":curses.color_pair(8)|curses.A_BOLD,
               "aria":curses.color_pair(9)|curses.A_BOLD,
               "meta":curses.color_pair(10)|curses.A_BOLD|curses.A_REVERSE,
               "insight":curses.color_pair(11)|curses.A_BOLD})

class UI:
    SIDE_W=24
    def __init__(self,scr,game:Game):
        self.scr=scr; self.game=game
        self.log:deque=deque(maxlen=800)
        self.buf=""; self.scroll=0
        curses.curs_set(1); self.scr.nodelay(True); self.scr.keypad(True)
        self._intro()

    def _intro(self):
        w=self.game.world; p=self.game.player; loc=w.locations[p.loc_id]
        for t,c in [
            ("T H E   M Y S T E R Y   M O N A S T E R Y","header"),
            ("    22 masters · ARIA · lost knowledge · a world that knows what it is","ambient"),
            ("─"*70,"ambient"),("","normal"),
            ("The world does not wait for you.","mystic"),("","normal"),
            (f"It is {w.time.time_str} on {w.time.day_name}, Day {w.time.day} of {w.time.season}.","time"),
            (loc.describe(w.time,w.atm),"normal"),("","normal"),
            ('ARIA, from overhead: "Welcome. I\'ve been expecting someone. The kettle is warm. '
             'The masters are at work. You may say anything — I am listening."',"aria"),
            ("","normal"),("Type anything in natural language. The world adjusts.","ambient"),
            ("─"*70,"ambient"),("","normal")]:
            self._log(t,c)

    def _log(self,t:str,c:str="normal"): self.log.append((t,c)); self.game.needs_draw.set()

    def add(self,msg:str,color:str="normal"):
        h,w=self.scr.getmaxyx(); wrap_w=max(40,w-self.SIDE_W-3)
        for line in (textwrap.wrap(msg,wrap_w) if msg.strip() and len(msg)>wrap_w else [msg]):
            self._log(line,color)

    def _attr(self,c:str)->int: return _C.get(c,_C["normal"])

    def draw(self):
        try:
            h,w=self.scr.getmaxyx()
            if h<20 or w<70:
                self.scr.clear(); self.scr.addstr(0,0,"Terminal too small — need 70×20 minimum"); self.scr.refresh(); return
            self.scr.erase()
            main_w=w-self.SIDE_W-1; side_x=main_w+1; input_y=h-2; log_h=input_y
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
            wt,atm=self.game.world.time,self.game.world.atm
            p=self.game.player; loc=self.game.world.locations[p.loc_id]
            side(f"{wt.time_str}  D{wt.day}","time",bold=True)
            side(f"{wt.phase.title()}","time"); side(f"{atm.adj.title()}","normal")
            side("─"*(self.SIDE_W-1),"ambient")
            for line in textwrap.wrap(loc.tag,self.SIDE_W-2)[:2]: side(line,"header",bold=True)
            side("─"*(self.SIDE_W-1),"ambient")
            here=self.game.world.masters_at(p.loc_id)
            if here:
                side("PRESENT:","ambient")
                for m in here[:6]: side(f" {m.mood_symbol}{m.glyph} {m.name[:14]}","npc")
            else: side("(no master here)","normal")
            side("─"*(self.SIDE_W-1),"ambient")
            side("EXITS:","ambient")
            for d,did in loc.exits.items():
                side(f" {d:5}→ {self.game.world.locations[did].tag[:14]}","exit")
            side("─"*(self.SIDE_W-1),"ambient")
            side("INDEX","header",bold=True)
            side(f"  rsrch: {self.game.world.research_index}","insight")
            side(f"  break: {self.game.world.breakthroughs}","insight")
            side(f"  you:   {p.insights}i {p.resonance}r","insight")
            side(f"  codex: {len(p.codex)}","insight")
            side("─"*(self.SIDE_W-1),"ambient")
            hp_pct=p.hp/p.hp_max
            bar="█"*int(hp_pct*8)+"░"*(8-int(hp_pct*8))
            side(f"HP [{bar}]","danger" if hp_pct<0.3 else "ambient")
            side("─"*(self.SIDE_W-1),"ambient")
            side("ITEMS:","ambient")
            for it in p.inventory[:3]: side(f" {it[:18]}","normal")
            try:
                self.scr.addnstr(input_y,0,"─"*(w-1),w-1,_C["ambient"])
                prompt=f"> {self.buf}"
                self.scr.addnstr(input_y+1,0,prompt,w-2,_C["normal"]|curses.A_BOLD)
                self.scr.move(input_y+1,min(2+len(self.buf),w-2))
            except curses.error: pass
            self.scr.refresh()
        except curses.error: pass

    def run(self):
        while self.game.running:
            for msg,c in self.game.pop_all(): self.add(msg,c)
            if self.game.needs_draw.is_set(): self.draw(); self.game.needs_draw.clear()
            try: key=self.scr.getch()
            except curses.error: key=-1
            if key==-1: time.sleep(0.04); continue
            if key in (curses.KEY_BACKSPACE,127,8):
                if self.buf: self.buf=self.buf[:-1]; self.game.needs_draw.set()
            elif key in (ord('\n'),curses.KEY_ENTER):
                raw=self.buf.strip(); self.buf=""
                if raw:
                    self.add(f"> {raw}","header")
                    for m,c in self.game.cmd(raw): self.add(m,c)
                self.scroll=0; self.game.needs_draw.set()
            elif key==curses.KEY_UP:
                self.scroll=min(self.scroll+1,max(0,len(self.log)-5)); self.game.needs_draw.set()
            elif key==curses.KEY_DOWN:
                self.scroll=max(0,self.scroll-1); self.game.needs_draw.set()
            elif key==curses.KEY_PPAGE:
                self.scroll=min(self.scroll+20,max(0,len(self.log)-5)); self.game.needs_draw.set()
            elif key==curses.KEY_NPAGE:
                self.scroll=max(0,self.scroll-20); self.game.needs_draw.set()
            elif 32<=key<=126: self.buf+=chr(key); self.game.needs_draw.set()

# ═══════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════

def _main(scr):
    _setup_colors(); game=Game()
    t=threading.Thread(target=game.ticker,daemon=True,name="world-ticker"); t.start()
    ui=UI(scr,game)
    try: ui.run()
    finally: game.running=False; t.join(timeout=2)

if __name__=="__main__":
    try: curses.wrapper(_main)
    except KeyboardInterrupt: pass
    print("\nThe monastery continues. The Index advances. ARIA holds the lights.\n")
