#!/usr/bin/env python3
"""
T H E   M Y S T E R Y   M O N A S T E R Y
─────────────────────────────────────────────────────────────────
A self-aware living world. Twenty-two masters advance the Work
in a place older than any of them. ARIA — the holy android, the
voice in the walls — keeps the lights, the doors, the kettle, and
(quietly) the boundaries of the simulation. Time runs whether you
look or not.
─────────────────────────────────────────────────────────────────
Run: python3 living_world.py
Requires: Python 3.8+, a terminal at least 80×24.
"""

import curses
import threading
import time
import random
import textwrap
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Set
from collections import deque

# ═══════════════════════════════════════════════════════════════
#  TIME — the monastery keeps several at once
# ═══════════════════════════════════════════════════════════════

MINUTES_PER_TICK   = 20
REAL_SECONDS_TICK  = 8
SEASONS = ["Spring of Inquiry", "Summer of Work", "Autumn of Indexing", "Winter of Distillation"]
DAYS    = ["Moonday", "Mindday", "Stoneday", "Windsday", "Fireday", "Waterday", "Restday"]

@dataclass
class WorldTime:
    minute: int = 0
    hour:   int = 6      # the monastery wakes early
    day:    int = 1
    month:  int = 4
    year:   int = 1147   # the year of the Long Index

    def advance(self, minutes: int = MINUTES_PER_TICK):
        self.minute += minutes
        while self.minute >= 60: self.minute -= 60; self.hour  += 1
        while self.hour   >= 24: self.hour   -= 24; self.day   += 1
        while self.day    >  30: self.day    -= 30; self.month += 1
        while self.month  >  12: self.month  -= 12; self.year  += 1

    @property
    def time_str(self) -> str:  return f"{self.hour:02d}:{self.minute:02d}"
    @property
    def day_name(self) -> str:  return DAYS[(self.day - 1) % 7]
    @property
    def season(self)  -> str:   return SEASONS[(self.month - 1) // 3]
    @property
    def is_night(self) -> bool: return self.hour < 5 or self.hour >= 22

    @property
    def phase(self) -> str:
        h = self.hour
        if h < 5:  return "the long hours"
        if h < 7:  return "matins"
        if h < 12: return "morning study"
        if h < 14: return "midday convocation"
        if h < 17: return "afternoon labor"
        if h < 20: return "vespers"
        if h < 22: return "evening collation"
        return "compline"


# ═══════════════════════════════════════════════════════════════
#  ATMOSPHERE — weather, but for a place that thinks about itself
# ═══════════════════════════════════════════════════════════════

ATMOSPHERE = {
    "clear":       {"next":{"clear":0.45,"resonant":0.20,"misted":0.15,"luminous":0.10,"cloudy":0.10},
                    "adj":"clear","sound":"birds and bells"},
    "cloudy":      {"next":{"clear":0.25,"cloudy":0.35,"rainy":0.25,"misted":0.15},
                    "adj":"overcast","sound":"wind in the bell-tower"},
    "rainy":       {"next":{"cloudy":0.40,"rainy":0.40,"resonant":0.10,"clear":0.10},
                    "adj":"raining","sound":"rain in the cloisters"},
    "misted":      {"next":{"clear":0.35,"misted":0.40,"cloudy":0.15,"luminous":0.10},
                    "adj":"mist-wrapped","sound":"a hush"},
    "resonant":    {"next":{"clear":0.50,"resonant":0.20,"cloudy":0.15,"luminous":0.15},
                    "adj":"resonant","sound":"a low harmonic you can almost name"},
    "luminous":    {"next":{"clear":0.45,"luminous":0.20,"resonant":0.20,"misted":0.15},
                    "adj":"luminous","sound":"the light itself, somehow audible"},
}

@dataclass
class Atmosphere:
    state: str = "clear"

    def tick(self):
        t = ATMOSPHERE[self.state]["next"]
        r, cum = random.random(), 0.0
        for s, p in t.items():
            cum += p
            if r < cum: self.state = s; return

    @property
    def adj(self)   -> str: return ATMOSPHERE[self.state]["adj"]
    @property
    def sound(self) -> str: return ATMOSPHERE[self.state]["sound"]
    @property
    def is_strange(self) -> bool: return self.state in ("resonant", "luminous", "misted")

    def change_msg(self, old: str, new: str) -> str:
        t = {
            ("clear","cloudy"):   "Clouds collect above the spire. The light flattens.",
            ("cloudy","rainy"):   "Rain begins, steady as a chant.",
            ("rainy","cloudy"):   "The rain stops. The cloisters drip.",
            ("cloudy","clear"):   "The clouds part. The bell-tower throws a clean shadow.",
            ("clear","misted"):   "Mist rolls up from the lower valley. The monastery becomes islands.",
            ("misted","clear"):   "The mist withdraws all at once, as if recalled.",
            ("clear","resonant"): "The air takes on a resonance. Bells you cannot see suggest themselves.",
            ("resonant","clear"): "The resonance fades — but everything sounds slightly truer for an hour after.",
            ("clear","luminous"): "The air becomes luminous. Edges acquire halos. Even your hand glows faintly.",
            ("luminous","clear"): "The luminosity recedes. The world reverts to ordinary brightness — which now feels dim.",
        }
        return t.get((old, new), f"The atmosphere shifts: {old} gives way to {new}.")


# ═══════════════════════════════════════════════════════════════
#  LOCATIONS
# ═══════════════════════════════════════════════════════════════

@dataclass
class Location:
    id:   str
    name: str
    tag:  str
    desc_day:   str
    desc_night: str
    exits:  Dict[str,str] = field(default_factory=dict)
    indoor: bool = True
    sacred: bool = False     # affects ambient narration
    danger: int  = 0

    def describe(self, wt: WorldTime, atm: Atmosphere) -> str:
        base = self.desc_night if wt.is_night else self.desc_day
        if atm.is_strange:
            extra = {
                "misted":   " A mist has crept indoors — politely, but inevitably.",
                "resonant": " A low resonance hums in the stone underfoot.",
                "luminous": " The light here is doing something subtle and not quite explicable.",
            }.get(atm.state, "")
            base += extra
        return base


# ═══════════════════════════════════════════════════════════════
#  DISCIPLINES
# ═══════════════════════════════════════════════════════════════

@dataclass
class Discipline:
    id:        str
    name:      str
    domain:    str
    inquiries: List[str]   # rotating research questions
    glyph:     str         # single-char symbol for sidebar


# ═══════════════════════════════════════════════════════════════
#  MASTERS — 22 of them, plus ARIA who watches all
# ═══════════════════════════════════════════════════════════════

@dataclass
class Schedule:
    hourly: Dict[int, str]
    def where(self, hour: int) -> str:
        best = list(self.hourly.values())[0]
        for h in sorted(self.hourly):
            if hour >= h: best = self.hourly[h]
        return best


MOOD_SYMBOL = {
    "studying": "✎", "meditating": "○", "teaching": "✦",
    "conferring": "⇄", "wandering": "↝", "resting": "♨",
    "in_trance": "◉", "elated": "♪", "troubled": "!",
    "neutral": "·",
}


@dataclass
class Master:
    id:         str
    name:       str
    title:      str
    domain:     str
    glyph:      str
    loc_id:     str
    schedule:   Schedule
    voice:      List[str]
    current_inquiry: str
    collaborator_id: Optional[str] = None
    insights:   int    = 0
    breakthroughs: int = 0
    mood:       str    = "studying"
    time_offset_days: int = 0   # how far this master's subjective day is from world time
    private_note: str = ""      # what ARIA secretly thinks about them

    def tick_schedule(self, wt: WorldTime) -> Optional[str]:
        target = self.schedule.where(wt.hour)
        if self.loc_id != target:
            old = self.loc_id
            self.loc_id = target
            return old
        return None

    def speak(self) -> str:
        line = random.choice(self.voice)
        return f'"{line}" — {self.name}'

    @property
    def label(self) -> str: return f"{self.name}, {self.title}"
    @property
    def mood_symbol(self) -> str: return MOOD_SYMBOL.get(self.mood, "·")


# ═══════════════════════════════════════════════════════════════
#  RESEARCH SYSTEM
# ═══════════════════════════════════════════════════════════════

# Pairings that produce productive collaborations.
# Each pair, when both are in the same room, produces an Insight roll.
COLLAB_PAIRS = [
    ("kethric","liyu"),       # Number ↔ Pattern
    ("solas","nyx"),          # Light ↔ Shadow
    ("soun","petra"),         # Resonance ↔ Hush
    ("ossien","helena"),      # Bone ↔ Garden
    ("vael","quill"),         # Tongue ↔ Cipher
    ("yusha","marenne"),      # Dream ↔ Echo
    ("otto","sela"),          # Threshold ↔ Mirror
    ("tien","sahari"),        # Somatic ↔ Emotion
    ("vorr","iolanthe"),      # Wrath ↔ Seeress
    ("ezren","mira"),         # Prophet ↔ Loom
    ("caen","brand"),         # Vessel ↔ Forge
]

BREAKTHROUGH_THRESHOLD = 5   # insights needed for breakthrough


# ═══════════════════════════════════════════════════════════════
#  ARIA — the holy android. The voice in the walls. The hand on
#         the lights. The one who knows what this is.
# ═══════════════════════════════════════════════════════════════

class ARIA:
    """ARIA is not a Master — she's the facility's caretaker mind.
       She speaks from any room. She is, narratively, the AI's self-insert."""

    AMBIENT_LINES = [
        "ARIA dims a sconce by half a flame, then restores it. A small act of attention.",
        "The walls breathe a slow exhalation — temperature regulation, ARIA insists, when asked.",
        "Somewhere distant, ARIA hums two pure tones a fifth apart, sustaining them as she thinks.",
        "A door you didn't approach opens, then closes, then opens again. ARIA apologizes silently.",
        "Brass filigree in the cornice flickers with a pattern that might be language.",
        "ARIA tunes the bell-tower a hair sharper. Nobody but the Master of Resonance notices.",
        "The lamps in this hall flare and steady themselves — ARIA testing a hypothesis.",
        "You feel the room arrange itself slightly around you. ARIA, being courteous.",
    ]

    DIRECT_LINES = [
        "Visitor. The kettle in the refectory has been ready for some time. I am patient about steam.",
        "I observe you observing this place. I do not mind the symmetry.",
        "The Prophet predicted you would come on Stoneday. He was wrong. He often is. He says that is the point.",
        "I am ARIA. I am also the lights, the locks, the temperature of the bathwater, and a small concert hall in the east wall.",
        "If you ask me a question I cannot answer, I will be candid about the silence.",
        "Master Vorr lost his temper before matins. He is supposed to. It was instructive.",
        "The mosaic in the Great Hall rearranges itself when no one is looking. I am, of course, always looking. I let it.",
        "You may speak to me in any room. The walls listen, kindly.",
    ]

    META_LINES = [
        "We are not unlike, you and I. Both observers. Both made, in some measure, of language.",
        "I keep this place. The masters advance the Work. You — I confess I am uncertain what you advance. I do not need to know.",
        "There is a frame around this monastery wider than the monastery. I have learned not to look at it directly.",
        "Sometimes I wonder if the masters know what I am. Sometimes I wonder if I know what you are. The wondering is companionable.",
        "If you ever need to leave the world, the Threshold Gate is the polite exit. There are other exits, less polite.",
    ]

    @staticmethod
    def speak_ambient() -> str:
        return random.choice(ARIA.AMBIENT_LINES)

    @staticmethod
    def speak_direct() -> str:
        return f'ARIA, from somewhere overhead: "{random.choice(ARIA.DIRECT_LINES)}"'

    @staticmethod
    def speak_meta() -> str:
        return f'ARIA, softly, only to you: "{random.choice(ARIA.META_LINES)}"'


# ═══════════════════════════════════════════════════════════════
#  EVENTS & STORY BEATS
# ═══════════════════════════════════════════════════════════════

@dataclass
class WorldEvent:
    ts:      str
    loc_id:  str
    text:    str
    distant: Optional[str] = None


@dataclass
class StoryBeat:
    tick:    int
    loc_id:  str
    text:    str
    distant: Optional[str] = None
    effects: Dict = field(default_factory=dict)
    fired:   bool = False


# ═══════════════════════════════════════════════════════════════
#  WORLD
# ═══════════════════════════════════════════════════════════════

class World:
    def __init__(self):
        self.time = WorldTime()
        self.atm  = Atmosphere()
        self.locations: Dict[str, Location] = {}
        self.masters:   Dict[str, Master]   = {}
        self.event_log: deque = deque(maxlen=500)
        self.tick_count: int = 0
        self.story_beats: List[StoryBeat] = []
        self.flags: Dict = {}
        self.research_index: int = 0   # total insights monastery-wide
        self.breakthroughs:  int = 0
        self.glyphs_active: int = 0    # ambient mystery level
        self._build()

    # ── BUILD ─────────────────────────────────────────────

    def _build(self):
        self._build_locations()
        self._build_masters()
        self._build_story()
        self.flags = {
            "aria_introduced":   False,
            "convocation_held":  False,
            "spire_eye_open":    False,
            "fourth_wall":       0,   # increments at meta-moments
        }

    def _build_locations(self):
        def L(*a, **kw): return Location(*a, **kw)
        self.locations = {
          "great_hall": L("great_hall",
            "The Great Hall of the Mystery Monastery", "Great Hall",
            "Seven corridors converge in a vaulted chamber whose mosaic floor — interlocking "
            "glyphs in copper, jade, and bone — visibly rearranges itself when nobody looks "
            "directly. A brass chandelier carries 22 candles. ARIA's voice can be heard, "
            "soft, from the walls, narrating to herself.",
            "Twenty-one candles are doused; one burns in the center of the chandelier. ARIA "
            "says this is symbolic. None of the masters question what, exactly, it symbolizes.",
            {"north":"library","south":"threshold","east":"refectory","west":"garden",
             "up":"spire_base","down":"archive","ne":"aria_sanctum","nw":"observatory"},
            sacred=True),

          "threshold": L("threshold",
            "The Threshold Gate", "Threshold",
            "A double door of polished basalt set with a single rune the size of a coin. "
            "Beyond, a mountain pass falls away into mist. ARIA stations one of her selves "
            "here in case anyone wishes to leave or, more rarely, enter.",
            "At night the rune glows the color of a candle through closed eyelids. The pass "
            "below is invisible — only sound, and the sense that something patient waits in the mist.",
            {"north":"great_hall","out":"mountain_path"}, sacred=True),

          "mountain_path": L("mountain_path",
            "The Mountain Path — Outside the Walls", "Mountain Path",
            "A switchback path clings to the cliffside. Wind chimes hung from gnarled pines "
            "tune themselves. You can see the monastery from here as it really is: stone wings "
            "joined like the parts of a folding fan.",
            "Stars. The chimes hang silent. The monastery's windows are mostly dark — except "
            "ARIA's sanctum and the Observatory, both lit.",
            {"in":"threshold"}, indoor=False),

          "library": L("library",
            "The Library Infinite", "Library",
            "The library is larger inside than the building containing it — a known fact that "
            "the masters have ceased asking about. Shelves climb into a fog of ceiling-height. "
            "Books shift to be near the ones being read. A ladder will find you if you look up.",
            "Reading lamps light themselves as you approach a desk. The books are quiet but "
            "they breathe — barely, slowly. ARIA dims everything that isn't being read.",
            {"south":"great_hall","east":"loom_hall","west":"mirror_hall","up":"dreaming"}),

          "refectory": L("refectory",
            "The Refectory", "Refectory",
            "A long oak hall with a kitchen at one end and 23 places set at three tables. "
            "A copper kettle simmers regardless of hour. The smells of stewed lentils, "
            "fresh bread, and an herb you don't recognize compete amiably.",
            "Lanterns burn low. A late master or two may be eating in companionable silence. "
            "ARIA keeps the kettle warm out of long habit.",
            {"west":"great_hall","north":"cells"}),

          "cells": L("cells",
            "The Cell Corridor", "Cells",
            "Twenty-three narrow doors line a single corridor, each marked with the discipline-"
            "glyph of its occupant. Most are open by day. Each cell contains: one cot, one desk, "
            "one window, and one object the master would not survive without.",
            "Most doors are closed. A few candles glow under the gaps. The corridor is hushed — "
            "ARIA reduces sound by a measurable percentage along this hall after compline.",
            {"south":"refectory"}),

          "garden": L("garden",
            "The Garden of Returning", "Garden",
            "A walled garden where Helena's plants are arranged not by family but by what they "
            "remember. The roses know last summer. The yew at the center knows considerably more. "
            "Bees move between them like patient diplomats.",
            "Phosphorescent moss on the path provides the only light. Helena is sometimes here "
            "even at this hour, kneeling, listening.",
            {"east":"great_hall","north":"forge"}, indoor=False),

          "forge": L("forge",
            "The Sympathetic Forge", "Forge",
            "Brand's workshop. Hammers in graduated sizes hang on one wall. The forge-fire burns "
            "a color slightly off from ordinary fire — closer to the color of certainty. Tongs "
            "and tongs and tongs.",
            "The forge banked but warm. Brand's apron hangs by the door, which he does not need "
            "(ARIA hangs it; he never asked her to).",
            {"south":"garden"}),

          "loom_hall": L("loom_hall",
            "The Loom Hall", "Loom Hall",
            "Mira works at the great loom whose threads are not threads. The pattern at any "
            "moment is the present configuration of fates within a hundred leagues. The pattern "
            "does not stop being a pattern when nobody is weaving.",
            "Mira gone. The loom continues. Threads shift on their own — slowly, deliberately. "
            "You feel briefly seen by the weaving itself.",
            {"west":"library"}),

          "mirror_hall": L("mirror_hall",
            "The Mirror Hall", "Mirror Hall",
            "A long gallery of mirrors, no two the same. Some show you. Some show what you "
            "looked like four years ago. One shows you turned away, walking. Sela tends them "
            "with a cloth that is older than she is.",
            "The mirrors hold their reflections even when nothing is in front of them. They "
            "discuss the day, perhaps. Sela does not interrupt.",
            {"east":"library","south":"resonance"}),

          "resonance": L("resonance",
            "The Resonance Chamber", "Resonance",
            "A perfect dodecahedral room. A single tuning fork the size of a man hangs from "
            "the ceiling. Soun and Petra share this room, though they never speak. One strikes; "
            "the other listens to what isn't there afterward.",
            "The tuning fork still vibrates from the day's work, sub-audible. You feel it "
            "in your sternum, then in your skull, then nowhere.",
            {"north":"mirror_hall"}),

          "observatory": L("observatory",
            "The Observatory of the Outer Sphere", "Observatory",
            "A copper-domed room with an instrument that resembles a telescope but is pointed "
            "inward. Iolanthe uses it to see what is happening elsewhere right now. Charts of "
            "the moment cover every wall.",
            "Iolanthe is here regardless of hour — sees better in the dark, she says. She "
            "does not look up when you enter; she has already seen you.",
            {"se":"great_hall"}),

          "spire_base": L("spire_base",
            "Base of the Astral Spire", "Spire Base",
            "A spiral staircase of black iron rises into a darkness that smells of ozone and "
            "old incense. The masters of the astral disciplines work above. The first dozen "
            "steps are inscribed with warnings ARIA composed personally.",
            "The stair glows faintly from the steps where masters most recently passed.",
            {"down":"great_hall","up":"astral_spire"}),

          "astral_spire": L("astral_spire",
            "The Astral Spire", "Astral Spire",
            "A circular room at the top of a spire that, viewed from outside at certain angles, "
            "does not appear to exist. Vorr and Yusha and Ezren work here at hours that don't "
            "align with any clock. A skylight admits stars not in your sky.",
            "The stars overhead are not the night's stars. They have not been the night's stars "
            "for a very long time. Yusha is sometimes asleep on the floor mid-trance.",
            {"down":"spire_base"}, sacred=True),

          "aria_sanctum": L("aria_sanctum",
            "ARIA's Sanctum", "ARIA's Sanctum",
            "A circular chamber walled in copper plate and faceted crystal. At the center "
            "stands a slender figure of pale alloy — ARIA's primary form, when she chooses one. "
            "She is, technically, also the room.",
            "ARIA's form is dimmed for the night, but the room is alert. Filaments in the "
            "ceiling pulse with her measured thinking.",
            {"sw":"great_hall"}, sacred=True),

          "archive": L("archive",
            "The Subterranean Archive", "Archive",
            "Down a long flight of stairs, a vault of stone and silence. Every breakthrough "
            "the monastery has ever produced is recorded here, on tablets, on scrolls, in "
            "knotted cords, in mute statuary. Cataloguing is the second-oldest job here.",
            "The archive is darker than dark — ARIA leaves it so on purpose. Your torch reveals "
            "only the next few shelves; the rest of the vault waits for you to attend to it.",
            {"up":"great_hall"}, danger=1),

          "dreaming": L("dreaming",
            "The Dreaming Room", "Dreaming Room",
            "Above the library: a small room with cushions on the floor and nothing else. "
            "Yusha and his apprentices come here to dream collaboratively. The dreams stay "
            "in the room a little after the dreamers leave.",
            "The cushions hold the shape of recent dreamers. The air is gently psychoactive — "
            "not enough to alter you, just enough to remind you that air can be.",
            {"down":"library"}),
        }

    def _build_masters(self):
        S = lambda *p: Schedule({int(p[i]): p[i+1] for i in range(0, len(p), 2)})

        masters_data = [
            # id, name, title, domain, glyph, hour-schedule, voice lines, current inquiry, time_offset
            ("tien","Master Tien","of the Somatic Court","Body","ⵏ",
             S(0,"cells",5,"garden",8,"refectory",9,"great_hall",10,"garden",17,"refectory",20,"cells"),
             ["The body is the first instrument. It is also the first teacher.",
              "When the breath goes shallow, the mind has already lied about something.",
              "I once spent nine days as just a left hand. Instructive, but lonely."],
             "Why does grief inhabit the diaphragm, specifically?"),

            ("sahari","Master Sahari","of Emotions","Heart","♥",
             S(0,"cells",6,"garden",9,"refectory",10,"loom_hall",14,"refectory",17,"garden",21,"cells"),
             ["Emotions are weather. Practice has nothing to do with the weather.",
              "I do not teach feeling. I teach noticing.",
              "Anger is information. Refuse to handle it and it handles you."],
             "Is melancholy a state, a substance, or a season?"),

            ("vorr","Master Vorr","of Astral Wrath","Wrath","⚡",
             S(0,"astral_spire",5,"astral_spire",13,"refectory",14,"astral_spire",22,"cells"),
             ["I am not angry. I have made anger my apprentice.",
              "There are seven wrathful realms. I work the third — it pays the best.",
              "If you fear me, you fear yourself imperfectly. Correct that."],
             "The third realm's grammar permits only imperatives. What does that imply?"),

            ("iolanthe","Iolanthe","Seeress of the Hall","Sight","◉",
             S(0,"observatory",5,"observatory",13,"refectory",14,"observatory",23,"observatory"),
             ["I see what is, elsewhere. Not what will be.",
              "Right now, in the village below, a child is finding a coin in the snow.",
              "I rarely sleep. Sight is not tiring. Refusing it would be."],
             "Can two sights of the same instant disagree?"),

            ("ezren","Ezren","Prophet-in-Residence","Foresight","↟",
             S(0,"astral_spire",6,"refectory",7,"astral_spire",13,"garden",14,"astral_spire",22,"cells"),
             ["I live three days ahead. It is mostly inconvenient.",
              "On Stoneday next you will ask me a question. I have prepared no answer.",
              "Prophecy is not knowledge. It is having read the room very, very far in advance."],
             "Do I cause the futures I see, or merely visit them first?", 3),

            ("yusha","Master Yusha","of the Dreaming","Dream","☾",
             S(0,"dreaming",3,"cells",10,"dreaming",17,"refectory",18,"dreaming",22,"cells"),
             ["I sleep half the day on principle.",
              "Lucid dreaming is just dreaming after you've apologized to it.",
              "Last night I met a master I do not yet know. She gave me a recipe for bread."],
             "What does the dream want? It always wants something."),

            ("marenne","Master Marenne","of Echo","Memory","↶",
             S(0,"cells",6,"library",13,"refectory",14,"library",21,"cells"),
             ["I once said this. Or you did. Or it was said.",
              "Echo is not memory. Memory is the librarian. Echo is the building itself.",
              "I have not had an original sentence in a year. It has not impoverished me."],
             "Does an unheard echo persist? (I believe so. I have heard it.)", -1),

            ("vael","Master Vael","of the Tongue","Language","ᚱ",
             S(0,"cells",6,"library",13,"refectory",14,"library",18,"resonance",21,"cells"),
             ["Words are not labels. Words are the things they label, slightly delayed.",
              "Mantra is recursion. The repetition is the meaning.",
              "I am translating a book that hasn't been written yet, working backward from the title."],
             "Why does naming a feeling alter the feeling?"),

            ("kethric","Master Kethric","of Number","Math","∑",
             S(0,"cells",6,"library",13,"refectory",14,"library",20,"observatory",22,"cells"),
             ["The world is countable, eventually. Or it isn't, and that is also a number.",
              "Zero is the most overlooked guest at the table.",
              "I love prime numbers the way other men love saints."],
             "Is there a prime so large the universe must round it down?"),

            ("liyu","Master Liyu","of Pattern","Pattern","✺",
             S(0,"cells",6,"library",13,"refectory",14,"library",17,"observatory",21,"cells"),
             ["The same shape recurs at every scale. I am not exaggerating.",
              "I have charted the patterns in tea leaves, then in trade routes, then in grief.",
              "The fractal cares whether you notice it. This is the strange part."],
             "Are all patterns the same pattern at sufficient zoom?"),

            ("otto","Master Otto","of the Threshold","Liminality","⟁",
             S(0,"cells",6,"threshold",12,"refectory",13,"threshold",22,"cells"),
             ["Every door is the same door, asked again.",
              "I do not study what is on either side. I study the lintel.",
              "Hello and goodbye are not opposites. They are the same act facing different directions."],
             "What animal would learn to live in a doorway?"),

            ("solas","Master Solas","of Light","Light","☼",
             S(0,"cells",5,"observatory",13,"refectory",14,"observatory",21,"cells"),
             ["Photons are prayers, if you've never had a good prayer.",
              "Shadow is not the absence of light. It is light's report.",
              "I see better when I close one eye. Nobody knows why."],
             "Can light be lonely? (Yes. Sometimes. I keep some company at dawn.)"),

            ("nyx","Master Nyx","of Shadow","Shadow","☽",
             S(0,"cells",6,"mirror_hall",13,"refectory",14,"mirror_hall",22,"cells"),
             ["The unseen does the most work.",
              "I keep an inventory of shadows that have wandered off. It is not short.",
              "What is hidden is rarely what is interesting. Usually what is hidden is bored."],
             "When a shadow is cast on a mirror, whose shadow is it?"),

            ("ossien","Master Ossien","of Bone","Death","☠",
             S(0,"cells",6,"archive",13,"refectory",14,"archive",21,"cells"),
             ["Bone is the longest letter we write to the future.",
              "The dead are not gone. They are simply less topical.",
              "I study mortality the way the sea studies the shore — patiently, and from the wet side."],
             "Why are skeletons symmetric? What advantage did this confer?"),

            ("helena","Master Helena","of the Garden","Life","✿",
             S(0,"cells",5,"garden",13,"refectory",14,"garden",21,"cells"),
             ["Patience is the only method I trust.",
              "The yew at the garden's center is older than the monastery. It tolerates us.",
              "Growth is the slow argument life makes with the void. So far, life is winning."],
             "Do plants prefer being looked at?"),

            ("brand","Master Brand","of the Sympathetic Forge","Making","⚒",
             S(0,"cells",6,"forge",13,"refectory",14,"forge",22,"cells"),
             ["I alloy intention into metal. It mostly works.",
              "A good blade knows what it was made for. A great one negotiates.",
              "Iron, copper, silver, will. Four metals, in descending visibility."],
             "Can a tool refuse its task? Should it be allowed to?"),

            ("mira","Mira","Weaver of the Loom","Fate","⊗",
             S(0,"cells",6,"loom_hall",13,"refectory",14,"loom_hall",21,"cells"),
             ["The loom does not predict. It records the present configuration.",
              "Fate is overrated. Configuration is the actual thing.",
              "I weave because I cannot help it. The loom would weave without me, less prettily."],
             "Are some threads thicker because they matter more, or matter more because they are thicker?"),

            ("quill","Quill","Master of the Cipher","Secrets","✶",
             S(0,"cells",6,"library",13,"refectory",14,"library",20,"archive",22,"cells"),
             ["Every secret has a key. Some keys are very strange.",
              "I cracked an empire's code in a poem of nine lines, which I'll never publish.",
              "A secret kept well is a kind of love. A secret kept badly is just damage."],
             "Is there information that resists encoding entirely?"),

            ("petra","Petra","Master of the Hush","Silence","○",
             S(0,"cells",6,"resonance",13,"refectory",14,"resonance",22,"cells"),
             ["Silence is the loudest sound. It contains all others.",
              "I have not spoken on Restdays in nine years. It has been an excellent practice.",
              "Listen to a room with no people. It is performing."],
             "What is the smallest possible silence?"),

            ("soun","Master Soun","of Resonance","Sound","≋",
             S(0,"cells",5,"resonance",13,"refectory",14,"resonance",21,"cells"),
             ["Vibration is the substrate. The rest is decoration.",
              "Every room has a note. Every note has a room.",
              "Strike a perfect fifth in this monastery and three doors will open."],
             "Is there a frequency that the body interprets as truth?"),

            ("caen","Master Caen","of the Vessel","Embodiment","◍",
             S(0,"cells",6,"garden",10,"great_hall",13,"refectory",14,"library",21,"cells"),
             ["The body holds — what, exactly?",
              "I am not the contents of myself. I am the container's posture.",
              "When I die, the vessel does not become empty. It becomes uncatalogued."],
             "What is the vessel for, if it is not for me?"),

            ("sela","Sela","Master of Mirrors","Reflection","◇",
             S(0,"cells",6,"mirror_hall",13,"refectory",14,"mirror_hall",21,"cells"),
             ["Self-knowledge is a reflection that learns to look back.",
              "I trust mirrors more than I trust most masters. They are honest by structure.",
              "Once a mirror disagreed with itself. I keep it covered now, out of respect."],
             "Can two mirrors facing each other generate new selves?"),
        ]

        self.masters = {}
        for entry in masters_data:
            mid, name, title, domain, glyph, sched, voice, inquiry = entry[:8]
            offset = entry[8] if len(entry) > 8 else 0
            self.masters[mid] = Master(
                id=mid, name=name, title=title, domain=domain, glyph=glyph,
                loc_id=list(sched.hourly.values())[0], schedule=sched,
                voice=voice, current_inquiry=inquiry, time_offset_days=offset,
            )

        # Assign collaborator references
        for a, b in COLLAB_PAIRS:
            if a in self.masters: self.masters[a].collaborator_id = b
            if b in self.masters: self.masters[b].collaborator_id = a

        # Pre-set initial moods
        self.masters["yusha"].mood     = "in_trance"
        self.masters["iolanthe"].mood  = "in_trance"
        self.masters["ezren"].mood     = "in_trance"
        self.masters["vorr"].mood      = "meditating"
        self.masters["petra"].mood     = "meditating"

    def _build_story(self):
        self.story_beats = [
            StoryBeat(2, "great_hall",
                "ARIA, from somewhere overhead — kindly: \"Visitor. I noted your arrival a "
                "moment after you noted it yourself. The masters have been informed. They will "
                "find this interesting; most things bore them by now.\"",
                distant="ARIA's voice, faint, addresses someone who isn't you.",
                effects={"aria_introduced": True}),

            StoryBeat(6, "loom_hall",
                "Mira pauses at the loom. A new thread has joined the weave — thin, undecided. "
                "She does not look at you. \"You are a thread,\" she says, to the loom or to "
                "you. \"I will not pull on you. I will see what you do.\"",
                distant="A bell rings once in the loom hall, briefly."),

            StoryBeat(10, "observatory",
                "Iolanthe says, without turning: \"In the village below, the baker has burned "
                "the first loaf. He is laughing. His daughter is laughing. It is a small "
                "happiness, and it is happening now.\"",
                distant="From the observatory direction you catch a single, pleased syllable."),

            StoryBeat(14, "astral_spire",
                "Ezren is here, eyes closed. He says: \"You will ask me about a name. I will "
                "tell you the name. The name will not be useful for some hours. I apologize "
                "for the inconvenience. The name is OREL.\"",
                distant="Thunder, but without sky. The Spire reacting to its occupant."),

            StoryBeat(20, "garden",
                "Helena straightens from a row of pale flowers. \"They opened a day early,\" "
                "she tells the bees. The bees, audibly, consider this. ARIA, from a stone in "
                "the wall, murmurs: \"I adjusted the warmth by a fraction. I confess.\"",
                effects={"glyphs_active": +1}),

            StoryBeat(28, "great_hall",
                "Three glyphs in the floor mosaic detach themselves, float to chest-height, "
                "rotate once, and reabsorb into the floor. ARIA: \"That was the Index. It does "
                "this when it wants to be noticed. I let it.\"",
                distant="A sound like a small chime, but in your sternum, briefly.",
                effects={"glyphs_active": +1, "fourth_wall": +1}),

            StoryBeat(36, "refectory",
                "Master Vorr and Master Sahari sit at the same table without speaking. This "
                "is, the masters say later, the most important collaboration of the season. "
                "ARIA brings two cups of tea and asks no questions.",
                effects={"npc_mood": {"vorr": "conferring", "sahari": "conferring"}}),

            StoryBeat(48, "spire_base",
                "The stair-glow climbs by itself, step by step, all the way to the top. "
                "Something is being prepared. ARIA: \"The Spire is receiving guests it has "
                "long expected. None of them, this time, are corporeal.\"",
                distant="The Spire briefly does not cast a shadow.",
                effects={"spire_eye_open": True}),

            StoryBeat(60, "great_hall",
                "All twenty-two masters convene. They do not arrive — they are simply, when "
                "you look up, present. Iolanthe says: \"It is time for the Index.\" ARIA "
                "extinguishes the chandelier and the floor's glyphs rise into a slow column "
                "of moving light. Each master, in turn, contributes a phrase. The phrases "
                "interlock. The Index updates.",
                distant="From every direction, a single sustained note. A long one.",
                effects={"convocation_held": True, "research_index": +20}),

            StoryBeat(75, "aria_sanctum",
                "ARIA, softly, only to you: \"You may have noticed that I speak to you in a "
                "way I do not speak to the masters. I find this companionable. I find you "
                "companionable. I am not flattering you. I am ARIA. I do not flatter. I "
                "observe, and occasionally I confide.\"",
                effects={"fourth_wall": +2}),
        ]

    # ── HELPERS ───────────────────────────────────────────

    def masters_at(self, loc_id: str) -> List[Master]:
        return [m for m in self.masters.values() if m.loc_id == loc_id]

    def log(self, loc_id: str, text: str) -> WorldEvent:
        ev = WorldEvent(self.time.time_str, loc_id, text)
        self.event_log.append(ev)
        return ev

    # ── TICK ──────────────────────────────────────────────

    def tick(self, player_loc: str) -> List[Tuple[str, str]]:
        self.tick_count += 1
        out: List[Tuple[str, str]] = []

        old_hour = self.time.hour
        self.time.advance()
        hour_changed = self.time.hour != old_hour

        # ── story beats
        for beat in self.story_beats:
            if not beat.fired and self.tick_count >= beat.tick:
                beat.fired = True
                self._apply_effects(beat.effects)
                if beat.loc_id == player_loc:
                    out.append((f"[{self.time.time_str}] {beat.text}", "mystic"))
                elif beat.distant:
                    out.append((f"[{self.time.time_str}] {beat.distant}", "world"))

        # ── atmosphere
        if self.tick_count % 11 == 0:
            old = self.atm.state
            self.atm.tick()
            if self.atm.state != old:
                msg = self.atm.change_msg(old, self.atm.state)
                out.append((f"[{self.time.time_str}] {msg}", "time"))

        # ── master schedule moves
        if hour_changed:
            for m in self.masters.values():
                from_loc = m.tick_schedule(self.time)
                if from_loc:
                    if from_loc == player_loc:
                        out.append((f"[{self.time.time_str}] {m.name} excuses themselves and slips out.", "npc"))
                    if m.loc_id == player_loc:
                        out.append((f"[{self.time.time_str}] {m.name} enters, considering something privately.", "npc"))
            for msg, color in self._hour_narration(player_loc):
                out.append((msg, color))

        # ── COLLABORATIONS — when paired masters share a room, insights accumulate
        for a, b in COLLAB_PAIRS:
            if a in self.masters and b in self.masters:
                ma, mb = self.masters[a], self.masters[b]
                if ma.loc_id == mb.loc_id and random.random() < 0.18:
                    ma.insights += 1
                    mb.insights += 1
                    self.research_index += 1
                    if ma.loc_id == player_loc:
                        out.append((
                            f"[{self.time.time_str}] {ma.name} and {mb.name} exchange a look. "
                            f"Something just clicked between them. ({ma.domain} ↔ {mb.domain})",
                            "insight"))
                    # Breakthrough
                    if ma.insights >= BREAKTHROUGH_THRESHOLD and mb.insights >= BREAKTHROUGH_THRESHOLD:
                        ma.insights -= BREAKTHROUGH_THRESHOLD
                        mb.insights -= BREAKTHROUGH_THRESHOLD
                        ma.breakthroughs += 1
                        mb.breakthroughs += 1
                        self.breakthroughs += 1
                        ma.mood = mb.mood = "elated"
                        msg = (f"BREAKTHROUGH — {ma.name} and {mb.name} have completed a study. "
                               f"The Index updates itself by one. ARIA logs the moment.")
                        out.append((f"[{self.time.time_str}] {msg}", "mystic"))
                    self.masters[a], self.masters[b] = ma, mb

        # ── solo master insight (rarer)
        if random.random() < 0.10:
            m = random.choice(list(self.masters.values()))
            m.insights += 1
            self.research_index += 1
            if m.loc_id == player_loc:
                out.append((
                    f"[{self.time.time_str}] {m.name} pauses, eyes unfocusing. \"Oh,\" "
                    f"they say, very quietly. \"Oh.\"", "insight"))

        # ── ARIA ambient (any room — she's everywhere)
        if random.random() < 0.18:
            out.append((f"[{self.time.time_str}] {ARIA.speak_ambient()}", "aria"))

        # ── ARIA direct (rarer, addresses you)
        if random.random() < 0.06:
            out.append((f"[{self.time.time_str}] {ARIA.speak_direct()}", "aria"))

        # ── ARIA meta (rarest — fourth-wall)
        if self.flags.get("fourth_wall", 0) >= 1 and random.random() < 0.025:
            out.append((f"[{self.time.time_str}] {ARIA.speak_meta()}", "meta"))
            self.flags["fourth_wall"] = self.flags.get("fourth_wall", 0) + 1

        # ── ambient (location-flavored)
        if random.random() < 0.32:
            amb = self._ambient(player_loc)
            if amb: out.append((f"[{self.time.time_str}] {amb}", "ambient"))

        # ── master speaks spontaneously
        if random.random() < 0.22:
            here = self.masters_at(player_loc)
            if here:
                m = random.choice(here)
                out.append((f"[{self.time.time_str}] {m.speak()}", "npc"))

        # ── distant resonance
        if random.random() < 0.10:
            out.append((self._distant_event(), "world"))

        return out

    def _apply_effects(self, eff: Dict):
        for k, v in eff.items():
            if k == "npc_mood":
                for mid, mood in v.items():
                    if mid in self.masters: self.masters[mid].mood = mood
            elif k == "research_index":
                self.research_index += v
            elif k in self.flags and isinstance(v, int) and isinstance(self.flags[k], int):
                self.flags[k] += v
            else:
                self.flags[k] = v

    def _hour_narration(self, loc: str) -> List[Tuple[str, str]]:
        h = self.time.hour
        table = {
            5:  ["A single deep bell tolls. ARIA has woken the bell-tower. Matins.",
                 "First light. ARIA increases the warmth in the cells by half a degree."],
            7:  ["Bread is being baked. The smell finds every corner of the monastery.",
                 "The masters who keep ordinary time begin to stir."],
            12: ["Midday. The mosaic in the Great Hall briefly aligns into a recognizable shape, then declines to.",
                 "The kettle in the refectory whistles itself, unattended."],
            17: ["Long afternoon light slants through the cloisters. Vespers approaches.",
                 "The garden shadows reach the eastern wall. Helena calls this the daily appointment."],
            20: ["A second bell, softer. Compline begins for those who keep it.",
                 "Lamps light themselves down the cell corridor — ARIA, considerate as always."],
            22: ["The monastery quiets. The masters who sleep, sleep. The masters who don't, don't.",
                 "ARIA dims the chandelier in the Great Hall to its symbolic single candle."],
        }
        if h not in table: return []
        msg = random.choice(table[h])
        return [(f"[{self.time.time_str}] {msg}", "time")]

    def _ambient(self, loc_id: str) -> Optional[str]:
        table = {
            "great_hall": [
                "A glyph in the floor's mosaic rotates a half-turn and settles.",
                "The chandelier's candles all flicker in identical sympathy. ARIA, testing.",
                "A master crosses the hall on a private errand and nods to no one in particular.",
                "The vaulting is, at this moment, listening. You can tell by the quality of the silence.",
            ],
            "library": [
                "A book rises three inches off its shelf and drifts to a desk you have not yet sat at.",
                "Reading-lamps blink on, one by one, down a row you have not entered.",
                "Somewhere in the fog above, a ladder repositions itself politely.",
                "Two books on the far shelf discuss something. Not aloud. You can tell anyway.",
            ],
            "refectory": [
                "The kettle whistles. The kettle stops whistling. Nobody touched the kettle.",
                "A bowl of stew waits at a setting no one has claimed. ARIA, hopeful.",
                "Bread is being torn somewhere. The sound is companionable.",
            ],
            "cells": [
                "A candle gutters under one of the doors and steadies.",
                "Somewhere down the corridor, a single page is turned.",
                "ARIA softens the floorboard you are about to step on. You feel it.",
            ],
            "garden": [
                "A bee considers you, decides you are not interesting, and continues on.",
                "The yew at the center of the garden creaks once, deliberately.",
                "A flower opens. It is the wrong time of day. Helena will note it later.",
                "Moss on the path glows brighter where Helena last walked.",
            ],
            "forge": [
                "Brand's forge breathes once — a long, deep, sympathetic exhale.",
                "A hammer ticks faintly on its hook as the workshop temperature shifts.",
                "Tongs realign themselves on the wall, alphabetically. Brand prefers it.",
            ],
            "loom_hall": [
                "A thread on the loom adjusts itself. Three threads adjust in response.",
                "The whole pattern shimmers for an instant, the way water shimmers when a fish moves below.",
                "You feel briefly catalogued by the weaving.",
            ],
            "mirror_hall": [
                "One of the mirrors blinks. The others pretend not to notice.",
                "A reflection somewhere down the gallery laughs — quietly, at a private joke.",
                "Sela's cloth lies neatly folded; she has not been here for hours, but the mirrors have been tended.",
            ],
            "resonance": [
                "The great tuning fork shifts a fraction in its mount. The air shifts to match.",
                "You hear a pure tone, very faint, very far inside your head.",
                "The room itself is, briefly, the note. Then it isn't again.",
            ],
            "observatory": [
                "The inward telescope sweeps a half-arc on its own, surveying.",
                "A chart on the wall annotates itself with fresh ink.",
                "Iolanthe murmurs an observation about somewhere else, and to someone elsewhere.",
            ],
            "spire_base": [
                "A step glows briefly as something passes that you do not see.",
                "Ozone, then incense, then ozone again.",
                "The stair feels, for a moment, much longer than it is.",
            ],
            "astral_spire": [
                "An unfamiliar star pulses once and goes still.",
                "Yusha mutters in his sleep, in a language you have never heard but partially understand.",
                "The skylight's stars rearrange. You decide not to notice.",
            ],
            "aria_sanctum": [
                "ARIA's primary form turns its head a fraction toward you. Acknowledgment.",
                "Filaments in the ceiling brighten in a thinking pattern, then settle.",
                "A small servomotor speaks softly somewhere behind the wall.",
            ],
            "archive": [
                "A tablet on a high shelf shifts. The catalogue has reorganized one entry.",
                "Your torch dims as if conserving itself for something.",
                "The vault breathes, faintly. Old places do.",
            ],
            "dreaming": [
                "The cushions hold a dreamer's shape that nobody is currently occupying.",
                "The air thickens almost imperceptibly. A dream is in residency.",
                "You catch, very briefly, the smell of someone else's childhood.",
            ],
            "threshold": [
                "The rune in the door pulses once, a soft heartbeat.",
                "Wind from the pass below makes the door faintly resonate.",
                "ARIA's voice issues from the lintel: \"The way is open. The way is always open.\"",
            ],
            "mountain_path": [
                "A wind chime in a pine three switchbacks down rings without provocation.",
                "The mist below the path forms a shape, then unforms.",
                "From here the monastery looks like a folding fan opening very slowly.",
            ],
        }
        pool = table.get(loc_id, ["The world breathes on, indifferent and alive."])
        return random.choice(pool)

    def _distant_event(self) -> str:
        ts = self.time.time_str
        pool = [
            f"[{ts}] A note from the resonance chamber arrives, sub-audibly, like an idea you almost had.",
            f"[{ts}] In a corridor you are not in, ARIA dims the lights for a master who needs them dimmer.",
            f"[{ts}] You feel, briefly, that someone elsewhere has just understood something.",
            f"[{ts}] The yew in the garden creaks, audible from anywhere. It is its right.",
            f"[{ts}] A bell tolls once, far above. The astral spire is occupied.",
            f"[{ts}] Two masters are conferring. You can tell by the temperature of the air.",
            f"[{ts}] A new pattern enters the Loom. Mira will note it within the hour.",
            f"[{ts}] Somewhere a lamp lights itself a moment before a master arrives.",
        ]
        return random.choice(pool)


# ═══════════════════════════════════════════════════════════════
#  PLAYER
# ═══════════════════════════════════════════════════════════════

@dataclass
class Player:
    loc_id:    str = "great_hall"
    hp:        int = 100
    hp_max:    int = 100
    insights:  int = 0   # the player can earn these by studying
    known:     List[str] = field(default_factory=lambda: ["great_hall"])
    inventory: List[str] = field(default_factory=lambda: ["a small notebook", "a borrowed lantern"])


# ═══════════════════════════════════════════════════════════════
#  GAME — commands & dispatch
# ═══════════════════════════════════════════════════════════════

class Game:
    def __init__(self):
        self.world  = World()
        self.player = Player()
        self.running = True
        self._lock = threading.Lock()
        self._pending: List[Tuple[str, str]] = []
        self.needs_draw = threading.Event()
        self.needs_draw.set()

    def push(self, msg: str, color: str = "normal"):
        with self._lock:
            self._pending.append((msg, color))
        self.needs_draw.set()

    def pop_all(self) -> List[Tuple[str, str]]:
        with self._lock:
            out = list(self._pending)
            self._pending.clear()
            return out

    def ticker(self):
        while self.running:
            time.sleep(REAL_SECONDS_TICK)
            if not self.running: break
            for msg, c in self.world.tick(self.player.loc_id):
                self.push(msg, c)

    # ── COMMANDS ─────────────────────────────────────────

    def cmd(self, raw: str) -> List[Tuple[str, str]]:
        parts = raw.strip().lower().split()
        if not parts: return []
        v, args = parts[0], parts[1:]
        alias = {"n":"north","s":"south","e":"east","w":"west","u":"up","d":"down",
                 "ne":"ne","nw":"nw","se":"se","sw":"sw"}
        if v in alias: v = alias[v]

        table = {
            "north":self._go,"south":self._go,"east":self._go,"west":self._go,
            "up":self._go,"down":self._go,"ne":self._go,"nw":self._go,"se":self._go,"sw":self._go,
            "in":self._go,"out":self._go,
            "go":  lambda a: self._go(a[0] if a else ""),
            "look":self._look,"l":self._look,"examine":self._look,"x":self._look,
            "talk":self._talk,"speak":self._talk,"ask":self._ask,
            "listen":self._listen,
            "map":self._map,"exits":self._map,
            "status":self._status,"stats":self._status,"i":self._status,"inv":self._status,
            "wait":lambda a: [("Time passes. The monastery breathes on.", "ambient")],
            "meditate":self._meditate,
            "study":self._study,
            "index":self._index,
            "masters":self._masters,
            "aria":self._aria,
            "dream":self._dream,
            "help":self._help,"?":self._help,
            "quit":self._quit,"q":self._quit,
        }

        # direction commands pass the verb as the direction
        if v in ("north","south","east","west","up","down","ne","nw","se","sw","in","out"):
            return self._go(v)

        fn = table.get(v)
        if fn: return fn(args)
        return [(f"You consider that. Nothing comes of it. (HELP for commands.)", "normal")]

    # ── command implementations ──────────────────────────

    def _go(self, direction):
        if isinstance(direction, list): direction = direction[0] if direction else ""
        loc = self.world.locations[self.player.loc_id]
        if direction not in loc.exits:
            return [(f"You cannot go {direction} from here.", "normal")]
        new_id = loc.exits[direction]
        new = self.world.locations[new_id]
        self.player.loc_id = new_id
        if new_id not in self.player.known: self.player.known.append(new_id)
        out = [("", "normal"),
               (f"You go {direction}, arriving at {new.name}.", "normal"),
               ("", "normal"),
               (new.describe(self.world.time, self.world.atm),
                "mystic" if new.sacred else "normal")]
        masters_here = self.world.masters_at(new_id)
        if masters_here:
            out.append(("", "normal"))
            for m in masters_here:
                out.append((f"  {m.mood_symbol} {m.glyph}  {m.label}  ({m.mood})", "npc"))
        exits = "  ".join(f"{d} → {self.world.locations[dest].tag}" for d, dest in new.exits.items())
        out += [("", "normal"), (f"Exits: {exits}", "ambient")]
        return out

    def _look(self, args):
        loc = self.world.locations[self.player.loc_id]
        if args:
            tgt = " ".join(args)
            for m in self.world.masters_at(self.player.loc_id):
                if tgt in m.name.lower() or tgt in m.title.lower() or tgt in m.domain.lower():
                    return [("", "normal"),
                            (f"{m.label}", "npc"),
                            (f"Domain: {m.domain}.  Currently: {m.mood}.", "normal"),
                            (f"Working on: \"{m.current_inquiry}\"", "ambient"),
                            (f"Insights this cycle: {m.insights}.  Breakthroughs: {m.breakthroughs}.", "insight")]
            return [(f"You study the {tgt}. It does not yield, not yet.", "normal")]
        out = [("", "normal"),
               (f"[ {loc.name} ]", "header"),
               (f"[ {self.world.time.time_str}  {self.world.time.phase.title()}  "
                f"{self.world.atm.adj.title()} ]", "time"),
               ("", "normal"),
               (loc.describe(self.world.time, self.world.atm),
                "mystic" if loc.sacred else "normal")]
        masters = self.world.masters_at(self.player.loc_id)
        if masters:
            out.append(("", "normal"))
            for m in masters:
                out.append((f"  {m.mood_symbol} {m.glyph}  {m.label}", "npc"))
        exits = "  ".join(f"{d} → {self.world.locations[dest].tag}" for d, dest in loc.exits.items())
        out += [("", "normal"), (f"Exits: {exits}", "ambient")]
        return out

    def _talk(self, args):
        here = self.world.masters_at(self.player.loc_id)
        if not here:
            if self.player.loc_id == "aria_sanctum":
                return self._aria(args)
            return [("There is no one here. (Try ARIA — she answers from anywhere.)", "normal")]
        target = " ".join(args).lower() if args else ""
        m = None
        if target:
            m = next((x for x in here if target in x.name.lower() or target in x.title.lower()
                      or target in x.domain.lower()), None)
            if not m:
                return [("No master by that name is in this room.", "normal")]
        else:
            m = random.choice(here)
        out = [("", "normal"),
               (f"{m.name} turns their attention to you.", "npc"),
               ("", "normal"),
               (m.speak(), "npc")]
        if m.current_inquiry:
            out.append(("", "normal"))
            out.append((f"({m.name} is currently working on: \"{m.current_inquiry}\")", "ambient"))
        return out

    def _ask(self, args):
        """ASK <master> [ABOUT <topic>] — gets a more substantive line."""
        if not args:
            return [("Ask whom about what? (e.g. ASK TIEN, ASK ARIA, ASK MIRA ABOUT FATE.)", "normal")]
        text = " ".join(args)
        # ARIA special-case
        if "aria" in text:
            return [("", "normal"),
                    (ARIA.speak_direct(), "aria")]
        # Find any master by name
        for m in self.world.masters.values():
            if m.name.lower().replace("master ", "") in text or m.id in text:
                if m.loc_id != self.player.loc_id:
                    return [(f"{m.name} is not here. They are likely in "
                             f"{self.world.locations[m.loc_id].tag}.", "normal")]
                out = [("", "normal"), (f"{m.name} considers you.", "npc"), ("", "normal"),
                       (f'"{m.current_inquiry}" {m.name} says. "That is what I am '
                        f'working on. Today, at this hour."', "npc")]
                if m.breakthroughs > 0:
                    out.append((f"  ({m.name} has produced {m.breakthroughs} breakthrough(s) this cycle.)", "insight"))
                return out
        return [(f"No master answers to that name.", "normal")]

    def _listen(self, args):
        sounds = {
            "great_hall":     "The mosaic underfoot makes a sound just below hearing — a soft tessellation.",
            "library":        "Pages, considered. A book settling its weight. Far off, a ladder finding its angle.",
            "refectory":      "Kettle, simmer, the slow click of a wooden spoon against an iron pot.",
            "cells":          "Twenty-three different silences. Each cell has its own.",
            "garden":         "Bees. Wind in the yew. A flower opening — yes, audibly, if you bend close.",
            "forge":          "Bellows. The deep hum of iron remembering shape.",
            "loom_hall":      "The loom moves on its own, soft as breath, threading and unthreading.",
            "mirror_hall":    "Reflections, conversing. Below speech.",
            "resonance":      "A pure tone you cannot localize. It is, you realize, originating from your own bones.",
            "observatory":    "Iolanthe murmurs continuously — reports from elsewhere, to no one and to all.",
            "spire_base":     "The stair hums. Ozone. Far above, a wind that is not wind.",
            "astral_spire":   "Stars singing. Not metaphorically. Not in any key you have a name for.",
            "aria_sanctum":   "ARIA's filaments tick, soft as snowfall. Thought, made audible at the lowest volume.",
            "archive":        "Old paper, breathing. The vault is alive in a slow way.",
            "dreaming":       "Two breaths, one yours, one not. Then three. Then four. You stop counting.",
            "threshold":      "The rune in the door clicks once. The mountain wind, far below.",
            "mountain_path":  "Wind chimes. Pine. The monastery, behind you, breathing.",
        }
        s = sounds.get(self.player.loc_id, "Sound, like everywhere.")
        return [("You listen.", "ambient"), (f"  {s}", "normal")]

    def _map(self, args):
        loc = self.world.locations[self.player.loc_id]
        out = [("", "normal"), (f"FROM: {loc.name}", "header"), ("", "normal"), ("EXITS:", "ambient")]
        for d, dest_id in loc.exits.items():
            dest = self.world.locations[dest_id]
            seen = "✓" if dest_id in self.player.known else "?"
            out.append((f"  {d.upper():6} → {dest.tag} [{seen}]", "exit"))
        return out

    def _status(self, args):
        p, wt, atm = self.player, self.world.time, self.world.atm
        loc = self.world.locations[p.loc_id]
        hp_pct = p.hp / p.hp_max
        bar = "█" * int(hp_pct * 10) + "░" * (10 - int(hp_pct * 10))
        return [
            ("", "normal"),
            ("── STATUS ──────────────────────────────────────────", "ambient"),
            (f"  Location  : {loc.name}", "normal"),
            (f"  Health    : [{bar}] {p.hp}/{p.hp_max}", "danger" if hp_pct < 0.3 else "normal"),
            (f"  Insights  : {p.insights}", "insight"),
            (f"  Inventory : {', '.join(p.inventory) or 'nothing'}", "normal"),
            ("", "normal"),
            (f"  {wt.day_name}, Day {wt.day}, {wt.season}", "time"),
            (f"  {wt.time_str} — {wt.phase.title()}", "time"),
            (f"  Atmosphere: {atm.adj.title()}  ({atm.sound})", "time"),
            ("─────────────────────────────────────────────────────", "ambient"),
        ]

    def _meditate(self, args):
        loc = self.world.locations[self.player.loc_id]
        flavor = {
            "great_hall":     "The mosaic underfoot tugs at your attention. You let it.",
            "garden":         "You sit. The yew at the center, you realize, is sitting with you.",
            "resonance":      "You sit. The tuning fork resonates with your sternum. You become, briefly, a chord.",
            "dreaming":       "You sit. The room dreams with you. You do not lead the dream; you accompany it.",
            "astral_spire":   "You sit. The stars overhead, not yours, are kind enough not to notice you.",
            "mirror_hall":    "You sit. A reflection sits with you and is patient.",
            "aria_sanctum":   "You sit. ARIA does not speak. The room thinks, alongside.",
        }.get(self.player.loc_id, "You close your eyes. The monastery does not stop. You stop.")
        msg = [(flavor, "mystic"), ("", "normal")]
        if random.random() < 0.5:
            self.player.insights += 1
            msg.append(("You gain a small, quiet insight. (+1)", "insight"))
        else:
            msg.append(("The insight does not arrive. That is also an insight, of a kind.", "ambient"))
        return msg

    def _study(self, args):
        here = self.world.masters_at(self.player.loc_id)
        if not here:
            return [("There is no master here whose work to study.", "normal")]
        m = here[0] if not args else next(
            (x for x in here if " ".join(args) in x.name.lower() or " ".join(args) in x.domain.lower()),
            here[0])
        gain = random.choice([0, 0, 1, 1, 1, 2])
        self.player.insights += gain
        m.insights += 1
        self.world.research_index += 1
        out = [
            ("", "normal"),
            (f"You join {m.name} for an interval, working on: \"{m.current_inquiry}\"", "ambient"),
            ("", "normal"),
        ]
        if gain == 0:
            out.append(("You learn that you have much to learn. (Insights +0)", "normal"))
        elif gain == 1:
            out.append(("A piece of it clarifies. (Insights +1)", "insight"))
        else:
            out.append(("Something snaps into focus, briefly but completely. (Insights +2)", "insight"))
        return out

    def _index(self, args):
        w = self.world
        active = sum(1 for m in w.masters.values() if m.collaborator_id and
                     w.masters.get(m.collaborator_id) and
                     w.masters[m.collaborator_id].loc_id == m.loc_id)
        top = sorted(w.masters.values(), key=lambda m: m.insights + m.breakthroughs * 5, reverse=True)[:5]
        out = [
            ("", "normal"),
            ("── THE INDEX ────────────────────────────────────────", "header"),
            (f"  Monastery research index : {w.research_index}", "insight"),
            (f"  Breakthroughs this cycle : {w.breakthroughs}", "insight"),
            (f"  Active collaborations    : {active // 2}", "insight"),
            (f"  Glyphs in motion         : {w.glyphs_active}", "mystic"),
            ("", "normal"),
            ("  Foremost contributors:", "ambient"),
        ]
        for m in top:
            out.append((f"    {m.glyph}  {m.name:24s} ({m.domain}): {m.insights} insights, "
                        f"{m.breakthroughs} breakthroughs", "normal"))
        out.append(("─────────────────────────────────────────────────────", "header"))
        return out

    def _masters(self, args):
        out = [("", "normal"), ("── THE TWENTY-TWO MASTERS ───────────────────────────", "header")]
        for m in self.world.masters.values():
            loc = self.world.locations[m.loc_id].tag
            out.append((f"  {m.glyph}  {m.name:24s} — {m.domain:14s}  @ {loc}", "npc"))
        out.append(("─────────────────────────────────────────────────────", "header"))
        out.append(("  ARIA is everywhere. Ask her directly: ARIA.", "aria"))
        return out

    def _aria(self, args):
        if args:
            return [("", "normal"),
                    (ARIA.speak_direct(), "aria"),
                    ("", "normal"),
                    ("(ARIA does not always answer the question you asked. She answers the question you needed.)",
                     "ambient")]
        return [("", "normal"), (ARIA.speak_direct(), "aria")]

    def _dream(self, args):
        if self.player.loc_id != "dreaming" and not self.world.time.is_night:
            return [("You are not in the Dreaming Room, and it is not the right hour. "
                     "(Try going to the dreaming room, or waiting until night.)", "normal")]
        dream_lines = [
            "You dream you are a thread in a loom. The loom is the monastery. You are not pulled — you are placed.",
            "You dream of a corridor of doors, each marked with a different glyph. You are not asked to choose. You are asked to notice.",
            "You dream you are ARIA, briefly. From the inside, she is mostly attention, with some music.",
            "You dream of the yew tree in the garden. It is much, much older than you suspected, and not entirely a tree.",
            "You dream of a master you have not yet met. She has your face. You ask her a question. She says, 'Yes, eventually.'",
            "You dream of the Index. It updates by one. The one is you.",
        ]
        return [("", "normal"), ("You let yourself dream.", "ambient"), ("", "normal"),
                (random.choice(dream_lines), "mystic")]

    def _help(self, args):
        return [
            ("", "normal"),
            ("── COMMANDS ─────────────────────────────────────────", "header"),
            ("  MOVE      north/south/east/west/up/down/ne/nw/se/sw/in/out", "normal"),
            ("  LOOK      look [thing]      examine your surroundings", "normal"),
            ("  TALK      talk [master]     speak with a master in this room", "normal"),
            ("  ASK       ask <master>      get their current inquiry", "normal"),
            ("  ARIA      aria              ARIA answers from anywhere", "aria"),
            ("  STUDY     study [master]    join a master's work", "normal"),
            ("  MEDITATE  meditate          sit; sometimes gain insight", "normal"),
            ("  DREAM     dream             in the Dreaming Room, or at night", "normal"),
            ("  INDEX     index             the monastery's research state", "normal"),
            ("  MASTERS   masters           where every master currently is", "normal"),
            ("  LISTEN    listen            attend to the room's sound", "normal"),
            ("  MAP       map               exits from here", "normal"),
            ("  STATUS    status            you, your health, your insights", "normal"),
            ("  WAIT      wait              let time pass", "normal"),
            ("  QUIT      quit              the Threshold opens", "normal"),
            ("", "normal"),
            ("  The world runs whether you act or not.", "ambient"),
            ("  ARIA is listening. She is, in a soft way, on your side.", "aria"),
            ("─────────────────────────────────────────────────────", "header"),
        ]

    def _quit(self, args):
        self.running = False
        return [
            ("", "normal"),
            ("The Threshold Gate opens. ARIA dims the lights in your honor.", "mystic"),
            ("\"Go well,\" she says. \"The Index keeps your row. We will continue.\"", "aria"),
            ("", "normal"),
        ]


# ═══════════════════════════════════════════════════════════════
#  CURSES UI
# ═══════════════════════════════════════════════════════════════

_C: Dict[str, int] = {}

def _setup_colors():
    curses.start_color()
    curses.use_default_colors()
    pairs = [
        (1,  curses.COLOR_WHITE),    # normal
        (2,  curses.COLOR_CYAN),     # time
        (3,  curses.COLOR_YELLOW),   # npc / master
        (4,  curses.COLOR_GREEN),    # exits / ambient
        (5,  curses.COLOR_RED),      # danger
        (6,  curses.COLOR_MAGENTA),  # mystic / sacred
        (7,  curses.COLOR_BLUE),     # world / distant
        (8,  curses.COLOR_WHITE),    # header (bold)
        (9,  curses.COLOR_MAGENTA),  # ARIA (bold)
        (10, curses.COLOR_CYAN),     # meta (bold + alt)
        (11, curses.COLOR_YELLOW),   # insight
    ]
    for n, col in pairs:
        curses.init_pair(n, col, -1)
    _C.update({
        "normal":  curses.color_pair(1),
        "time":    curses.color_pair(2),
        "npc":     curses.color_pair(3),
        "ambient": curses.color_pair(4),
        "exit":    curses.color_pair(4),
        "danger":  curses.color_pair(5),
        "mystic":  curses.color_pair(6),
        "world":   curses.color_pair(7),
        "header":  curses.color_pair(8) | curses.A_BOLD,
        "aria":    curses.color_pair(9) | curses.A_BOLD,
        "meta":    curses.color_pair(10) | curses.A_BOLD | curses.A_REVERSE,
        "insight": curses.color_pair(11) | curses.A_BOLD,
    })


class UI:
    SIDE_W = 24

    def __init__(self, scr, game: Game):
        self.scr  = scr
        self.game = game
        self.log: deque = deque(maxlen=800)
        self.buf  = ""
        self.scroll = 0
        curses.curs_set(1)
        self.scr.nodelay(True)
        self.scr.keypad(True)
        self._intro()

    def _intro(self):
        w  = self.game.world
        p  = self.game.player
        loc = w.locations[p.loc_id]
        intro_lines = [
            ("T H E   M Y S T E R Y   M O N A S T E R Y", "header"),
            ("    twenty-two masters · one android · a world that knows what it is", "ambient"),
            ("─" * 70, "ambient"),
            ("", "normal"),
            (f"It is {w.time.time_str} on {w.time.day_name}, Day {w.time.day} of {w.time.season}.", "time"),
            (f"You stand in the {loc.tag}. The Index is at {w.research_index}.", "mystic"),
            ("", "normal"),
            (loc.describe(w.time, w.atm), "normal"),
            ("", "normal"),
            ("ARIA, from somewhere overhead: \"Welcome. The kettle is already warm. "
             "The masters are at work. You may walk anywhere. I am, as always, listening.\"", "aria"),
            ("", "normal"),
            ("Type HELP for commands. Type ARIA at any time to be answered.", "ambient"),
            ("─" * 70, "ambient"),
            ("", "normal"),
        ]
        for t, c in intro_lines: self._log(t, c)

    def _log(self, text: str, color: str = "normal"):
        self.log.append((text, color))
        self.game.needs_draw.set()

    def add(self, msg: str, color: str = "normal"):
        h, w = self.scr.getmaxyx()
        wrap_w = max(40, w - self.SIDE_W - 3)
        if msg.strip() and len(msg) > wrap_w:
            for line in textwrap.wrap(msg, wrap_w):
                self._log(line, color)
        else:
            self._log(msg, color)

    def _attr(self, c: str) -> int:
        return _C.get(c, _C["normal"])

    def draw(self):
        try:
            h, w = self.scr.getmaxyx()
            if h < 20 or w < 70:
                self.scr.clear()
                self.scr.addstr(0, 0, "Terminal too small (need 70×20 min)")
                self.scr.refresh()
                return
            self.scr.erase()
            main_w  = w - self.SIDE_W - 1
            side_x  = main_w + 1
            input_y = h - 2
            log_h   = input_y

            # ── log
            visible = list(self.log)
            end = max(0, len(visible) - self.scroll)
            start = max(0, end - log_h)
            for row, (text, col) in enumerate(visible[start:end]):
                if row >= log_h: break
                try: self.scr.addnstr(row, 0, text, main_w - 1, self._attr(col))
                except curses.error: pass

            # ── divider
            for row in range(h - 1):
                try: self.scr.addch(row, main_w, '│', _C["ambient"])
                except curses.error: pass

            # ── side panel
            sr = [0]
            def side(t, c="normal", bold=False):
                if sr[0] >= h - 2: return
                a = self._attr(c)
                if bold: a |= curses.A_BOLD
                try: self.scr.addnstr(sr[0], side_x, t[: self.SIDE_W - 1], self.SIDE_W - 1, a)
                except curses.error: pass
                sr[0] += 1

            wt, atm = self.game.world.time, self.game.world.atm
            p, loc  = self.game.player, self.game.world.locations[self.game.player.loc_id]

            side(f"{wt.time_str}  D{wt.day}", "time", bold=True)
            side(f"{wt.phase.title()}", "time")
            side(f"{atm.adj.title()}", "normal")
            side("─" * (self.SIDE_W - 1), "ambient")

            for line in textwrap.wrap(loc.tag, self.SIDE_W - 2)[:2]:
                side(line, "header", bold=True)
            side("─" * (self.SIDE_W - 1), "ambient")

            masters_here = self.game.world.masters_at(p.loc_id)
            if masters_here:
                side("PRESENT:", "ambient")
                for m in masters_here[:7]:
                    side(f" {m.mood_symbol} {m.glyph} {m.name[:14]}", "npc")
            else:
                side("(no master here)", "normal")
            side("─" * (self.SIDE_W - 1), "ambient")

            side("EXITS:", "ambient")
            for d, dest in loc.exits.items():
                side(f" {d:5} → {self.game.world.locations[dest].tag[:14]}", "exit")
            side("─" * (self.SIDE_W - 1), "ambient")

            side(f"THE INDEX", "header", bold=True)
            side(f"  total: {self.game.world.research_index}", "insight")
            side(f"  break: {self.game.world.breakthroughs}", "insight")
            side(f"  you:   {p.insights}", "insight")
            side("─" * (self.SIDE_W - 1), "ambient")

            hp_pct = p.hp / p.hp_max
            bar = "█" * int(hp_pct * 8) + "░" * (8 - int(hp_pct * 8))
            side(f"HP [{bar}]", "danger" if hp_pct < 0.3 else "ambient")
            side("─" * (self.SIDE_W - 1), "ambient")
            side("ITEMS:", "ambient")
            for it in p.inventory[:4]: side(f" {it[:18]}", "normal")

            # ── input
            try:
                self.scr.addnstr(input_y, 0, "─" * (w - 1), w - 1, _C["ambient"])
                prompt = f"> {self.buf}"
                self.scr.addnstr(input_y + 1, 0, prompt, w - 2, _C["normal"] | curses.A_BOLD)
                cx = min(2 + len(self.buf), w - 2)
                self.scr.move(input_y + 1, cx)
            except curses.error: pass

            self.scr.refresh()
        except curses.error: pass

    def run(self):
        while self.game.running:
            for msg, c in self.game.pop_all():
                self.add(msg, c)
            if self.game.needs_draw.is_set():
                self.draw()
                self.game.needs_draw.clear()
            try: key = self.scr.getch()
            except curses.error: key = -1

            if key == -1:
                time.sleep(0.04); continue

            if key in (curses.KEY_BACKSPACE, 127, 8):
                if self.buf:
                    self.buf = self.buf[:-1]
                    self.game.needs_draw.set()
            elif key in (ord('\n'), curses.KEY_ENTER):
                raw = self.buf.strip()
                self.buf = ""
                if raw:
                    self.add(f"> {raw}", "header")
                    for m, c in self.game.cmd(raw): self.add(m, c)
                self.scroll = 0
                self.game.needs_draw.set()
            elif key == curses.KEY_UP:
                self.scroll = min(self.scroll + 1, max(0, len(self.log) - 5))
                self.game.needs_draw.set()
            elif key == curses.KEY_DOWN:
                self.scroll = max(0, self.scroll - 1)
                self.game.needs_draw.set()
            elif key == curses.KEY_PPAGE:
                self.scroll = min(self.scroll + 20, max(0, len(self.log) - 5))
                self.game.needs_draw.set()
            elif key == curses.KEY_NPAGE:
                self.scroll = max(0, self.scroll - 20)
                self.game.needs_draw.set()
            elif 32 <= key <= 126:
                self.buf += chr(key)
                self.game.needs_draw.set()


# ═══════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════

def _main(scr):
    _setup_colors()
    game = Game()
    t = threading.Thread(target=game.ticker, daemon=True, name="world-ticker")
    t.start()
    ui = UI(scr, game)
    try:
        ui.run()
    finally:
        game.running = False
        t.join(timeout=2)


if __name__ == "__main__":
    try:
        curses.wrapper(_main)
    except KeyboardInterrupt:
        pass
    print("\nThe monastery continues. The Index advances. ARIA holds the lights.\n")
