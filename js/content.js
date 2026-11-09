/* Locations, people, and the ways they can go wrong. */
(function () {
  "use strict";
  var Ash = window.Ash;

  function N(id, node) {
    Ash.nodes[id] = node;
  }
  function join(parts) {
    return parts.filter(Boolean).join("\n\n");
  }
  function passSlope(s) {
    s.flags.reaperDone = true;
    Ash.learn("silt", s);
    Ash.learn("scrap", s);
    Ash.xpAward(15, s);
  }

  N("bunker.corridor", {
    hub: true,
    scene: "bunker",
    onEnter: function (s) {
      Ash.markJoss(s);
      s.flags.corridorFresh = !s.flags.seenCorridor;
      s.flags.seenCorridor = true;
    },
    text: function (s) {
      var open = "";
      if (s.flags.corridorFresh) {
        if (s.background === "tech") {
          open =
            "The corridor smells like hot dust and the lemon soap they stopped issuing. Your work order is a square of paper that has forgotten how to be flat. Above the laundry, the Lungs hitch.";
        } else if (s.background === "guard") {
          open =
            "You have walked this corridor on shift for years. Today the bolt is on the other side of the habit. Mara's runner didn't wait for an answer. Runners don't.";
        } else {
          open =
            "Archive air tastes like old glue. You copied a dead tech's work order in a hand close enough to pass, then you didn't file it. The Lungs hitch above the laundry, rude and on time.";
        }
      } else if (s.flags.lungsSaved) {
        open = "Bunker 7 is full of ordinary complaints again. That means the air is working. People are already picky about the taste.";
      } else if (s.flags.lastGasp) {
        open = "You came in on the last click of the gauge. The bulbs are the color of old teeth. Nobody in the corridor will meet your eye, which is a kind of welcome.";
      } else {
        open = "Concrete, amber bulbs, and the distant chew of a machine that is losing an argument with grit.";
      }
      return join([open, s._jossLine, Ash.lungsWhisper(s)]);
    },
    choices: function (s) {
      var c = [];
      c.push({ label: "Speak with Mara Venn.", goto: "bunker.mara" });
      c.push({ label: "Check the Lungs.", goto: "bunker.lungs" });
      c.push({ label: "The quartermaster cage.", goto: "bunker.stores" });
      c.push({
        label: "Go out the hatch.",
        if: function (st) {
          return st.background === "guard" && !st.flags.briefed;
        },
        goto: "bunker.hatchBlock",
      });
      c.push({
        label: "Slip the hatch before anyone assigns you.",
        if: function (st) {
          return st.background === "clerk" && !st.flags.briefed;
        },
        check: { skill: "sneak", name: "Sneak", mod: -5 },
        fx: function (st, success) {
          if (!success) return;
          st.flags.briefed = true;
          st.flags.skippedMara = true;
          Ash.shiftRep("bunker", -5, st);
          Ash.xpAward(10, st);
          Ash.travel("hatch");
          return "stop";
        },
        success: "bunker.corridor",
        failure: "bunker.hatchSneakFail",
      });
      c.push({
        label: "Take the hatch to the ash.",
        if: function (st) {
          return st.flags.briefed && !(st.background === "clerk" && !st.flags.briefed);
        },
        travel: "hatch",
      });
      return c;
    },
  });

  N("bunker.hatchBlock", {
    scene: "bunker",
    speaker: { id: "mara", name: "Duty bolt" },
    text: "The outer bolt is still on Mara's word. A guard you know shrugs without joy. \"She ordered you. She didn't order the door. Talk to her.\"",
    choices: [{ label: "Back to the corridor.", goto: "bunker.corridor" }],
  });

  N("bunker.hatchSneakFail", {
    scene: "bunker",
    text: "A laundry tech catches the borrowed signature halfway down the stair. She doesn't shout. She just walks you to Mara's door and knocks for you, which is worse.",
    choices: [
      {
        label: "Face Mara.",
        fx: function (s) {
          Ash.shiftRep("bunker", -4, s);
          s.flags.caughtSneak = true;
        },
        goto: "bunker.mara",
      },
    ],
  });

  N("bunker.mara", {
    scene: "bunker",
    speaker: { id: "mara", name: "Mara Venn" },
    onEnter: function (s) {
      s.flags.metMara = true;
    },
    text: function (s) {
      if (Ash.hasCore(s) && !s.flags.lungsSaved && s.flags.coilPact) {
        return "Mara sees the pack and the decision in your face. She puts both hands on the desk so they won't do anything else. \"If you brought them, say it. I am too tired for a riddle.\"";
      }
      if (Ash.hasCore(s) && !s.flags.lungsSaved) {
        return "Mara looks at the pack before she looks at you. The hum is small and indecent in a quiet office. \"Tell me that noise is what I think it is.\"";
      }
      if (s.flags.lungsSaved) {
        return "Mara has grease on a cuff and the face of someone who has been allowed to be annoyed again. \"Don't hover. Hovering is how gauges lie.\"";
      }
      if (s.background === "tech") {
        return "Mara doesn't offer you a chair. \"You kept them coughing. That's not praise. A filter core, copper collar, ceramic body. Fourteen days if the gauge isn't a coward. Silt sits in the reservoir bones. Somebody there will sell you anything, including us, if you get chatty.\"";
      }
      if (s.background === "guard") {
        return "\"You've had the inside of the hatch,\" Mara says. \"Now you get the outside. Find a filter core. Bring it here. Don't bring an audience. If you need the order in writing, you can watch the gauge instead.\"";
      }
      var extra = s.flags.caughtSneak ? " She taps your forged line without looking at it." : "";
      return (
        "Mara reads the work order, including the part you wrote." +
        extra +
        " \"Clerks read. Read the surface. A filter core. Copper and ceramic. Bring it back and I will pretend the signature was always yours.\""
      );
    },
    choices: function (s) {
      var c = [];
      if (Ash.hasCore(s) && !s.flags.lungsSaved) {
        c.push({
          label: "Give her the filter core.",
          fx: function (st) {
            Ash.invRemove("filterCore", 1, st);
            st.flags.coreFate = "mara";
            st.flags.lungsSaved = true;
            Ash.shiftRep("bunker", 12, st);
            Ash.xpAward(90, st);
          },
          goto: "bunker.seated",
        });
        c.push({
          label: "Propose a trade: Silt's water and silence for upkeep.",
          if: function (st) {
            return st.flags.calderTradeOk && !st.flags.bunkerExposed;
          },
          goto: "bunker.broker",
        });
        c.push({
          label: "Keep the core. Say it plainly.",
          goto: "bunker.keepConfirm",
        });
      }
      if (!s.flags.briefed) {
        c.push({
          label: s.background === "clerk" ? "I'll go. Make the order mine." : "I'll bring the core back.",
          fx: function (st) {
            st.flags.briefed = true;
            Ash.shiftKarma(1, st);
            Ash.xpAward(10, st);
          },
          goto: "bunker.maraDone",
        });
        c.push({ label: "What does a filter core look like?", goto: "bunker.coreLook" });
        c.push({
          label: "There has to be another way.",
          check: { skill: "speech", name: "Speech", mod: -5, joss: true },
          success: "bunker.pushOk",
          failure: "bunker.pushFail",
        });
        c.push({
          label: "Send someone else. I'm not your surface.",
          fx: function (st) {
            st.flags.briefed = true;
            st.flags.refusedOrder = true;
            Ash.shiftKarma(-6, st);
            Ash.shiftRep("bunker", -8, st);
          },
          goto: "bunker.refuse",
        });
      } else {
        if (s.flags.towerFixed && !s.flags.toldMaraRadio) {
          c.push({ label: "Tell her what the tower said.", goto: "bunker.maraRadio" });
        }
        if (!s.flags.knowCore) c.push({ label: "Ask what the core looks like.", goto: "bunker.coreLook" });
        c.push({ label: "Leave her to the desk.", goto: "bunker.corridor" });
      }
      return c;
    },
  });

  N("bunker.maraDone", {
    scene: "bunker",
    speaker: { id: "mara", name: "Mara Venn" },
    text: "\"Then walk. The reservoir camp calls itself Silt. Don't sell the hatch for a story, a drink, or a kind face. Kind faces love a sealed door.\" She slides a tin chit across. \"If the gauge hits the pin, I will not be in a mood to forgive the road.\"",
    choices: [
      {
        label: "Take the chit and go.",
        fx: function (s) {
          s.scrip += 8;
        },
        goto: "bunker.corridor",
      },
    ],
  });

  N("bunker.coreLook", {
    scene: "bunker",
    speaker: { id: "mara", name: "Mara Venn" },
    text: "\"Copper collar. Ceramic body. About the weight of a bread tin. It hums when it's willing. If it doesn't hum, you've been sold a coffin for air.\" She almost smiles. It doesn't survive the trip. \"A truck of ours left with a spare and never arrived. Surface thieves wearing cable. Remember that if Silt shrugs.\"",
    choices: [
      {
        label: "That's enough.",
        fx: function (s) {
          s.flags.knowCore = true;
          s.flags.truckHint = true;
          Ash.learn("coil", s);
        },
        goto: "bunker.mara",
      },
    ],
  });

  N("bunker.pushOk", {
    scene: "bunker",
    speaker: { id: "mara", name: "Mara Venn" },
    text: "She pinches the bridge of her nose until it whites. \"The truck. Filter spare in a green crate, if the manifest wasn't a poem. Coil camp took it, or the ash did. Start there if the camp wants a tax for talking.\" She flicks a medkit across the desk. \"Don't make me generous twice.\"",
    choices: [
      {
        label: "Take it.",
        fx: function (s) {
          s.flags.briefed = true;
          s.flags.truckHint = true;
          Ash.learn("coil", s);
          if (!Ash.invAdd("medkit", 1, s)) Ash.groundAdd("bunker", "medkit", 1, s);
          Ash.xpAward(10, s);
        },
        goto: "bunker.corridor",
      },
    ],
  });

  N("bunker.pushFail", {
    scene: "bunker",
    speaker: { id: "mara", name: "Mara Venn" },
    text: "\"You want comfort, file a poem with the clerk you replaced.\" Mara stands, which is the end of the meeting. \"The hatch is still the job. The gauge does not do appeals.\"",
    choices: [
      {
        label: "Fine.",
        fx: function (s) {
          s.flags.briefed = true;
          Ash.shiftRep("bunker", -3, s);
        },
        goto: "bunker.corridor",
      },
    ],
  });

  N("bunker.refuse", {
    scene: "bunker",
    speaker: { id: "mara", name: "Mara Venn" },
    text: "\"Stay, then. Count breaths. When dying gets dull, the hatch will be where it always was.\" She strikes your name off a ration margin. \"I will find someone meaner if I have to. I'd rather not. Meaner people sell doors.\"",
    choices: [{ label: "Leave her office.", goto: "bunker.corridor" }],
  });

  N("bunker.maraRadio", {
    scene: "bunker",
    speaker: { id: "mara", name: "Mara Venn" },
    text: function (s) {
      if (s.flags.bunkerExposed) {
        return "You tell her about Hollow Meridian. Mara's mouth goes thin. \"You already gave the surface our shape. Now you want me to thank you for a ghost story from the neighbor we don't visit.\"";
      }
      if (Ash.invCount("overseerSeal", s)) {
        return "You put Bunker 4's seal on her desk and say Juniper's name once. Mara doesn't touch the seal. \"Vents stay shut. If I hear this on a camp board I will assume you wanted us empty.\" She believes you completely, and she hates that.";
      }
      return "You tell it short: Bunker 4 seated a core wrong, opened their vents to the crater, and walked out smiling. Mara stares at a point over your shoulder until the point gives up. \"Do not put this on a board. Do not be interesting about it.\"";
    },
    choices: [
      {
        label: "Keep it inside the concrete.",
        fx: function (s) {
          s.flags.toldMaraRadio = true;
          if (s.flags.bunkerExposed || s.flags.toldCalderRadio) {
            Ash.shiftRep("bunker", -8, s);
            s.note = "She has already heard the shape of it from the surface. There is no reward for being second.";
            return;
          }
          var pay = Ash.invCount("overseerSeal", s) ? 35 : 15;
          s.scrip += pay;
          Ash.shiftRep("bunker", Ash.invCount("overseerSeal", s) ? 16 : 8, s);
          if (!Ash.invAdd("medkit", 1, s)) Ash.groundAdd("bunker", "medkit", 1, s);
          s.note = "She pays " + pay + " scrip like it is a fine for knowing.";
          Ash.xpAward(20, s);
        },
        goto: "bunker.corridor",
      },
    ],
  });

  N("bunker.lungs", {
    scene: "bunker",
    text: function (s) {
      if (s.flags.lungsSaved) {
        return "The Lungs turn over like a large animal that has decided not to die today. Red grit still freckles the housing. Somebody has written WASH ME in the dust and somebody else has obeyed, badly.";
      }
      var tech = s.background === "tech" ? " You know which bolt weeps and which bolt only pretends." : "";
      return (
        "The air recycler fills a room that used to be two rooms. Amber light puddles in the fan housing. Red grit has crept through a crack in the rock and packed the filters into felt. The gauge sits on a number nobody reads aloud." +
        tech +
        " " +
        (s.flags.lungsSaved ? "" : "Days left, if you believe metal: " + s.lungs + ".")
      );
    },
    choices: function (s) {
      var c = [];
      if (!s.flags.lungsSaved && !s.flags.lungsJury) {
        c.push({
          label: "Jury-rig one more day out of the housing.",
          check: { skill: "repair", name: "Repair", mod: s.background === "tech" ? 5 : -10 },
          success: "bunker.lungsOk",
          failure: "bunker.lungsFail",
        });
      }
      c.push({ label: "Step back.", goto: "bunker.corridor" });
      return c;
    },
  });

  N("bunker.lungsOk", {
    scene: "bunker",
    text: "You cheat a baffle and the grit slumps instead of packing. The gauge gives up a day like a tooth. It will want it back. For now the room sounds less like a death rattle and more like work.",
    choices: [
      {
        label: "Take the day.",
        fx: function (s) {
          s.flags.lungsJury = true;
          s.lungs += 1;
          Ash.xpAward(20, s);
        },
        goto: "bunker.corridor",
      },
    ],
  });

  N("bunker.lungsFail", {
    scene: "bunker",
    text: "The baffle spits. Grit as fine as glass finds your knuckle and writes its name there. The gauge does not move. The machine, insulted, goes on dying at the same speed.",
    choices: [
      {
        label: "Wrap the hand.",
        fx: function (s) {
          s.flags.lungsJury = true;
          Ash.hurt(5, s);
          s.note = "The cut is small and full of opinions.";
        },
        goto: "bunker.corridor",
      },
    ],
  });

  N("bunker.stores", {
    scene: "bunker",
    speaker: { id: "wend", name: "Wend" },
    text: function (s) {
      if (s.flags.storesIssued) {
        return "Wend counts bolts without looking up. \"You signed for what you signed for. The cage is not a shop, and I am not your surface aunt.\"";
      }
      return "Wend keeps the cage like other people keep grudges: indexed. One yellow finger taps a clipboard. \"Surface kit is a myth. I have gauze, a handful of rounds, and a form that says you'll die with them on you.\"";
    },
    choices: function (s) {
      var c = [];
      if (!s.flags.storesIssued && s.rep.bunker > -12) {
        c.push({
          label: "Sign the form. Take the kit.",
          fx: function (st) {
            st.flags.storesIssued = true;
            if (!Ash.invAdd("medkit", 1, st)) Ash.groundAdd("bunker", "medkit", 1, st);
            var ammo = st.equip.weapon === "pipeRifle" ? "rifleRounds" : "pistolRounds";
            if (!Ash.invAdd(ammo, 1, st)) Ash.groundAdd("bunker", ammo, 1, st);
            st.note = "Wend makes you sign twice. The second signature is for when the first one is a lie.";
          },
          goto: "bunker.corridor",
        });
      }
      if (s.flags.seenSilt && s.scrip >= 12 && !s.flags.boughtIodineBunker) {
        c.push({
          label: "Buy an iodine chew off the books (12).",
          fx: function (st) {
            if (st.scrip < 12) return;
            if (!Ash.invAdd("iodine", 1, st)) {
              st.note = "No room in the pack.";
              return;
            }
            st.scrip -= 12;
            st.flags.boughtIodineBunker = true;
            st.note = "Wend pretends the tin fell into your pocket by weather.";
          },
          goto: "bunker.stores",
        });
      }
      c.push({ label: "Leave the cage.", goto: "bunker.corridor" });
      return c;
    },
  });

  N("bunker.seated", {
    scene: "bunker",
    speaker: { id: "mara", name: "Mara Venn" },
    text: function (s) {
      var harsh = s.flags.bunkerExposed || s.karma < -20;
      if (harsh) {
        return "The core seats with a dull click. Air comes back into the room like a guest who won't say sorry. Mara wipes her hands on a rag that used to be a shirt. \"It works. You don't sleep here. You learned the address out loud, or you learned how to be someone I won't bunk next to. The surface kept you. Let it.\"";
      }
      var close = s.flags.lastGasp ? " You cut it so close the gauge stuck and had to be tapped like a sulking child." : "";
      return (
        "The core seats. The Lungs take one long breath and then a boring one, which is the miracle." +
        close +
        " Mara nods at a bunk down the hall as if it has always had your name and she simply refused to read it. \"Shift in the morning. Or walk back out. I won't chase either choice.\""
      );
    },
    choices: function (s) {
      if (s.flags.bunkerExposed || s.karma < -20) {
        return [{ label: "Take the surface.", ending: "exiled" }];
      }
      return [
        { label: "Take the bunk.", ending: "stay" },
        {
          label: "Walk back out on your own feet.",
          fx: function (st) {
            st.flags.walkedOut = true;
          },
          ending: "stay",
        },
      ];
    },
  });

  N("bunker.broker", {
    scene: "bunker",
    speaker: { id: "mara", name: "Mara Venn" },
    text: "You lay it out without poetry: Silt's water and a shut mouth, the bunker's upkeep, a hatch that opens on a schedule and not for sightseeing. Mara listens the way she listens to machines, waiting for the knock.",
    choices: [
      {
        label: "Draft the timetable as a repair.",
        check: {
          skill: "repair",
          name: "Repair",
          mod: function (st) {
            return st.flags.tradeHarder ? -18 : 0;
          },
        },
        fx: function (st, success) {
          if (!success) {
            st.lungs = Math.max(0, st.lungs - 1);
            Ash.shiftRep("bunker", -4, st);
            if (st.lungs <= 0 && !st.flags.lungsSaved) {
              Ash.ending("choke");
              return "stop";
            }
            return;
          }
          Ash.invRemove("filterCore", 1, st);
          st.flags.coreFate = "broker";
          st.flags.lungsSaved = true;
          Ash.shiftRep("bunker", 16, st);
          Ash.shiftRep("silt", 12, st);
          Ash.shiftKarma(8, st);
          Ash.xpAward(100, st);
        },
        success: "bunker.brokerDone",
        failure: "bunker.brokerFail",
      },
      {
        label: "Talk her into the two ledgers.",
        check: {
          skill: "speech",
          name: "Speech",
          joss: true,
          mod: function (st) {
            return st.flags.tradeHarder ? -22 : -8;
          },
        },
        fx: function (st, success) {
          if (!success) {
            st.lungs = Math.max(0, st.lungs - 1);
            Ash.shiftRep("bunker", -4, st);
            if (st.lungs <= 0 && !st.flags.lungsSaved) {
              Ash.ending("choke");
              return "stop";
            }
            return;
          }
          Ash.invRemove("filterCore", 1, st);
          st.flags.coreFate = "broker";
          st.flags.lungsSaved = true;
          Ash.shiftRep("bunker", 14, st);
          Ash.shiftRep("silt", 14, st);
          Ash.shiftKarma(8, st);
          Ash.xpAward(100, st);
        },
        success: "bunker.brokerDone",
        failure: "bunker.brokerFail",
      },
      { label: "Not this bargain.", goto: "bunker.mara" },
    ],
  });

  N("bunker.brokerDone", {
    scene: "bunker",
    speaker: { id: "mara", name: "Mara Venn" },
    text: "She signs a scrap of foil with a nail, which is as official as Bunker 7 gets this year. \"Water on the even days. Silence on all of them. If Calder gets chatty, the hatch rusts shut and I will blame your eloquent mouth.\" The core is already humming in the housing, bored and alive.",
    choices: [{ label: "File it.", ending: "broker" }],
  });

  N("bunker.brokerFail", {
    scene: "bunker",
    speaker: { id: "mara", name: "Mara Venn" },
    text: "She finds the hole in the timetable with one finger. While you argue, a seal pops and the gauge surrenders a day out of spite. \"Bring me a plan that doesn't leak, or bring me the core and stop inventing politics.\"",
    choices: [{ label: "Back up.", goto: "bunker.mara" }],
  });

  N("bunker.keepConfirm", {
    scene: "bunker",
    speaker: { id: "mara", name: "Mara Venn" },
    text: "Mara's voice goes flat, which is the register she uses for funerals and inventories. \"Eighty people. Say it again, so I know you heard yourself.\"",
    choices: [
      {
        label: "I'm keeping it.",
        fx: function (s) {
          s.flags.coreFate = "kept";
          Ash.shiftKarma(-18, s);
          Ash.shiftRep("bunker", -40, s);
        },
        ending: "kept",
      },
      { label: "Forget that.", goto: "bunker.mara" },
    ],
  });

  N("bunker.raid", {
    scene: "hatch",
    onEnter: function (s) {
      if (s.joss.following && s.joss.alive && !s.flags.jossRaidTalk) {
        s.flags.jossRaidTalk = true;
        s.joss.following = false;
        s.joss.parted = true;
        s._jossLine =
          "Joss stops on the ash and will not take the stair. \"Lookouts shot at me. That's a cellar full of clerks. I don't do cellars.\" She walks toward Silt without waiting to see what you are.";
      }
    },
    text: function (s) {
      return join([
        "The Coil comes up the slope like a bad idea that brought tools. Hasp taps the oval door with a cable-wrapped knuckle. \"Open it, or we open it and you get to watch.\"",
        s._jossLine,
      ]);
    },
    choices: [
      {
        label: "Force the duty bolt.",
        combat: {
          enemies: ["bunkerGuard", "bunkerGuard"],
          then: "bunker.raidInside",
          fleeTo: "hatch.slope",
          intro: "Two people you have eaten with raise rifles they were never supposed to need.",
          talk: {
            skill: "speech",
            mod: -20,
            success: "One of them knows your voice. They lower the rifles and hate you for it. The door is still a problem, but the blood isn't.",
            fail: "They were trained not to chat at the hatch. The training holds.",
            failDamage: true,
          },
          onWin: function (s) {
            s.flags.guardsDown = true;
            Ash.shiftKarma(-10, s);
            Ash.shiftRep("bunker", -25, s);
          },
        },
      },
      {
        label: "Sneak the bolt while Hasp makes noise.",
        check: { skill: "sneak", name: "Sneak", mod: -8 },
        success: "bunker.raidInside",
        failureCombat: {
          enemies: ["bunkerGuard", "bunkerGuard"],
          then: "bunker.raidInside",
          fleeTo: "hatch.slope",
          intro: "The bolt shrieks. So does the woman on the other side of it.",
          onWin: function (s) {
            s.flags.guardsDown = true;
            Ash.shiftKarma(-8, s);
          },
        },
        fx: function (st, success) {
          if (success) {
            st.flags.raidSneak = true;
            st.note = "The bolt gives. You get through without a shot. It will not make you cleaner.";
          }
        },
      },
      {
        label: "Call it off.",
        fx: function (s) {
          s.flags.coilPact = false;
          s.flags.raidMarch = false;
          s.flags.bunkerExposed = true;
          Ash.shiftRep("coil", -25, s);
          Ash.shiftRep("bunker", -20, s);
          Ash.shiftKarma(4, s);
        },
        goto: "bunker.calledOff",
      },
    ],
  });

  N("bunker.calledOff", {
    scene: "hatch",
    text: "Hasp looks at you the way a dog looks at a hand that promised and closed. \"Keep the road, then. We'll invoice you when we feel like walking.\" Below, someone in the bunker has already heard cable on the stone. You will not be a rumor anymore.",
    choices: [{ label: "Get off the slope.", goto: "hatch.slope" }],
  });

  N("bunker.raidInside", {
    scene: "bunker",
    speaker: { id: "mara", name: "Mara Venn" },
    text: function (s) {
      var sneak = s.flags.raidSneak ? "You got in quiet, which only means she meets you standing instead of over a body. " : "";
      return (
        sneak +
        "Mara is in the corridor with a wrench and no audience she can spare. Hasp's people smell like warm insulation. \"You brought the weather inside,\" she says. \"If you have a speech, spend it before I spend this.\""
      );
    },
    choices: [
      {
        label: "Get people to the laundry. Then let the Coil have the door.",
        check: {
          skill: "speech",
          name: "Speech",
          mod: function (st) {
            var m = st.flags.raidSneak ? 5 : -12;
            if (st.karma >= 10) m += 8;
            return m;
          },
        },
        fx: function (st, success) {
          if (!success) {
            Ash.shiftKarma(-4, st);
            return;
          }
          st.flags.evacuated = true;
          st.flags.raidDone = true;
          st.flags.raidMarch = false;
          st.flags.coreFate = "raid";
          st.flags.coilCleared = false;
          if (Ash.hasCore(st)) Ash.invRemove("filterCore", 1, st);
          Ash.shiftKarma(6, st);
          Ash.shiftRep("coil", 10, st);
          Ash.xpAward(70, st);
        },
        success: "bunker.raidEnd",
        failure: "bunker.raidSpeechFail",
      },
      {
        label: "Stand aside and let Hasp take the Lungs.",
        fx: function (st) {
          st.flags.raidDone = true;
          st.flags.raidMarch = false;
          st.flags.coreFate = "raid";
          st.flags.maraDead = true;
          if (Ash.hasCore(st)) Ash.invRemove("filterCore", 1, st);
          Ash.shiftKarma(-20, st);
          Ash.shiftRep("coil", 15, st);
          Ash.shiftRep("bunker", -50, st);
          Ash.xpAward(40, st);
        },
        goto: "bunker.raidEnd",
      },
    ],
  });

  N("bunker.raidSpeechFail", {
    scene: "bunker",
    speaker: { id: "mara", name: "Mara Venn" },
    text: "\"Too late to be a shepherd,\" Mara says, and the wrench rings off the wall an inch from your ear. People scatter anyway, badly. Hasp laughs like gravel in a tin. The moment for a clean evacuation is gone. The moment for a choice isn't.",
    choices: [
      {
        label: "Let it happen.",
        fx: function (st) {
          st.flags.raidDone = true;
          st.flags.raidMarch = false;
          st.flags.coreFate = "raid";
          st.flags.maraDead = true;
          if (Ash.hasCore(st)) Ash.invRemove("filterCore", 1, st);
          Ash.shiftKarma(-16, st);
          Ash.xpAward(30, st);
        },
        goto: "bunker.raidEnd",
      },
    ],
  });

  N("bunker.raidEnd", {
    scene: "bunker",
    text: function (s) {
      if (s.flags.evacuated) {
        return "You buy them the laundry cistern and a door that bolts from the inside. It is not a life. Hasp's people seat the core with filthy ceremony. The Lungs start. The bunker, as a home, stops.";
      }
      return "Cable goes down the stairs. The core seats because Hasp wants the hum more than he wants prisoners. Mara does not get a vote. The air comes back to a room that has changed owners.";
    },
    choices: [{ label: "Close the file.", ending: "raid" }],
  });

  N("hatch.slope", {
    hub: true,
    scene: "hatch",
    onEnter: function (s) {
      Ash.markJoss(s);
      s.flags.leftBunker = true;
    },
    text: function (s) {
      if (!s.flags.reaperDone) {
        return join([
          "The hatch opens on a sky the color of dirty bone. Ash moves along the slope in low sheets. Your eyes try to quit. They don't get to.",
          "The scree thirty paces out is boiling. Something underneath is tracking the heat of your ankles. It does not look like a conversation.",
          s._jossLine,
          Ash.lungsWhisper(s),
        ]);
      }
      return join([
        "The oval door sits in the hill behind you, a polite mouth. Ahead, the drained reservoir holds a camp in its ribs. East, wrecks comb the ridge.",
        s._jossLine,
        Ash.lungsWhisper(s),
      ]);
    },
    choices: function (s) {
      if (!s.flags.reaperDone) {
        return [
          {
            label: "Sneak the long contour.",
            check: { skill: "sneak", name: "Sneak", mod: 5 },
            fx: function (st, ok) {
              if (ok) passSlope(st);
            },
            success: "hatch.clear",
            failure: "hatch.caught",
          },
          {
            label: "Throw grit and take the ugly line.",
            check: { skill: "survival", name: "Survival", mod: 0 },
            fx: function (st, ok) {
              if (ok) passSlope(st);
            },
            success: "hatch.clear",
            failure: "hatch.caught",
          },
          {
            label: "Stand and fight the thing in the scree.",
            combat: {
              enemies: ["sandreaper"],
              then: "hatch.fought",
              fleeTo: "bunker.corridor",
              intro: "The sandreaper comes up already biting. It is mostly mouth and a decision.",
              talk: {
                impossible: true,
                fail: "You speak. It has no language. The mouth decides for both of you, and it decides with teeth.",
                failDamage: true,
              },
              onWin: function (st) {
                passSlope(st);
                st.flags.reaperKilled = true;
              },
            },
          },
          {
            label: "Try to talk it down.",
            combat: {
              enemies: ["sandreaper"],
              then: "hatch.fought",
              fleeTo: "bunker.corridor",
              intro: "You put your empty hands where a person could see them. The sandreaper is not a person.",
              talk: {
                impossible: true,
                fail: "Talking was never on the table. The table was ash, and then it was teeth.",
                failDamage: true,
              },
              onWin: function (st) {
                passSlope(st);
                st.flags.reaperKilled = true;
              },
            },
          },
          { label: "Back through the hatch.", travel: "bunker" },
        ];
      }
      return [
        { label: "Take the road down to Silt.", travel: "silt" },
        { label: "Climb toward Scrap Ridge.", travel: "scrap" },
        { label: "Step back inside.", travel: "bunker" },
      ];
    },
  });

  N("hatch.clear", {
    scene: "hatch",
    text: "You take the long way around the boil in the scree. The sandreaper follows your heat, loses the plot, and sinks. That is the only mercy it has. Below, Silt is a stain of canvas in the reservoir's bones. The ridge to the east is all ribs and wrecks.",
    choices: [{ label: "Breathe, then look again.", goto: "hatch.slope" }],
  });

  N("hatch.caught", {
    scene: "hatch",
    text: "The scree explodes under your off foot. A sandreaper — hide like wet concrete, mouth like a bad idea — comes up already committed. Sneaking is a story you can tell later, if there's a later.",
    choices: [
      {
        label: "Fight.",
        fx: function (s) {
          Ash.hurt(4, s);
          s.note = "The first bite finds you before your feet do.";
        },
        combat: {
          enemies: ["sandreaper"],
          then: "hatch.fought",
          fleeTo: "bunker.corridor",
          intro: "It is too close for a plan.",
          onWin: function (st) {
            passSlope(st);
            st.flags.reaperKilled = true;
          },
        },
      },
    ],
  });

  N("hatch.fought", {
    scene: "hatch",
    text: "The slope is just a slope again, plus a body the ash is already editing. Silt shows in the reservoir. The ridge shows its wrecks. Your hands are doing an honest job of shaking and then they stop.",
    choices: [{ label: "Get your bearings.", goto: "hatch.slope" }],
  });

  N("silt.square", {
    hub: true,
    scene: "silt",
    onEnter: function (s) {
      Ash.markJoss(s);
      s.flags.siltFresh = !s.flags.siltIntro;
      s.flags.siltIntro = true;
      s.flags.seenSilt = true;
    },
    text: function (s) {
      var first = "";
      if (s.flags.siltFresh) {
        first =
          "Silt sits in the ribs of a reservoir that gave up. Canvas, copper troughs, a cistern with a grudge. People watch your boots and decide what you cost. The wind here is mostly dust and other people's laundry.";
      } else {
        first = "The camp goes on counting water, bullets, and who owes whom a favor they will deny in daylight.";
      }
      var dead = !s.joss.alive ? "Somebody pinned a strip of Joss's sight-cloth to the trough. Nobody is drinking next to it." : "";
      return join([first, dead, s._jossLine, Ash.lungsWhisper(s)]);
    },
    choices: function (s) {
      var c = [
        { label: "Calder's rib — the camp lead.", goto: "silt.calder" },
        { label: "Nim's tent.", goto: "silt.nim" },
        { label: "Pebble's blanket.", goto: "silt.pebble" },
        { label: "The notice board.", goto: "silt.board" },
        { label: "The cistern.", goto: "silt.cistern" },
      ];
      if (s.joss.alive && !s.joss.parted) c.push({ label: "Joss, by the trough.", goto: "silt.joss" });
      c.push({ label: "Tic, on the cistern rim.", goto: "silt.tic" });
      if (Ash.hasCore(s) && !s.flags.lungsSaved) {
        c.push({ label: "Leave the Ash Range with the core.", goto: "silt.keep" });
      }
      if (s.flags.coreFate === "sold" && !s.ending) {
        c.push({
          label: "The bunker is no longer your errand.",
          ending: "sold",
        });
      }
      if (s.joss.recruited && s.joss.alive && !s.joss.following && !s.joss.parted) {
        c.push({
          label: "Ask Joss to come along.",
          fx: function (st) {
            st.joss.following = true;
            st.note = "\"Try not to need a speech,\" she says, and falls in anyway.";
          },
          goto: "silt.square",
        });
      }
      return c;
    },
  });

  N("silt.keep", {
    scene: "silt",
    text: "You could put the core on Mara's desk. You could also not. The hum against your back is a private weather. Eighty people is a number. Numbers are easy to leave in a camp.",
    choices: [
      {
        label: "Keep it and go.",
        fx: function (s) {
          s.flags.coreFate = "kept";
          Ash.shiftKarma(-18, s);
          Ash.shiftRep("bunker", -30, s);
        },
        ending: "kept",
      },
      { label: "Don't be that person. Not yet.", goto: "silt.square" },
    ],
  });

  N("silt.board", {
    scene: "silt",
    text: "The board is a door with ambitions. A hog bounty in Nim's writing. A moth warning with the word PRETTY crossed out. Calder has written Reed's name like a debt. Someone else has drawn a coil of cable and a knife, which is either a map or a mood. The roads out of Silt are all gossip and all true enough to walk.",
    choices: [
      {
        label: "Read it down to the splinters.",
        fx: function (s) {
          ["reed", "tower", "scrap", "coil", "crater"].forEach(function (id) {
            Ash.learn(id, s);
          });
          s.flags.readBoard = true;
        },
        goto: "silt.square",
      },
    ],
  });

  N("silt.cistern", {
    scene: "silt",
    text: function (s) {
      var book = s.flags.calderBook
        ? "The blue tally book is back in Calder's rib, if it was ever careless enough to lie here."
        : "A blue tally book sits under a tin cup, casual as a trap. The public column is thirsty. The private column has a name you could get hit for reading.";
      return "The cistern is lower than the paint that marks yesterday. Cups hang on nails. One cup, smaller, is cleaner than the rest. " + book;
    },
    choices: function (s) {
      var c = [];
      if (!s.flags.calderBook && s.flags.metCalder) {
        c.push({
          label: "Read the blue book while the camp looks elsewhere.",
          check: { skill: "sneak", name: "Sneak", mod: 0 },
          success: "silt.book",
          failure: "silt.cisternFail",
        });
      }
      if (s.flags.calderBook && s.flags.dry === "started" && !s.flags.didExpose) {
        c.push({ label: "Say the private cut out loud, where the cups can hear.", goto: "silt.expose" });
      }
      c.push({ label: "Leave the water alone.", goto: "silt.square" });
      return c;
    },
  });

  N("silt.book", {
    scene: "silt",
    text: "Pebble's line is off the public tally: two cans, every day, written small. The night column is just a word, REED, pressed hard enough to groove the page. You put the book back. The knowledge does not go back with it.",
    choices: [
      {
        label: "Remember the numbers.",
        fx: function (s) {
          s.flags.calderBook = true;
          Ash.xpAward(15, s);
        },
        goto: "silt.square",
      },
    ],
  });

  N("silt.cisternFail", {
    scene: "silt",
    text: "A woman slaps the book shut on your fingers. Not hard. Hard enough. \"Calder counts that,\" she says, already walking toward his rib. By dusk this will be a story about your hands.",
    choices: [
      {
        label: "Shake it off.",
        fx: function (s) {
          Ash.shiftRep("silt", -8, s);
          s.flags.tradeHarder = true;
          s.note = "Your fingers will bruise in the shape of a ledger.";
        },
        goto: "silt.square",
      },
    ],
  });

  N("silt.expose", {
    scene: "silt",
    text: "You speak at the cistern, not in Calder's shadow. Pebble's private cans. The night word. People were hoping for a fight and got arithmetic, which is slower and meaner.",
    choices: [
      {
        label: "Make them believe the arithmetic.",
        check: { skill: "speech", name: "Speech", mod: 5, joss: true },
        fx: function (st, ok) {
          if (!ok) {
            Ash.shiftRep("silt", -10, st);
            st.flags.calderBanDay = st.day;
            return;
          }
          st.flags.didExpose = true;
          Ash.resolveDry("reed");
        },
        success: "silt.exposeOk",
        failure: "silt.exposeFail",
      },
      { label: "Swallow it.", goto: "silt.square" },
    ],
  });

  N("silt.exposeOk", {
    scene: "silt",
    text: "The camp does not drag Calder out. Camps hate a vacancy more than a cheat. They do change the price of his silence. Reed's pump will run in daylight. Pebble's smile goes somewhere else for a week. You are not going to be popular in the rib.",
    choices: [{ label: "Let the cups talk.", goto: "silt.square" }],
  });

  N("silt.exposeFail", {
    scene: "silt",
    text: "Somebody laughs in the wrong place and the laugh wins. Calder's name is still a door. Yours is now a little like a thief's. The book did not change hands. The story did, and not toward you.",
    choices: [{ label: "Step away from the cistern.", goto: "silt.square" }],
  });

  N("silt.calder", {
    scene: "silt",
    speaker: { id: "calder", name: "Calder" },
    onEnter: function (s) {
      s.flags.metCalder = true;
    },
    text: function (s) {
      if (s.day === s.flags.calderBanDay) {
        return "Calder doesn't look up from the tally. \"Not today. I have already spent my patience on your hands.\"";
      }
      if (s.flags.dry === "fair") {
        return "Calder rubs a cracked thumbnail along the ledger. \"Noon count. I hate it. The cistern doesn't. Don't bring me a new philosophy. I just survived one.\"";
      }
      if (s.flags.dry === "calder") {
        return "\"Reed's quiet,\" Calder says. He sounds tired, not proud. \"If you're here to be thanked, the trough is that way. If you're here about work, say the work.\"";
      }
      if (s.flags.dry === "reed") {
        return "Calder's courtesy has a tax on it now. \"You talked at my cistern. Drink somewhere else if you're thirsty for speeches.\"";
      }
      var smell = s.flags.bunkerExposed
        ? "He knows the bunker by name and he is polite about it, which is worse than shouting."
        : "He sniffs once. \"That's not camp soap.\"";
      return (
        "Calder runs Silt from a rib of the old dam, at a desk made of a door. He counts people like inventory and rubs a cracked thumbnail when the count goes bad. " +
        smell
      );
    },
    choices: function (s) {
      var c = [];
      if (s.day === s.flags.calderBanDay) {
        c.push({ label: "Leave.", goto: "silt.square" });
        return c;
      }
      if (!s.flags.bunkerExposed && !s.flags.admittedBunker) {
        c.push({
          label: "I'm from a sealed bunker. Not the address.",
          fx: function (st) {
            st.flags.admittedBunker = true;
            st.flags.bunkerRumored = true;
            Ash.shiftKarma(2, st);
            Ash.shiftRep("silt", 4, st);
            st.note = "He nods like a man filing a risk, not a friend.";
          },
          goto: "silt.calder",
        });
        c.push({
          label: "Bunker 7. Oval hatch, under the ash.",
          fx: function (st) {
            st.flags.admittedBunker = true;
            st.flags.bunkerExposed = true;
            Ash.shiftRep("silt", 3, st);
            Ash.shiftKarma(-2, st);
            st.note = "\"Don't say that name at the trough,\" he says, and then he says nothing else for a while.";
          },
          goto: "silt.calder",
        });
      }
      if (s.flags.dry === "none" || s.flags.dry === "started") {
        c.push({ label: "Ask for work.", goto: "silt.calderWork" });
      }
      if ((s.flags.dry === "fair" || s.flags.dry === "calder") && !s.flags.calderTradeOk && !s.flags.bunkerExposed) {
        c.push({ label: "If a sealed place offered quiet upkeep for water, would you take it?", goto: "silt.calderTrade" });
      }
      if (s.flags.towerFixed && !s.flags.toldCalderRadio) {
        c.push({ label: "Tell him about the broadcast.", goto: "silt.calderRadio" });
      }
      if (s.flags.jossQuest === "started" && !s.flags.jossFavor && s.joss.alive) {
        c.push({ label: "Put Joss on the medical water.", goto: "silt.calderJoss" });
      }
      c.push({ label: "Step out.", goto: "silt.square" });
      return c;
    },
  });

  N("silt.calderWork", {
    scene: "silt",
    speaker: { id: "calder", name: "Calder" },
    text: "\"Reed pumps nights. The cistern drops. He says I'm skimming. I'm skimming a little, and he's skimming a story.\" Calder taps the desk. \"Bring him into a daylight split, or bring me proof he isn't a thief, or run him off. Fifty scrip if the water gets simpler. Don't bring me a poem.\"",
    choices: [
      {
        label: "I'll see the claim.",
        fx: function (s) {
          if (s.flags.dry === "none") s.flags.dry = "started";
          Ash.learn("reed", s);
        },
        goto: "silt.calder",
      },
      {
        label: "Show him Reed's log.",
        if: function (st) {
          return st.flags.reedLog && !st.flags.evidenceShownCalder;
        },
        goto: "silt.calderLog",
      },
      {
        label: "You already know about Pebble's private cans.",
        if: function (st) {
          return st.flags.calderBook && st.flags.dry === "started";
        },
        goto: "silt.calderBook",
      },
      {
        label: "Talk him into a daylight split with no paper.",
        if: function (st) {
          return st.flags.dry === "started" && !st.flags.calderAgreed;
        },
        check: {
          skill: "speech",
          name: "Speech",
          joss: true,
          mod: function (st) {
            var m = -18;
            if (st.flags.seepInsight) m += 10;
            if (st.flags.reedAgreed) m += 12;
            if (st.flags.calderScorn) m -= 8;
            return m;
          },
        },
        fx: function (st, ok) {
          if (!ok) {
            st.flags.calderScorn = true;
            return;
          }
          st.flags.calderAgreed = true;
          if (Ash.finishFairIfReady()) return;
        },
        success: "silt.calderSpeechOk",
        failure: "silt.calderSpeechFail",
      },
      { label: "Back.", goto: "silt.calder" },
    ],
  });

  N("silt.calderLog", {
    scene: "silt",
    speaker: { id: "calder", name: "Calder" },
    text: "He reads the column labeled TIC and his thumbnail stops. The night draw isn't a fortune. It's a boy's wash water and a man's pride. Calder hates both of those when they ambush him.",
    choices: [
      {
        label: "Push for a daylight split.",
        check: { skill: "speech", name: "Speech", mod: 8, joss: true },
        fx: function (st, ok) {
          st.flags.evidenceShownCalder = true;
          if (!ok) {
            st.flags.calderScorn = true;
            return;
          }
          st.flags.calderAgreed = true;
          Ash.shiftKarma(2, st);
          Ash.finishFairIfReady();
        },
        success: "silt.calderSpeechOk",
        failure: "silt.calderLogFail",
      },
      { label: "Let him sit with it.", goto: "silt.calder" },
    ],
  });

  N("silt.calderLogFail", {
    scene: "silt",
    speaker: { id: "calder", name: "Calder" },
    text: "\"That's a story with handwriting,\" he says. \"Stories don't fill cisterns. Run Reed off and I'll forget I saw the boy's name. Otherwise don't wave paper at me.\" He is not shouting. He is done.",
    choices: [{ label: "Take the ugly option or leave it.", goto: "silt.calder" }],
  });

  N("silt.calderSpeechOk", {
    scene: "silt",
    speaker: { id: "calder", name: "Calder" },
    text: function (s) {
      if (s.flags.dry === "fair") {
        return "Both names are on the noon count now. Calder pays you like a man settling a fine he agrees with. \"Tell Reed if he hasn't heard. Tell him I will hate it on schedule.\" The cistern will still be low. It will be low honestly.";
      }
      return "\"If Reed signs, I sign,\" Calder says. \"I will hate it. Do not ask me to walk down there and perform my hatred. Bring me his yes.\"";
    },
    choices: [{ label: "Noted.", goto: "silt.square" }],
  });

  N("silt.calderSpeechFail", {
    scene: "silt",
    speaker: { id: "calder", name: "Calder" },
    text: "You spend an hour. He spends it looking at the door. \"No. Paper, or Reed gone, or you gone. I don't buy speeches retail.\" The rib feels smaller on the way out.",
    choices: [{ label: "Get some air.", goto: "silt.square" }],
  });

  N("silt.calderBook", {
    scene: "silt",
    speaker: { id: "calder", name: "Calder" },
    text: "You say Pebble's cans out loud, in the rib, where the book can hear its own name. Calder's jaw works. \"You read my desk. That's a brave way to get a broken hand.\"",
    choices: [
      {
        label: "Fix your book and I'll fix Reed. Clean.",
        check: { skill: "speech", name: "Speech", mod: -5, joss: true },
        fx: function (st, ok) {
          if (!ok) {
            Ash.shiftRep("silt", -8, st);
            st.flags.calderBanDay = st.day;
            return;
          }
          st.flags.calderAgreed = true;
          Ash.shiftKarma(4, st);
          Ash.finishFairIfReady();
        },
        success: "silt.calderSpeechOk",
        failure: "silt.calderBookFail",
      },
      {
        label: "Or I read it at the trough.",
        fx: function (st) {
          st.flags.calderAgreed = true;
          st.flags.calderBlackmailed = true;
          Ash.shiftKarma(-5, st);
          Ash.shiftRep("silt", -4, st);
          Ash.finishFairIfReady();
        },
        goto: "silt.calderBlackmail",
      },
      { label: "Drop it.", goto: "silt.calder" },
    ],
  });

  N("silt.calderBookFail", {
    scene: "silt",
    speaker: { id: "calder", name: "Calder" },
    text: "\"Get out of my book,\" he says, and he means the room. The tally snaps shut. You will not be welcome in the rib until the day turns and his temper has somewhere else to sit.",
    choices: [{ label: "Go.", goto: "silt.square" }],
  });

  N("silt.calderBlackmail", {
    scene: "silt",
    speaker: { id: "calder", name: "Calder" },
    text: function (s) {
      if (s.flags.dry === "fair") {
        return "He agrees so fast the agreement looks like a flinch. The noon count will happen. So will the story that you twisted a man's thumb in his own office. The water will not care. People will.";
      }
      return "\"Noon count,\" he says, hating you with professional calm. \"Get Reed's yes. If the trough hears my book, you and I are finished in a louder way.\"";
    },
    choices: [{ label: "Leave him the taste of it.", goto: "silt.square" }],
  });

  N("silt.calderTrade", {
    scene: "silt",
    speaker: { id: "calder", name: "Calder" },
    text: "You don't say the bunker's name. You say: a sealed place, filter upkeep, water on a schedule, no tours. Calder stares at the dam rib like it might answer first.",
    choices: [
      {
        label: "Ask him to say yes.",
        check: { skill: "speech", name: "Speech", mod: 0, joss: true },
        fx: function (st, ok) {
          if (ok) {
            st.flags.calderTradeOk = true;
            Ash.shiftRep("silt", 6, st);
          } else {
            st.flags.tradeHarder = true;
            st.flags.bunkerRumored = true;
          }
        },
        success: "silt.calderTradeOk",
        failure: "silt.calderTradeFail",
      },
      { label: "Never mind.", goto: "silt.calder" },
    ],
  });

  N("silt.calderTradeOk", {
    scene: "silt",
    speaker: { id: "calder", name: "Calder" },
    text: "\"Water for quiet work. The hatch stays a rumor. If I see pilgrims, the deal drowns.\" He spits into the dust, which is Calder for a signature. \"Bring me their yes. I'll bring buckets.\"",
    choices: [{ label: "Good enough.", goto: "silt.square" }],
  });

  N("silt.calderTradeFail", {
    scene: "silt",
    speaker: { id: "calder", name: "Calder" },
    text: "\"Everybody has a sealed place,\" he says. \"Usually it's a hole with a gun in it. Come back with something that isn't a riddle, or don't.\" He files you under maybe-trouble. The next bargain with anyone official just got heavier.",
    choices: [{ label: "Drop it.", goto: "silt.square" }],
  });

  N("silt.calderRadio", {
    scene: "silt",
    speaker: { id: "calder", name: "Calder" },
    text: "You tell him another bunker went quiet on purpose and by mistake. Calder posts the shape of it on the board in his head: refugees, thirst, a glow to the south that eats smiles.",
    choices: [
      {
        label: "Keep the location out of it.",
        fx: function (s) {
          s.flags.toldCalderRadio = true;
          Ash.shiftRep("silt", 8, s);
          Ash.xpAward(15, s);
          s.note = "He puts an extra body on the night watch and doesn't ask you to be interesting.";
        },
        goto: "silt.square",
      },
      {
        label: "Tell him it was a neighbor of Bunker 7.",
        fx: function (s) {
          s.flags.toldCalderRadio = true;
          s.flags.bunkerExposed = true;
          Ash.shiftRep("silt", 4, s);
          Ash.shiftKarma(-3, s);
          s.note = "He repeats the name once, quietly, so he won't say it wrong later at the trough.";
        },
        goto: "silt.square",
      },
    ],
  });

  N("silt.calderJoss", {
    scene: "silt",
    speaker: { id: "calder", name: "Calder" },
    text: "\"Joss drinks like the trough insulted her mother. Medical water is not a hobby.\" He waits to see if you have a reason or only a mood.",
    choices: [
      {
        label: "Her partner died on that Coil sightline. Write the cup.",
        if: function (st) {
          return st.flags.dry === "fair" || st.flags.dry === "calder";
        },
        fx: function (st) {
          st.flags.jossFavor = true;
          Ash.shiftKarma(3, st);
          st.note = "He writes her name small, in the column that isn't public. \"If she wastes it, it's your waste.\"";
        },
        goto: "silt.square",
      },
      {
        label: "Argue it anyway.",
        check: { skill: "speech", name: "Speech", mod: -8 },
        fx: function (st, ok) {
          if (ok) st.flags.jossFavor = true;
          else Ash.shiftRep("silt", -3, st);
        },
        success: "silt.jossFavorSet",
        failure: "silt.jossFavorNo",
      },
      { label: "Drop it.", goto: "silt.calder" },
    ],
  });

  N("silt.jossFavorSet", {
    scene: "silt",
    text: "He writes the name. He does not look glad. \"One cup. If I see her pour it into a bottle I will pour her into the road.\"",
    choices: [{ label: "Fair.", goto: "silt.square" }],
  });

  N("silt.jossFavorNo", {
    scene: "silt",
    text: "\"No.\" Calder returns to the tally. The word is complete. Joss will have to be paid in peaches or scrip or left to her trough.",
    choices: [{ label: "All right.", goto: "silt.square" }],
  });

  N("silt.nim", {
    scene: "silt",
    speaker: { id: "nim", name: "Nim" },
    onEnter: function (s) {
      s.flags.metNim = true;
    },
    text: function (s) {
      var base =
        "Nim's tent smells like boiled cloth and metal. Her hands are faintly yellow to the wrist. \"If you're bleeding, sit. If you're talking, bleed quieter.\" A boy coughs outside and she doesn't look; she already knows which cough.";
      if (s.flags.nim === "done") base += " The shelf behind her has a new row of kits that don't look like apologies.";
      return base;
    },
    choices: function (s) {
      var c = [];
      var cost = s.flags.nimHeal ? 0 : 8;
      c.push({
        label: cost ? "Let her work. (8 scrip)" : "Let her work. She waves off the scrip.",
        if: function (st) {
          return st.flags.nimHeal || st.scrip >= 8;
        },
        fx: function (st) {
          if (!st.flags.nimHeal) st.scrip -= 8;
          var before = st.hp;
          Ash.heal(Math.floor(Ash.maxHp(st) * 0.55), st);
          Ash.addRads(-18, st);
          st.note = "Nim stitches like she's angry at the wound. You come out " + (st.hp - before) + " healthier and less luminous.";
        },
        goto: "silt.nim",
      });
      if (s.flags.nim === "none") c.push({ label: "You look like someone who needs a thing fetched.", goto: "silt.nimStart" });
      if (s.flags.nim === "started" && (Ash.invCount("hogGland", s) >= 2 || s.flags.choirSalts)) {
        c.push({ label: "Settle the debt.", goto: "silt.nimDone" });
      }
      c.push({
        label: "Ask where the glow is.",
        fx: function (st) {
          Ash.learn("crater", st);
          st.note = "\"South. Don't lick the glass. People do. I get their teeth in a cup.\"";
        },
        goto: "silt.nim",
      });
      if (s.flags.nim === "done" && (s.flags.nimAffection || 0) >= 10 && !s.flags.nimFlirtDone) {
        c.push({
          label: "Tell her the tent feels less like a clinic when she's in it.",
          check: { skill: "speech", name: "Speech", mod: 5 },
          success: "silt.nimFlirtOk",
          failure: "silt.nimFlirtNo",
        });
        c.push({
          label: "Ask if she ever puts the iodine down for a night.",
          check: { attr: "cha", name: "Charm", mod: 0 },
          success: "silt.nimFlirtOk",
          failure: "silt.nimFlirtNo",
        });
      }
      c.push({ label: "Leave her to the cough.", goto: "silt.square" });
      return c;
    },
  });

  N("silt.nimStart", {
    scene: "silt",
    speaker: { id: "nim", name: "Nim" },
    text: "\"Grit-hog glands. Two. The wallow's on Scrap Ridge when the smell is fresh. Or walk to the Glass Choir and make them give up a twist of their salt — I owe a woman in a shawl and I don't walk into glow.\" She flexes a yellow hand. \"Do it and my kits stop being theoretical.\"",
    choices: [
      {
        label: "I'll get it.",
        fx: function (s) {
          s.flags.nim = "started";
          Ash.learn("scrap", s);
          Ash.learn("crater", s);
        },
        goto: "silt.nim",
      },
      { label: "Not my errand.", goto: "silt.nim" },
    ],
  });

  N("silt.nimDone", {
    scene: "silt",
    speaker: { id: "nim", name: "Nim" },
    text: function (s) {
      if (s.flags.choirSalts && Ash.invCount("hogGland", s) < 2) {
        return "You put the Choir's salt in her palm. Nim doesn't thank the glow. She thanks the jar. \"This pays a woman and stocks me. Your kits will work harder. Try not to need the demonstration.\"";
      }
      return "Two glands hit the tray and the tray regrets it. Nim's mouth tightens, which is her version of pleased. \"I'll render them. You'll get kits that actually finish the job. Wash your hands before you touch a child.\"";
    },
    choices: [
      {
        label: "Done.",
        fx: function (st) {
          if (Ash.invCount("hogGland", st) >= 2) {
            Ash.invRemove("hogGland", 1, st);
            Ash.invRemove("hogGland", 1, st);
          } else st.flags.choirSalts = false;
          st.flags.nim = "done";
          st.flags.nimHeal = true;
          st.scrip += 20;
          Ash.shiftKarma(4, st);
          Ash.xpAward(60, st);
          if (Ash.bumpNim) Ash.bumpNim(18, st);
        },
        goto: "silt.square",
      },
    ],
  });

  N("silt.pebble", {
    scene: "silt",
    speaker: { id: "pebble", name: "Pebble" },
    onEnter: function (s) {
      s.flags.metPebble = true;
    },
    text: "Pebble sells off a blanket that used to be a car seat. Prices are written up her wrist in grease pencil, which keeps haggling intimate. She smiles with too many teeth. \"I sell what the ground didn't want. The ground didn't want you either. Here we are.\"",
    choices: function (s) {
      var c = [
        { label: "See what she's selling.", shop: "pebble" },
        { label: "Ask about a filter core.", goto: "silt.pebbleCore" },
      ];
      if (Ash.invCount("hogGland", s) > 0) {
        c.push({
          label: "Sell a grit-hog gland.",
          fx: function (st) {
            if (!Ash.invRemove("hogGland", 1, st)) return;
            st.scrip += 16;
            st.note = "She wraps it like it might bite the other goods. Sixteen scrip.";
          },
          goto: "silt.pebble",
        });
      }
      c.push({ label: "Leave the blanket.", goto: "silt.square" });
      return c;
    },
  });

  N("silt.pebbleCore", {
    scene: "silt",
    speaker: { id: "pebble", name: "Pebble" },
    text: function (s) {
      if (Ash.hasCore(s)) {
        return "Her eyes go to the pack and stay there, polite as a knife. \"I'll give you one-sixty and a wrap so it doesn't hum at the trough. Or you can walk around like a saint with a appliance. Your trouble.\"";
      }
      if (s.flags.pebbleCoreGone) return "\"I had one. I don't. The ground is fresh out of miracles and so am I.\"";
      var helped = s.flags.dry === "fair" || s.flags.dry === "calder";
      if (helped && s.flags.prices !== "surcharge") {
        return "\"For you, fifty-five. You unclogged Calder's mood and my wrist hates a mood.\" She taps a crate that hums when the wind hits it wrong. \"Don't tell the trough. The trough gossips.\"";
      }
      if (s.flags.dry === "reed") {
        return "\"Calder's sour, so my discount is dead. Two-twenty. One-eighty if you can haggle without crying. I sat on this crate through two owners. I can sit longer than you can breathe down there.\"";
      }
      return "\"I have a core. You have a face. Faces don't buy crates.\" She licks a thumb and checks her wrist. \"Help Calder with his water sulk, or bring a stupid amount of scrip. Two-twenty. I'll hear one-eighty if the hearing is expensive.\"";
    },
    choices: function (s) {
      var c = [];
      if (Ash.hasCore(s)) {
        c.push({
          label: "Sell it. One hundred and sixty.",
          fx: function (st) {
            Ash.invRemove("filterCore", 1, st);
            st.scrip += 160;
            st.flags.coreFate = "sold";
            st.flags.pebbleCoreGone = true;
            Ash.shiftKarma(-12, st);
            Ash.shiftRep("bunker", -18, st);
          },
          goto: "silt.pebbleSold",
        });
      } else if (!s.flags.pebbleCoreGone) {
        var price = Ash.corePrice();
        var helped = (s.flags.dry === "fair" || s.flags.dry === "calder") && s.flags.prices !== "surcharge";
        if (helped) {
          c.push({
            label: "Buy it (" + price + " scrip).",
            if: function (st) {
              return st.scrip >= Ash.corePrice();
            },
            fx: function (st) {
              var p = Ash.corePrice();
              if (st.scrip < p) return;
              st.scrip -= p;
              Ash.takeCore("pebble");
              st.flags.pebbleCoreGone = true;
            },
            goto: "silt.pebbleBuy",
          });
        }
        c.push({
          label: "Haggle the fortune price.",
          if: function (st) {
            return !st.flags.fortuneCut && !helped;
          },
          check: { skill: "barter", name: "Barter", mod: -10 },
          fx: function (st, ok) {
            if (ok) st.flags.fortuneCut = true;
          },
          success: "silt.pebbleHaggleOk",
          failure: "silt.pebbleHaggleNo",
        });
        var fortune = s.flags.fortuneCut ? 180 : 220;
        if (!helped) {
          c.push({
            label: "Pay the fortune (" + fortune + ").",
            if: function (st) {
              return st.scrip >= (st.flags.fortuneCut ? 180 : 220);
            },
            fx: function (st) {
              var p = st.flags.fortuneCut ? 180 : 220;
              if (st.scrip < p) return;
              st.scrip -= p;
              Ash.takeCore("pebble");
              st.flags.pebbleCoreGone = true;
            },
            goto: "silt.pebbleBuy",
          });
        }
      }
      c.push({ label: "Not today.", goto: "silt.pebble" });
      return c;
    },
  });

  N("silt.pebbleHaggleOk", {
    scene: "silt",
    speaker: { id: "pebble", name: "Pebble" },
    text: "She rewrites her wrist. \"One-eighty. I hope the bunker chokes slower than my profit. Bring the money, not a speech.\"",
    choices: [{ label: "Count your scrip.", goto: "silt.pebbleCore" }],
  });

  N("silt.pebbleHaggleNo", {
    scene: "silt",
    speaker: { id: "pebble", name: "Pebble" },
    text: "\"Cute.\" She underlines a number that was already underlined. \"Two-twenty. I don't discount pride. Come back with the water problem fixed or with a heavier pocket.\"",
    choices: [{ label: "Fine.", goto: "silt.pebble" }],
  });

  N("silt.pebbleBuy", {
    scene: "silt",
    speaker: { id: "pebble", name: "Pebble" },
    text: "The crate gives up a copper-collared tin that hums against your ribs. Pebble wraps it in a shirt that has given up being a shirt. \"If you drop it, don't. If you tell the trough, I'll tell the trough what you paid.\"",
    choices: [{ label: "Tuck it away.", goto: "silt.square" }],
  });

  N("silt.pebbleSold", {
    scene: "silt",
    speaker: { id: "pebble", name: "Pebble" },
    text: "She pays in mixed scrip and one coin you're sure is a button. The hum leaves your pack and enters her crate. Somewhere under the ash a gauge is still counting, and it did not get a vote.",
    choices: [
      { label: "Walk away from the errand.", ending: "sold" },
      { label: "Stay in camp. The clock can wait on you.", goto: "silt.square" },
    ],
  });

  N("silt.joss", {
    scene: "silt",
    speaker: { id: "joss", name: "Joss" },
    onEnter: function (s) {
      s.flags.metJoss = true;
      s.joss.met = true;
    },
    text: function (s) {
      if (!s.joss.alive) return "The trough remembers her by a strip of cloth and a clean space nobody uses.";
      if (s.joss.parted) return "Joss looks at you like a door she already closed. \"I said what I said on the slope. Buy a drink or don't. I'm not walking anywhere with you.\"";
      if (s.joss.recruited) {
        return s.joss.following
          ? "Joss checks the ridge with her eyes and the bottle with her thumb. \"I'm here. Don't get used to the company. I don't.\""
          : "She's back at the trough, boots off one heel. \"You again. I was almost comfortable. That's your fault.\"";
      }
      return "Joss drinks like it's marksmanship. The laugh comes half a second late, after she's checked who heard it. A pipe rifle leans where her hand can find it without looking. \"I shoot better than I talk. That's the kindest thing I'll say about me.\"";
    },
    choices: function (s) {
      var c = [];
      if (!s.joss.alive || s.joss.parted) {
        c.push({ label: "Leave it.", goto: "silt.square" });
        return c;
      }
      if (!s.flags.jossHeardStory) {
        c.push({ label: "Who are you when you're not at the trough?", goto: "silt.jossWho" });
      }
      if (s.flags.jossQuest === "none") c.push({ label: "You watch the ridge like it owes you.", goto: "silt.jossLook" });
      if (s.flags.lookoutCleared && !s.joss.recruited) {
        c.push({
          label: "Come with me. Sober enough to aim.",
          check: { skill: "speech", name: "Speech", mod: s.flags.jossSpeechFailed ? -12 : 0 },
          success: "silt.jossJoinOk",
          failure: "silt.jossJoinFail",
          fx: function (st, ok) {
            if (ok) {
              st.joss.recruited = true;
              st.joss.following = true;
              st.joss.hp = st.joss.maxHp;
              Ash.xpAward(25, st);
              Ash.shiftKarma(2, st);
              if (Ash.bumpJoss) Ash.bumpJoss(12, st);
            } else st.flags.jossSpeechFailed = true;
          },
        });
        c.push({
          label: "Pay her tab with two canned peaches.",
          if: function (st) {
            return Ash.invCount("cannedPeach", st) >= 2;
          },
          fx: function (st) {
            Ash.invRemove("cannedPeach", 1, st);
            Ash.invRemove("cannedPeach", 1, st);
            st.joss.recruited = true;
            st.joss.following = true;
            st.joss.hp = st.joss.maxHp;
            Ash.xpAward(25, st);
            if (Ash.bumpJoss) Ash.bumpJoss(10, st);
            st.note = "She eats one like it insulted her and pockets the other. \"Fine. I walk. Don't narrate it.\"";
          },
          goto: "silt.square",
        });
        c.push({
          label: "Clear her tab. Thirty scrip.",
          if: function (st) {
            return st.scrip >= 30;
          },
          fx: function (st) {
            st.scrip -= 30;
            st.joss.recruited = true;
            st.joss.following = true;
            st.joss.hp = st.joss.maxHp;
            Ash.xpAward(25, st);
            if (Ash.bumpJoss) Ash.bumpJoss(10, st);
            st.note = "Pebble's runner takes the scrip before Joss can pretend not to care. She cares enough to stand up.";
          },
          goto: "silt.square",
        });
        c.push({
          label: "Calder put a medical cup on her nail.",
          if: function (st) {
            return st.flags.jossFavor;
          },
          fx: function (st) {
            st.joss.recruited = true;
            st.joss.following = true;
            st.joss.hp = st.joss.maxHp;
            Ash.xpAward(25, st);
            Ash.shiftKarma(2, st);
            if (Ash.bumpJoss) Ash.bumpJoss(14, st);
            st.note = "She hears about the cup and goes quiet in the good way. \"All right. Don't make it a story.\"";
          },
          goto: "silt.square",
        });
      }
      if (s.joss.recruited) {
        c.push({
          label: s.joss.following ? "Wait here. I'll be back through." : "Walk with me.",
          fx: function (st) {
            st.joss.following = !st.joss.following;
            st.note = st.joss.following ? "She falls in, rifle first." : "\"I'll be at the trough. Don't die interesting.\"";
          },
          goto: "silt.square",
        });
      }
      if (s.joss.alive && !s.joss.parted && !s.flags.jossDrinkShared) {
        c.push({
          label: "Buy her a drink and share it.",
          if: function (st) { return st.scrip >= 6; },
          fx: function (st) {
            st.scrip -= 6;
            st.flags.jossDrinkShared = true;
            if (Ash.bumpJoss) Ash.bumpJoss(10, st);
            st.note = "The bottle goes back and forth. Joss's late laugh arrives almost on time. \"You're paying for a habit. Don't make it a hobby.\"";
          },
          goto: "silt.joss",
        });
      }
      if (s.joss.alive && !s.joss.parted && (s.joss.affection || 0) >= 12 && !s.flags.jossFlirtDone) {
        c.push({
          label: "Tell her the trough's less interesting than she is.",
          check: { skill: "speech", name: "Speech", mod: 0 },
          success: "silt.jossFlirtOk",
          failure: "silt.jossFlirtNo",
        });
        c.push({
          label: "Ask, carefully, if she ever rests with company.",
          check: { attr: "cha", name: "Charm", mod: -5 },
          success: "silt.jossFlirtOk",
          failure: "silt.jossFlirtNo",
        });
      }
      c.push({ label: "Leave her the bottle.", goto: "silt.square" });
      return c;
    },
  });

  N("silt.jossWho", {
    scene: "silt",
    speaker: { id: "joss", name: "Joss" },
    text: "\"I shot for a caravan that thought it was a town. The town ended. I kept the rifle and lost the part where I talk first.\" She kills the laugh before it starts. \"If you're recruiting, don't. I'm expensive in bad decisions.\"",
    choices: [
      {
        label: "Honest enough. I'll keep the score clean.",
        fx: function (s) {
          s.flags.jossHeardStory = true;
          if (Ash.bumpJoss) Ash.bumpJoss(8, s);
        },
        goto: "silt.joss",
      },
      {
        label: "Fair enough.",
        fx: function (s) {
          s.flags.jossHeardStory = true;
          if (Ash.bumpJoss) Ash.bumpJoss(3, s);
        },
        goto: "silt.joss",
      },
    ],
  });

  N("silt.jossLook", {
    scene: "silt",
    speaker: { id: "joss", name: "Joss" },
    text: "She points with the bottle, not her finger. \"Coil lookout on the cable spool west of their truck. They shot my partner for walking on a ridge the ridge didn't own. Clear them. Then maybe I walk with somebody again. Maybe I don't.\" The maybe is doing a lot of work.",
    choices: [
      {
        label: "I'll clear the lookout.",
        fx: function (s) {
          s.flags.jossQuest = "started";
          Ash.learn("coil", s);
          if (Ash.bumpJoss) Ash.bumpJoss(4, s);
        },
        goto: "silt.square",
      },
      { label: "That's a lot of maybe.", goto: "silt.joss" },
    ],
  });

  N("silt.jossJoinOk", {
    scene: "silt",
    speaker: { id: "joss", name: "Joss" },
    text: "She stands. The bottle stays. The rifle comes. \"You sound like a person with a place to be. Don't get poetic when I shoot. I hate a narrator.\"",
    choices: [{
      label: "Then let's walk.",
      fx: function (s) { if (Ash.bumpJoss) Ash.bumpJoss(12, s); },
      goto: "silt.square",
    }],
  });

  N("silt.jossJoinFail", {
    scene: "silt",
    speaker: { id: "joss", name: "Joss" },
    text: "She laughs late. \"You sound like a foreman. I buried the last one who recruited me with a tone.\" The rifle doesn't move. \"Pay the tab or bring peaches. Money doesn't make speeches.\"",
    choices: [{ label: "Noted.", goto: "silt.joss" }],
  });

  N("silt.tic", {
    scene: "silt",
    speaker: { id: "tic", name: "Tic" },
    onEnter: function (s) {
      s.flags.metTic = true;
    },
    text: function (s) {
      if (s.flags.toldTicRadio) {
        return "Tic taps the cistern rim in a pattern he isn't charging you for. \"Juniper,\" he says, smaller. \"I don't need the tower to say it anymore. I still like that it can.\"";
      }
      if (s.flags.towerFixed) {
        return "He's waiting, which is a loud thing on a small person. \"Did it say her name all the way through this time?\"";
      }
      return "Tic is maybe ten and already dusty in the permanent way. He taps Morse on his knee and doesn't notice. \"The tower keeps saying a name. Juniper. She sounds like she ran out of air halfway through a word. Can you put the tooth back in the radio?\"";
    },
    choices: function (s) {
      var c = [];
      if (!s.flags.ticAsked) {
        c.push({
          label: "Where's the tooth come from?",
          fx: function (st) {
            st.flags.ticAsked = true;
            Ash.learn("tower", st);
            st.note = "\"Pebble has a glass bulb she calls a paperweight. The ridge eats cars that still have dashboards. I'm not allowed up either place.\"";
          },
          goto: "silt.tic",
        });
      }
      if (s.flags.towerFixed && !s.flags.toldTicRadio) c.push({ label: "Tell him the truth, all of it.", goto: "silt.ticTold" });
      c.push({ label: "Leave him the rhythm.", goto: "silt.square" });
      return c;
    },
  });

  N("silt.ticTold", {
    scene: "silt",
    speaker: { id: "tic", name: "Tic" },
    text: function (s) {
      var late = s.flags.toldCalderRadio || s.flags.toldMaraRadio || s.flags.toldChoirRadio;
      var first = late
        ? "\"You told the camp before you told me.\" He doesn't cry. He taps harder. "
        : "He doesn't cry. His knee does, in code. ";
      return (
        first +
        "\"Juniper was my mother's bunker-name. Reed says don't repeat it. He's wrong.\" He pushes a strip of dried rat into your hand like a medal. \"The signal walked east of the tower and stopped. If you go, don't smile at anything that smiles first.\""
      );
    },
    choices: [
      {
        label: "Keep the rat. Keep the warning.",
        fx: function (st) {
          st.flags.toldTicRadio = true;
          st.flags.silentSafe = true;
          Ash.learn("silent", st);
          if (!Ash.invAdd("driedRat", 1, st)) Ash.groundAdd("silt", "driedRat", 1, st);
          Ash.shiftKarma(6, st);
          Ash.xpAward(20, st);
        },
        goto: "silt.square",
      },
    ],
  });

  N("reed.yard", {
    hub: true,
    scene: "reed",
    onEnter: function (s) {
      Ash.markJoss(s);
    },
    text: function (s) {
      if (s.flags.reedDead) {
        return join([
          "The pump handle sticks halfway. The shack door bangs once and then thinks better of it. Wind does the talking Reed isn't here to do.",
          Ash.lungsWhisper(s),
        ]);
      }
      if (s.flags.reedHostile) {
        return join([
          "Reed is on the pump with a wrench he isn't using as a wrench. \"You don't get shade here. Say your piece from the road or don't say it.\"",
          s._jossLine,
        ]);
      }
      var base = s.flags.metReed
        ? "The claim is a shack, a pump, and a man who speaks to the dirt more than to you. The dirt seems further along in the conversation."
        : "Reed's claim is a low shack and a hand pump arguing with cracked ground. A single scrub bush has decided to live anyway. Reed has dirt under every nail and no interest in your boots.";
      if (s.flags.dry === "fair") base = "The pump runs where people can see it. Reed still looks like he expects the daylight to charge rent.";
      return join([base, s._jossLine, Ash.lungsWhisper(s)]);
    },
    choices: function (s) {
      var c = [];
      if (!s.flags.reedDead) c.push({ label: "Talk to Reed.", goto: "reed.talk" });
      c.push({ label: "Look at the seep.", goto: "reed.seep" });
      c.push({ label: "The shack.", goto: "reed.shack" });
      return c;
    },
  });

  N("reed.talk", {
    scene: "reed",
    speaker: { id: "reed", name: "Reed" },
    onEnter: function (s) {
      s.flags.metReed = true;
      if (s.flags.dry === "none") s.flags.dry = "started";
    },
    text: function (s) {
      if (s.flags.reedHostile) return "\"I said the road.\" Reed's wrench agrees with him.";
      if (s.flags.dry === "fair") return "\"Noon count,\" he says, like the words itch. \"Tic's cup stays full. You did a thing. Don't linger and turn it into a friendship.\"";
      if (s.flags.stoleLog && s.flags.reedLog) return "He sees the shape of the notebook in your pack and his face closes like a shutter. \"You take a man's numbers, you can at least stand there and be a thief out loud.\"";
      return "Reed squints past you at the seep. \"Calder counts water like it owes him rent. It doesn't. I do. Night draw's for the boy. Daylight's for whoever shouts. I am done shouting at a dam.\"";
    },
    choices: function (s) {
      var c = [];
      if (s.flags.reedHostile) {
        c.push({
          label: "Put the wrench down. Talk.",
          check: { skill: "speech", name: "Speech", mod: -20 },
          fx: function (st, ok) {
            if (ok) st.flags.reedHostile = false;
          },
          success: "reed.cooled",
          failureCombat: {
            enemies: ["reed"],
            then: "reed.after",
            fleeTo: "reed.yard",
            intro: "Reed is done being a conversation.",
            onWin: function (st) {
              st.flags.reedBeaten = true;
            },
          },
        });
        c.push({
          label: "Fight him.",
          combat: {
            enemies: ["reed"],
            then: "reed.after",
            fleeTo: "silt.square",
            intro: "The claim gets small in a hurry.",
            onWin: function (st) {
              st.flags.reedBeaten = true;
            },
          },
        });
        c.push({ label: "Back off.", goto: "reed.yard" });
        return c;
      }
      if (s.flags.dry === "fair" || s.flags.dry === "calder" || s.flags.dry === "reed") {
        c.push({ label: "Leave him to the pump.", goto: "reed.yard" });
        return c;
      }
      c.push({ label: "Talk about the seep.", goto: "reed.seepTalk" });
      if (s.flags.metTic) c.push({ label: "This is about Tic's cough, isn't it.", goto: "reed.tic" });
      if (s.flags.calderBook) c.push({ label: "Calder's book has a private cut. I saw it.", goto: "reed.showBook" });
      if (s.flags.stoleLog) {
        c.push({
          label: "I took the log. That was wrong. Read it with me anyway.",
          fx: function (st) {
            Ash.shiftKarma(3, st);
            st.flags.confessedLog = true;
          },
          goto: "reed.seepTalk",
        });
      }
      c.push({
        label: "Get off the claim the hard way.",
        combat: {
          enemies: ["reed"],
          then: "reed.after",
          fleeTo: "silt.square",
          intro: "You came to the pump looking for a fight. Reed is cooperative.",
          onWin: function (st) {
            st.flags.reedBeaten = true;
          },
        },
      });
      c.push({ label: "That's enough.", goto: "reed.yard" });
      return c;
    },
  });

  N("reed.cooled", {
    scene: "reed",
    speaker: { id: "reed", name: "Reed" },
    text: "The wrench becomes a wrench again. \"Talk, then. Don't waste the shade.\" He is not friendly. He is no longer a weapon.",
    choices: [{ label: "Talk.", goto: "reed.seepTalk" }],
  });

  N("reed.seepTalk", {
    scene: "reed",
    speaker: { id: "reed", name: "Reed" },
    text: "\"Night water's for Tic's wash. Nim says the dust cakes a kid's lungs worse than a man's. Calder's book has a hole in it the size of his trader. I won't walk into that rib and beg.\" He spits, misses the dust's opinion, and waits.",
    choices: function () {
      return [
        {
          label: "Split it in daylight. Write it down. Both of you.",
          check: {
            skill: "speech",
            name: "Speech",
            joss: true,
            mod: function (st) {
              var m = -12;
              if (st.flags.calderBook) m += 12;
              if (st.flags.reedLog && !st.flags.stoleLog) m += 10;
              if (st.flags.confessedLog) m += 4;
              if (st.flags.stoleLog && !st.flags.confessedLog) m -= 14;
              if (st.flags.seepInsight) m += 8;
              if (st.flags.metTic) m += 6;
              if (st.flags.calderAgreed) m += 10;
              return m;
            },
          },
          fx: function (st, ok) {
            if (!ok) {
              Ash.hurt(3, st);
              st.note = "The cup misses. The wrench doesn't, quite.";
              return;
            }
            st.flags.reedAgreed = true;
            if (!st.flags.reedLog) {
              st.flags.reedLog = true;
              Ash.invAdd("waterLog", 1, st);
            }
            Ash.shiftKarma(3, st);
            Ash.finishFairIfReady();
          },
          success: "reed.agreeOk",
          failure: "reed.agreeFail",
        },
        { label: "I'll look around first.", goto: "reed.yard" },
      ];
    },
  });

  N("reed.agreeOk", {
    scene: "reed",
    speaker: { id: "reed", name: "Reed" },
    text: function (s) {
      if (s.flags.dry === "fair") {
        return "Reed hears that Calder already flinched and almost smiles. It dies of embarrassment. \"Noon, then. The boy's cup stays. You can tell Calder I said a worse word than the one I'm saying.\"";
      }
      return "\"Take my yes to the rib. I won't perform it there. If he wants a signature he can read the log and be a person about it.\" Reed goes back to the pump like you were weather.";
    },
    choices: [{ label: "Leave the claim.", goto: "reed.yard" }],
  });

  N("reed.agreeFail", {
    scene: "reed",
    speaker: { id: "reed", name: "Reed" },
    text: "\"Come back with a fact or a fist. I'm busy.\" Your shoulder will remember the wrench longer than he will remember the speech. The seep keeps seeping, which feels like an insult.",
    choices: [{ label: "Give him the ground.", goto: "reed.yard" }],
  });

  N("reed.tic", {
    scene: "reed",
    speaker: { id: "reed", name: "Reed" },
    text: "The name lands. Reed's hands go still on the pump. \"He tap-codes when he thinks nobody's hired to listen. You listened. All right. The log's in the shack on a nail. I was going to pretend it was private.\" He jerks his chin. \"If you're kind, be kind quickly. Calder eats slow kindness.\"",
    choices: [
      {
        label: "Ask him to split the seep in daylight.",
fx: function (st, ok) {
            if (!ok) {
              Ash.hurt(3, st);
              return;
            }
            st.flags.reedLog = true;
            if (!Ash.invCount("waterLog", st)) Ash.invAdd("waterLog", 1, st);
          },
          check: { skill: "speech", name: "Speech", mod: 12, joss: true },
        success: "reed.ticOk",
        failure: "reed.agreeFail",
        /* check attached below via duplicate? I put check after fx accidentally.
           The engine reads check if present. fx runs inside check branch. Good.
           Wait, I set fx AND check. Engine: if check, fx(s, success), then dest.
           But I also need reedAgreed on success. The success node can set it... 
           better put in fx. */
      },
    ],
  });

  N("reed.ticOk", {
    scene: "reed",
    speaker: { id: "reed", name: "Reed" },
    onEnter: function (s) {
      s.flags.reedAgreed = true;
      if (!s.flags.reedLog) {
        s.flags.reedLog = true;
        Ash.invAdd("waterLog", 1, s);
      }
      Ash.shiftKarma(4, s);
      Ash.finishFairIfReady();
    },
    text: function (s) {
      if (s.flags.dry === "fair") return "It's done. Reed looks at the seep like it might apologize. It won't. The noon count will.";
      return "He'll take a daylight split. He still won't walk into Calder's rib. The log is yours to show, which is trust, so don't get cute with it.";
    },
    choices: [{ label: "Guard it.", goto: "reed.yard" }],
  });

  N("reed.showBook", {
    scene: "reed",
    speaker: { id: "reed", name: "Reed" },
    text: "You tell him about Pebble's cans, the off-book line, the groove in the page. Reed nods at the dirt. \"Then the camp can hear it, or Calder can. I don't care which door. I care that the night draw stops being the only honest number.\"",
    choices: [
      {
        label: "I'll say it at the cistern.",
        fx: function (s) {
          s.flags.reedWantsExpose = true;
          if (!s.flags.reedAgreed) {
            /* exposing is the reed path, not fair, unless calder also agrees */
          }
        },
        goto: "reed.yard",
      },
      {
        label: "Or we do the noon count and nobody has to bleed in public.",
        check: { skill: "speech", name: "Speech", mod: 6 },
        fx: function (st, ok) {
          if (!ok) return;
          st.flags.reedAgreed = true;
          Ash.finishFairIfReady();
        },
        success: "reed.agreeOk",
        failure: "reed.agreeFail",
      },
    ],
  });

  N("reed.seep", {
    scene: "reed",
    text: "The seep is a dark mouth in pale ground. A clay pipe shows a fresh crack, and the night mud is cut with small bootprints — a kid's, and a man's over them. Somebody also took a neat wedge out of the flow that doesn't match either print.",
    choices: [
      {
        label: "Read the mud.",
        check: { skill: "survival", name: "Survival", mod: 0 },
        success: "reed.seepOk",
        failure: "reed.seepFail",
      },
      { label: "Don't fall in.", goto: "reed.yard" },
    ],
  });

  N("reed.seepOk", {
    scene: "reed",
    text: "Night draw, small boots, one adult. And a second cut, tidier, upstream of Reed's mark — camp tools, not a homesteader's. Both stories are true and both are incomplete. That's the sort of fact that makes men angry in a useful way.",
    choices: [
      {
        label: "Keep the picture.",
        fx: function (s) {
          s.flags.seepInsight = true;
          Ash.xpAward(15, s);
        },
        goto: "reed.yard",
      },
    ],
  });

  N("reed.seepFail", {
    scene: "reed",
    text: "The bank is grease and grit. You wear it. A little of the seep's metal taste gets in your mouth and stays, like a coin you didn't agree to hold.",
    choices: [
      {
        label: "Spit and stand.",
        fx: function (s) {
          Ash.addRads(5, s);
          Ash.hurt(2, s);
        },
        goto: "reed.yard",
      },
    ],
  });

  N("reed.shack", {
    scene: "reed",
    text: function (s) {
      if (s.flags.reedDead) return "A nail where a notebook used to hang. The cups are gone. Whatever Reed was counting, the wind has the only copy.";
      if (s.flags.reedLog) return "The nail by the door is empty. You know where the notebook went.";
      return "The shack smells like dry onion and gun oil. A school notebook hangs on a nail, out of the weather and in the way of anyone who lives here. Reed is not a man who leaves his numbers by accident. He is a man who has to pump.";
    },
    choices: function (s) {
      var c = [];
      if (!s.flags.reedLog && !s.flags.reedDead) {
        c.push({
          label: "Take the log while he's on the pump.",
          check: {
            skill: "sneak",
            name: "Sneak",
            mod: function (st) {
              return st.flags.reedHostile ? -18 : 0;
            },
          },
          success: "reed.shedOk",
          failure: "reed.shedFail",
        });
      }
      c.push({ label: "Leave the shack.", goto: "reed.yard" });
      return c;
    },
  });

  N("reed.shedOk", {
    scene: "reed",
    text: "The notebook is cups in, cups out, and a column labeled TIC in a hand that pressed too hard. You take it. He will notice by dark. Thieves who plan to be kind should walk quickly.",
    choices: [
      {
        label: "Pocket it.",
        fx: function (s) {
          s.flags.reedLog = true;
          s.flags.stoleLog = true;
          Ash.invAdd("waterLog", 1, s);
          Ash.shiftKarma(-2, s);
          Ash.xpAward(15, s);
        },
        goto: "reed.yard",
      },
    ],
  });

  N("reed.shedFail", {
    scene: "reed",
    speaker: { id: "reed", name: "Reed" },
    text: "The nail squeaks. Reed fills the door. \"Get off my ground.\" There isn't a version of this where you were just looking. He is offering you the road with his shoulders, and the wrench is in the offer.",
    choices: [
      {
        label: "Apologize and mean it.",
        check: { skill: "speech", name: "Speech", mod: -10 },
        fx: function (st, ok) {
          if (ok) {
            Ash.shiftKarma(2, st);
            st.note = "He lets you leave. The shack is closed to you, and so is the easy version of his trust.";
            st.flags.reedSore = true;
          } else {
            st.flags.reedHostile = true;
          }
        },
        success: "reed.yard",
        failure: "reed.talk",
      },
      {
        label: "Don't apologize.",
        fx: function (st) {
          st.flags.reedHostile = true;
          Ash.shiftKarma(-3, st);
        },
        goto: "reed.talk",
      },
    ],
  });

  N("reed.after", {
    scene: "reed",
    text: "Reed is on the ground and angry about it, which means he is alive. The pump ticks. You can walk away with a beaten man behind you, or you can make the claim quiet in a way noon won't fix.",
    choices: [
      {
        label: "Spare him. The claim is Calder's now.",
        if: function (st) {
          return st.flags.reedBeaten && !st.flags.reedDead;
        },
        fx: function (st) {
          st.flags.reedHostile = true;
          Ash.resolveDry("calder");
          st.note = "He leaves with a sack and a silence you paid for. He will not help you later. He will remember the wrench.";
        },
        goto: "reed.spared",
      },
      {
        label: "Finish it.",
        if: function (st) {
          return st.flags.reedBeaten && !st.flags.reedDead;
        },
        fx: function (st) {
          st.flags.reedDead = true;
          st.flags.reedHostile = false;
          Ash.resolveDry("calder");
          Ash.shiftKarma(-12, st);
        },
        goto: "reed.killed",
      },
      { label: "Just go.", goto: "reed.yard" },
    ],
  });

  N("reed.spared", {
    scene: "reed",
    text: "Reed goes. The pump stays. Calder will call this a solution. The seep, which has no politics, keeps coming out of the ground.",
    choices: [{ label: "Back to the road.", goto: "reed.yard" }],
  });

  N("reed.killed", {
    scene: "reed",
    text: "The claim is quiet in the bad way. You will hear this pump in other rooms. The ash starts its edit on a man who wanted a fair count and got you instead.",
    choices: [{ label: "Don't look back.", goto: "reed.yard" }],
  });
})();
