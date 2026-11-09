/* Headless paths: speech, combat, death reload, clock, saves. */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var store = {};
var localStorage = {
  getItem: function (k) {
    return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
  },
  setItem: function (k, v) {
    store[k] = String(v);
  },
  removeItem: function (k) {
    delete store[k];
  },
};

var context = {
  console: console,
  localStorage: localStorage,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Date: Date,
  JSON: JSON,
  Math: Math,
  Object: Object,
  Array: Array,
  String: String,
  Number: Number,
  parseInt: parseInt,
  parseFloat: parseFloat,
};
context.window = context;
vm.createContext(context);

[
  "data.js",
  "state.js",
  "combat.js",
  "engine.js",
  "content.js",
  "content-b.js",
  "scenes.js",
].forEach(function (file) {
  var code = fs.readFileSync(path.join(__dirname, "..", "js", file), "utf8");
  try {
    vm.runInContext(code, context, { filename: file });
  } catch (err) {
    console.error("Load failed", file, err);
    process.exit(1);
  }
});

var Ash = context.Ash;
var failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  }
}

function probe(label, mutate) {
  var s = Ash.defaultState();
  s.screen = "play";
  s.joss = { met: true, recruited: true, following: true, alive: true, parted: false, hp: 20, maxHp: 32 };
  if (mutate) mutate(s);
  Ash.state = s;
  Object.keys(Ash.nodes).forEach(function (id) {
    s.node = id;
    var prefix = id.split(".")[0];
    s.location = Ash.LOCATIONS[prefix] ? prefix : "silt";
    try {
      var text = Ash.currentText();
      if (typeof text !== "string" || !text.length) throw new Error("empty text");
      Ash.choiceList().forEach(function (c) {
        if (!c || !c.label) throw new Error("blank choice");
        ["goto", "success", "failure"].forEach(function (k) {
          var dest = c[k];
          if (!dest || dest === "@hub" || dest === "@arrive") return;
          if (!Ash.nodes[dest]) throw new Error(k + " missing " + dest);
        });
        ["combat", "successCombat", "failureCombat"].forEach(function (k) {
          var spec = c[k];
          if (!spec || typeof spec === "function") return;
          if (spec.then && !Ash.nodes[spec.then]) throw new Error("then missing " + spec.then);
          if (spec.fleeTo && !Ash.nodes[spec.fleeTo]) throw new Error("flee missing " + spec.fleeTo);
          (spec.enemies || []).forEach(function (e) {
            if (!Ash.ENEMIES[e]) throw new Error("enemy " + e);
          });
        });
        if (c.travel && !Ash.LOCATIONS[c.travel]) throw new Error("travel " + c.travel);
        if (c.check) Ash.chanceOf(c.check, s);
      });
    } catch (err) {
      failed++;
      console.error("PROBE", label, id, err.message);
    }
  });
}

probe("fresh");
probe("hot", function (s) {
  s.background = "guard";
  s.flags.briefed = true;
  s.flags.reaperDone = true;
  s.flags.dry = "started";
  s.flags.reedLog = true;
  s.flags.calderBook = true;
  s.flags.metCalder = true;
  s.flags.metTic = true;
  s.flags.towerFixed = true;
  s.flags.nim = "started";
  s.flags.jossQuest = "started";
  s.flags.lookoutCleared = true;
  s.inv.filterCore = 1;
  s.inv.radioTube = 1;
  s.inv.hogGland = 2;
  s.inv.overseerSeal = 1;
  s.inv.waterLog = 1;
  s.inv.medkit = 2;
  s.inv.cannedPeach = 2;
  s.inv.iodine = 2;
  s.scrip = 400;
  s.known = Object.keys(Ash.LOCATIONS);
  s.flags.calderTradeOk = true;
  s.flags.coilPact = false;
  s.flags.choirSalts = true;
  s.lungs = 3;
});
probe("grim", function (s) {
  s.flags.reedDead = true;
  s.flags.reedHostile = true;
  s.flags.lungsSaved = true;
  s.flags.dry = "calder";
  s.flags.haspDead = true;
  s.flags.coilCleared = true;
  s.flags.truckLooted = true;
  s.flags.choirHostile = true;
  s.flags.shrine = "fight";
  s.flags.towerFixed = true;
  s.flags.silentLooted = true;
  s.flags.tookSeal = true;
  s.flags.wreckLooted = true;
  s.flags.coreFate = "mara";
  s.joss.alive = false;
  s.joss.following = false;
  s.karma = -40;
  s.flags.bunkerExposed = true;
});

function clearLevel() {
  var guard = 0;
  while ((Ash.state.bankedSkills > 0 || Ash.state.bankedPerks > 0) && guard++ < 8) {
    if (!Ash.state.levelDraft) Ash.openLevelUp();
    if (!Ash.state.levelDraft) break;
    var left = Ash.state.bankedSkills;
    Ash.state.levelDraft.spends.speech = left;
    if (Ash.state.bankedPerks > 0) Ash.state.levelDraft.perk = "softVoice";
    Ash.confirmLevel();
  }
  Ash.state.modal = null;
}

function pick(re) {
  clearLevel();
  if (Ash.state.ending || Ash.state.dead) return;
  var list = Ash.choiceList();
  var i = -1;
  for (var n = 0; n < list.length; n++) {
    if (re.test(list[n].label)) {
      i = n;
      break;
    }
  }
  if (i < 0) {
    failed++;
    console.error("No choice /" + re + "/ at " + Ash.state.node);
    console.error(list.map(function (c) { return " - " + c.label; }).join("\n"));
    console.error((Ash.currentText() || "").slice(0, 240));
    throw new Error("stuck at " + Ash.state.node);
  }
  Ash.choose(i);
}

function fight() {
  var guard = 0;
  while (Ash.state.combat && Ash.state.hp > 0 && guard++ < 80) {
    var cost = Ash.combat.attackCost(false);
    if (Ash.state.combat.ap < cost) Ash.combat.endTurn();
    else Ash.combat.strike(null);
  }
  assert(!Ash.state.combat, "combat did not end at " + (Ash.state.node || ""));
}

Ash.debug = { alwaysPass: true, noEncounter: true, playerAlwaysHits: true, enemyAlwaysMisses: true };

function boot(bg, attrs, tags) {
  Ash.newGame({ name: "Ives", background: bg, attrs: attrs, tags: tags, typewriter: false });
  Ash.state.typewriter = false;
}

var clerk = { str: 4, per: 6, end: 4, cha: 8, int: 8, agi: 4, lck: 6 };
boot("clerk", clerk, ["speech", "science", "barter"]);
assert(!Ash.state.flags.briefed, "clerk is not briefed until they speak");
assert(Ash.state.node === "bunker.corridor", "start node " + Ash.state.node);
assert(Ash.skillValue("speech") > 40, "tagged speech " + Ash.skillValue("speech"));

pick(/Mara/);
pick(/Make the order mine|I'll go|bring the core/);
pick(/chit|Fine|Take it|Noted|Leave/);
if (Ash.state.node !== "bunker.corridor") pick(/corridor|Leave her|Go/);
pick(/hatch/);
assert(Ash.state.location === "hatch", "reached hatch " + Ash.state.location + " " + Ash.state.node);
pick(/Sneak the long/);
pick(/Breathe|bearings|look again/);
assert(Ash.state.flags.reaperDone, "sneak past reaper");
pick(/Silt/);
assert(Ash.state.location === "silt", "reached silt");
pick(/notice board/);
pick(/splinters|Read/);
pick(/Tic/);
pick(/tooth/);
pick(/rhythm|Leave/);
pick(/Calder/);
pick(/Ask for work/);
pick(/see the claim/);
pick(/Step out|Leave|Noted/);
Ash.travel("reed");
pick(/Talk to Reed/);
pick(/seep/);
pick(/daylight/);
assert(Ash.state.flags.reedAgreed, "reed agreed");
Ash.travel("silt");
pick(/Calder/);
pick(/Ask for work/);
pick(/log/);
pick(/daylight split/);
assert(Ash.state.flags.dry === "fair", "dry claim fair, got " + Ash.state.flags.dry);
pick(/Noted|cups|Leave/);
pick(/Calder/);
pick(/sealed place/);
pick(/say yes/);
assert(Ash.state.flags.calderTradeOk, "trade ok");
pick(/Good enough|Drop|Step/);
Ash.travel("scrap");
pick(/supply van/);
pick(/Take it/);
pick(/Pocket|Climb|Shut|Bind/);
assert(Ash.invCount("radioTube") > 0, "tube from van");
Ash.travel("tower");
pick(/mast/);
pick(/Seat the tube/);
pick(/Mark the direction|Climb/);
assert(Ash.state.flags.towerFixed, "tower fixed");
Ash.travel("silt");
pick(/Tic/);
pick(/truth/);
pick(/rat|warning|Keep/);
assert(Ash.state.flags.toldTicRadio, "told tic");
pick(/Nim/);
pick(/fetched|thing fetched/);
pick(/I'll get it/);
pick(/Leave her/);
Ash.travel("crater");
pick(/Vellum/);
pick(/salt/);
pick(/dry stories/);
pick(/Pocket|Step|Leave/);
Ash.travel("silt");
pick(/Nim/);
pick(/Settle/);
pick(/Done/);
assert(Ash.state.flags.nim === "done", "nim done");
Ash.travel("coil");
pick(/Fight the lookout/);
fight();
if (/Walk in/.test((Ash.choiceList()[0] || {}).label || "")) pick(/Walk in/);
assert(Ash.state.flags.lookoutCleared, "lookout clear");
Ash.travel("silt");
pick(/Joss/);
pick(/Sober enough/);
pick(/let's walk|Leave|Noted/);
assert(Ash.state.joss.recruited, "joss recruited");
pick(/Pebble/);
pick(/filter core/);
pick(/Buy it/);
pick(/Tuck|Leave|blanket/);
assert(Ash.hasCore(), "bought core");
assert(Ash.state.flags.coreSource === "pebble", "source pebble");
Ash.travel("bunker");
pick(/Mara/);
pick(/Propose a trade/);
pick(/Draft the timetable/);
pick(/File it/);
assert(Ash.state.ending === "broker", "broker ending, got " + Ash.state.ending);
console.log("Speech path ending:", Ash.state.ending, "day", Ash.state.day, "level", Ash.state.level);

Ash.debug.playerAlwaysHits = true;
Ash.debug.enemyAlwaysMisses = true;
var guard = { str: 8, per: 5, end: 7, cha: 4, int: 4, agi: 6, lck: 1 };
boot("guard", guard, ["smallGuns", "melee", "survival"]);
pick(/Mara/);
pick(/bring the core|Understood|I'll bring/);
pick(/chit|corridor|Leave/);
pick(/hatch/);
pick(/Stand and fight/);
fight();
pick(/bearings/);
assert(Ash.state.flags.reaperKilled, "killed reaper");
Ash.travel("silt");
Ash.travel("scrap");
pick(/wallow/);
pick(/Hunt/);
fight();
assert(Ash.invCount("hogGland") >= 1, "glands " + Ash.invCount("hogGland"));
Ash.state.day += 2;
pick(/wallow/);
pick(/Hunt/);
fight();
assert(Ash.invCount("hogGland") >= 2, "second gland " + Ash.invCount("hogGland"));
Ash.travel("coil");
pick(/Fight the lookout/);
fight();
pick(/Walk in/);
pick(/Hasp/);
pick(/Take it from him/);
fight();
assert(Ash.state.flags.haspDead, "hasp dead");
pick(/truck/);
pick(/Take the filter/);
pick(/Go/);
assert(Ash.hasCore() && Ash.state.flags.coreSource === "coil", "coil core");
Ash.travel("bunker");
pick(/Mara/);
pick(/Give her the filter/);
pick(/Take the bunk|Take the surface|own feet/);
assert(Ash.state.ending === "stay" || Ash.state.ending === "exiled", "mara ending " + Ash.state.ending);
console.log("Combat path ending:", Ash.state.ending, "day", Ash.state.day, "joss", Ash.state.joss.alive);

Ash.debug.enemyAlwaysHits = true;
Ash.debug.enemyAlwaysMisses = false;
Ash.debug.playerAlwaysHits = false;
boot("tech", { str: 4, per: 5, end: 6, cha: 4, int: 8, agi: 4, lck: 4 }, ["repair", "science", "smallGuns"]);
assert(Ash.state.flags.briefed, "tech starts briefed");
var hpBefore = Ash.state.hp;
pick(/hatch/);
pick(/Stand and fight/);
assert(Ash.state.modal === "combat" || Ash.state.combat, "in tutorial fight");
Ash.state.hp = 1;
Ash.combat.endTurn();
assert(Ash.state.dead || Ash.state.screen === "dead", "died in the tutorial");
var loaded = Ash.save.load("ashwalk.auto");
assert(loaded, "autosave reloaded");
assert(!Ash.state.dead && Ash.state.hp > 1, "hp restored " + Ash.state.hp + " was " + hpBefore);
assert(Ash.state.screen === "play", "back in play");
console.log("Death reload ok, hp", Ash.state.hp, "node", Ash.state.node);

Ash.state.hp = Ash.maxHp();
Ash.state.dead = false;
Ash.state.screen = "play";
Ash.save.slot(1, "Before the clock");
Ash.state.lungs = 1;
Ash.state.flags.lungsSaved = false;
Ash.state.location = "silt";
Ash.state.node = "silt.square";
Ash.rest();
assert(Ash.state.ending === "choke", "clock ending " + Ash.state.ending);
var ep = Ash.epitaph(Ash.state);
assert(/GAUGE|gauge|pin/i.test(ep.title + ep.body), "choke epitaph");
console.log("Clock ending:", ep.title);

assert(Ash.save.load("ashwalk.slot.1"), "slot load");
assert(Ash.state.ending == null || Ash.state.ending === null, "slot is pre-ending... ending=" + Ash.state.ending);
assert(Ash.state.hp > 0 && !Ash.state.dead, "slot alive");

boot("clerk", clerk, ["speech", "sneak", "science"]);
Ash.debug.alwaysPass = true;
Ash.debug.noEncounter = true;
Ash.debug.enemyAlwaysHits = false;
Ash.debug.enemyAlwaysMisses = true;
Ash.debug.playerAlwaysHits = true;
pick(/Mara/);
pick(/Make the order|I'll go/);
pick(/chit|Leave/);
pick(/hatch/);
pick(/Sneak/);
pick(/Breathe|bearings/);
pick(/Silt/);
Ash.state.scrip = 300;
pick(/Pebble/);
pick(/filter core/);
pick(/Haggle/);
pick(/Count|fortune|Pay the fortune|Buy it|scrip/);
if (!Ash.hasCore()) {
  pick(/Pay the fortune|Buy it/);
}
if (!Ash.hasCore()) pick(/Pay the fortune/);
assert(Ash.hasCore(), "fortune core, scrip " + Ash.state.scrip + " node " + Ash.state.node);
pick(/Tuck|Leave|square|blanket/);
pick(/Leave the Ash Range/);
pick(/Keeping it|Keep it and go/);
assert(Ash.state.ending === "kept", "kept ending " + Ash.state.ending);
console.log("Kept ending ok");

boot("guard", guard, ["smallGuns", "melee", "sneak"]);
Ash.state.scrip = 0;
pick(/Mara/);
pick(/bring the core/);
pick(/chit|Leave/);
pick(/hatch/);
pick(/Sneak/);
pick(/Breathe|bearings/);
pick(/Silt/);
Ash.travel("coil");
if (/Sneak past/.test(Ash.choiceList().map(function (c) { return c.label; }).join("|"))) pick(/Sneak past/);
pick(/truck/);
pick(/Lift it quiet/);
assert(Ash.hasCore() && Ash.state.flags.coreSource === "coil", "stolen core");
console.log("Steal path ok");

boot("tech", { str: 4, per: 5, end: 6, cha: 5, int: 9, agi: 4, lck: 3 }, ["science", "repair", "speech"]);
pick(/hatch/);
pick(/Sneak/);
pick(/Breathe|bearings/);
pick(/Silt/);
Ash.travel("crater");
pick(/shrine/);
pick(/unseat it/);
assert(Ash.hasCore() && Ash.state.flags.coreSource === "choir", "choir core via science");
console.log("Choir science path ok, shrine", Ash.state.flags.shrine);

boot("guard", guard, ["speech", "melee", "smallGuns"]);
pick(/Mara/);
pick(/bring the core/);
pick(/chit|Leave/);
pick(/hatch/);
pick(/Sneak/);
pick(/Breathe|bearings/);
Ash.travel("silt");
Ash.travel("coil");
pick(/Sneak past|Fight the lookout/);
if (Ash.state.combat) fight();
if (Ash.state.node === "coil.lookoutDone") pick(/Walk in/);
pick(/Hasp/);
pick(/open Bunker 7/);
pick(/Walk now/);
pick(/Sneak the bolt|Force the duty/);
if (Ash.state.combat) fight();
pick(/Get people to the laundry|Stand aside|Let it happen/);
if (Ash.state.node === "bunker.raidSpeechFail") pick(/Let it happen/);
pick(/Close the file/);
assert(Ash.state.ending === "raid", "raid ending " + Ash.state.ending + " node " + Ash.state.node);
console.log("Raid ending ok");

["stay", "exiled", "broker", "raid", "choke", "sold", "kept"].forEach(function (id) {
  var s = Ash.defaultState();
  s.name = "Ives";
  s.ending = id;
  s.day = 9;
  s.flags.dry = "fair";
  s.joss.met = true;
  s.joss.recruited = true;
  s.joss.alive = id !== "raid";
  var text = Ash.epitaph(s);
  assert(text.title && text.body && text.foot, "epitaph " + id);
});

boot("clerk", clerk, ["speech", "barter", "sneak"]);
Ash.invAdd("filterCore", 1);
Ash.state.location = "silt";
Ash.goto("silt.pebble");
pick(/filter core/);
pick(/Sell it/);
pick(/Walk away/);
assert(Ash.state.ending === "sold", "sold ending " + Ash.state.ending);

boot("guard", guard, ["speech", "melee", "smallGuns"]);
Ash.invAdd("filterCore", 1);
Ash.state.flags.bunkerExposed = true;
Ash.goto("bunker.mara");
pick(/Give her the filter/);
pick(/Take the surface/);
assert(Ash.state.ending === "exiled", "exiled ending " + Ash.state.ending);
console.log("Sold and exiled endings ok");

assert(Ash.route("bunker", "crater").days > 0, "path to crater");
assert(Ash.ITEMS.filterCore.kind === "quest", "core is quest");
assert(Object.keys(Ash.LOCATIONS).length === 9, "nine locations");
assert(Ash.PERK_PICKS.length >= 6, "perk list");

if (failed) {
  console.error(failed + " failures");
  process.exit(1);
}
console.log("All playtests passed.");
