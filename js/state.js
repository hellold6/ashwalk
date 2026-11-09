/* State, derived stats, inventory, time, saves. */
(function () {
  "use strict";
  var Ash = (window.Ash = window.Ash || {});

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  Ash.clamp = clamp;

Ash.roll = function () {
  if (Ash.debug && Ash.debug.queue && Ash.debug.queue.length) return Ash.debug.queue.shift();
  return Math.random();
};

Ash.d100 = function () {
  return 1 + Math.floor(Ash.roll() * 100);
};

  Ash.blankFlags = function () {
    return {
      briefed: false,
      skippedMara: false,
      refusedOrder: false,
      knowCore: false,
      seenSilt: false,
      metCalder: false,
      metNim: false,
      metPebble: false,
      metJoss: false,
      metTic: false,
      metReed: false,
      metHasp: false,
      metVellum: false,
      dry: "none",
      reedLog: false,
      calderBook: false,
      evidenceShownCalder: false,
      evidenceShownReed: false,
      reedHelp: false,
      reedHostile: false,
      reedDead: false,
      calderDead: false,
      prices: "normal",
      calderTradeOk: false,
      tradeHarder: false,
      bunkerExposed: false,
      bunkerRumored: false,
      radioTubeFound: false,
      towerFixed: false,
      toldMaraRadio: false,
      toldCalderRadio: false,
      toldChoirRadio: false,
      toldTicRadio: false,
      knowSilent: false,
      silentVisited: false,
      silentLooted: false,
      sealShownMara: false,
      sealShownHasp: false,
      sealShownVellum: false,
      nim: "none",
      nimHeal: false,
      choirSalts: false,
      jossQuest: "none",
      lookoutCleared: false,
      jossFavor: false,
      coilCleared: false,
      haspDead: false,
      truckLooted: false,
      coilPact: false,
      choirHostile: false,
      patientHelped: false,
      shrine: "none",
      coreSource: "",
      coreFate: "",
      lungsSaved: false,
      lastGasp: false,
      lungsJury: false,
      firstRoad: false,
      storesIssued: false,
      wreckLooted: false,
      wallowDay: -9,
      ridgeSeen: false,
      cacheRoad: false,
      dustOnce: false,
      jossParted: false,
      raidDone: false,
      marginaliaUsed: false,
      ground: {},
      stashesNote: "",
    };
  };

  Ash.defaultState = function () {
    return {
      v: 1,
      name: "Walker",
      background: "tech",
      attrs: { str: 5, per: 5, end: 5, cha: 5, int: 5, agi: 5, lck: 5 },
      tags: [],
      skillRanks: {},
      perks: [],
      level: 1,
      xp: 0,
      karma: 0,
      rep: { bunker: 0, silt: 0, coil: 0, choir: 0 },
      hp: 40,
      rads: 0,
      scrip: 0,
      day: 1,
      lungs: 14,
      location: "bunker",
      node: "bunker.corridor",
      known: ["bunker", "hatch"],
      equip: { weapon: null, armor: null },
      inv: {},
      flags: Ash.blankFlags(),
      joss: {
        met: false,
        recruited: false,
        following: false,
        alive: true,
        parted: false,
        hp: 32,
        maxHp: 32,
      },
      note: "",
      bankedSkills: 0,
      bankedPerks: 0,
      modal: null,
      screen: "title",
      travel: null,
      combat: null,
      levelDraft: null,
      dead: false,
      ending: null,
      checkNote: "",
      aside: "",
      typewriter: true,
      shop: null,
      mapPick: null,
      combatRoundOne: false,
      defending: false,
      defendBonus: 0,
    };
  };

  Ash.state = Ash.defaultState();

  Ash.hasPerk = function (id, s) {
    s = s || Ash.state;
    return s.perks.indexOf(id) !== -1;
  };

  Ash.skillValue = function (id, s) {
    s = s || Ash.state;
    var meta = Ash.SKILLS[id];
    if (!meta) return 0;
    var v = 15 + 2 * (s.attrs[meta.attr] || 1);
    if (s.tags.indexOf(id) !== -1) v += 15;
    v += s.skillRanks[id] || 0;
    if (id === "repair" && Ash.hasPerk("schematic", s)) v += 15;
    if (id === "science" && Ash.hasPerk("schematic", s)) v += 5;
    if (id === "melee" && Ash.hasPerk("hatch", s)) v += 10;
    if (id === "speech" && Ash.hasPerk("marginalia", s)) v += 10;
    if (id === "sneak" && Ash.hasPerk("quietBoots", s)) v += 15;
    if (id === "smallGuns" && Ash.hasPerk("splitter", s)) v += 10;
    if (id === "repair" && Ash.hasPerk("knotNeedle", s)) v += 10;
    if (id === "medicine" && Ash.hasPerk("knotNeedle", s)) v += 10;
    if (id === "barter" && Ash.hasPerk("marketThumb", s)) v += 15;
    if ((id === "melee" || id === "unarmed") && Ash.hasPerk("meanElbow", s)) v += 15;
    if (id === "speech" && Ash.hasPerk("softVoice", s)) v += 15;
    if (id === "science" && Ash.hasPerk("craterPrayer", s)) v += 10;
    return clamp(v, 1, 100);
  };

  Ash.maxHp = function (s) {
    s = s || Ash.state;
    var hp = 22 + s.attrs.end * 5 + (s.level - 1) * 4;
    if (Ash.hasPerk("hatch", s)) hp += 6;
    if (s.rads >= 50) hp -= Math.floor(hp * clamp(s.rads - 40, 0, 60) / 200);
    return Math.max(8, hp);
  };

  Ash.maxAp = function (s) {
    s = s || Ash.state;
    return 5 + Math.floor(s.attrs.agi / 2);
  };

  Ash.carryMax = function (s) {
    s = s || Ash.state;
    return 35 + s.attrs.str * 10;
  };

  Ash.radResist = function (s) {
    s = s || Ash.state;
    var rr = s.attrs.end * 3;
    var armor = s.equip.armor && Ash.ITEMS[s.equip.armor];
    if (armor) rr += armor.rr || 0;
    if (Ash.hasPerk("ashLung", s)) rr += 20;
    return rr;
  };

  Ash.speechBonus = function (s) {
    s = s || Ash.state;
    return (s.attrs.cha || 1) * 2;
  };

  Ash.dt = function (s) {
    s = s || Ash.state;
    var armor = s.equip.armor && Ash.ITEMS[s.equip.armor];
    var dt = armor ? armor.dt || 0 : 0;
    if (s.defending) dt += 3;
    return dt;
  };

  Ash.karmaWord = function (s) {
    s = s || Ash.state;
    var k = s.karma;
    if (k >= 40) return "Mercy";
    if (k >= 15) return "Soft";
    if (k >= -14) return "Even";
    if (k >= -39) return "Hard";
    return "Cruel";
  };

  Ash.priceOf = function (id, buying, s) {
    s = s || Ash.state;
    var item = Ash.ITEMS[id];
    if (!item) return 0;
    var base = item.value || 0;
    if (!buying) {
      if (id === "hogGland") return 16;
      return Math.max(1, Math.floor(base * 0.4));
    }
    var mult = 1;
    if (s.flags.prices === "discount") mult -= 0.1;
    if (s.flags.prices === "surcharge") mult += 0.25;
    if (s.rep.silt >= 25) mult -= 0.08;
    if (s.rep.silt <= -20) mult += 0.15;
    var barter = Ash.skillValue("barter", s);
    mult -= Math.min(0.28, barter / 280);
    if (Ash.hasPerk("marketThumb", s)) mult -= 0.1;
    if (Ash.hasPerk("marginalia", s) && !s.flags.marginaliaUsed) mult -= 0.08;
    mult = clamp(mult, 0.45, 1.7);
    return Math.max(1, Math.floor(base * mult));
  };

  Ash.invWeight = function (s) {
    s = s || Ash.state;
    var w = 0;
    Object.keys(s.inv).forEach(function (id) {
      var item = Ash.ITEMS[id];
      if (!item) return;
      if (item.kind === "quest") return;
      w += (item.w || 0) * (s.inv[id] || 0);
    });
    return w;
  };

  Ash.invCount = function (id, s) {
    s = s || Ash.state;
    return s.inv[id] || 0;
  };

  Ash.invCanFit = function (id, n, s) {
    s = s || Ash.state;
    var item = Ash.ITEMS[id];
    if (!item) return false;
    if (item.kind === "quest" || !item.w) return true;
    return Ash.invWeight(s) + item.w * n <= Ash.carryMax(s) + 0.001;
  };

  Ash.invAdd = function (id, n, s) {
    s = s || Ash.state;
    n = n || 1;
    if (n <= 0) return true;
    if (!Ash.ITEMS[id]) return false;
    if (!Ash.invCanFit(id, n, s)) return false;
    s.inv[id] = (s.inv[id] || 0) + n;
    return true;
  };

  Ash.invRemove = function (id, n, s) {
    s = s || Ash.state;
    n = n || 1;
    if ((s.inv[id] || 0) < n) return false;
    s.inv[id] -= n;
    if (s.inv[id] <= 0) delete s.inv[id];
    if (s.equip.weapon === id && !s.inv[id]) s.equip.weapon = null;
    if (s.equip.armor === id && !s.inv[id]) s.equip.armor = null;
    return true;
  };

  Ash.groundAdd = function (loc, id, n, s) {
    s = s || Ash.state;
    var g = s.flags.ground[loc] || (s.flags.ground[loc] = {});
    g[id] = (g[id] || 0) + n;
  };

  Ash.tryLoot = function (id, n, s) {
    s = s || Ash.state;
    if (Ash.invAdd(id, n, s)) return true;
    Ash.groundAdd(s.location, id, n, s);
    return false;
  };

  Ash.learn = function (id, s) {
    s = s || Ash.state;
    if (s.known.indexOf(id) === -1) s.known.push(id);
  };

  Ash.hasCore = function (s) {
    return Ash.invCount("filterCore", s || Ash.state) > 0;
  };

  Ash.route = function (from, to) {
    if (from === to) return { days: 0, path: [from] };
    var nodes = Object.keys(Ash.LOCATIONS);
    var dist = {};
    var prev = {};
    nodes.forEach(function (n) {
      dist[n] = Infinity;
    });
    dist[from] = 0;
    var used = {};
    while (true) {
      var best = null;
      nodes.forEach(function (n) {
        if (used[n]) return;
        if (best === null || dist[n] < dist[best]) best = n;
      });
      if (best === null || dist[best] === Infinity) break;
      if (best === to) break;
      used[best] = true;
      Ash.ROADS.forEach(function (r) {
        var a = r[0],
          b = r[1],
          d = r[2];
        if (a !== best && b !== best) return;
        var nxt = a === best ? b : a;
        if (used[nxt]) return;
        var nd = dist[best] + d;
        if (nd < dist[nxt]) {
          dist[nxt] = nd;
          prev[nxt] = best;
        }
      });
    }
    if (dist[to] === Infinity) return null;
    var path = [to];
    var cur = to;
    while (cur !== from) {
      cur = prev[cur];
      if (!cur) return null;
      path.push(cur);
    }
    path.reverse();
    return { days: dist[to], path: path };
  };

  Ash.xpAward = function (n, s) {
    s = s || Ash.state;
    if (n <= 0 || s.ending || s.dead) return;
    s.xp += n;
    var gained = false;
    while (s.level < Ash.XP_TABLE.length - 1 && s.xp >= Ash.XP_TABLE[s.level + 1]) {
      s.level += 1;
      s.bankedSkills += 4;
      if (s.level % 2 === 0) s.bankedPerks += 1;
      s.hp = Math.min(Ash.maxHp(s), s.hp + 8);
      gained = true;
    }
    if (gained && !s.combat && s.screen === "play") {
      Ash.openLevelUp();
    }
  };

  Ash.openLevelUp = function () {
    var s = Ash.state;
    if (s.bankedSkills <= 0 && s.bankedPerks <= 0) return;
    if (s.levelDraft) return;
    s.levelDraft = { spends: {}, perk: null };
    s.modal = "levelup";
  };

  Ash.heal = function (n, s) {
    s = s || Ash.state;
    s.hp = clamp(s.hp + n, 0, Ash.maxHp(s));
  };

  Ash.hurt = function (n, s) {
    s = s || Ash.state;
    s.hp = Math.max(0, s.hp - n);
    if (s.hp <= 0 && !s.dead && !s.ending) {
      s.dead = true;
      s.modal = null;
      s.screen = "dead";
    }
  };

  Ash.addRads = function (n, s) {
    s = s || Ash.state;
    if (n > 0) {
      var resist = Ash.radResist(s);
      var taken = Math.max(0, Math.round(n * (1 - Math.min(0.75, resist / 120))));
      if (Ash.hasPerk("craterPrayer", s)) taken = Math.ceil(taken * 0.6);
      s.rads = clamp(s.rads + taken, 0, 100);
    } else {
      s.rads = clamp(s.rads + n, 0, 100);
    }
    if (s.rads >= 100) Ash.hurt(999, s);
    s.hp = Math.min(s.hp, Ash.maxHp(s));
  };

  Ash.shiftRep = function (fac, n, s) {
    s = s || Ash.state;
    if (!s.rep[fac] && s.rep[fac] !== 0) return;
    s.rep[fac] = clamp(s.rep[fac] + n, -100, 100);
  };

  Ash.shiftKarma = function (n, s) {
    s = s || Ash.state;
    s.karma = clamp(s.karma + n, -100, 100);
  };

  Ash.useConsumable = function (id, s) {
    s = s || Ash.state;
    var item = Ash.ITEMS[id];
    if (!item || item.kind !== "consumable") return "That doesn't work that way.";
    if (!Ash.invRemove(id, 1, s)) return "You don't have it.";
    var bits = [];
    if (item.heal) {
      var amt = item.heal;
      if (id === "medkit") {
        amt += Math.floor(Ash.skillValue("medicine", s) / 5);
        if (s.flags.nimHeal) amt += 12;
      }
      var before = s.hp;
      Ash.heal(amt, s);
      bits.push("You mend " + (s.hp - before) + ".");
    }
    if (item.rads) {
      var prev = s.rads;
      Ash.addRads(item.rads, s);
      if (item.rads < 0) bits.push("Rads ease (" + prev + " to " + s.rads + ").");
      else bits.push("A metal taste climbs your tongue.");
    }
    if (!bits.length) bits.push("You use it.");
    return bits.join(" ");
  };

  Ash.advanceDays = function (n, destination, s) {
    s = s || Ash.state;
    if (n <= 0) return "ok";
    s.day += n;
    if (!s.flags.lungsSaved) {
      s.lungs -= n;
      if (s.lungs <= 0) {
        if (destination === "bunker" && Ash.hasCore(s)) {
          s.lungs = 0;
          s.flags.lastGasp = true;
          return "ok";
        }
        s.lungs = 0;
        return "choke";
      }
    }
    if (s.rads >= 75) {
      Ash.hurt(Math.ceil((s.rads - 60) / 10), s);
    }
    return s.dead ? "dead" : "ok";
  };

  Ash.applyBackground = function (s, id) {
    var bg = Ash.BACKGROUNDS[id];
    if (!bg) return;
    s.background = id;
    s.attrs = Object.assign({}, bg.base);
    s.scrip = bg.scrip;
    s.rep = Object.assign({ bunker: 0, silt: 0, coil: 0, choir: 0 }, bg.rep);
    s.inv = {};
    Object.keys(bg.items).forEach(function (k) {
      s.inv[k] = bg.items[k];
    });
    s.equip = { weapon: bg.equip.weapon, armor: bg.equip.armor };
    s.perks = [bg.perk];
    s.hp = Ash.maxHp(s);
    s.joss.hp = s.joss.maxHp;
  };

  function storage() {
    try {
      return window.localStorage;
    } catch (e) {
      return null;
    }
  }

  Ash.save = {
    pack: function (label) {
      var s = Ash.state;
      return {
        v: 1,
        savedAt: Date.now(),
        label: label || s.name + " — day " + s.day,
        summary: {
          name: s.name,
          day: s.day,
          loc: (Ash.LOCATIONS[s.location] || {}).name || s.location,
          level: s.level,
          ending: s.ending,
        },
        state: JSON.parse(JSON.stringify(s)),
      };
    },
    write: function (key, label) {
      var ls = storage();
      if (!ls) return false;
      if (Ash.state.dead || Ash.state.hp <= 0) return false;
      var copy = Ash.save.pack(label);
      copy.state.modal = null;
      copy.state.combat = null;
      copy.state.shop = null;
      copy.state.levelDraft = null;
      copy.state.mapPick = null;
      try {
        ls.setItem(key, JSON.stringify(copy));
        return true;
      } catch (e) {
        return false;
      }
    },
    auto: function () {
      if (Ash.state.screen === "title" || Ash.state.screen === "create") return false;
      return Ash.save.write("ashwalk.auto");
    },
    slot: function (n, label) {
      return Ash.save.write("ashwalk.slot." + n, label);
    },
    read: function (key) {
      var ls = storage();
      if (!ls) return null;
      var raw = ls.getItem(key);
      if (!raw) return null;
      try {
        var data = JSON.parse(raw);
        if (!data || data.v !== 1 || !data.state) return null;
        return data;
      } catch (e) {
        return null;
      }
    },
    load: function (key) {
      var data = Ash.save.read(key);
      if (!data) return false;
      Ash.state = data.state;
      Ash.state.dead = false;
      Ash.state.screen = Ash.state.ending ? "ending" : "play";
      Ash.state.modal = null;
      Ash.state.combat = null;
      Ash.state.hp = Math.max(1, Math.min(Ash.state.hp, Ash.maxHp(Ash.state)));
      if (!Ash.state.flags.ground) Ash.state.flags.ground = {};
      return true;
    },
    list: function () {
      return [1, 2, 3].map(function (n) {
        return { n: n, data: Ash.save.read("ashwalk.slot." + n) };
      });
    },
    hasAuto: function () {
      return !!Ash.save.read("ashwalk.auto");
    },
  };

  Ash.quests = function (s) {
    s = s || Ash.state;
    var f = s.flags;
    var list = [];
    var lungsDetail = "The Lungs have about " + s.lungs + " days. Find a filter core.";
    var lungsStatus = "Active";
    if (f.lungsSaved && f.coreFate === "mara") {
      lungsStatus = "Done";
      lungsDetail = "You seated the core. Bunker 7 is breathing.";
    } else if (f.lungsSaved && f.coreFate === "broker") {
      lungsStatus = "Done";
      lungsDetail = "The core sits in the Lungs under a trade with Silt.";
    } else if (f.coreFate === "sold") {
      lungsStatus = "Failed";
      lungsDetail = "You sold the core. The bunker is on its own clock.";
    } else if (f.coreFate === "kept") {
      lungsStatus = "Failed";
      lungsDetail = "You kept the core. Eighty people can argue with that.";
    } else if (f.coreFate === "raid") {
      lungsStatus = "Done";
      lungsDetail = "The Coil took the hatch. The core is theirs as much as anyone's.";
    } else if (Ash.hasCore(s)) {
      lungsDetail = "The core is in your pack. Bunker 7 is still counting.";
    } else if (!f.briefed) {
      lungsDetail = "Mara has a job. The gauge does not care if you want it.";
    }
    list.push({ name: "The Lungs", status: lungsStatus, detail: lungsDetail });

    if (f.dry === "started") {
      list.push({
        name: "Dry Claim",
        status: "Active",
        detail: "Calder and Reed are bleeding the same seep with different stories.",
      });
    } else if (f.dry === "fair") {
      list.push({
        name: "Dry Claim",
        status: "Done",
        detail: "The seep is counted in daylight. Nobody is happy. The water moves.",
      });
    } else if (f.dry === "calder") {
      list.push({
        name: "Dry Claim",
        status: "Done",
        detail: "Reed is out. Calder's book got quieter and heavier.",
      });
    } else if (f.dry === "reed") {
      list.push({
        name: "Dry Claim",
        status: "Done",
        detail: "Reed keeps the pump. Silt will taste the difference in the prices.",
      });
    }

    if (f.metTic || f.towerFixed) {
      var rd = "Tic says the tower is saying a name. It needs a tube.";
      var st = "Active";
      if (f.towerFixed && f.knowSilent) {
        rd = "Bunker 4 went quiet. The tower still has their last breath on it.";
        if (f.silentVisited) {
          st = "Done";
          rd = "You heard Juniper's bunker and you walked into what was left.";
        }
      } else if (f.towerFixed) {
        rd = "The broadcast played. Decide who gets the truth.";
      } else if (Ash.invCount("radioTube", s)) {
        rd = "You have a tube. The mast above the shack is waiting.";
      }
      list.push({ name: "Tic's Radio", status: st, detail: rd });
    }

    if (f.nim === "started") {
      list.push({
        name: "Nim's Debt",
        status: "Active",
        detail: Ash.invCount("hogGland", s) + " grit-hog gland(s) in pack. Nim wants two, or a deal with the Choir.",
      });
    } else if (f.nim === "done") {
      list.push({
        name: "Nim's Debt",
        status: "Done",
        detail: "Nim's tent smells like iodine and relief. Her kits work harder.",
      });
    }

    if (f.jossQuest === "started" && !s.joss.recruited) {
      list.push({
        name: "Joss",
        status: "Active",
        detail: f.lookoutCleared
          ? "The lookout is down. She might walk with you if you ask straight, or pay her tab in peaches."
          : "Clear the Coil lookout. She says her partner is still in that sightline.",
      });
    } else if (s.joss.recruited && s.joss.alive && !s.joss.parted) {
      list.push({
        name: "Joss",
        status: s.joss.following ? "Following" : "Waiting in Silt",
        detail: "She shoots better than she talks. She will demonstrate both.",
      });
    } else if (!s.joss.alive) {
      list.push({
        name: "Joss",
        status: "Dead",
        detail: "The ridge kept her. The rifle did not get up either.",
      });
    }
    return list;
  };
})();
