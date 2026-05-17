#!/usr/bin/env python3
"""
L I V I N G   W O R L D
────────────────────────────────────────────────────────────
A text adventure where the world breathes without you.
NPCs keep schedules. Events cascade. The dungeon stirs.
Time passes whether you act or not.
────────────────────────────────────────────────────────────
Run: python3 living_world.py
Requires: Python 3.8+, a terminal at least 80x24.
"""

import curses
import threading
import time
import random
import textwrap
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Callable
from enum import Enum
from collections import deque

# ═══════════════════════════════════════════════════════════
#  TIME
# ═══════════════════════════════════════════════════════════

MINUTES_PER_TICK   = 20   # game-minutes per world tick
REAL_SECONDS_TICK  = 9    # real seconds per world tick

SEASONS = ["Spring", "Summer", "Autumn", "Winter"]
DAYS    = ["Moonday", "Ironday", "Stoneday", "Windsday", "Fireday", "Waterday", "Restday"]

@dataclass
class WorldTime:
    minute: int = 0
    hour:   int = 9
    day:    int = 1
    month:  int = 6   # midsummer start
    year:   int = 847

    def advance(self, minutes: int = MINUTES_PER_TICK):
        self.minute += minutes
        while self.minute >= 60:  self.minute -= 60; self.hour  += 1
        while self.hour   >= 24:  self.hour   -= 24; self.day   += 1
        while self.day    >  30:  self.day    -= 30; self.month += 1
        while self.month  >  12:  self.month  -= 12; self.year  += 1

    @property
    def time_str(self) -> str:   return f"{self.hour:02d}:{self.minute:02d}"
    @property
    def day_name(self) -> str:   return DAYS[(self.day - 1) % 7]
    @property
    def season(self) -> str:     return SEASONS[(self.month - 1) // 3]
    @property
    def is_night(self) -> bool:  return self.hour < 5 or self.hour >= 22
    @property
    def is_dawn(self) -> bool:   return 5 <= self.hour <= 7
    @property
    def is_dusk(self) -> bool:   return 19 <= self.hour <= 21

    @property
    def phase(self) -> str:
        h = self.hour
        if h < 5:   return "deep night"
        if h < 7:   return "dawn"
        if h < 12:  return "morning"
        if h < 14:  return "midday"
        if h < 17:  return "afternoon"
        if h < 20:  return "evening"
        if h < 22:  return "dusk"
        return "night"


# ═══════════════════════════════════════════════════════════
#  WEATHER
# ═══════════════════════════════════════════════════════════

WEATHER = {
    "clear":   {"next": {"clear":0.55,"cloudy":0.35,"foggy":0.10}, "adj":"clear",    "sound":"birdsong"},
    "cloudy":  {"next": {"clear":0.25,"cloudy":0.35,"rainy":0.30,"stormy":0.10}, "adj":"overcast","sound":"wind"},
    "rainy":   {"next": {"cloudy":0.40,"rainy":0.40,"stormy":0.20}, "adj":"rainy",  "sound":"rain on stone"},
    "stormy":  {"next": {"rainy":0.50,"cloudy":0.30,"stormy":0.20}, "adj":"stormy", "sound":"thunder"},
    "foggy":   {"next": {"clear":0.35,"foggy":0.45,"cloudy":0.20}, "adj":"foggy",   "sound":"eerie silence"},
    "snowing": {"next": {"clear":0.20,"cloudy":0.30,"snowing":0.50}, "adj":"snowy", "sound":"muffled quiet"},
}

@dataclass
class Weather:
    state: str = "clear"

    def tick(self, season: str):
        if season == "Winter" and self.state == "rainy":
            self.state = "snowing"; return
        t = WEATHER[self.state]["next"]
        r, cum = random.random(), 0.0
        for s, p in t.items():
            cum += p
            if r < cum: self.state = s; return

    @property
    def adj(self) -> str:   return WEATHER[self.state]["adj"]
    @property
    def sound(self) -> str: return WEATHER[self.state]["sound"]
    @property
    def slows_travel(self) -> bool: return self.state in ("stormy","snowing","foggy")

    def change_msg(self, old: str, new: str) -> str:
        table = {
            ("clear","cloudy"):  "Clouds boil up from the mountains. The light turns grey.",
            ("cloudy","rainy"):  "The clouds open. Rain begins to fall steadily.",
            ("rainy","stormy"):  "The rain becomes a tempest. Lightning forks across the hills.",
            ("stormy","rainy"):  "The fury eases to steady rain. Thunder still grumbles.",
            ("rainy","cloudy"):  "The rain stops. Damp air and grey sky remain.",
            ("cloudy","clear"):  "The clouds break apart, releasing shafts of gold light.",
            ("clear","foggy"):   "A thick fog rolls in from the lowlands, swallowing sound.",
            ("foggy","clear"):   "The fog burns away, revealing the world fresh and sharp.",
            ("cloudy","snowing"):"The first snow of the season begins to fall.",
            ("snowing","clear"): "The snow stops. Everything is white and silent.",
        }
        return table.get((old,new), f"The weather shifts — {old} gives way to {new}.")


# ═══════════════════════════════════════════════════════════
#  LOCATIONS
# ═══════════════════════════════════════════════════════════

@dataclass
class Location:
    id:        str
    name:      str
    tag:       str           # short label for sidebar
    desc_day:  str
    desc_night: str
    exits:     Dict[str,str] = field(default_factory=dict)
    indoor:    bool  = False
    dungeon:   bool  = False
    danger:    int   = 0     # 0 safe … 5 deadly

    def describe(self, wt: "WorldTime", wx: Weather) -> str:
        base = self.desc_night if wt.is_night else self.desc_day
        if not self.indoor and wx.state != "clear":
            extras = {
                "rainy":   " Rain drums against every surface.",
                "stormy":  " Lightning strobes. Thunder shakes the ground.",
                "foggy":   " The fog reduces sight to a few feet.",
                "snowing": " Snow falls without sound.",
                "cloudy":  " Heavy clouds press down on the rooftops.",
            }
            base += extras.get(wx.state, "")
        return base


# ═══════════════════════════════════════════════════════════
#  FACTIONS
# ═══════════════════════════════════════════════════════════

@dataclass
class Faction:
    id:     str
    name:   str
    power:  int = 50   # 0-100
    rep:    int = 50   # player reputation with this faction


# ═══════════════════════════════════════════════════════════
#  NPCS
# ═══════════════════════════════════════════════════════════

@dataclass
class Schedule:
    """Maps hours → location_id. Last entry before current hour wins."""
    hourly: Dict[int,str]

    def where_at(self, hour: int) -> str:
        best = list(self.hourly.values())[0]
        for h in sorted(self.hourly):
            if hour >= h: best = self.hourly[h]
        return best


MOODS = {
    "neutral": "•", "happy": "♪", "worried": "!", "angry": "!!",
    "afraid": "?!", "drunk": "~", "reverent": "✦", "suspicious": "◉",
}

@dataclass
class NPC:
    id:          str
    name:        str
    title:       str
    faction:     Optional[str]
    loc_id:      str
    schedule:    Schedule
    personality: str
    lines:       List[str]            # general dialogue pool
    mood_lines:  Dict[str,List[str]] = field(default_factory=dict)
    mood:        str  = "neutral"
    hp:          int  = 100
    hp_max:      int  = 100
    gold:        int  = 10
    alive:       bool = True
    memory:      List[str] = field(default_factory=list)

    def tick_schedule(self, wt: "WorldTime") -> Optional[str]:
        target = self.schedule.where_at(wt.hour)
        if self.loc_id != target:
            old = self.loc_id
            self.loc_id = target
            return old
        return None

    def speak(self, context_tags: List[str] = None) -> str:
        pool = list(self.lines)
        if self.mood in self.mood_lines:
            pool = self.mood_lines[self.mood] + pool
        if not pool:
            return f"{self.name} says nothing."
        line = random.choice(pool)
        mood_wrap = {
            "worried":    lambda t: f'"{t}" {self.name} mutters, eyes darting.',
            "angry":      lambda t: f'"{t}" {self.name} snaps.',
            "afraid":     lambda t: f'"{t}" {self.name} whispers.',
            "drunk":      lambda t: f'"{t}" {self.name} announces to no one in particular.',
            "reverent":   lambda t: f'"{t}" {self.name} says softly, as if in prayer.',
            "suspicious": lambda t: f'"{t}" {self.name} says, watching you carefully.',
        }
        wrapper = mood_wrap.get(self.mood, lambda t: f'"{t}" — {self.name}')
        return wrapper(line)

    @property
    def label(self) -> str: return f"{self.name} ({self.title})"
    @property
    def mood_symbol(self) -> str: return MOODS.get(self.mood, "•")


# ═══════════════════════════════════════════════════════════
#  WORLD EVENTS
# ═══════════════════════════════════════════════════════════

@dataclass
class WorldEvent:
    ts:           str
    loc_id:       str
    text:         str
    distant:      Optional[str] = None
    rumor:        Optional[str] = None
    # side effects applied after creation
    effects:      Dict = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════
#  SCRIPTED STORY BEATS
# ═══════════════════════════════════════════════════════════

@dataclass
class StoryBeat:
    """A scripted event that fires at a specific world tick."""
    tick:     int
    loc_id:   str   # where the event happens
    text:     str   # seen if player is there
    distant:  Optional[str] = None
    effects:  Dict  = field(default_factory=dict)
    fired:    bool  = False


# ═══════════════════════════════════════════════════════════
#  WORLD
# ═══════════════════════════════════════════════════════════

class World:
    def __init__(self):
        self.time    = WorldTime()
        self.weather = Weather()
        self.locations:  Dict[str, Location] = {}
        self.npcs:       Dict[str, NPC]      = {}
        self.factions:   Dict[str, Faction]  = {}
        self.event_log:  deque = deque(maxlen=400)
        self.flags:      Dict   = {}
        self.tick_count: int    = 0
        self.story_beats: List[StoryBeat] = []
        self._build()

    # ── Construction ──────────────────────────────────────

    def _build(self):
        self._build_factions()
        self._build_locations()
        self._build_npcs()
        self._build_story()
        self.flags = {
            "bandit_raids":    3,
            "cult_activity":   1,
            "town_morale":     62,
            "market_open":     True,
            "lenna_in_dungeon": False,
            "crow_alerted":    False,
            "osric_activated": False,
        }

    def _build_factions(self):
        self.factions = {
            "town":    Faction("town",   "Thornhaven Folk",   60, 70),
            "guild":   Faction("guild",  "Merchant Guild",    75, 55),
            "bandits": Faction("bandits","The Iron Crows",    40,  5),
            "cult":    Faction("cult",   "Cult of the Hollow Eye", 30, 0),
        }

    def _build_locations(self):
        def L(id, name, tag, day, night, exits=None, indoor=False, dungeon=False, danger=0):
            return Location(id, name, tag, day, night, exits or {}, indoor, dungeon, danger)

        self.locations = {
          "town_square": L("town_square",
            "Thornhaven — Town Square", "Town Square",
            "Cobblestones worn smooth by generations of feet. Market stalls ring the perimeter. "
            "The old stone well at the center has a crow perched on its lip, watching everything.",
            "The square breathes under cold stars. A single watchman traces endless circles around the well, "
            "lantern swinging like a slow pendulum.",
            {"north":"market","south":"tavern","east":"blacksmith","west":"temple","down":"dungeon_gate"}),

          "tavern": L("tavern",
            "Thornhaven — The Rusty Flagon", "The Tavern",
            "Sawdust and spilled ale, smoke-blackened beams, and a hearth large enough to roast an ox. "
            "The Rusty Flagon smells of everything: roasting meat, wet wool, sweat, and—faintly—hope.",
            "Tallow candles gutter in iron holders. The evening crowd packs every table. "
            "Someone in the corner picks a sad tune on a battered lute.",
            {"north":"town_square"}, indoor=True),

          "blacksmith": L("blacksmith",
            "Thornhaven — Aldric's Forge", "The Forge",
            "A wall of heat hits you at the threshold. Iron rings on iron. The smell of hot metal "
            "and coal fills your lungs. Finished blades hang in rows catching the fire's light.",
            "The forge is cold and dark. Tools hang in neat rows. Aldric has left for the night, "
            "but the forge still ticks as it cools.",
            {"west":"town_square"}, indoor=True),

          "market": L("market",
            "Thornhaven — The Morning Market", "The Market",
            "Stalls overflow with vegetables, smoked fish, rough cloth, and sundries. "
            "Merchants bicker and buyers haggle. Children dart between legs like small fish.",
            "Empty. The stalls are shuttered and padlocked. A single cat patrols between the tables, "
            "sovereign in the vacancy.",
            {"south":"town_square","east":"guild_hall"}, indoor=False),

          "temple": L("temple",
            "Thornhaven — Temple of the Dawn", "The Temple",
            "Cool, incense-freighted air. Stone columns rise to vaulted arches overhead. "
            "Worshippers kneel in the pews. Someone is weeping, very softly.",
            "Candlelight makes the stone walls seem to breathe. Evening prayers rise and fall "
            "like tidal breathing. The silence has texture here.",
            {"east":"town_square"}, indoor=True),

          "guild_hall": L("guild_hall",
            "Thornhaven — Merchant Guild Hall", "Guild Hall",
            "Dark wood paneling and the smell of ink and ledger-mold. A clerk watches your approach "
            "from behind a counter built to intimidate. Maps cover one entire wall.",
            "A small sign: GUILD HOURS: DAWN TO DUSK. The hall is dark save for a lamp left burning "
            "on the counting desk.",
            {"west":"market"}, indoor=True),

          "dungeon_gate": L("dungeon_gate",
            "The Old Cellar — Gate to Below", "Dungeon Gate",
            "Crumbling stairs descend into a smell of earth, old water, and something rotten that "
            "isn't quite rot. Someone has scratched into the wall: HERE LIGHT ENDS.",
            "In darkness, the gate exhales cold air that has no business being this close to the surface.",
            {"up":"town_square","down":"dungeon_hall"}, dungeon=True, danger=1),

          "dungeon_hall": L("dungeon_hall",
            "The Hollow Below — Entrance Hall", "D: Hall",
            "Carved stone corridors branch in three directions. Old torches burned to nothing long ago. "
            "Pale fungi glow faintly on the walls, giving just enough light to see how lost you are.",
            "In the dungeon there is no day or night. Only dripping water and a darkness that presses "
            "against your torch like something alive.",
            {"up":"dungeon_gate","north":"dungeon_bones","east":"dungeon_shrine"},
            dungeon=True, danger=3),

          "dungeon_bones": L("dungeon_bones",
            "The Hollow Below — The Bone Hall", "D: Bone Hall",
            "Skeletons have been stacked along the walls like cordwood, floor to ceiling. "
            "Whether reverence or contempt, it's impossible to say. The air tastes of copper.",
            "Bones are bones in any light. The darkness here is absolute and has weight.",
            {"south":"dungeon_hall","west":"dungeon_shrine","down":"dungeon_chamber"},
            dungeon=True, danger=4),

          "dungeon_shrine": L("dungeon_shrine",
            "The Hollow Below — Defiled Shrine", "D: Shrine",
            "A shrine to something old and badly wrong. Fresh candles still burn — someone tends them. "
            "Strange symbols cover the altar stone, carved over and over, obsessively.",
            "The shrine candles never go out. They burn too steadily, too cleanly, as if "
            "feeding on something other than wax.",
            {"west":"dungeon_hall","east":"dungeon_bones"},
            dungeon=True, danger=4),

          "dungeon_chamber": L("dungeon_chamber",
            "The Hollow Below — The Drowned Chamber", "D: Chamber",
            "Half-flooded with black water that swallowed all light. Something moves beneath the surface — "
            "you only see the ripples. On a dry ledge sits an iron-bound chest.",
            "The water is perfectly still now. Whatever was moving has stopped. It knows you're here.",
            {"up":"dungeon_bones"},
            dungeon=True, danger=5),
        }

    def _build_npcs(self):
        def S(*pairs) -> Schedule:
            it = iter(pairs)
            return Schedule({int(h): loc for h, loc in zip(it, it)})

        self.npcs = {
          "mira": NPC("mira","Mira","barmaid","town","tavern",
            S(0,"tavern",6,"town_square",8,"tavern"),
            "warm, sharp-eyed, misses nothing",
            ["Another round?","The roads are dangerous lately.",
             "I see everything from behind this bar.",
             "Aldric was ranting about those bandits again.",
             "You look like someone with a story.","Sleep well?"],
            mood_lines={"worried":["I keep thinking about that rider last week. Something was wrong.",
                                   "Three shipments. Three. And the guild does nothing."],
                        "afraid": ["Please, keep the noise down. I can't afford trouble."]}),

          "aldric": NPC("aldric","Aldric","blacksmith","town","blacksmith",
            S(0,"tavern",5,"blacksmith",20,"tavern",23,"blacksmith"),
            "blunt, hardworking, simmering with rage",
            ["Good steel doesn't lie.","The pass is as good as closed.",
             "I haven't slept right in a week.","Six guards. Six!"],
            mood_lines={"angry":  ["Three shipments! THREE! And what does the guild do? Paperwork!",
                                   "If they raid one more time I'm leading the response myself.",
                                   "The captain's hands are tied. Mine aren't."],
                        "worried":["I've started sleeping at the forge. Don't ask me why."]},
            mood="angry"),

          "gareth": NPC("gareth","Gareth","merchant","guild","market",
            S(0,"tavern",6,"market",9,"guild_hall",17,"market",20,"tavern",23,"tavern"),
            "nervous, calculating, self-preserving",
            ["The guild will do something. They have to.",
             "Supply is low. Prices must rise. Simple economics.",
             "I'm thinking of closing the stall until things settle."],
            mood_lines={"worried":["Another caravan hit. Do you understand what that means?",
                                   "I've hidden half my stock. Don't tell anyone.",
                                   "I'm sending Lenna to my sister in the capital. She won't be happy."],
                        "afraid": ["I can't keep doing this. I can't."]}),

          "sister_vael": NPC("sister_vael","Sister Vael","temple priestess","town","temple",
            S(0,"temple",5,"temple",7,"town_square",9,"temple",20,"temple"),
            "serene, speaks carefully, knows too much",
            ["The dawn finds everyone, eventually.",
             "Light a candle. It is all any of us can do.",
             "I've been having unusual dreams."],
            mood_lines={"reverent":["Something old has woken in the hollow below. I feel it in my prayers.",
                                    "The candles at the shrine — they should not stay lit.",
                                    "Do not go below without light. And not just torch-light."],
                        "worried": ["The dreams are clearer now. That worries me more than vagueness did."]},
            mood="reverent"),

          "captain_brynn": NPC("captain_brynn","Captain Brynn","town guard","town","town_square",
            S(0,"tavern",6,"town_square",20,"tavern",22,"town_square"),
            "frustrated, overworked, unfailingly loyal",
            ["Stay off the roads after dark.","Six guards for a whole town. Six.",
             "I've sent three requests to the capital. Silence.",
             "At least it's quiet tonight. That worries me most."],
            mood_lines={"worried":["If you hear anything — anything — come to me directly.",
                                   "There was a scout near the dungeon gate last night. Gone before I could reach him."],
                        "angry":  ["The guild wants me to 'ensure market stability.' With six guards!"]},
            mood="worried"),

          "old_pip": NPC("old_pip","Old Pip","wanderer","town","town_square",
            S(0,"tavern",6,"town_square",12,"market",15,"town_square",21,"tavern"),
            "confused in ways that seem purposeful",
            ["They come up from below at night. I've seen them.",
             "Spare a coin? The crows are watching.",
             "I remember when the dungeon was just a cellar.",
             "Something's different about the shadows lately.",
             "The eye. The eye in the dark."]),

          "lenna": NPC("lenna","Lenna","merchant's daughter","guild","market",
            S(0,"guild_hall",7,"market",12,"temple",14,"market",18,"tavern",22,"guild_hall"),
            "brave, frustrated, wants the adventure her father forbids",
            ["Father wants me to leave town. I refuse.",
             "I can handle myself better than he thinks.",
             "Have you been in the dungeon? What's down there?",
             "Teach me to fight and I'll pay you well."],
            mood_lines={"afraid": ["Father was right. I shouldn't have gone. But I saw things.",
                                   "There's someone in the shrine. Someone living there."],
                        "angry":  ["Father locked the guild hall door. He thinks I don't know where he hides the key."]}),

          "crow_scout": NPC("crow_scout","Hooded Stranger","Iron Crow bandit","bandits","dungeon_gate",
            S(0,"dungeon_hall",10,"dungeon_gate",14,"dungeon_hall",20,"dungeon_gate",22,"dungeon_hall"),
            "watchful, dangerous, economical with words",
            ["...","Move along.","You didn't see me.","Interesting timing."],
            mood_lines={"suspicious":["You come here often, traveler?","What business have you below?"]}),

          "osric": NPC("osric","Osric","cultist","cult","dungeon_shrine",
            S(0,"dungeon_shrine",6,"dungeon_shrine",18,"dungeon_shrine"),
            "serene in a way that suggests the wrong things",
            ["The Hollow Eye sees all depths.",
             "You should not be here. Or perhaps you should.",
             "The candles do not go out.",
             "We wait. We have always waited.",
             "It is very nearly time."],
            mood_lines={"reverent":["The old one stirs. I can hear it breathing.",
                                    "Come. Kneel. You don't have to understand. Yet."]}),
        }

    def _build_story(self):
        """Scripted beats that fire at specific world ticks, creating a narrative arc."""
        self.story_beats = [
            StoryBeat(8, "town_square",
                "A breathless rider reins up at the well. 'Caravan's been hit — Iron Crows, east road!' "
                "He drops a leather satchel that clanks with something broken.",
                distant="A horse arrives at speed in the square. Someone is shouting.",
                effects={"bandit_raids": +1, "town_morale": -8,
                         "npc_mood": {"aldric":"angry","gareth":"afraid","captain_brynn":"worried"}}),

            StoryBeat(14, "tavern",
                "Gareth corners Mira at the bar. 'I'm sending Lenna north on the next cart. This town '  "
                "'is finished if the guild doesn't act.' Mira refills his cup without comment.",
                distant="Raised voices from the tavern drift through the walls.",
                effects={"npc_mood":{"gareth":"afraid","lenna":"angry"}}),

            StoryBeat(20, "temple",
                "Sister Vael turns from the altar, her face pale. 'I had the dream again,' she tells "
                "no one in particular. 'The eye opens a little wider each time.'",
                distant="The temple bell rings once. An unusual hour for it.",
                effects={"cult_activity": +1, "npc_mood":{"sister_vael":"worried"}}),

            StoryBeat(26, "dungeon_gate",
                "Fresh scratch-marks scar the dungeon gate. Recent. Made by something climbing up, "
                "not going down. Old Pip sits nearby, absolutely still, staring at the marks.",
                distant="Old Pip is crouched near the dungeon entrance, which is odd even for him.",
                effects={"cult_activity": +2}),

            StoryBeat(32, "market",
                "Two stalls don't open. Their owners left in the night, taking their stock. "
                "The empty frames stand like missing teeth in the market row.",
                distant="The market is noticeably thinner today. Several familiar stalls are dark.",
                effects={"market_open": False, "town_morale": -10}),

            StoryBeat(40, "town_square",
                "Captain Brynn calls the town together. Six people gather — fewer than she hoped. "
                "'We've had word: the Iron Crows are moving closer. Stay in groups. Bar your doors at night.' "
                "Someone asks about the dungeon. Brynn's jaw tightens. She doesn't answer.",
                distant="Captain Brynn is speaking to a small crowd in the square.",
                effects={"npc_mood":{"captain_brynn":"angry"},"crow_alerted":True}),

            StoryBeat(50, "dungeon_shrine",
                "Fresh blood on the altar stone. A crow's feather beside it — the emblem of the Iron Crows. "
                "Osric kneels in prayer, hands folded, utterly undisturbed by your presence. "
                "'The Crows think they make an offering,' he says without turning. 'They are the offering.'",
                distant="From deep below you hear — or feel — a resonant hum that lasts for three heartbeats.",
                effects={"cult_activity": +3, "osric_activated": True,
                         "npc_mood":{"osric":"reverent"}}),

            StoryBeat(60, "dungeon_chamber",
                "The black water rises. Not flooding — it is rising deliberately. "
                "The iron chest is half submerged now. Something vast and slow moves beneath, "
                "turning like a wheel. One eye opens just below the surface. It focuses on you.",
                distant="The ground shudders once, very gently, as if something very large shifted.",
                effects={"cult_activity": +5, "town_morale": -15}),
        ]


    # ── Helpers ───────────────────────────────────────────

    def npcs_at(self, loc_id: str) -> List[NPC]:
        return [n for n in self.npcs.values() if n.loc_id == loc_id and n.alive]

    def log(self, loc_id: str, text: str, distant: str = None, rumor: str = None) -> WorldEvent:
        ev = WorldEvent(self.time.time_str, loc_id, text, distant, rumor)
        self.event_log.append(ev)
        return ev

    # ── World Tick ────────────────────────────────────────

    def tick(self, player_loc: str) -> List[Tuple[str,str]]:
        """
        Advance world by MINUTES_PER_TICK minutes.
        Returns list of (message, color_hint) for the player.
        color_hint: "normal" | "ambient" | "npc" | "mystic" | "danger" | "world" | "time"
        """
        self.tick_count += 1
        msgs: List[Tuple[str,str]] = []

        old_hour = self.time.hour
        self.time.advance()
        hour_changed = self.time.hour != old_hour

        # ── Story beats ───────────────────────────────────
        for beat in self.story_beats:
            if not beat.fired and self.tick_count >= beat.tick:
                beat.fired = True
                self._apply_effects(beat.effects)
                if player_loc == beat.loc_id:
                    ev = self.log(beat.loc_id, beat.text)
                    msgs.append((f"[{ev.ts}] {beat.text}", "mystic"))
                elif beat.distant:
                    ev = self.log(beat.loc_id, beat.text, beat.distant)
                    msgs.append((f"[{ev.ts}] {beat.distant}", "world"))

        # ── Weather ───────────────────────────────────────
        if self.tick_count % 9 == 0:
            old_w = self.weather.state
            self.weather.tick(self.time.season)
            if self.weather.state != old_w:
                msg = self.weather.change_msg(old_w, self.weather.state)
                ev = self.log(player_loc, msg)
                msgs.append((f"[{ev.ts}] {msg}", "time"))

        # ── NPC schedule moves ────────────────────────────
        if hour_changed:
            for npc in self.npcs.values():
                if not npc.alive: continue
                old_loc = npc.loc_id
                moved_from = npc.tick_schedule(self.time)
                if moved_from:
                    if moved_from == player_loc:
                        depart = self._depart_msg(npc, old_loc)
                        ev = self.log(moved_from, depart)
                        msgs.append((f"[{ev.ts}] {depart}", "npc"))
                    if npc.loc_id == player_loc:
                        arrive = self._arrive_msg(npc, moved_from)
                        ev = self.log(npc.loc_id, arrive)
                        msgs.append((f"[{ev.ts}] {arrive}", "npc"))

            # Hour-specific narration
            for msg, color in self._hour_narration(player_loc):
                msgs.append((msg, color))

        # ── Ambient event ─────────────────────────────────
        if random.random() < 0.32:
            ambient = self._ambient(player_loc)
            if ambient:
                ev = self.log(player_loc, ambient)
                msgs.append((f"[{ev.ts}] {ambient}", "ambient"))

        # ── NPC speaks spontaneously ──────────────────────
        if random.random() < 0.28:
            local = self.npcs_at(player_loc)
            if local:
                npc = random.choice(local)
                said = npc.speak()
                ev = self.log(player_loc, said)
                msgs.append((f"[{ev.ts}] {said}", "npc"))

        # ── Distant world event ───────────────────────────
        if random.random() < 0.14:
            distant = self._distant_event(player_loc)
            if distant:
                msgs.append((distant, "world"))

        return msgs

    def _apply_effects(self, effects: Dict):
        for key, val in effects.items():
            if key == "npc_mood":
                for npc_id, mood in val.items():
                    if npc_id in self.npcs:
                        self.npcs[npc_id].mood = mood
            elif key in self.flags and isinstance(val, int) and isinstance(self.flags[key], int):
                self.flags[key] += val
            else:
                self.flags[key] = val

    def _depart_msg(self, npc: NPC, from_loc: str) -> str:
        options = [
            f"{npc.name} gathers their things and slips out.",
            f"{npc.name} checks the hour, drains the last of their drink, and goes.",
            f"{npc.name} nods to no one in particular and steps away.",
            f"{npc.name} pulls their coat on and disappears through the door.",
        ]
        return random.choice(options)

    def _arrive_msg(self, npc: NPC, from_loc: str) -> str:
        from_name = self.locations.get(from_loc, Location("","","","","")).tag or "elsewhere"
        options = [
            f"{npc.name} pushes in from {from_name}, scanning the room.",
            f"{npc.name} arrives, settling into their usual spot.",
            f"{npc.name} enters, bringing cold air from outside.",
            f"{npc.name} steps in and stops, looking tired.",
        ]
        return random.choice(options)

    def _hour_narration(self, player_loc: str) -> List[Tuple[str,str]]:
        hour = self.time.hour
        table = {
            6:  ["A rooster crows somewhere in Thornhaven. Dawn has come.",
                 "Lights appear in windows. The town stirs to life."],
            7:  ["The smell of baking bread drifts from somewhere nearby.",
                 "Children's voices — the day has properly begun."],
            12: ["The sun stands at its height. It is midday.",
                 "A distant bell marks noon. Work pauses briefly across town."],
            17: ["The light softens. Evening gold touches the rooftops.",
                 "Shadows lengthen. The afternoon slopes toward dark."],
            19: ["Lanterns are being lit throughout Thornhaven.",
                 "Evening. The market stalls are closing."],
            20: ["Night is falling on Thornhaven.",
                 "The streets begin to empty. Most sensible people are indoors."],
            22: ["The town grows quiet. Only the tavern burns bright against the dark.",
                 "Most have gone to their beds. The watch takes over the night."],
        }
        if hour not in table:
            return []
        msg = random.choice(table[hour])
        ev = self.log(player_loc, msg)
        return [(f"[{ev.ts}] {msg}", "time")]

    def _ambient(self, loc_id: str) -> Optional[str]:
        table = {
            "town_square": [
                "A merchant argues with a customer over the price of wool.",
                "A child chases a dog across the cobblestones, laughing.",
                "Two old men play dice on the well's stone rim.",
                "Pigeons scatter from the well as someone passes too close.",
                "A crow on the well's rim tilts its head and studies you.",
                "Somewhere, a door slams. Then silence.",
                "A cloud shadow sweeps the square like a slow broom.",
                "The watchman's footsteps echo on the stones.",
            ],
            "tavern": [
                "The fire pops, sending a shower of sparks up the chimney.",
                "Someone at the bar laughs too loudly at their own joke.",
                "A cat stretches beside the hearth and goes back to sleep.",
                "A tankard slams down. Triumphant or angry — hard to say.",
                "Two travelers argue in low voices at the corner table.",
                "The lute player picks out a few melancholy notes, then stops.",
                "The smell of something roasting fills the room.",
                "Mira's rag never stops moving across that counter.",
            ],
            "blacksmith": [
                "The sound of hammering fills the forge, then pauses, then continues.",
                "The bellows breathe, and the coals surge to white.",
                "A shower of sparks cascades from the anvil.",
                "The heat here is immense. Sweat forms immediately.",
                "Finished blades hang in a row, catching the fire.",
                "Metal cools with a sound like a long exhalation.",
            ],
            "market": [
                "A vendor calls out prices that seem higher than last week.",
                "Someone haggles loudly over a wheel of hard cheese.",
                "The smell of fish mingles with fresh bread.",
                "A stray dog circles the meat stall hopefully.",
                "Two merchants are deep in whispered conference.",
                "A child steals an apple and runs. No one chases them.",
            ],
            "temple": [
                "Incense smoke curls upward toward the arched ceiling.",
                "Someone weeps quietly in one of the forward pews.",
                "A soft chant rises and falls like breathing.",
                "Candlelight makes the stone walls seem to move.",
                "A dove sits atop the altar, perfectly still.",
                "The silence here has texture. Weight.",
            ],
            "guild_hall": [
                "The scratch of quills. The rustle of ledger pages.",
                "The clerk is pretending not to watch you.",
                "A seal is pressed into wax with deliberate force.",
                "Maps cover the wall: roads marked in red are crossed out.",
            ],
            "dungeon_gate": [
                "Cold air breathes upward from the dark below.",
                "Distant dripping. Or footsteps. Impossible to tell.",
                "The scratched warning catches your eye: HERE LIGHT ENDS.",
                "Your torch flame bends toward the descending stairs. No wind.",
                "The smell of stone and rot is stronger than it should be.",
            ],
            "dungeon_hall": [
                "The fungi pulse with faint cold light — blue-green, sickly beautiful.",
                "Something skitters in the walls. Claws on old stone.",
                "A drop of water falls from the ceiling and lands on your neck.",
                "The darkness beyond your torchlight is absolute.",
                "You hear breathing that might be your own echo. Might not be.",
                "Distant, something shifts. Then silence so complete it rings.",
                "The air has been breathed by things that no longer exist.",
            ],
            "dungeon_bones": [
                "The stacked bones seem to have shifted since the last visit.",
                "Something is wrong with the shadows in this room.",
                "Dripping echoes up from the chamber below.",
                "One skull has been placed facing the entrance. As if watching.",
                "Your light seems dimmer here. As if the darkness feeds.",
            ],
            "dungeon_shrine": [
                "The shrine candles flicker without wind.",
                "The carved symbols seem to shift when you look away.",
                "A low hum emanates from the altar stone.",
                "The candle flames burn the wrong color. Just barely.",
                "You feel watched from beyond the shrine's light.",
                "A coldness that isn't temperature settles over you.",
            ],
            "dungeon_chamber": [
                "The black water is absolutely still.",
                "Ripples spread from the center of the flooded chamber — nothing caused them.",
                "The iron chest on the ledge has moved. Slightly.",
                "Something moves beneath the surface. Slow. Patient.",
                "The water smells of metal and something older than metal.",
                "You hear, or imagine, a very slow heartbeat from below.",
            ],
        }
        pool = table.get(loc_id, ["The world turns around you, indifferent and alive."])
        return random.choice(pool)

    def _distant_event(self, player_loc: str) -> Optional[str]:
        ts = self.time.time_str
        options = [
            f"[{ts}] A shout from the direction of the market. Then nothing.",
            f"[{ts}] Something falls in the dungeon below with a crash that rises through the stone.",
            f"[{ts}] A rider passes through town at speed, raising dust and questions.",
            f"[{ts}] The temple bell rings. An unusual hour for it.",
            f"[{ts}] Across the square, two figures argue. One walks away quickly.",
            f"[{ts}] A dog starts barking near the dungeon gate. Then abruptly stops.",
            f"[{ts}] Someone runs past the window — toward something, not away from it.",
            f"[{ts}] The forge goes quiet. Aldric has stopped hammering. Unusual.",
            f"[{ts}] A woman you don't recognize asks directions to the temple without meeting your eyes.",
            f"[{ts}] The guard's whistle sounds from the north. Just once.",
            f"[{ts}] Laughter from the tavern, then a long silence, then more laughter.",
            f"[{ts}] You hear what sounds like chanting from far below. It stops.",
        ]
        return random.choice(options)


# ═══════════════════════════════════════════════════════════
#  PLAYER
# ═══════════════════════════════════════════════════════════

@dataclass
class Player:
    loc_id:     str  = "tavern"
    hp:         int  = 100
    hp_max:     int  = 100
    gold:       int  = 15
    inventory:  List[str] = field(default_factory=lambda: ["torch", "dagger", "rations x3"])
    known_locs: List[str] = field(default_factory=lambda: ["tavern","town_square"])
    rep:        Dict[str,int] = field(default_factory=lambda: {
                    "town":70,"guild":55,"bandits":5,"cult":0})


# ═══════════════════════════════════════════════════════════
#  GAME ENGINE
# ═══════════════════════════════════════════════════════════

class Game:
    def __init__(self):
        self.world   = World()
        self.player  = Player()
        self.running = True
        self._msg_lock   = threading.Lock()
        self._pending:    List[Tuple[str,str]] = []
        self.needs_draw  = threading.Event()
        self.needs_draw.set()

    # ── Thread-safe messaging ─────────────────────────────

    def push(self, msg: str, color: str = "normal"):
        with self._msg_lock:
            self._pending.append((msg, color))
        self.needs_draw.set()

    def pop_all(self) -> List[Tuple[str,str]]:
        with self._msg_lock:
            out = list(self._pending)
            self._pending.clear()
            return out

    # ── World ticker thread ───────────────────────────────

    def ticker(self):
        while self.running:
            time.sleep(REAL_SECONDS_TICK)
            if not self.running: break
            for msg, color in self.world.tick(self.player.loc_id):
                self.push(msg, color)

    # ── Command parser ────────────────────────────────────

    def cmd(self, raw: str) -> List[Tuple[str,str]]:
        parts = raw.strip().lower().split()
        if not parts: return []
        v, args = parts[0], parts[1:]

        # Aliases
        direction_aliases = {"n":"north","s":"south","e":"east","w":"west","u":"up","d":"down"}
        if v in direction_aliases: v = direction_aliases[v]

        dispatch = {
            "north": lambda: self._go("north"),
            "south": lambda: self._go("south"),
            "east":  lambda: self._go("east"),
            "west":  lambda: self._go("west"),
            "up":    lambda: self._go("up"),
            "down":  lambda: self._go("down"),
            "go":    lambda: self._go(args[0] if args else ""),
            "look":  lambda: self._look(args),
            "l":     lambda: self._look(args),
            "examine": lambda: self._look(args),
            "x":     lambda: self._look(args),
            "talk":  lambda: self._talk(args),
            "speak": lambda: self._talk(args),
            "listen":lambda: self._listen(),
            "map":   lambda: self._map(),
            "exits": lambda: self._map(),
            "status":lambda: self._status(),
            "stats": lambda: self._status(),
            "i":     lambda: self._status(),
            "inv":   lambda: self._status(),
            "wait":  lambda: [("Time passes. The world breathes on.", "ambient")],
            "help":  lambda: self._help(),
            "?":     lambda: self._help(),
            "quit":  self._quit,
            "q":     self._quit,
        }

        fn = dispatch.get(v)
        if fn: return fn()
        return [("Nothing comes of that. (Try HELP for commands.)", "normal")]

    # ── Commands ──────────────────────────────────────────

    def _go(self, direction: str) -> List[Tuple[str,str]]:
        loc = self.world.locations[self.player.loc_id]
        if direction not in loc.exits:
            return [(f"You can't go {direction} from here.", "normal")]

        if not loc.indoor and self.world.weather.slows_travel and random.random() < 0.25:
            return [(f"The {self.world.weather.adj} weather slows your step. Try again.", "ambient")]

        new_id  = loc.exits[direction]
        new_loc = self.world.locations[new_id]
        self.player.loc_id = new_id
        if new_id not in self.player.known_locs:
            self.player.known_locs.append(new_id)

        out = [("", "normal"),
               (f"You head {direction} and arrive at {new_loc.name}.", "normal"),
               ("", "normal"),
               (new_loc.describe(self.world.time, self.world.weather),
                "mystic" if new_loc.dungeon else "normal")]

        npcs = self.world.npcs_at(new_id)
        if npcs:
            out.append(("", "normal"))
            for npc in npcs:
                out.append((f"  {npc.mood_symbol} {npc.label}", "npc"))

        exits = "  ".join(
            f"{d} → {self.world.locations[dest].tag}"
            for d, dest in new_loc.exits.items()
        )
        out += [("", "normal"), (f"Exits: {exits}", "ambient")]
        return out

    def _look(self, args: List[str]) -> List[Tuple[str,str]]:
        loc = self.world.locations[self.player.loc_id]

        if args:
            target = " ".join(args)
            for npc in self.world.npcs_at(self.player.loc_id):
                if target in npc.name.lower() or target in npc.title.lower():
                    return [("", "normal"),
                            (f"{npc.label}", "npc"),
                            (f"Personality: {npc.personality}.", "normal"),
                            (f"Mood: {npc.mood}.", "normal")]
            return [(f"You study the {target} carefully. It reveals nothing easily.", "normal")]

        npcs = self.world.npcs_at(self.player.loc_id)
        out = [("", "normal"),
               (f"[ {loc.name} ]", "header"),
               (f"[ {self.world.time.time_str}  {self.world.time.phase.title()}  "
                f"{self.world.weather.adj.title()} ]", "time"),
               ("", "normal"),
               (loc.describe(self.world.time, self.world.weather),
                "mystic" if loc.dungeon else "normal")]
        if npcs:
            out.append(("", "normal"))
            for npc in npcs:
                out.append((f"  {npc.mood_symbol} {npc.label}", "npc"))
        exits = "  ".join(
            f"{d} → {self.world.locations[dest].tag}"
            for d, dest in loc.exits.items()
        )
        out += [("", "normal"), (f"Exits: {exits}", "ambient")]
        return out

    def _talk(self, args: List[str]) -> List[Tuple[str,str]]:
        npcs = self.world.npcs_at(self.player.loc_id)
        if not npcs:
            return [("There's no one here to speak with.", "normal")]

        target_name = " ".join(args).lower() if args else ""
        if target_name:
            npc = next((n for n in npcs
                        if target_name in n.name.lower() or target_name in n.title.lower()), None)
            if not npc:
                return [(f"No one by that name is here.", "normal")]
        else:
            npc = random.choice(npcs)

        out = [("", "normal"),
               (f"{npc.name} turns to look at you.", "npc"),
               ("", "normal"),
               (npc.speak(), "npc")]
        if npc.mood not in ("neutral", "happy"):
            out.append(("", "normal"))
            out.append((f"({npc.name} seems {npc.mood}.)", "ambient"))
        return out

    def _listen(self) -> List[Tuple[str,str]]:
        sounds = {
            "tavern":         "Laughter. Clinking tankards. The pop and hiss of the fire. A lute, badly tuned.",
            "town_square":    "Voices, cart wheels, vendor calls. The steady drip of the well.",
            "blacksmith":     "Iron on iron. Bellows-breath. The hiss of hot metal meeting cold water.",
            "market":         "Haggling. Laughter. A penned chicken's complaint. A child crying.",
            "temple":         "Silence. Then — barely — a chant like slow breathing. Then silence again.",
            "guild_hall":     "Quill on parchment. The dry sound of coins being counted.",
            "dungeon_gate":   "From below: dripping. From above: the muffled town. They sound very far apart.",
            "dungeon_hall":   "Dripping. Skittering in the walls. Your own heartbeat, louder than expected.",
            "dungeon_bones":  "The creak of settling stone. Something that might be distant voices. Might not.",
            "dungeon_shrine": "A low hum. Steady. From everywhere and nowhere. It is not wind.",
            "dungeon_chamber":"Water. Slow movement beneath. Very slow. Very patient.",
        }
        sound = sounds.get(self.player.loc_id, "The ambient sounds of the world, going on without you.")
        return [("You listen carefully.", "ambient"), (f"  {sound}", "normal")]

    def _map(self) -> List[Tuple[str,str]]:
        loc = self.world.locations[self.player.loc_id]
        out = [("", "normal"), (f"FROM: {loc.name}", "header"), ("", "normal"), ("EXITS:", "ambient")]
        for d, dest_id in loc.exits.items():
            dest = self.world.locations[dest_id]
            mark = "✓" if dest_id in self.player.known_locs else "?"
            danger = " !!!" if dest.danger >= 4 else " !" if dest.danger >= 2 else ""
            out.append((f"  {d.upper():8} → {dest.tag} [{mark}]{danger}", "exit"))
        return out

    def _status(self) -> List[Tuple[str,str]]:
        p  = self.player
        wt = self.world.time
        wx = self.world.weather
        loc = self.world.locations[p.loc_id]
        hp_pct = p.hp / p.hp_max
        bar = "█" * int(hp_pct * 10) + "░" * (10 - int(hp_pct * 10))
        return [
            ("", "normal"),
            ("── STATUS ─────────────────────────────────────────────", "ambient"),
            (f"  Location : {loc.name}", "normal"),
            (f"  Health   : [{bar}] {p.hp}/{p.hp_max}", "danger" if hp_pct < 0.3 else "normal"),
            (f"  Gold     : {p.gold}", "normal"),
            (f"  Inventory: {', '.join(p.inventory) or 'nothing'}", "normal"),
            ("", "normal"),
            (f"  {wt.day_name}, Day {wt.day}   {wt.time_str}   {wt.phase.title()}   {wt.season}", "time"),
            (f"  Weather  : {wx.adj.title()}  ({wx.sound})", "time"),
            ("────────────────────────────────────────────────────────", "ambient"),
        ]

    def _help(self) -> List[Tuple[str,str]]:
        return [
            ("", "normal"),
            ("── COMMANDS ────────────────────────────────────────────", "header"),
            ("  MOVE    north/south/east/west/up/down  (or n/s/e/w/u/d)", "normal"),
            ("  LOOK    look [thing]   — examine your surroundings", "normal"),
            ("  TALK    talk [name]    — speak with someone nearby", "normal"),
            ("  LISTEN  listen         — hear what the world sounds like", "normal"),
            ("  MAP     map            — see your exits", "normal"),
            ("  STATUS  status         — health, gold, inventory", "normal"),
            ("  WAIT    wait           — let time pass", "normal"),
            ("  QUIT    quit           — leave Thornhaven", "normal"),
            ("", "normal"),
            ("  The world runs whether you act or not.", "ambient"),
            ("  Watch. Listen. Ask questions. Trust nothing below ground.", "ambient"),
            ("────────────────────────────────────────────────────────", "header"),
        ]

    def _quit(self) -> List[Tuple[str,str]]:
        self.running = False
        return [("", "normal"),
                ("Thornhaven fades. The well, the crow, the lantern-lit tavern.", "mystic"),
                ("The dungeon keeps its secrets. The world breathes on without you.", "mystic"),
                ("", "normal")]


# ═══════════════════════════════════════════════════════════
#  CURSES UI
# ═══════════════════════════════════════════════════════════

# color slots
_C: Dict[str, int] = {}

def _setup_colors():
    curses.start_color()
    curses.use_default_colors()
    curses.init_pair(1,  curses.COLOR_WHITE,   -1)  # normal
    curses.init_pair(2,  curses.COLOR_CYAN,    -1)  # time / timestamps
    curses.init_pair(3,  curses.COLOR_YELLOW,  -1)  # npc
    curses.init_pair(4,  curses.COLOR_GREEN,   -1)  # exits / ambient
    curses.init_pair(5,  curses.COLOR_RED,     -1)  # danger
    curses.init_pair(6,  curses.COLOR_MAGENTA, -1)  # mystic / dungeon
    curses.init_pair(7,  curses.COLOR_BLUE,    -1)  # world events
    curses.init_pair(8,  curses.COLOR_WHITE,   -1)  # header (bold)
    _C["normal"]  = curses.color_pair(1)
    _C["time"]    = curses.color_pair(2)
    _C["npc"]     = curses.color_pair(3)
    _C["ambient"] = curses.color_pair(4)
    _C["exit"]    = curses.color_pair(4)
    _C["danger"]  = curses.color_pair(5)
    _C["mystic"]  = curses.color_pair(6)
    _C["world"]   = curses.color_pair(7)
    _C["header"]  = curses.color_pair(8) | curses.A_BOLD


class UI:
    SIDE_W = 22

    def __init__(self, stdscr, game: Game):
        self.scr  = stdscr
        self.game = game
        self.log: deque = deque(maxlen=600)  # (text, color_key)
        self.buf   = ""
        self.scroll_offset = 0   # lines up from bottom
        curses.curs_set(1)
        self.scr.nodelay(True)
        self.scr.keypad(True)
        self._intro()

    def _intro(self):
        w  = self.game.world
        p  = self.game.player
        loc = w.locations[p.loc_id]
        for line, color in [
            ("L I V I N G   W O R L D  —  Thornhaven & The Hollow Below", "header"),
            ("─" * 58, "ambient"),
            ("", "normal"),
            ("The world does not wait for you.", "mystic"),
            ("", "normal"),
            (f"It is {w.time.time_str} on {w.time.day_name}, Day {w.time.day}. {w.time.season}.", "time"),
            (loc.describe(w.time, w.weather), "normal"),
            ("", "normal"),
            ("Type HELP for commands. The world runs in real time.", "ambient"),
            ("─" * 58, "ambient"),
            ("", "normal"),
        ]:
            self._log(line, color)

    def _log(self, text: str, color: str = "normal"):
        self.log.append((text, color))
        self.game.needs_draw.set()

    def add(self, msg: str, color: str = "normal"):
        h, w = self.scr.getmaxyx()
        wrap_w = max(40, w - self.SIDE_W - 3)
        lines = textwrap.wrap(msg, wrap_w) if msg.strip() and len(msg) > wrap_w else [msg]
        for line in lines:
            self._log(line, color)

    def _attr(self, color: str) -> int:
        return _C.get(color, _C["normal"])

    def draw(self):
        try:
            h, w = self.scr.getmaxyx()
            if h < 18 or w < 55:
                self.scr.clear()
                self.scr.addstr(0, 0, "Terminal too small (need 55×18 min)")
                self.scr.refresh()
                return

            self.scr.erase()
            main_w  = w - self.SIDE_W - 1
            side_x  = main_w + 1
            input_y = h - 2
            log_h   = input_y   # rows available for the log

            # ── log panel ─────────────────────────────────
            visible = list(self.log)
            end     = max(0, len(visible) - self.scroll_offset)
            start   = max(0, end - log_h)
            shown   = visible[start:end]
            for row, (text, col) in enumerate(shown):
                if row >= log_h: break
                try:
                    self.scr.addnstr(row, 0, text, main_w - 1, self._attr(col))
                except curses.error:
                    pass

            # ── vertical divider ──────────────────────────
            for row in range(h - 1):
                try: self.scr.addch(row, main_w, '│', _C["ambient"])
                except curses.error: pass

            # ── side panel helper ─────────────────────────
            sr = [0]
            def side(text: str, color: str = "normal", bold: bool = False):
                if sr[0] >= h - 2: return
                attr = self._attr(color)
                if bold: attr |= curses.A_BOLD
                try:
                    self.scr.addnstr(sr[0], side_x, text[: self.SIDE_W - 1], self.SIDE_W - 1, attr)
                except curses.error:
                    pass
                sr[0] += 1

            wt  = self.game.world.time
            wx  = self.game.world.weather
            p   = self.game.player
            loc = self.game.world.locations[p.loc_id]

            side(f"{wt.time_str}  D{wt.day}", "time", bold=True)
            side(f"{wt.phase.title()}  {wt.season}", "time")
            side(wx.adj.title(), "normal")
            side("─" * (self.SIDE_W - 1), "ambient")

            for line in textwrap.wrap(loc.tag, self.SIDE_W - 2)[:2]:
                side(line, "header", bold=True)
            side("─" * (self.SIDE_W - 1), "ambient")

            npcs = self.game.world.npcs_at(p.loc_id)
            if npcs:
                side("PRESENT:", "ambient")
                for npc in npcs[:6]:
                    side(f" {npc.mood_symbol} {npc.name}", "npc")
            else:
                side("(no one here)", "normal")
            side("─" * (self.SIDE_W - 1), "ambient")

            side("EXITS:", "ambient")
            for d, dest_id in loc.exits.items():
                dest = self.game.world.locations[dest_id]
                danger_flag = " !" if dest.danger >= 3 else ""
                side(f" {d} → {dest.tag}{danger_flag}", "exit")
            side("─" * (self.SIDE_W - 1), "ambient")

            hp_pct = p.hp / p.hp_max
            bar = "█" * int(hp_pct * 8) + "░" * (8 - int(hp_pct * 8))
            side(f"HP [{bar}]", "danger" if hp_pct < 0.35 else "ambient")
            side(f"Gold: {p.gold}", "npc")
            side("─" * (self.SIDE_W - 1), "ambient")
            side("ITEMS:", "ambient")
            for item in p.inventory[:4]:
                side(f" {item}", "normal")

            # ── input bar ─────────────────────────────────
            try:
                self.scr.addnstr(input_y, 0, "─" * (w - 1), w - 1, _C["ambient"])
                prompt = f"> {self.buf}"
                self.scr.addnstr(input_y + 1, 0, prompt, w - 2, _C["normal"] | curses.A_BOLD)
                cursor_x = min(2 + len(self.buf), w - 2)
                self.scr.move(input_y + 1, cursor_x)
            except curses.error:
                pass

            self.scr.refresh()
        except curses.error:
            pass

    def run(self):
        while self.game.running:
            for msg, color in self.game.pop_all():
                self.add(msg, color)

            if self.game.needs_draw.is_set():
                self.draw()
                self.game.needs_draw.clear()

            try: key = self.scr.getch()
            except curses.error: key = -1

            if key == -1:
                time.sleep(0.04)
                continue

            if key in (curses.KEY_BACKSPACE, 127, 8):
                if self.buf:
                    self.buf = self.buf[:-1]
                    self.game.needs_draw.set()

            elif key in (ord('\n'), curses.KEY_ENTER):
                raw = self.buf.strip()
                self.buf = ""
                if raw:
                    self.add(f"> {raw}", "header")
                    for msg, color in self.game.cmd(raw):
                        self.add(msg, color)
                self.scroll_offset = 0
                self.game.needs_draw.set()

            elif key == curses.KEY_UP:
                self.scroll_offset = min(self.scroll_offset + 1, max(0, len(self.log) - 5))
                self.game.needs_draw.set()

            elif key == curses.KEY_DOWN:
                self.scroll_offset = max(0, self.scroll_offset - 1)
                self.game.needs_draw.set()

            elif key == curses.KEY_PPAGE:   # page up
                self.scroll_offset = min(self.scroll_offset + 20, max(0, len(self.log) - 5))
                self.game.needs_draw.set()

            elif key == curses.KEY_NPAGE:   # page down
                self.scroll_offset = max(0, self.scroll_offset - 20)
                self.game.needs_draw.set()

            elif 32 <= key <= 126:
                self.buf += chr(key)
                self.game.needs_draw.set()


# ═══════════════════════════════════════════════════════════
#  ENTRY POINT
# ═══════════════════════════════════════════════════════════

def _main(stdscr):
    _setup_colors()
    game = Game()
    t = threading.Thread(target=game.ticker, daemon=True, name="world-ticker")
    t.start()
    ui = UI(stdscr, game)
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
    print("\nThornhaven fades. The world breathes on without you.\n")
