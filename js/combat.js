/* Turn-based combat. The player acts, then Joss, then the other side. */
(function () {
  "use strict";
  var Ash = (window.Ash = window.Ash || {});

  function rng() {
    return Ash.roll();
  }
  function d100() {
    return Ash.d100();
  }

  function cloneEnemy(id, idx) {
    var proto = Ash.ENEMIES[id];
    if (!proto) throw new Error("unknown enemy " + id);
    var e = JSON.parse(JSON.stringify(proto));
    e.key = id + "#" + idx;
    e.id = id;
    e.maxHp = e.hp;
    e.armDebuff = 0;
    e.legDebuff = 0;
    return e;
  }

  Ash.combat = {
    start: function (opts) {
      var s = Ash.state;
      if (s.dead || s.ending) return;
      Ash.save.auto();
      var list = opts.enemies || [];
      s.combat = {
        enemies: list.map(cloneEnemy),
        log: [opts.intro || "The ash thins, and something decides you are edible."],
        ap: Ash.maxAp(s) + (Ash.hasPerk("hatch", s) ? 2 : 0),
        maxAp: Ash.maxAp(s),
        round: 1,
        aimOpen: false,
        itemOpen: false,
        talkUsed: false,
        talk: opts.talk || null,
        then: opts.then || null,
        fleeTo: opts.fleeTo || null,
        thenTravel: !!opts.thenTravel,
        onWin: opts.onWin || null,
        onFlee: opts.onFlee || null,
        xp: list.reduce(function (sum, id) {
          return sum + ((Ash.ENEMIES[id] && Ash.ENEMIES[id].xp) || 0);
        }, 0),
        defending: false,
      };
      if (s.joss.hp == null) s.joss.hp = s.joss.maxHp;
      s.modal = "combat";
      s.defending = false;
    },

    living: function () {
      var c = Ash.state.combat;
      if (!c) return [];
      return c.enemies.filter(function (e) {
        return e.hp > 0;
      });
    },

    log: function (line) {
      var c = Ash.state.combat;
      if (!c) return;
      c.log.push(line);
      if (c.log.length > 16) c.log.splice(0, c.log.length - 16);
    },

    weapon: function () {
      var s = Ash.state;
      var id = s.equip.weapon;
      var item = id && Ash.ITEMS[id];
      if (item && item.kind === "weapon" && (!item.ammo || Ash.invCount(item.ammo, s) > 0)) {
        return { id: id, item: item };
      }
      var melee = ["coilWhip", "tireIron", "glassShiv"].filter(function (k) {
        return Ash.invCount(k, s) > 0 && Ash.ITEMS[k] && !Ash.ITEMS[k].ammo;
      })[0];
      if (melee) return { id: melee, item: Ash.ITEMS[melee] };
      return {
        id: "unarmed",
        item: { name: "fists", skill: "unarmed", dmg: 4, ap: 3, slot: "melee" },
      };
    },

    attackCost: function (aimed) {
      var cost = Ash.combat.weapon().item.ap || 3;
      if (aimed) cost += 2;
      if (aimed && Ash.hasPerk("splitter")) cost -= 1;
      return Math.max(3, cost);
    },

    strike: function (aimed) {
      var s = Ash.state;
      var c = s.combat;
      if (!c) return;
      var cost = Ash.combat.attackCost(aimed);
      if (c.ap < cost) {
        Ash.combat.log("Not enough AP.");
        return;
      }
      var living = Ash.combat.living();
      if (!living.length) return;
      var target = living[0];
      var w = Ash.combat.weapon();
      c.ap -= cost;
      if (w.item.ammo) {
        if (!Ash.invCount(w.item.ammo, s)) {
          Ash.combat.log("The " + w.item.name + " clicks. It is hungry.");
          Ash.combat.afterAction();
          return;
        }
        Ash.invRemove(w.item.ammo, 1, s);
      }
      var skill = Ash.skillValue(w.item.skill || "unarmed", s);
      var dodge = Math.max(0, (target.dodge || 0) - (target.legDebuff || 0));
      var pen = aimed === "head" ? 20 : aimed ? 12 : 0;
      var chance = Ash.clamp(
        38 + Math.floor(skill * 0.5) + s.attrs.per * 2 + (s.attrs.lck - 5) * 2 - dodge - pen,
        8,
        95
      );
      if (Ash.debug && Ash.debug.playerAlwaysHits) chance = 100;
      var roll = d100();
      var where = aimed ? " at the " + aimed : "";
      if (roll > chance) {
        Ash.combat.log("You miss the " + target.name + where + ". (" + roll + " / " + chance + ")");
        Ash.combat.afterAction();
        return;
      }
      var dmg = (w.item.dmg || 3) + Math.floor(skill / 18) + Math.floor(rng() * 3);
      if (aimed === "head") dmg += 5;
      if ((w.item.slot === "melee" || w.id === "unarmed") && Ash.hasPerk("meanElbow")) dmg += 2;
      if (d100() <= s.attrs.lck * 2 + (aimed === "head" ? 8 : 0)) {
        dmg = Math.floor(dmg * 1.5);
        Ash.combat.log("Luck puts an edge on it.");
      }
      var dt = Math.max(0, (target.dt || 0) - (w.item.dtIgnore || 0));
      var dealt = dmg > dt ? Math.max(1, dmg - dt) : 0;
      target.hp -= dealt;
      Ash.combat.log(
        dealt > 0
          ? "You hit the " + target.name + where + " for " + dealt + "."
          : "You connect, and the hide shrugs it off."
      );
      if (w.item.radSelf) Ash.addRads(w.item.radSelf, s);
      if (w.item.radOnHit && dealt > 0) Ash.combat.log("Crater-light crawls into the cut.");
      if (aimed === "arm" && dealt > 0 && d100() <= 60) {
        target.armDebuff += 3;
        Ash.combat.log("The arm goes dull. Their next swings will be poorer.");
      }
      if (aimed === "leg" && dealt > 0 && d100() <= 60) {
        target.legDebuff += 14;
        Ash.combat.log("The leg folds. Running just became a story.");
      }
      if (target.hp <= 0) {
        target.hp = 0;
        Ash.combat.log(target.name + " goes down.");
      }
      if (!s.dead) Ash.combat.afterAction();
    },

    useItem: function (id) {
      var c = Ash.state.combat;
      if (!c) return;
      if (c.ap < 2) {
        Ash.combat.log("Not enough AP.");
        return;
      }
      var msg = Ash.useConsumable(id);
      if (/don't|doesn't/.test(msg)) {
        Ash.combat.log(msg);
        return;
      }
      c.ap -= 2;
      c.itemOpen = false;
      Ash.combat.log(msg);
      Ash.combat.afterAction();
    },

    defend: function () {
      var s = Ash.state;
      var c = s.combat;
      if (!c) return;
      if (c.ap < 2) {
        Ash.combat.log("Not enough AP.");
        return;
      }
      c.ap -= 2;
      c.defending = true;
      s.defending = true;
      Ash.combat.log("You set your weight and let the kit earn its keep.");
      Ash.combat.afterAction();
    },

    talk: function () {
      var s = Ash.state;
      var c = s.combat;
      if (!c || !c.talk || c.talkUsed) return;
      if (c.ap < 3) {
        Ash.combat.log("Not enough AP.");
        return;
      }
      c.ap -= 3;
      c.talkUsed = true;
      var t = c.talk;
      if (t.impossible) {
        Ash.combat.log(t.fail || "It doesn't have a language. It has a mouth.");
        var foe = Ash.combat.living()[0];
        if (foe) Ash.combat.bite(foe, true);
        if (!s.dead) Ash.combat.afterAction();
        return;
      }
      var skill = Ash.skillValue(t.skill || "speech", s);
      var mod = typeof t.mod === "function" ? t.mod(s) : t.mod || 0;
      var chance = Ash.clamp(skill + mod + (s.attrs.lck - 5) * 2, 5, 95);
      if (Ash.debug && (Ash.debug.alwaysTalk || Ash.debug.alwaysPass)) chance = 100;
      var roll = d100();
      if (roll <= chance) {
        Ash.combat.log((t.success || "They want out of this more than you do.") + " (" + roll + " under " + chance + ")");
        c.enemies.forEach(function (e) {
          e.hp = 0;
          e.ran = true;
        });
        Ash.combat.finish("talk");
      } else {
        Ash.combat.log((t.fail || "The words hit the ground.") + " (" + roll + " over " + chance + ")");
        if (t.failDamage) {
          var foe2 = Ash.combat.living()[0];
          if (foe2) Ash.combat.bite(foe2, true);
        }
        if (!s.dead) Ash.combat.afterAction();
      }
    },

    flee: function () {
      var s = Ash.state;
      var c = s.combat;
      if (!c) return;
      if (c.ap < 4) {
        Ash.combat.log("Not enough AP to break off.");
        return;
      }
      c.ap -= 4;
      var living = Ash.combat.living();
      var pressure = living.length * 8;
      living.forEach(function (e) {
        if (e.legDebuff) pressure -= 6;
      });
      var chance = Ash.clamp(30 + s.attrs.agi * 3 + Math.floor(Ash.skillValue("sneak", s) / 4) - pressure, 8, 92);
      if (Ash.debug && Ash.debug.alwaysFlee) chance = 100;
      var roll = d100();
      if (roll <= chance) {
        Ash.combat.log("You get clear. (" + roll + " under " + chance + ")");
        Ash.combat.finish("flee");
      } else {
        Ash.combat.log("You don't. (" + roll + " over " + chance + ") They spend the gap on you.");
        Ash.combat.enemyPhase(true);
      }
    },

    endTurn: function () {
      if (!Ash.state.combat) return;
      Ash.state.combat.ap = 0;
      Ash.combat.afterAction();
    },

    afterAction: function () {
      var s = Ash.state;
      if (s.dead) {
        s.combat = null;
        s.defending = false;
        return;
      }
      if (!s.combat) return;
      if (!Ash.combat.living().length) {
        Ash.combat.finish("win");
        return;
      }
      if (s.combat.ap < 2) Ash.combat.enemyPhase(false);
    },

    jossAct: function () {
      var s = Ash.state;
      if (!s.joss.recruited || !s.joss.following || !s.joss.alive || s.joss.hp <= 0) return;
      var living = Ash.combat.living();
      if (!living.length) return;
      var target = living[0];
      var chance = 68;
      if (Ash.debug && Ash.debug.jossMiss) chance = 0;
      if (d100() > chance) {
        Ash.combat.log("Joss fires and punches a hole in the weather.");
        return;
      }
      var dmg = 9 + Math.floor(rng() * 4);
      var dealt = dmg > (target.dt || 0) ? dmg - (target.dt || 0) : 0;
      target.hp -= dealt;
      Ash.combat.log("Joss puts " + dealt + " into the " + target.name + ".");
      if (target.hp <= 0) {
        target.hp = 0;
        Ash.combat.log(target.name + " goes down.");
      }
    },

    bite: function (e, angry) {
      var s = Ash.state;
      var hit = Ash.clamp(e.hit - Math.floor(s.attrs.agi * 1.5) - (s.defending ? 12 : 0), 8, 94);
      if (Ash.debug && Ash.debug.enemyAlwaysMisses) hit = 0;
      if (Ash.debug && Ash.debug.enemyAlwaysHits) hit = 100;
      if (d100() > hit) {
        Ash.combat.log(e.name + (angry ? " lunges and " : " ") + "misses.");
        return;
      }
      var raw = Math.max(1, e.dmg - (e.armDebuff || 0) + Math.floor(rng() * 3) - 1);
      var dt = Ash.dt(s);
      var dealt = raw > dt ? Math.max(1, raw - dt) : 0;
      if (dealt <= 0) Ash.combat.log(e.name + " hits your kit and gets a noise for it.");
      else {
        Ash.hurt(dealt, s);
        if (Ash.state.combat) Ash.combat.log(e.name + " hits you for " + dealt + ".");
      }
      if (!s.dead && e.radOnHit && dealt > 0) {
        var rad = e.radOnHit;
        if (Ash.hasPerk("craterPrayer")) rad = Math.ceil(rad * 0.55);
        Ash.addRads(rad, s);
        if (Ash.state.combat && !s.dead) Ash.combat.log("Glow sticks to your skin. Rads " + s.rads + ".");
      }
    },

    enemyPhase: function (punish) {
      var s = Ash.state;
      var c = s.combat;
      if (!c || s.dead) return;
      if (!punish) Ash.combat.jossAct();
      if (!Ash.combat.living().length) {
        Ash.combat.finish("win");
        return;
      }
      Ash.combat.living().forEach(function (e) {
        if (s.dead || !s.combat) return;
        var fleeAt = e.fleeAt == null ? 0.2 : e.fleeAt;
        if (fleeAt > 0 && e.hp <= e.maxHp * fleeAt && !e.legDebuff && rng() < 0.45) {
          e.hp = 0;
          e.ran = true;
          Ash.combat.log(e.name + " has had enough and runs.");
          return;
        }
        var jossUp = s.joss.recruited && s.joss.following && s.joss.alive && s.joss.hp > 0;
        if (jossUp && rng() < 0.38) {
          var jhit = Ash.clamp(e.hit - 8, 10, 90);
          if (Ash.debug && Ash.debug.enemyAlwaysMisses) jhit = 0;
          if (Ash.debug && Ash.debug.enemyAlwaysHits) jhit = 100;
          if (d100() <= jhit) {
            var dealt = Math.max(1, e.dmg - 1);
            s.joss.hp -= dealt;
            Ash.combat.log(e.name + " rakes Joss for " + dealt + ".");
            if (s.joss.hp <= 0) {
              s.joss.hp = 0;
              s.joss.alive = false;
              s.joss.following = false;
              Ash.combat.log("Joss drops and does not get up.");
            }
          } else Ash.combat.log(e.name + " snaps at Joss and gets dust.");
        } else Ash.combat.bite(e, false);
      });
      if (s.dead) {
        s.combat = null;
        s.defending = false;
        return;
      }
      if (!s.combat) return;
      if (!Ash.combat.living().length) {
        Ash.combat.finish("win");
        return;
      }
      c.defending = false;
      s.defending = false;
      c.round += 1;
      c.ap = Ash.maxAp(s);
      c.aimOpen = false;
      c.itemOpen = false;
    },

    finish: function (how) {
      var s = Ash.state;
      var c = s.combat;
      if (!c) return;
      var then = c.then;
      var fleeTo = c.fleeTo;
      var thenTravel = c.thenTravel;
      var onWin = c.onWin;
      var onFlee = c.onFlee;
      var xp = c.xp || 0;
      var defeated = c.enemies.filter(function (e) {
        return e.hp <= 0 && !e.ran;
      });
      s.combat = null;
      s.modal = null;
      s.defending = false;

      if (how === "flee") {
        if (onFlee) onFlee(s);
        s.note = "You break contact. The road keeps the time it already charged.";
        if (thenTravel) {
          s.location = (s.travel && s.travel.from) || s.location;
          s.node = Ash.hubFor(s.location);
          s.travel = null;
        } else if (fleeTo) {
          var prefix = String(fleeTo).split(".")[0];
          if (Ash.LOCATIONS[prefix]) s.location = prefix;
          Ash.goto(fleeTo);
        }
        return;
      }

      if (how === "talk") xp = Math.max(10, Math.floor(xp * 0.5));
      else {
        var scrip = 0;
        var left = [];
        defeated.forEach(function (e) {
          scrip += e.scrip || 0;
          (e.loot || []).forEach(function (drop) {
            if (!Ash.tryLoot(drop.id, drop.n || 1, s)) {
              left.push((Ash.ITEMS[drop.id] && Ash.ITEMS[drop.id].name) || drop.id);
            }
          });
        });
        var bits = [];
        if (scrip) {
          s.scrip += scrip;
          bits.push("You lift " + scrip + " scrip off the quiet.");
        }
        if (left.length) bits.push("No room for " + left.join(", ") + ". Left on the ground.");
        if (bits.length) s.note = bits.join(" ");
      }
      if (onWin) onWin(s, { talk: how === "talk" });
      if (s.joss && s.joss.recruited && s.joss.following && s.joss.alive && !s.joss.parted && Ash.bumpJoss) {
        Ash.bumpJoss(how === "talk" ? 3 : 5, s);
      }
      if (xp) Ash.xpAward(xp, s);
      if ((s.bankedSkills > 0 || s.bankedPerks > 0) && !s.modal) Ash.openLevelUp();
      if (s.dead || s.ending) return;
      if (thenTravel) {
        if (s.travel && s.travel.to) Ash.arrive(s.travel.to);
        return;
      }
      if (then) Ash.goto(then);
    },
  };
})();
