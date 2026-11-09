/* Tower, ridge, Coil, crater, and the road between. */
(function () {
  "use strict";
  var Ash = window.Ash;
  function N(id, node) {
    Ash.nodes[id] = node;
  }
  function join(parts) {
    return parts.filter(Boolean).join("\n\n");
  }
  function keepWalking() {
    return {
      label: "Keep walking.",
      fx: function (s) {
        if (s.travel && s.travel.to) {
          Ash.arrive(s.travel.to);
          return "stop";
        }
        Ash.goto(Ash.hubFor(s.location));
      },
    };
  }

  N("tower.base", {
    hub: true,
    scene: "tower",
    onEnter: function (s) {
      Ash.markJoss(s);
    },
    text: function (s) {
      var mast = s.flags.towerFixed
        ? "The mast ticks. Somebody, somewhere, could still be not answering."
        : "The mast above the shack is a ladder of rust and intention. The socket at its throat is empty.";
      return join([
        "The tower stands on a rise that gets more wind than news. Guy wires sing if you let them. A shack at the base still holds a mug nobody washed.",
        mast,
        s._jossLine,
        Ash.lungsWhisper(s),
      ]);
    },
    choices: function () {
      return [
        { label: "Climb to the mast.", goto: "tower.mast" },
        { label: "Search the shack.", goto: "tower.shack" },
      ];
    },
  });

  N("tower.shack", {
    scene: "tower",
    text: function (s) {
      if (s.flags.shackLooted) return "The mug is still here. The interesting things aren't. A tech lived in this room long enough to own a stain and not long enough to own a plan.";
      return "A cot, a mug, a tin of screws that aren't the right screws. Under the cot, an iodine chew in a paper fold and a note: GONE TO SEE ABOUT THE GLOW. DON'T WAIT UP. The handwriting got worse as it went.";
    },
    choices: function (s) {
      var c = [];
      if (!s.flags.shackLooted) {
        c.push({
          label: "Take the chew. Leave the note.",
          fx: function (st) {
            st.flags.shackLooted = true;
            if (!Ash.invAdd("iodine", 1, st)) Ash.groundAdd("tower", "iodine", 1, st);
            st.note = "The note stays. You are not the person it was for.";
          },
          goto: "tower.base",
        });
      }
      c.push({ label: "Back out.", goto: "tower.base" });
      return c;
    },
  });

  N("tower.mast", {
    scene: "tower",
    text: function (s) {
      if (s.flags.towerFixed) {
        return "The broadcast is still in the metal if you put your ear to the right bolt. Juniper, running out of air on purpose and by accident. East of here the signal died. You could walk toward the quiet.";
      }
      if (!Ash.invCount("radioTube", s)) {
        return "The socket is a mouth with no tooth. Pebble calls a radio tube a paperweight and prices it like one. The wrecks on Scrap Ridge still have dashboards, if the hogs haven't edited them.";
      }
      return "You have the bulb. The socket has the hunger. Wind tries to take the glass out of your fingers, and for a second you let it think it might win.";
    },
    choices: function (s) {
      var c = [];
      if (!s.flags.towerFixed && Ash.invCount("radioTube", s)) {
        c.push({
          label: "Seat the tube.",
          check: { skill: "repair", name: "Repair", mod: -5 },
          fx: function (st, ok) {
            Ash.invRemove("radioTube", 1, st);
            if (!ok) {
              Ash.hurt(2, st);
              return;
            }
            st.flags.towerFixed = true;
            st.flags.knowSilent = true;
            Ash.learn("silent", st);
            Ash.xpAward(70, st);
          },
          success: "tower.fixed",
          failure: "tower.fail",
        });
      }
      if (s.flags.towerFixed) {
        c.push({ label: "Listen again.", goto: "tower.fixed" });
        c.push({ label: "Walk east, toward the quiet bunker.", travel: "silent" });
      }
      c.push({ label: "Climb down.", goto: "tower.base" });
      return c;
    },
  });

  N("tower.fixed", {
    scene: "tower",
    text: "The mast coughs, then speaks in a woman's voice sanded down by distance.\n\n\"This is Hollow Meridian. Bunker 4. The core seated wrong. We opened the vents to the glow because the overseer said the crater was a lung. People walked out smiling. If you are 7, do not open the vents. Juniper out.\"\n\nThe name stops halfway through being alive. East, the signal walked and then didn't.",
    choices: [
      {
        label: "Mark the direction. Tell who you choose.",
        fx: function (s) {
          s.flags.towerFixed = true;
          s.flags.knowSilent = true;
          Ash.learn("silent", s);
        },
        goto: "tower.base",
      },
    ],
  });

  N("tower.fail", {
    scene: "tower",
    text: "The bulb sighs and goes white in your hand. A curl of glass finds skin. The socket is empty again, and smug about it. You will need another tooth.",
    choices: [{ label: "Climb down cursing quietly.", goto: "tower.base" }],
  });

  N("silent.door", {
    hub: true,
    scene: "silent",
    onEnter: function (s) {
      Ash.markJoss(s);
      if (!s.flags.silentXp) {
        s.flags.silentXp = true;
        s.flags.silentVisited = true;
        Ash.xpAward(40, s);
      }
    },
    text: function (s) {
      return join([
        "Bunker 4's hatch is open and wrong. The air that comes out is cold and sweet, like a fruit that turned. One light still burns down the throat of the stair, the color of a tooth in milk. Nobody is singing. The smiles, if they happened, happened outside.",
        s._jossLine,
        Ash.lungsWhisper(s),
      ]);
    },
    choices: function () {
      return [
        { label: "The overseer's logs.", goto: "silent.logs" },
        { label: "The infirmary.", goto: "silent.infirmary" },
        { label: "The common room.", goto: "silent.common" },
      ];
    },
  });

  N("silent.logs", {
    scene: "silent",
    text: function (s) {
      var seal = s.flags.tookSeal
        ? "The desk drawer is empty of the seal you already took."
        : "In the desk drawer, an overseer's seal: a circle broken by a crack. The metal stays cold.";
      return (
        "The log is tidy until it isn't.\n\nDay 12: core seated. Gauge sulks.\nDay 13: seated it again, the other way. The housing sang.\nDay 14: overseer opened the vents toward the crater. Said the glow was a second lung. People queued like it was laundry.\nDay 15: they walked out smiling. I stayed to write this. The backup core was on the truck. The truck never came.\n\n" +
        seal
      );
    },
    choices: function (s) {
      var c = [];
      if (!s.flags.tookSeal) {
        c.push({
          label: "Take the seal.",
          fx: function (st) {
            st.flags.tookSeal = true;
            Ash.invAdd("overseerSeal", 1, st);
            st.flags.knowTruck = true;
            Ash.xpAward(15, st);
          },
          goto: "silent.door",
        });
      }
      c.push({
        label: "Burn the log.",
        if: function (st) {
          return !st.flags.burnedLog;
        },
        fx: function (st) {
          st.flags.burnedLog = true;
          Ash.shiftKarma(-6, st);
          st.note = "The pages take the flame personally. Juniper's name goes last. You are not sure you improved the room.";
        },
        goto: "silent.door",
      });
      c.push({ label: "Leave the desk.", goto: "silent.door" });
      return c;
    },
  });

  N("silent.infirmary", {
    scene: "silent",
    text: function (s) {
      if (s.flags.silentLooted) return "The sheet is still polite. You already took what the room was willing to give. The rest is rust and a smell like pennies.";
      return "Cots, a sheet pulled up with care, and a cabinet that still locks out of habit. Iodine. A medkit with the good scissors gone. Scrip in a tin labeled FOR THE TRIP HOME. The sheet does not need you.";
    },
    choices: function (s) {
      var c = [];
      if (!s.flags.silentLooted) {
        c.push({
          label: "Take the supplies. Leave the sheet.",
          fx: function (st) {
            st.flags.silentLooted = true;
            Ash.shiftKarma(2, st);
            st.scrip += 34;
            if (!Ash.invAdd("iodine", 1, st)) Ash.groundAdd("silent", "iodine", 1, st);
            if (!Ash.invAdd("iodine", 1, st)) Ash.groundAdd("silent", "iodine", 1, st);
            if (!Ash.invAdd("medkit", 1, st)) Ash.groundAdd("silent", "medkit", 1, st);
            if (!Ash.tryLoot("riotFragments", 1, st)) {
              st.note = "The riot plates are too heavy. They stay with the quiet.";
            }
          },
          goto: "silent.door",
        });
        c.push({
          label: "Search the body too.",
          fx: function (st) {
            st.flags.silentLooted = true;
            Ash.shiftKarma(-4, st);
            st.scrip += 40;
            if (!Ash.invAdd("pistolRounds", 1, st)) Ash.groundAdd("silent", "pistolRounds", 1, st);
            if (!Ash.invAdd("medkit", 1, st)) Ash.groundAdd("silent", "medkit", 1, st);
            st.note = "You find rounds and a worse feeling. The sheet goes back. It doesn't forgive the hands.";
          },
          goto: "silent.door",
        });
      }
      c.push({ label: "Back to the stair.", goto: "silent.door" });
      return c;
    },
  });

  N("silent.common", {
    scene: "silent",
    text: "Tables still set for a meal that became a procession. At the far vent, light the wrong color breathes in and out. Moths — or what moths became — tick against the grille, patient as dust.",
    choices: [
      {
        label: "Shut the vent without cracking it.",
        check: { skill: "science", name: "Science", mod: -5 },
        success: "silent.ventOk",
        failure: "silent.ventFail",
      },
      {
        label: "Sneak the side locker and leave the vent alone.",
        check: { skill: "sneak", name: "Sneak", mod: 0 },
        success: "silent.lockerOk",
        failure: "silent.ventFail",
      },
      { label: "Leave the moths their room.", goto: "silent.door" },
    ],
  });

  N("silent.ventOk", {
    scene: "silent",
    text: "You seat the grille the way the schematic wanted, not the way the overseer did. The glow thins. The moths lose interest and sift back into the dark like a decision reversing. The room becomes a room.",
    choices: [
      {
        label: "Take the quiet as a win.",
        fx: function (s) {
          s.flags.ventShut = true;
          Ash.xpAward(25, s);
          Ash.shiftKarma(3, s);
        },
        goto: "silent.door",
      },
    ],
  });

  N("silent.lockerOk", {
    scene: "silent",
    text: "The locker gives scatter shells and a note in a steady hand: TRUCK HIT EAST OF THE RIDGE. CABLE PEOPLE. DO NOT SMILE AT THE LIGHT. You leave the vent ticking. Some doors you close. Some you just don't open.",
    choices: [
      {
        label: "Pocket the shells.",
        fx: function (s) {
          s.flags.knowTruck = true;
          if (!Ash.invAdd("scatterShells", 1, s)) Ash.groundAdd("silent", "scatterShells", 1, s);
          Ash.learn("coil", s);
          Ash.xpAward(15, s);
        },
        goto: "silent.door",
      },
    ],
  });

  N("silent.ventFail", {
    scene: "silent",
    text: "The grille squeals. Glow pours in thicker, and the moths come with it, delighted. They have been waiting for a draft and a pulse.",
    choices: [
      {
        label: "Fight them off.",
        combat: {
          enemies: ["moths", "moths"],
          then: "silent.door",
          fleeTo: "tower.base",
          intro: "They are not heavy. They are bright, and brightness gets into the lungs.",
          onWin: function (s) {
            s.flags.ventShut = true;
            Ash.addRads(6, s);
          },
        },
      },
    ],
  });

  N("scrap.ridge", {
    hub: true,
    scene: "scrap",
    onEnter: function (s) {
      Ash.markJoss(s);
    },
    text: function (s) {
      return join([
        "Scrap Ridge is a traffic jam that lost the century. Cars kneel into the hill. A supply van still has a stencil that used to be a promise. Downwind, the grit-hog wallow smells like a coin rubbed on meat.",
        s._jossLine,
        Ash.lungsWhisper(s),
      ]);
    },
    choices: function (s) {
      var c = [
        { label: "Search the supply van.", goto: "scrap.wreck" },
        { label: "The grit-hog wallow.", goto: "scrap.wallow" },
        { label: "Glass the horizon.", goto: "scrap.view" },
      ];
      return c;
    },
  });

  N("scrap.wreck", {
    scene: "scrap",
    text: function (s) {
      if (s.flags.wreckLooted) return "You already pulled the van's teeth. The stencil keeps lying about delivery windows.";
      return "The side door complains and then remembers how. Inside: a radio tube nested in a sock, two tins of peach, a scatter of rounds, and eighteen scrip in a driver's envelope. The driver is not here to argue about privacy.";
    },
    choices: function (s) {
      if (s.flags.wreckLooted) return [{ label: "Shut the door.", goto: "scrap.ridge" }];
      return [
        {
          label: "Take it. Check the dash for anything mean.",
          check: { skill: "survival", name: "Survival", mod: 0 },
          fx: function (st) {
            st.flags.wreckLooted = true;
            st.scrip += 18;
            if (!Ash.invAdd("radioTube", 1, st)) Ash.groundAdd("scrap", "radioTube", 1, st);
            if (!Ash.invAdd("cannedPeach", 1, st)) Ash.groundAdd("scrap", "cannedPeach", 1, st);
            if (!Ash.invAdd("cannedPeach", 1, st)) Ash.groundAdd("scrap", "cannedPeach", 1, st);
            if (!Ash.invAdd("rifleRounds", 1, st)) Ash.groundAdd("scrap", "rifleRounds", 1, st);
            if (!Ash.invAdd("pistolRounds", 1, st)) Ash.groundAdd("scrap", "pistolRounds", 1, st);
            Ash.xpAward(20, st);
          },
          success: "scrap.wreckOk",
          failure: "scrap.wreckCut",
        },
      ];
    },
  });

  N("scrap.wreckOk", {
    scene: "scrap",
    text: "Your hand finds an iodine chew the crash tried to hide, and doesn't find a sharp. The ridge can keep its rust. You have the tooth for the tower.",
    choices: [
      {
        label: "Pocket the chew.",
        fx: function (s) {
          if (!Ash.invAdd("iodine", 1, s)) Ash.groundAdd("scrap", "iodine", 1, s);
        },
        goto: "scrap.ridge",
      },
    ],
  });

  N("scrap.wreckCut", {
    scene: "scrap",
    text: "A dash bracket takes a toll from your palm on the way out. You still got the tube, the peaches, the rounds, the scrip. The van got a little of you. Fair, by ridge rules.",
    choices: [
      {
        label: "Bind it and go.",
        fx: function (s) {
          Ash.hurt(3, s);
        },
        goto: "scrap.ridge",
      },
    ],
  });

  N("scrap.wallow", {
    scene: "scrap",
    text: function (s) {
      if (s.day < (s.flags.wallowDay || -9) + 2) return "The wallow is a smell with no tenant. Give it a day. Grit-hogs are punctual about being awful.";
      return "The mud moves when you don't. A grit-hog is in it, low and plated, minding a gland you would rather it kept and Nim would rather it didn't.";
    },
    choices: function (s) {
      if (s.day < (s.flags.wallowDay || -9) + 2) return [{ label: "Leave the smell.", goto: "scrap.ridge" }];
      return [
        {
          label: "Hunt it.",
          combat: {
            enemies: ["gritHog"],
            then: "scrap.ridge",
            fleeTo: "scrap.ridge",
            intro: "The hog comes out of the mud already offended.",
            talk: {
              impossible: true,
              fail: "You make the noise people make at animals. It makes the noise animals make at meat.",
              failDamage: true,
            },
            onWin: function (st) {
              st.flags.wallowDay = st.day;
            },
          },
        },
        { label: "Not this hog.", goto: "scrap.ridge" },
      ];
    },
  });

  N("scrap.view", {
    scene: "scrap",
    text: "From the spine of the ridge you can see Silt's canvas, a thread of smoke where cable-people camp, and — if you let your eyes hurt — a bowl of glow south of honest ground. The Coil truck, if it's real, is under that smoke. The Choir is under that glow.",
    choices: [
      {
        label: "Mark both.",
        check: { skill: "survival", name: "Survival", mod: 10 },
        fx: function (st, ok) {
          Ash.learn("coil", st);
          Ash.learn("crater", st);
          st.flags.ridgeSeen = true;
          if (!ok) Ash.addRads(4, st);
        },
        success: "scrap.viewOk",
        failure: "scrap.viewOk",
      },
    ],
  });

  N("scrap.viewOk", {
    scene: "scrap",
    text: "You have the directions in your head where a map would be, if anyone had paper they trusted. Smoke for the Coil. Glow for the Choir. Neither is a welcome.",
    choices: [{ label: "Climb down.", goto: "scrap.ridge" }],
  });

  N("coil.approach", {
    hub: true,
    scene: "coil",
    onEnter: function (s) {
      Ash.markJoss(s);
    },
    text: function (s) {
      return join([
        "Two figures on a spool of cable, rifles across their knees, watching the ridge like it might apologize. This is the sightline Joss meant. They have not seen you yet. That is a temporary condition.",
        s._jossLine,
        Ash.lungsWhisper(s),
      ]);
    },
    choices: function (s) {
      return [
        {
          label: "Fight the lookout.",
          combat: {
            enemies: ["coilLookout", "coilLookout"],
            then: "coil.lookoutDone",
            fleeTo: "silt.square",
            intro: "The spool isn't cover once they stand up.",
            talk: {
              skill: "speech",
              mod: -8,
              success: "They do the math on your face and decide the ridge can watch itself. They go.",
              fail: "One of them knew Joss. That's not a point in your favor. The rifles come up.",
              failDamage: true,
            },
            onWin: function (st, info) {
              st.flags.lookoutCleared = true;
            if (Ash.bumpJoss) Ash.bumpJoss(16, st);
              if (info && info.talk) Ash.xpAward(20, st);
              Ash.shiftRep("coil", -8, st);
            },
          },
        },
        {
          label: "Sneak past them into the camp.",
          check: {
            skill: "sneak",
            name: "Sneak",
            mod: function (st) {
              return st.flags.reedWarned ? 12 : -5;
            },
          },
          success: "coil.camp",
          failureCombat: {
            enemies: ["coilLookout", "coilLookout"],
            then: "coil.lookoutDone",
            fleeTo: "silt.square",
            intro: "A stone turns under your boot and the lookout stops being bored.",
            onWin: function (st) {
              st.flags.lookoutCleared = true;
            if (Ash.bumpJoss) Ash.bumpJoss(16, st);
              Ash.shiftRep("coil", -8, st);
            },
          },
        },
        {
          label: "Bribe them. Twenty-five scrip.",
          if: function (st) {
            return st.scrip >= 25;
          },
          fx: function (st) {
            st.scrip -= 25;
            st.flags.lookoutBribed = true;
            st.note = "They take the scrip and the boredom back. Joss wanted them down, not rented. This does not count.";
          },
          goto: "coil.camp",
        },
        { label: "Back off the ridge.", travel: "silt" },
      ];
    },
  });

  N("coil.lookoutDone", {
    scene: "coil",
    text: "The spool is empty of living opinions. The camp is still ahead: a truck, dogs, and somebody who thinks cable is a rank. If Joss was telling the truth, she will know this sightline is closed.",
    choices: [
      {
        label: "Walk in.",
        fx: function (s) {
          s.flags.lookoutCleared = true;
          if (Ash.bumpJoss) Ash.bumpJoss(16, s);
        },
        goto: "coil.camp",
      },
    ],
  });

  N("coil.ambush", {
    scene: "coil",
    text: "They know your outline now. The lookout doesn't ask a question. The rifles do.",
    choices: [
      {
        label: "Fight.",
        combat: {
          enemies: ["coilLookout", "coilRaider"],
          then: "coil.camp",
          fleeTo: "silt.square",
          intro: "The Coil collected a grudge with your name on it.",
          onWin: function (s) {
            s.flags.lookoutCleared = true;
          if (Ash.bumpJoss) Ash.bumpJoss(16, s);
            Ash.shiftRep("coil", -5, s);
          },
        },
      },
      { label: "Get off their road.", travel: "silt" },
    ],
  });

  N("coil.camp", {
    hub: true,
    scene: "coil",
    onEnter: function (s) {
      Ash.markJoss(s);
    },
    text: function (s) {
      if (s.flags.coilCleared || s.flags.haspDead) {
        return join([
          "The fire is ash. The truck's lock is a suggestion. Cable lies where people were. It doesn't look like victory. It looks like a camp that lost an argument.",
          s.flags.truckLooted ? "The green crate is empty." : "The green crate is still in the truck, humming like a secret with a job.",
          s._jossLine,
        ]);
      }
      if (s.flags.coilPact) {
        return "Hasp's people let you through because you promised them a door. The truck stays shut. Collateral, he called it, like a man who learned a word and liked the taste.";
      }
      return join([
        "Coil camp is a truck, a fire, and armor made of the same stuff as the fence. Dogs wear scraps of insulation like collars. Nobody is glad to see you. A few of them are willing to be paid to be neutral.",
        s._jossLine,
        Ash.lungsWhisper(s),
      ]);
    },
    choices: function (s) {
      var c = [];
      if (!s.flags.haspDead) c.push({ label: "Talk to Hasp.", goto: "coil.hasp" });
      c.push({ label: "The supply truck.", goto: "coil.truck" });
      if (!s.flags.dogsDown && !s.flags.coilCleared) c.push({ label: "The dogs.", goto: "coil.dogs" });
      return c;
    },
  });

  N("coil.dogs", {
    scene: "coil",
    text: "Two coil dogs, low and wire-smart, chained to a dead axle. They are not pets. They are a lock with teeth.",
    choices: [
      {
        label: "Cut them loose into someone else's problem? No. Quiet the chain.",
        check: { skill: "sneak", name: "Sneak", mod: -4 },
        fx: function (st, ok) {
          if (ok) st.flags.dogsDown = true;
        },
        success: "coil.dogsOk",
        failureCombat: {
          enemies: ["coilDog", "coilDog"],
          then: "coil.camp",
          fleeTo: "coil.approach",
          intro: "The chain was the polite part.",
          onWin: function (st) {
            st.flags.dogsDown = true;
          },
        },
      },
      {
        label: "Fight the dogs.",
        combat: {
          enemies: ["coilDog", "coilDog"],
          then: "coil.camp",
          fleeTo: "silt.square",
          intro: "They are faster than the chain suggests.",
          onWin: function (st) {
            st.flags.dogsDown = true;
          },
        },
      },
      { label: "Leave them.", goto: "coil.camp" },
    ],
  });

  N("coil.dogsOk", {
    scene: "coil",
    text: "You feed the chain a twist and the dogs get a bowl that isn't you. They forget their job for as long as a dog forgets. The truck will be easier. Nothing here stays easy.",
    choices: [{ label: "Move.", goto: "coil.camp" }],
  });

  N("coil.hasp", {
    scene: "coil",
    speaker: { id: "hasp", name: "Hasp" },
    onEnter: function (s) {
      s.flags.metHasp = true;
    },
    text: function (s) {
      if (s.flags.coilPact) return "Hasp taps cable against cable. \"We walking, or are you becoming a story I tell the dogs?\"";
      var seal = Ash.invCount("overseerSeal", s) ? " His eyes stick to the seal at your belt and recalculate." : "";
      return (
        "Hasp is big the way a knot is big. Cable wraps his chest like rank. \"You want the shiny lung in the truck. I want a door that isn't mine yet.\"" +
        seal +
        " He smiles with no practice."
      );
    },
    choices: function (s) {
      var c = [];
      if (s.flags.coilPact) {
        c.push({
          label: "We walk. The hatch is east.",
          fx: function (st) {
            st.flags.raidMarch = true;
            st.flags.bunkerExposed = true;
            Ash.travel("bunker");
            return "stop";
          },
        });
        c.push({ label: "Not this minute.", goto: "coil.camp" });
        return c;
      }
      var price = s.flags.haspPrice || 150;
      c.push({
        label: "Buy the core. (" + price + " scrip)",
        if: function (st) {
          return st.scrip >= (st.flags.haspPrice || 150) && !Ash.hasCore(st);
        },
        fx: function (st) {
          var p = st.flags.haspPrice || 150;
          st.scrip -= p;
          Ash.takeCore("coil");
          st.flags.truckLooted = true;
          Ash.shiftRep("coil", 6, st);
        },
        goto: "coil.paid",
      });
      if (Ash.invCount("overseerSeal", s) && !s.flags.sealShownHasp) {
        c.push({
          label: "Show him Bunker 4's seal and ask for the crate.",
          check: { skill: "speech", name: "Speech", mod: 8, joss: true },
          fx: function (st, ok) {
            st.flags.sealShownHasp = true;
            if (!ok) return;
            if (Ash.hasCore(st)) return;
            Ash.invRemove("overseerSeal", 1, st);
            Ash.takeCore("coil");
            st.flags.truckLooted = true;
          },
          success: "coil.sealDeal",
          failure: "coil.haspNo",
        });
      }
      if (!s.flags.haspPrice) {
        c.push({
          label: "Talk him down.",
          check: { skill: "barter", name: "Barter", mod: s.flags.haspAngry ? -18 : -8, joss: true },
          fx: function (st, ok) {
            if (ok) st.flags.haspPrice = 100;
          },
          success: "coil.haggleOk",
          failure: "coil.haggleNo",
        });
      }
      c.push({
        label: "I'll open Bunker 7 for you.",
        fx: function (st) {
          st.flags.coilPact = true;
          st.flags.bunkerExposed = true;
          Ash.shiftRep("coil", 18, st);
          Ash.shiftKarma(-10, st);
          Ash.xpAward(15, st);
        },
        goto: "coil.pact",
      });
      c.push({
        label: "Take it from him.",
        combat: {
          enemies: ["hasp", "coilRaider"],
          then: "coil.camp",
          fleeTo: "scrap.ridge",
          intro: "Hasp grins like he ordered this.",
          talk: {
            skill: "speech",
            mod: -18,
            joss: true,
            success: "He laughs, and then he actually stops. \"Keep your bunker. Take the tin. I'm bored of both of you.\"",
            fail: "Talking to Hasp mid-swing is how people become stories.",
            failDamage: true,
          },
          onWin: function (st, info) {
            if (info && info.talk) {
              if (!Ash.hasCore(st)) Ash.takeCore("coil");
              st.flags.truckLooted = true;
              st.flags.haspDeal = true;
              Ash.shiftKarma(2, st);
              return;
            }
            st.flags.haspDead = true;
            st.flags.coilCleared = true;
            st.flags.lookoutCleared = true;
            if (Ash.bumpJoss) Ash.bumpJoss(16, st);
            Ash.shiftRep("coil", -30, st);
            Ash.shiftKarma(-6, st);
          },
        },
      });
      c.push({ label: "Leave him the fire.", goto: "coil.camp" });
      return c;
    },
  });

  N("coil.paid", {
    scene: "coil",
    speaker: { id: "hasp", name: "Hasp" },
    text: "Hasp takes the scrip and kicks the crate open. The core hums like it disapproves of the new hands and will work anyway. \"Don't tell me which hole you live in. I charge extra for addresses.\"",
    choices: [{ label: "Take the core and the hint.", goto: "coil.camp" }],
  });

  N("coil.sealDeal", {
    scene: "coil",
    speaker: { id: "hasp", name: "Hasp" },
    text: "He weighs the cracked seal, then the crate, and decides he likes a relic more than a lung. \"Bunker metal. I'll wear it. You wear the hum. We are not friends.\" The core changes packs.",
    choices: [{ label: "Fair enough, in the worst way.", goto: "coil.camp" }],
  });

  N("coil.haspNo", {
    scene: "coil",
    speaker: { id: "hasp", name: "Hasp" },
    text: "\"Pretty coin. Not a door.\" He doesn't take the seal. He also doesn't have you shot, which is Hasp being generous. The price on the crate does not move.",
    choices: [{ label: "Pocket the seal.", goto: "coil.hasp" }],
  });

  N("coil.haggleOk", {
    scene: "coil",
    speaker: { id: "hasp", name: "Hasp" },
    text: "\"A hundred. Because I'm bored and your face is doing math out loud.\" He spits into the fire. \"Dogs get the difference if you short me.\"",
    choices: [{ label: "A hundred, then.", goto: "coil.hasp" }],
  });

  N("coil.haggleNo", {
    scene: "coil",
    speaker: { id: "hasp", name: "Hasp" },
    text: "A raider laughs. Hasp doesn't. \"Dogs get bored when guests haggle.\" Someone fires into the dirt at your boots. You are still a guest. You are a worse one.",
    choices: [
      {
        label: "Back up.",
        fx: function (s) {
          s.flags.haspAngry = true;
          Ash.shiftRep("coil", -6, s);
          Ash.hurt(2, s);
        },
        goto: "coil.camp",
      },
    ],
  });

  N("coil.pact", {
    scene: "coil",
    speaker: { id: "hasp", name: "Hasp" },
    text: "\"Then we walk. The core stays in the truck until the hatch is ours. Collateral.\" He says it carefully. \"You just told me where you sleep. Don't get shy on the slope.\"",
    choices: [
      {
        label: "Walk now.",
        fx: function (s) {
          s.flags.raidMarch = true;
          Ash.travel("bunker");
          return "stop";
        },
      },
      { label: "Soon.", goto: "coil.camp" },
    ],
  });

  N("coil.truck", {
    scene: "coil",
    text: function (s) {
      if (s.flags.truckLooted) return "The green crate is a crate. The hum has left it. Whatever bargain or theft did that, the truck is just a truck again.";
      if (s.flags.haspDead || s.flags.coilCleared) return "Hasp isn't here to love the lock. The green crate sits in the bed, stenciled for a bunker that never signed for it.";
      if (s.flags.coilPact) return "Hasp was clear. The crate is collateral, and the camp is watching you be tempted.";
      return "The bunker stencil is still on the crate, under a thumb of ash. A lock. Dogs if you didn't deal with them. People if you get this wrong.";
    },
    choices: function (s) {
      var c = [];
      if (s.flags.truckLooted) {
        c.push({ label: "Leave it.", goto: "coil.camp" });
        return c;
      }
      if (s.flags.haspDead || s.flags.coilCleared) {
        c.push({
          label: "Take the filter core.",
          fx: function (st) {
            if (Ash.hasCore(st)) {
              st.note = "You already carry one. This crate is a shell.";
              st.flags.truckLooted = true;
              return;
            }
            Ash.takeCore("coil");
            st.flags.truckLooted = true;
          },
          goto: "coil.got",
        });
        return c;
      }
      c.push({
        label: "Lift it quiet.",
        check: {
          skill: "sneak",
          name: "Sneak",
          mod: function (st) {
            var m = st.flags.dogsDown ? 10 : -8;
            if (st.flags.reedWarned) m += 10;
            if (st.flags.haspAngry) m -= 12;
            if (st.flags.truckHot) m -= 15;
            return m;
          },
        },
        fx: function (st, ok) {
          if (!ok) {
            st.flags.truckHot = true;
            return;
          }
          if (!Ash.hasCore(st)) Ash.takeCore("coil");
          st.flags.truckLooted = true;
          st.flags.stoleTruck = true;
          Ash.shiftRep("coil", -22, st);
          Ash.shiftKarma(-3, st);
        },
        success: "coil.got",
        failureCombat: {
          enemies: ["coilRaider", "coilRaider"],
          then: "coil.camp",
          fleeTo: "scrap.ridge",
          intro: "The lock screams. So does a woman by the fire.",
          onWin: function (st) {
            st.flags.truckHot = true;
            Ash.shiftRep("coil", -10, st);
          },
        },
      });
      c.push({ label: "Not now.", goto: "coil.camp" });
      return c;
    },
  });

  N("coil.got", {
    scene: "coil",
    text: "The core is heavier than bread and ruder. It hums against your spine like it wants to be installed in something that isn't a pack. The truck looks embarrassed to be empty.",
    choices: [{ label: "Go.", goto: "coil.camp" }],
  });

  N("crater.rim", {
    hub: true,
    scene: "crater",
    onEnter: function (s) {
      Ash.markJoss(s);
      if (s.flags.choirHostile && !s.flags.choirFought) {
        s.flags.choirFought = true;
      }
    },
    text: function (s) {
      if (s.flags.choirHostile) {
        return "The rim knows you. Glass shawls turn. The glow doesn't care who started it. The people do.";
      }
      return join([
        "The crater is a bowl of fused sand and a light that isn't fire. People in glass shawls stand where the breath is warm and call that a reason. Rads tick in your teeth like a second pulse.",
        s._jossLine,
        Ash.lungsWhisper(s),
      ]);
    },
    choices: function (s) {
      if (s.flags.choirHostile) {
        return [
          {
            label: "They mean to keep you here.",
            combat: {
              enemies: ["choirSentinel", "choirSentinel"],
              then: "crater.rim",
              fleeTo: "silt.square",
              intro: "Glass and knives and a belief that cuts.",
              onWin: function (st) {
                Ash.shiftRep("choir", -10, st);
              },
            },
          },
          { label: "Get off the glass.", travel: "silt" },
        ];
      }
      return [
        { label: "Speak with Vellum.", goto: "crater.vellum" },
        { label: "The shrine on the lip.", goto: "crater.shrine" },
        { label: "A pilgrim who can't stand.", goto: "crater.patient" },
      ];
    },
  });

  N("crater.vellum", {
    scene: "crater",
    speaker: { id: "vellum", name: "Vellum" },
    onEnter: function (s) {
      s.flags.metVellum = true;
    },
    text: "Vellum finishes your sentence wrong on purpose, to see if you'll accept the new ending. Her shawl is a window. \"The crater inhales. We stand where the breath is warm. You've brought outside thoughts. They look heavy.\"",
    choices: function (s) {
      var c = [{ label: "The relic in the shrine.", goto: "crater.shrine" }];
      if (s.flags.nim === "started" && !s.flags.choirSalts) c.push({ label: "Nim needs a twist of your salt.", goto: "crater.salt" });
      if (s.flags.towerFixed && !s.flags.toldChoirRadio) c.push({ label: "Tell her about Hollow Meridian.", goto: "crater.radio" });
      if (Ash.invCount("overseerSeal", s) && !s.flags.sealShownVellum) {
        c.push({
          label: "Show her the cracked seal.",
          fx: function (st) {
            st.flags.sealShownVellum = true;
            Ash.shiftRep("choir", 8, st);
            st.flags.choirBroadcast = true;
            st.note = "She holds it to the glow and calls it a saint's coin. The shrine, somehow, feels less guarded.";
          },
          goto: "crater.vellum",
        });
      }
      c.push({ label: "Step back.", goto: "crater.rim" });
      return c;
    },
  });

  N("crater.salt", {
    scene: "crater",
    speaker: { id: "vellum", name: "Vellum" },
    text: "\"Nim owes us a story and a debt, and she sent a stranger with pockets.\" Vellum tips her head. \"Salt is for the bowl. I can spare a twist if you pay, or bleed a hog, or tell me something true that isn't a price.\"",
    choices: function (s) {
      var c = [];
      c.push({
        label: "Pay thirty scrip.",
        if: function (st) {
          return st.scrip >= 30;
        },
        fx: function (st) {
          st.scrip -= 30;
          st.flags.choirSalts = true;
          Ash.shiftRep("choir", 4, st);
        },
        goto: "crater.saltGot",
      });
      c.push({
        label: "Trade a grit-hog gland.",
        if: function (st) {
          return Ash.invCount("hogGland", st) > 0;
        },
        fx: function (st) {
          Ash.invRemove("hogGland", 1, st);
          st.flags.choirSalts = true;
          Ash.shiftRep("choir", 5, st);
        },
        goto: "crater.saltGot",
      });
      c.push({
        label: "Nim's patients are choking on dry stories. That's the truth.",
        check: { skill: "speech", name: "Speech", mod: -4, joss: true },
        fx: function (st, ok) {
          if (!ok) {
            Ash.addRads(12, st);
            return;
          }
          st.flags.choirSalts = true;
          Ash.shiftRep("choir", 6, st);
          Ash.shiftKarma(3, st);
        },
        success: "crater.saltGot",
        failure: "crater.saltFail",
      });
      c.push({ label: "Never mind.", goto: "crater.vellum" });
      return c;
    },
  });

  N("crater.saltGot", {
    scene: "crater",
    speaker: { id: "vellum", name: "Vellum" },
    text: "She twists a yellow grit into a scrap of glasscloth. \"Tell Nim the bowl remembers her. Tell her not to send a third favor. We get ideas.\"",
    choices: [{ label: "Pocket it carefully.", goto: "crater.rim" }],
  });

  N("crater.saltFail", {
    scene: "crater",
    speaker: { id: "vellum", name: "Vellum" },
    text: "\"Then stand in the breath until you have a better truth.\" She doesn't shove you. The glow doesn't need to. Your skin files a complaint. The salt stays in the bowl.",
    choices: [{ label: "Step out of the worst of it.", goto: "crater.vellum" }],
  });

  N("crater.radio", {
    scene: "crater",
    speaker: { id: "vellum", name: "Vellum" },
    text: "You tell her about the vents and the smiles. Vellum's eyes go bright in a way the crater doesn't have to help with. \"They inhaled the saint and were finished being afraid. You say it like a wound. We say it like a door.\"",
    choices: [
      {
        label: "Let her have the prophecy.",
        fx: function (s) {
          s.flags.toldChoirRadio = true;
          s.flags.choirBroadcast = true;
          Ash.shiftRep("choir", 12, s);
          Ash.xpAward(15, s);
        },
        goto: "crater.rim",
      },
      {
        label: "It's a broken machine, not a door.",
        check: { skill: "medicine", name: "Medicine", mod: 0 },
        fx: function (st, ok) {
          st.flags.toldChoirRadio = true;
          if (ok) {
            Ash.shiftKarma(4, st);
            Ash.shiftRep("choir", -4, st);
            st.flags.patientHelped = st.flags.patientHelped;
          } else {
            Ash.addRads(10, st);
            Ash.shiftRep("choir", 4, st);
          }
        },
        success: "crater.radioPush",
        failure: "crater.radioFail",
      },
    ],
  });

  N("crater.radioPush", {
    scene: "crater",
    speaker: { id: "vellum", name: "Vellum" },
    text: "A few shawls shift. Vellum doesn't like you better. She does look at the shrine as if it might be a part and not a saint, just for a second. Seconds matter near a core.",
    choices: [{ label: "Leave the second to work.", goto: "crater.rim" }],
  });

  N("crater.radioFail", {
    scene: "crater",
    speaker: { id: "vellum", name: "Vellum" },
    text: "\"Machines in the blood. You don't have the prayer.\" She has you stand where the glow is thick until your gums taste like pennies. The story remains hers.",
    choices: [{ label: "Enough.", goto: "crater.rim" }],
  });

  N("crater.patient", {
    scene: "crater",
    text: function (s) {
      if (s.flags.patientHelped) return "The pilgrim is upright, embarrassed, breathing like a person. They won't meet your eye. Gratitude, around here, looks like that.";
      return "A kid — not Tic, some other dust-child — sits where the glass is hottest and pretends that counts as treatment. The cough is the bunker's cough. You know the sound. They know you know.";
    },
    choices: function (s) {
      if (s.flags.patientHelped) return [{ label: "Let them be.", goto: "crater.rim" }];
      var c = [];
      if (Ash.invCount("medkit", s)) {
        c.push({
          label: "Spend a medkit and do it properly.",
          check: { skill: "medicine", name: "Medicine", mod: 0 },
          fx: function (st, ok) {
            Ash.invRemove("medkit", 1, st);
            if (ok) {
              st.flags.patientHelped = true;
              Ash.shiftKarma(5, st);
              Ash.shiftRep("choir", 8, st);
              Ash.xpAward(20, st);
            } else {
              st.note = "The gauze is wrong for glow-sickness. You spent it anyway.";
            }
          },
          success: "crater.patientOk",
          failure: "crater.patientFail",
        });
      }
      c.push({
        label: "Talk them out of the hottest glass.",
        check: { skill: "speech", name: "Speech", mod: -5 },
        fx: function (st, ok) {
          if (!ok) return;
          st.flags.patientHelped = true;
          Ash.shiftKarma(3, st);
          Ash.shiftRep("choir", 4, st);
        },
        success: "crater.patientOk",
        failure: "crater.patientFail",
      });
      c.push({ label: "This isn't your clinic.", goto: "crater.rim" });
      return c;
    },
  });

  N("crater.patientOk", {
    scene: "crater",
    text: "The kid breathes like a person again. A shawl at the rim watches you do it and does not stop you. That is as close as the Choir comes to a permit.",
    choices: [{ label: "Stand up.", goto: "crater.rim" }],
  });

  N("crater.patientFail", {
    scene: "crater",
    text: "The kid stays in the heat. Your help was a noise. Vellum, later, will say you tried to put a machine in the blood. She won't be entirely wrong, and she won't be kind.",
    choices: [{ label: "Leave them the bowl.", goto: "crater.rim" }],
  });

  N("crater.shrine", {
    scene: "crater",
    text: function (s) {
      if (s.flags.shrine !== "none" && s.flags.shrine) {
        return "The lip of the crater has a hole where a hum used to be. The glass around it is a mouth that closed. People walk the long way.";
      }
      return "They have set the filter core into the crater lip like a tooth in a saint. It hums. Children play near it until they don't feel like playing. Rads come off the glass in a slow weather. Vellum calls it a lung. It is a part.";
    },
    choices: function (s) {
      if (Ash.hasCore(s) || (s.flags.shrine && s.flags.shrine !== "none")) {
        return [{ label: "Nothing here wants you.", goto: "crater.rim" }];
      }
      return [
        {
          label: "This is dosing your children. Give me the part.",
          check: {
            skill: "speech",
            name: "Speech",
            joss: true,
            mod: function (st) {
              var m = -8;
              if (st.flags.patientHelped) m += 14;
              if (st.flags.choirBroadcast) m += 8;
              if (st.flags.sealShownVellum) m += 8;
              m += Math.floor(Ash.skillValue("science", st) / 12);
              return m;
            },
          },
          fx: function (st, ok) {
            if (!ok) {
              Ash.shiftRep("choir", -8, st);
              return;
            }
            Ash.takeCore("choir");
            st.flags.shrine = "speech";
            Ash.shiftRep("choir", 10, st);
            Ash.shiftKarma(6, st);
            Ash.addRads(6, st);
          },
          success: "crater.got",
          failure: "crater.speechFail",
        },
        {
          label: "Ask to unseat it without cracking the glass.",
          check: {
            skill: "science",
            name: "Science",
            mod: function (st) {
              return st.flags.patientHelped ? 6 : -6;
            },
          },
          fx: function (st, ok) {
            if (!ok) {
              Ash.addRads(16, st);
              st.flags.choirHostile = true;
              return;
            }
            Ash.takeCore("choir");
            st.flags.shrine = "science";
            Ash.shiftRep("choir", 6, st);
            Ash.addRads(4, st);
          },
          success: "crater.got",
          failureCombat: {
            enemies: ["choirSentinel", "choirSentinel"],
            then: "crater.afterFight",
            fleeTo: "silt.square",
            intro: "The pane screams. So do the people who loved it.",
            onWin: function (st) {
              st.flags.choirHostile = true;
              st.flags.choirFought = true;
              if (!Ash.hasCore(st)) {
                Ash.takeCore("choir");
                st.flags.shrine = "fight";
              }
              Ash.shiftKarma(-4, st);
              Ash.addRads(8, st);
            },
          },
        },
        {
          label: "Buy the saint. Ninety scrip and an iodine.",
          if: function (st) {
            return st.scrip >= 90 && Ash.invCount("iodine", st) > 0;
          },
          fx: function (st) {
            st.scrip -= 90;
            Ash.invRemove("iodine", 1, st);
            Ash.takeCore("choir");
            st.flags.shrine = "barter";
            Ash.shiftRep("choir", -4, st);
            Ash.shiftKarma(-2, st);
          },
          goto: "crater.bought",
        },
        {
          label: "Take it.",
          combat: {
            enemies: ["choirSentinel", "choirSentinel"],
            then: "crater.afterFight",
            fleeTo: "silt.square",
            intro: "You put your hands on their saint. They put knives on you.",
            talk: {
              skill: "speech",
              mod: -5,
              success: "Vellum calls them off. \"Take the part. Leave the bowl. We will invent a new saint by morning.\"",
              fail: "There is no version of this sentence they wanted.",
              failDamage: true,
            },
            onWin: function (st, info) {
              if (!Ash.hasCore(st)) {
                Ash.takeCore("choir");
                st.flags.shrine = "fight";
              }
              if (!(info && info.talk)) {
                st.flags.choirHostile = true;
                Ash.shiftKarma(-8, st);
                Ash.shiftRep("choir", -20, st);
              } else {
                Ash.shiftKarma(1, st);
                st.flags.shrine = "speech";
              }
              Ash.addRads(10, st);
            },
          },
        },
        { label: "Leave the hum where it is.", goto: "crater.rim" },
      ];
    },
  });

  N("crater.speechFail", {
    scene: "crater",
    speaker: { id: "vellum", name: "Vellum" },
    text: "\"Come back with a better prayer or a harder hand.\" The shawls close ranks around the hum. You are not banned. You are unfinished. Children keep playing a little too close to the glass.",
    choices: [{ label: "Back off.", goto: "crater.rim" }],
  });

  N("crater.got", {
    scene: "crater",
    text: "The core comes free. The glass complains and then decides to be glass. A few people touch their shawls like widows. Vellum looks at the empty lip and starts, already, to tell the bowl a new story. You have the hum, and a sunburn that isn't from a sun.",
    choices: [{ label: "Leave before the story includes you.", goto: "crater.rim" }],
  });

  N("crater.bought", {
    scene: "crater",
    speaker: { id: "vellum", name: "Vellum" },
    text: "She takes the scrip and the iodine and looks away, so the saint doesn't see her be practical. \"Walk. If you turn it into a joke at the trough, the bowl will hear. The bowl is a gossip.\"",
    choices: [{ label: "Walk.", goto: "crater.rim" }],
  });

  N("crater.afterFight", {
    scene: "crater",
    text: "The lip is quiet in the ugly way. If the core is in your pack, it hums like it would rather be a saint than a spare. The glow does not take sides. It just keeps being bad for teeth.",
    choices: [{ label: "Get off the glass.", goto: "crater.rim" }],
  });

  N("road.dust", {
    scene: "hatch",
    text: "The road stands up. Ash in a wall, red grit in the teeth of it, the kind of wind that files a person down to an errand. You can find a culvert or you can be the thing the grit polishes.",
    choices: [
      {
        label: "Find cover.",
        check: { skill: "survival", name: "Survival", mod: 0 },
        success: "road.dustOk",
        failure: "road.dustFail",
      },
    ],
  });

  N("road.dustOk", {
    scene: "hatch",
    text: "A culvert, half collapsed, takes you in. The storm files the road and misses the soft parts. You come out dusty and still shaped like yourself.",
    choices: [keepWalking()],
  });

  N("road.dustFail", {
    scene: "hatch",
    text: "You eat a little of the storm. It tastes like a penny and a slap. Nothing poetic about it. Your skin will remember.",
    choices: [
      {
        label: "Spit and keep going.",
        fx: function (s) {
          Ash.addRads(12, s);
          Ash.hurt(6, s);
        },
        goto: "@arrive",
      },
    ],
  });

  N("road.trader", {
    scene: "silt",
    speaker: { id: "moss", name: "Moss" },
    text: "A handcart and a hat with no crown. \"Moss,\" she says, like you asked. \"Cousin to nobody. I've got gauze, chew, and opinions I don't sell. You're going somewhere. Buy first.\"",
    choices: [{ label: "See the cart.", shop: "moss" }, keepWalking(), { label: "No thanks.", goto: "@arrive" }],
  });

  N("road.cache", {
    scene: "scrap",
    text: "Somebody cached a life under a slab and then didn't come back for it. Peach tin. Rounds. Twelve scrip in a sock. A kindness, if you don't think about the somebody.",
    choices: [
      {
        label: "Take it.",
        fx: function (s) {
          s.flags.cacheRoad = true;
          s.scrip += 12;
          if (!Ash.invAdd("cannedPeach", 1, s)) Ash.groundAdd(s.location, "cannedPeach", 1, s);
          if (!Ash.invAdd("pistolRounds", 1, s)) Ash.groundAdd(s.location, "pistolRounds", 1, s);
          Ash.xpAward(10, s);
        },
        goto: "@arrive",
      },
      { label: "Leave it for whoever is still walking.", goto: "@arrive" },
    ],
  });

  N("road.pilgrim", {
    scene: "crater",
    speaker: { id: "pilgrim", name: "Pilgrim" },
    text: "A Glass Choir walker, shawl dusty, asks for water with their eyes and then with their mouth, which is worse. They have a story about the glow and no canteen. You have choices, which is the whole problem.",
    choices: function (s) {
      var c = [];
      if (Ash.invCount("cannedPeach", s) || Ash.invCount("driedRat", s)) {
        c.push({
          label: "Share food.",
          fx: function (st) {
            if (Ash.invCount("cannedPeach", st)) Ash.invRemove("cannedPeach", 1, st);
            else Ash.invRemove("driedRat", 1, st);
            Ash.shiftKarma(4, st);
            Ash.shiftRep("choir", 5, st);
            st.note = "They eat like a person, not a prophecy. \"The bowl can wait,\" they say, surprised.";
          },
          goto: "@arrive",
        });
      }
      c.push({
        label: "Take what they're carrying.",
        fx: function (st) {
          st.scrip += 14;
          Ash.shiftKarma(-8, st);
          Ash.shiftRep("choir", -12, st);
          st.note = "Fourteen scrip and a look you will store somewhere inconvenient. They keep walking. So do you.";
        },
        goto: "@arrive",
      });
      c.push({ label: "Pass them.", goto: "@arrive" });
      return c;
    },
  });
})();
