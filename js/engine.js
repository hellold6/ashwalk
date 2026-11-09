/* Node runner, travel, quests, endings. */
(function () {
  "use strict";
  var Ash = (window.Ash = window.Ash || {});

  Ash.nodes = {};

  Ash.JOSS_LINES = {
    bunker: "Joss eyes the concrete like it might invoice her. \"I left places like this on purpose.\"",
    hatch: "\"Nice door. Shame about the planet glued to it.\"",
    silt: "She angles at the trough and then doesn't. \"If I sit, I stay. Don't let me sit.\"",
    reed: "\"Farmers and foremen. My favorite kind of crossfire.\"",
    tower: "\"If that thing starts naming me, we burn it.\"",
    scrap: "\"I lost a bet on this ridge. The bet was a person.\"",
    coil: "She goes quiet in the way that means the opposite. \"That's the sightline. Don't get poetic.\"",
    crater: "\"Pretty. So's an infection.\"",
    silent: "Joss will not stand in the doorway. \"I don't do smiles that stay on.\"",
  };

  Ash.jossAside = function (loc, s) {
    s = s || Ash.state;
    if (!s.joss.recruited || !s.joss.following || !s.joss.alive || s.joss.parted) return "";
    var key = "jossHeard_" + loc;
    if (s.flags[key]) return "";
    s.flags[key] = true;
    return Ash.JOSS_LINES[loc] || "";
  };

  Ash.lungsWhisper = function (s) {
    s = s || Ash.state;
    if (s.flags.lungsSaved) return "";
    if (s.lungs <= 2) return "The Lungs are at " + s.lungs + " day" + (s.lungs === 1 ? "" : "s") + ". The gauge is not a metaphor.";
    if (s.lungs <= 4) return "The Lungs sit at " + s.lungs + " days in the back of your head, heavy as a tool.";
    return "";
  };

  Ash.hubFor = function (loc) {
    var f = Ash.state.flags;
    if (loc === "coil") {
      if (f.coilCleared || f.coilPact || f.lookoutCleared) return "coil.camp";
      return "coil.approach";
    }
    var map = {
      bunker: "bunker.corridor",
      hatch: "hatch.slope",
      silt: "silt.square",
      reed: "reed.yard",
      tower: "tower.base",
      scrap: "scrap.ridge",
      crater: "crater.rim",
      silent: "silent.door",
    };
    return map[loc] || "silt.square";
  };

  Ash.node = function () {
    return Ash.nodes[Ash.state.node];
  };

  Ash.currentText = function () {
    var n = Ash.node();
    if (!n) return "The page is blank. That is a bug, not a prophecy.";
    var t = typeof n.text === "function" ? n.text(Ash.state) : n.text;
    return t || "";
  };

  Ash.currentSpeaker = function () {
    var n = Ash.node();
    if (!n || !n.speaker) return null;
    return typeof n.speaker === "function" ? n.speaker(Ash.state) : n.speaker;
  };

  Ash.currentScene = function () {
    var n = Ash.node();
    if (n && n.scene) return n.scene;
    return Ash.state.location || "silt";
  };

  Ash.choiceList = function () {
    var n = Ash.node();
    if (!n) return [];
    var s = Ash.state;
    var list = typeof n.choices === "function" ? n.choices(s) : n.choices || [];
    list = list.filter(function (c) {
      return !c.if || c.if(s);
    });
    if (!n.hub) return list;
    var g = (s.flags.ground && s.flags.ground[s.location]) || {};
    Object.keys(g).forEach(function (id) {
      if (g[id] > 0 && Ash.ITEMS[id]) {
        list.push({
          label: "Pick up the " + Ash.ITEMS[id].name + (g[id] > 1 ? " ×" + g[id] : "") + ".",
          fx: function (st) {
            var have = st.flags.ground[st.location][id];
            var got = 0;
            for (var i = 0; i < have; i++) {
              if (!Ash.invAdd(id, 1, st)) break;
              got++;
            }
            st.flags.ground[st.location][id] = have - got;
            st.note = got
              ? "You take the " + Ash.ITEMS[id].name + "."
              : "You're at your weight. It stays in the dust.";
          },
          goto: "@hub",
        });
      }
    });
    if (s.joss.recruited && s.joss.alive && s.joss.following && !s.joss.parted && s.location !== "silt") {
      list.push({
        label: "Send Joss to wait at the trough in Silt.",
        fx: function (st) {
          st.joss.following = false;
          st.note = "Joss spits, nods, and takes the road back alone.";
        },
        goto: "@hub",
      });
    }
    return list;
  };

  Ash.chanceOf = function (check, s) {
    s = s || Ash.state;
    if (!check) return 0;
    var skill = Ash.skillValue(check.skill, s);
    var mod = typeof check.mod === "function" ? check.mod(s) : check.mod || 0;
    if ((check.skill === "speech" || check.skill === "barter") && check.joss && s.joss.following && s.joss.alive && !s.joss.parted) {
      mod -= Ash.hasPerk("softVoice", s) ? 6 : 14;
    }
    if (check.skill === "barter" && Ash.hasPerk("marginalia", s) && !s.flags.marginaliaUsed) mod += 10;
    if (check.skill === "speech" && s.flags.reedHelp && check.reedTip) mod += 10;
    var luck = (s.attrs.lck - 5) * 2;
    return Ash.clamp(skill + mod + luck, 5, 95);
  };

  Ash.goto = function (id) {
    var s = Ash.state;
    var node = Ash.nodes[id];
    if (!node) {
      s.note = "Missing scene (" + id + ").";
      return;
    }
    s._jossLine = "";
    s.node = id;
    if (node.onEnter) node.onEnter(s);
  };

  Ash.markJoss = function (s) {
    if (!s.joss.recruited || !s.joss.following || !s.joss.alive || s.joss.parted) return;
    var key = "jossHeard_" + s.location;
    if (s.flags[key]) return;
    s.flags[key] = true;
    s._jossLine = Ash.JOSS_LINES[s.location] || "";
  };

  Ash.arrive = function (loc) {
    var s = Ash.state;
    s.location = loc;
    Ash.learn(loc, s);
    if (loc === "silt") {
      ["reed", "tower", "scrap", "coil", "crater"].forEach(function (id) {
        Ash.learn(id, s);
      });
    }
    if (loc === "crater") {
      var rad = 8;
      if (s.rep.choir >= 20) rad -= 3;
      Ash.addRads(Math.max(2, rad), s);
      if (s.dead) return;
    }
    if (loc === "silent" && !s.flags.silentRads) {
      s.flags.silentRads = true;
      Ash.addRads(6, s);
      if (s.dead) return;
    }
    var march = s.travel;
    s.travel = null;
    if (loc === "bunker" && s.flags.raidMarch && s.flags.coilPact && !s.flags.raidDone) {
      Ash.goto("bunker.raid");
      Ash.save.auto();
      return;
    }
    if (loc === "coil" && s.rep.coil <= -35 && !s.flags.coilCleared && !s.flags.coilPact) {
      Ash.goto("coil.ambush");
      Ash.save.auto();
      return;
    }
    Ash.goto(Ash.hubFor(loc));
    if (march && s.flags.reedHelp && (loc === "coil" || loc === "scrap") && !s.flags.reedWarned) {
      s.flags.reedWarned = true;
      s.note = (s.note ? s.note + " " : "") + "Reed's tip holds: he marked the dog-lines with chalk. You see them before they see you.";
    }
    Ash.save.auto();
  };

  function roadPool(from, to) {
    var hot = [from, to];
    var pool = [];
    if (hot.indexOf("crater") !== -1 || hot.indexOf("silent") !== -1) {
      pool.push("moths", "choirSentinel", "sandreaper");
    } else if (hot.indexOf("coil") !== -1) {
      pool.push("coilDog", "coilRaider", "gritHog", "sandreaper");
    } else {
      pool.push("sandreaper", "gritHog", "coilDog", "sandreaper");
    }
    return pool;
  }

  Ash.travel = function (to) {
    var s = Ash.state;
    if (s.dead || s.ending) return;
    if (s.known.indexOf(to) === -1) {
      s.note = "You don't know that road yet.";
      return;
    }
    if (to === s.location) {
      s.note = "You're already standing on it.";
      return;
    }
    var rt = Ash.route(s.location, to);
    if (!rt) {
      s.note = "There isn't a road, and you are not that lucky.";
      return;
    }
    Ash.save.auto();
    var from = s.location;
    var time = Ash.advanceDays(rt.days, to, s);
    if (s.dead) return;
    if (time === "choke") {
      Ash.ending("choke");
      return;
    }
    s.travel = { from: from, to: to, days: rt.days };
    if (rt.days <= 0) {
      Ash.arrive(to);
      return;
    }
    if (!s.flags.firstRoad && to === "silt" && (from === "hatch" || from === "bunker")) {
      s.flags.firstRoad = true;
      Ash.arrive(to);
      return;
    }
    var quiet = Ash.roll();
    if (Ash.debug && Ash.debug.noEncounter) quiet = 1;
    if (Ash.debug && Ash.debug.forceEncounter) quiet = 0;
    if (s.flags.silentSafe && (to === "silent" || from === "silent")) quiet += 0.15;
    if (quiet > 0.36) {
      Ash.arrive(to);
      return;
    }
    var kindRoll = Ash.roll();
    if (kindRoll < 0.55) {
      var pool = roadPool(from, to);
      var id = pool[Math.floor(Ash.roll() * pool.length)];
      var count = id === "moths" || id === "coilDog" ? (Ash.roll() < 0.4 ? 2 : 1) : 1;
      var enemies = [];
      for (var i = 0; i < count; i++) enemies.push(id);
      Ash.combat.start({
        enemies: enemies,
        thenTravel: true,
        intro: "The road spends an ambush it was saving.",
        onWin: function () {},
      });
      return;
    }
    if (kindRoll < 0.72) {
      Ash.goto("road.dust");
      return;
    }
    if (kindRoll < 0.86) {
      Ash.goto("road.trader");
      return;
    }
    if (kindRoll < 0.95 && !s.flags.cacheRoad) {
      Ash.goto("road.cache");
      return;
    }
    if (to === "crater" || from === "crater" || to === "silt") {
      Ash.goto("road.pilgrim");
      return;
    }
    Ash.arrive(to);
  };

  Ash.rest = function () {
    var s = Ash.state;
    if (s.dead || s.ending || s.modal === "combat") return;
    var loc = s.location;
    var safe = {
      bunker: true,
      hatch: true,
      silt: true,
      tower: true,
      scrap: false,
      crater: false,
      silent: false,
      coil: !!s.flags.coilCleared,
      reed: !s.flags.reedHostile && !s.flags.reedDead,
    };
    if (!safe[loc]) {
      s.note =
        loc === "crater"
          ? "You shut your eyes and the glow prints on them. This is not a place to sleep."
          : "Not here. Not with your eyes closed.";
      return;
    }
    Ash.save.auto();
    var before = s.hp;
    var frac = loc === "bunker" || (loc === "reed" && s.flags.reedHelp) ? 0.5 : 0.35;
    var gain = Math.floor(Ash.maxHp(s) * frac) + Math.floor(Ash.skillValue("medicine", s) / 10);
    Ash.heal(gain, s);
    if (loc === "bunker") Ash.addRads(-10, s);
    else if (s.flags.nimHeal && loc === "silt") Ash.addRads(-6, s);
    else Ash.addRads(-Math.floor(s.attrs.end / 2), s);
    if (loc === "reed" && s.flags.reedGift) {
      s.flags.reedGift = false;
      var gotWhip = Ash.tryLoot("coilWhip", 1, s);
      var whipLine = gotWhip
        ? "Reed presses a coil-whip into your hand. \"Took it off a dog that used to have an owner.\""
        : "Reed has a coil-whip for you. You're carrying too much, so he leans it on the pump.";
      s.note = whipLine;
    }
    var time = Ash.advanceDays(1, loc, s);
    if (s.dead) return;
    if (time === "choke") {
      Ash.ending("choke");
      return;
    }
    var healed = s.hp - before;
    var base =
      "You sleep. Day " +
      s.day +
      ". " +
      (healed > 0 ? "The worst of it knits (" + healed + ")." : "Sleep doesn't bother to heal you.") +
      (s.flags.lungsSaved ? " The Lungs keep their dull new rhythm." : " The Lungs: " + s.lungs + " days.");
    s.note = (s.note ? s.note + " " : "") + base;
    Ash.save.auto();
  };

  Ash.resolveDry = function (mode) {
    var s = Ash.state;
    if (s.flags.dry === "fair" || s.flags.dry === "calder" || s.flags.dry === "reed") return false;
    s.flags.dry = mode;
    if (mode === "fair") {
      s.flags.reedHelp = true;
      s.flags.prices = "discount";
      s.flags.reedGift = true;
      Ash.shiftRep("silt", 14, s);
      Ash.shiftKarma(10, s);
      s.scrip += 55;
      Ash.xpAward(80, s);
    } else if (mode === "calder") {
      s.flags.reedHelp = false;
      if (!s.flags.reedDead) s.flags.reedHostile = true;
      s.flags.prices = "discount";
      Ash.shiftRep("silt", 8, s);
      Ash.shiftKarma(s.flags.reedDead ? -16 : -6, s);
      s.scrip += 40;
      Ash.xpAward(65, s);
    } else if (mode === "reed") {
      s.flags.reedHelp = true;
      s.flags.reedGift = true;
      s.flags.prices = "surcharge";
      s.flags.calderTradeOk = false;
      Ash.shiftRep("silt", -6, s);
      Ash.shiftKarma(6, s);
      s.scrip += 20;
      Ash.xpAward(65, s);
    }
    return true;
  };

  Ash.finishFairIfReady = function () {
    var s = Ash.state;
    if (s.flags.calderAgreed && s.flags.reedAgreed) {
      Ash.resolveDry("fair");
      return true;
    }
    return false;
  };

  Ash.takeCore = function (source) {
    var s = Ash.state;
    if (Ash.hasCore(s)) return false;
    Ash.invAdd("filterCore", 1, s);
    s.flags.coreSource = source;
    Ash.xpAward(45, s);
    return true;
  };

  Ash.corePrice = function () {
    var s = Ash.state;
    var helped = s.flags.dry === "fair" || s.flags.dry === "calder";
    if (helped && s.flags.prices !== "surcharge") return 55;
    return s.flags.fortuneCut ? 180 : 220;
  };

  Ash.ending = function (id) {
    var s = Ash.state;
    s.ending = id;
    s.screen = "ending";
    s.modal = null;
    s.combat = null;
    if (id === "stay" || id === "exiled" || id === "broker") s.flags.lungsSaved = true;
    Ash.save.auto();
  };

  Ash.epitaph = function (s) {
    s = s || Ash.state;
    var n = s.name || "The walker";
    var k = Ash.karmaWord(s);
    var days = s.day;
    var joss = "";
    if (!s.joss.met) joss = "A drunk at the trough never had to learn the name.";
    else if (!s.joss.alive) joss = "Joss ended in the dust with the rifle under her. Somebody will pretend that was the plan.";
    else if (s.joss.parted) joss = "Joss stayed at the trough and did not watch the hatch. She counts that as mercy.";
    else if (s.joss.recruited) joss = "Joss is alive, which she treats as a clerical error she intends to keep.";
    else joss = "Joss is still at the trough, spending her aim on bottles.";

    var silt = "The water argument outlived the week.";
    if (s.flags.dry === "fair") silt = "The seep is counted in daylight now. Nobody is charming about it.";
    else if (s.flags.reedDead) silt = "Reed's pump sticks. Nobody oils it. Calder's book got lighter by a man.";
    else if (s.flags.dry === "calder") silt = "Reed's claim is quiet and Calder's book is not.";
    else if (s.flags.dry === "reed") silt = "Calder still spits when the pump is mentioned. The water runs anyway.";

    var slow = days >= 12 ? " It took almost all the air they had." : days <= 5 ? " It was fast, for the ash." : " It took " + days + " days.";
    var bunkerLine = "";
    var title = "FILE CLOSED";
    var body = "";

    if (s.ending === "stay") {
      title = "FILE CLOSED — RETURNED TO ROTATION";
      body =
        n +
        " brought the filter core home." +
        slow +
        " The Lungs took it the way a throat takes water. Mara " +
        (s.flags.walkedOut ? "left a bunk empty. " + n + " did not take it." : "pointed at a bunk and did not make a speech.") +
        " Outside, the ash kept its job.";
    } else if (s.ending === "exiled") {
      title = "FILE CLOSED — USEFUL";
      body =
        "The core seated. The door did not open again for " +
        n +
        "." +
        slow +
        " Mara counted them as a tool that had learned too many addresses. Bunker 7 breathed. It did not say thank you.";
    } else if (s.ending === "broker") {
      title = "FILE CLOSED — TWO LEDGERS";
      body =
        "Silt's water and Bunker 7's air signed the same scrap of foil." +
        slow +
        " " +
        n +
        " walked the hatch on a schedule. Nobody liked it. Everybody breathed. The core hummed like a clerk who had finally been given a form.";
    } else if (s.ending === "raid") {
      title = "FILE CLOSED — CABLE ON THE STAIRS";
      body =
        "The Coil came down the hatch behind " +
        n +
        "." +
        slow +
        (s.flags.evacuated
          ? " Mara got a roomful of people as far as the laundry cistern. It was not a life. It was a delay."
          : " The people who knew how to run the Lungs did not get a vote.") +
        " The core went in. The door changed owners.";
    } else if (s.ending === "choke") {
      title = "FILE CLOSED — THE GAUGE";
      body =
        "The gauge hit the pin on day " +
        days +
        ". Bunker 7 coughed once and learned a quieter job. " +
        n +
        " was outside with the surface on their teeth. " +
        (Ash.hasCore(s)
          ? "The core was in the pack. The clock does not check pockets."
          : s.flags.coreFate === "sold"
            ? "The fix had already been sold. Pebble's receipt outlived the bunker."
            : "Whatever the core was doing, it was not this.");
    } else if (s.ending === "sold") {
      title = "FILE CLOSED — RECEIPT";
      body =
        "Pebble paid for the core and wrapped it like meat." +
        slow +
        " " +
        n +
        " walked away from the number on the gauge. Bunker 7 did not get a copy of the receipt. The camp drank, briefly, to nobody in particular.";
    } else if (s.ending === "kept") {
      title = "FILE CLOSED — PRIVATE AIR";
      body =
        n +
        " kept the core and stopped saying the word bunker out loud." +
        slow +
        " Eighty people underground finished their argument with the dust. The tin hummed in the pack like a second heart that would not share.";
    } else {
      body = n + " stopped. The ash did not.";
    }

    var extra = "";
    if (s.flags.silentVisited && (s.ending === "stay" || s.ending === "broker")) {
      extra = " They never opened Bunker 7's vents. Bunker 4's mistake stayed buried with the smiles.";
    } else if (s.flags.silentVisited && s.ending === "choke") {
      extra = " They had seen a bunker die of a bad idea, and then they were late to their own.";
    }
    if (s.flags.towerFixed && s.flags.toldTicRadio) {
      extra += " Tic still taps Juniper on his knee, softer now.";
    }

    return {
      title: title,
      body: body + extra,
      foot: silt + " " + joss + " The ledger marks them " + k + ".",
      meta: n + "  ·  day " + days + "  ·  " + k + "  ·  level " + s.level,
    };
  };

  Ash.choose = function (index) {
    var s = Ash.state;
    if (s.screen !== "play" || s.modal || s.dead || s.ending) return;
    var list = Ash.choiceList();
    var c = list[index];
    if (!c) return;
    s.note = "";
    s.checkNote = "";

    function goDest(dest) {
      if (!dest) return;
      if (dest === "@hub") Ash.goto(Ash.hubFor(s.location));
      else if (dest === "@arrive") {
        if (s.travel && s.travel.to) Ash.arrive(s.travel.to);
      } else Ash.goto(dest);
    }

    if (c.check) {
      var chance = Ash.chanceOf(c.check, s);
      var roll = Ash.d100();
      var success = roll <= chance;
      if (Ash.debug && Ash.debug.alwaysPass) success = true;
      if (Ash.debug && Ash.debug.alwaysFail) success = false;
      if (c.check.skill === "barter") s.flags.marginaliaUsed = true;
      var jossBit = "";
      if (c.check.joss && s.joss.following && s.joss.alive && !s.joss.parted) {
        jossBit = Ash.hasPerk("softVoice", s)
          ? " Joss adds a blunt end. It only knocks the fine print."
          : " Joss talks over the soft part. The room hears her first.";
      }
      var nm = c.check.name || Ash.SKILLS[c.check.skill].name;
      s.checkNote = nm + (success ? " holds" : " slips") + " (" + roll + " vs " + chance + ")." + jossBit;
      if (c.fx) {
        var stop = c.fx(s, success);
        if (stop === "stop" || s.dead || s.ending) return;
      }
      if (success && c.successCombat) {
        Ash.combat.start(typeof c.successCombat === "function" ? c.successCombat(s) : c.successCombat);
        return;
      }
      if (!success && c.failureCombat) {
        Ash.combat.start(typeof c.failureCombat === "function" ? c.failureCombat(s) : c.failureCombat);
        return;
      }
      goDest(success ? c.success || c.goto : c.failure || c.goto);
      return;
    }

    if (c.fx) {
      var stop2 = c.fx(s, true);
      if (stop2 === "stop" || s.dead || s.ending) return;
    }
    if (c.combat) {
      var spec = typeof c.combat === "function" ? c.combat(s) : c.combat;
      Ash.combat.start(spec);
      return;
    }
    if (c.travel) {
      Ash.travel(c.travel);
      return;
    }
    if (c.ending) {
      Ash.ending(c.ending);
      return;
    }
    if (c.shop) {
      s.shop = { vendor: c.shop };
      s.modal = "shop";
      return;
    }
    goDest(c.goto);
  };

  Ash.newGame = function (draft) {
    var s = Ash.defaultState();
    Ash.state = s;
    var name = (draft.name || "").replace(/[^a-zA-Z \-']/g, "").trim();
    s.name = name.slice(0, 16) || "Walker";
    s.tags = (draft.tags || []).slice(0, 3);
    s.typewriter = draft.typewriter !== false;
    s.screen = "play";
    s.location = "bunker";
    Ash.applyBackground(s, draft.background || "tech");
    if (draft.attrs) s.attrs = Object.assign({}, draft.attrs);
    s.hp = Ash.maxHp(s);
    if (s.background === "tech") s.flags.briefed = true;
    s.modal = null;
    Ash.goto("bunker.corridor");
    Ash.save.auto();
  };

  Ash.confirmLevel = function () {
    var s = Ash.state;
    var d = s.levelDraft;
    if (!d) return;
    var spent = 0;
    Object.keys(d.spends).forEach(function (k) {
      spent += d.spends[k] || 0;
    });
    if (spent > s.bankedSkills) return;
    if (s.bankedPerks > 0 && !d.perk) return;
    Object.keys(d.spends).forEach(function (k) {
      s.skillRanks[k] = (s.skillRanks[k] || 0) + (d.spends[k] || 0) * 5;
    });
    s.bankedSkills -= spent;
    if (d.perk) {
      if (s.perks.indexOf(d.perk) === -1) s.perks.push(d.perk);
      s.bankedPerks -= 1;
    }
    s.levelDraft = null;
    s.modal = null;
    s.hp = Math.min(Ash.maxHp(s), s.hp);
    if (s.bankedPerks > 0 || s.bankedSkills > 0) Ash.openLevelUp();
    Ash.save.auto();
  };

  Ash.shopStock = function (vendor) {
    var s = Ash.state;
    var list = (Ash.SHOP[vendor] || []).slice();
    return list.filter(function (id) {
      if (id === "radioTube" && (s.flags.tubesBought || 0) >= 2) return false;
      return !!Ash.ITEMS[id];
    });
  };

  Ash.buyItem = function (id) {
    var s = Ash.state;
    if (!s.shop) return;
    if (Ash.shopStock(s.shop.vendor).indexOf(id) === -1) return;
    var price = Ash.priceOf(id, true, s);
    if (s.scrip < price) {
      s.note = "You don't have the scrip.";
      return;
    }
    if (!Ash.invAdd(id, 1, s)) {
      s.note = "You're carrying too much.";
      return;
    }
    s.scrip -= price;
    s.flags.marginaliaUsed = true;
    if (id === "radioTube") s.flags.tubesBought = (s.flags.tubesBought || 0) + 1;
    s.note = "You buy the " + Ash.ITEMS[id].name + " for " + price + " scrip.";
  };

  Ash.sellItem = function (id) {
    var s = Ash.state;
    var item = Ash.ITEMS[id];
    if (!item || item.kind === "quest") {
      s.note = "That's not for sale.";
      return;
    }
    if (!Ash.invCount(id, s)) return;
    var price = Ash.priceOf(id, false, s);
    Ash.invRemove(id, 1, s);
    s.scrip += price;
    s.flags.marginaliaUsed = true;
    s.note = "You sell the " + item.name + " for " + price + " scrip.";
  };

  Ash.safeToRest = function (s) {
    s = s || Ash.state;
    if (s.location === "reed") return !s.flags.reedHostile && !s.flags.reedDead;
    if (s.location === "coil") return !!s.flags.coilCleared;
    return ["bunker", "hatch", "silt", "tower"].indexOf(s.location) !== -1;
  };
})();
