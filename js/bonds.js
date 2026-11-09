/* Optional adult romances. Fade-to-black only. Save-safe. */
(function () {
  "use strict";
  var Ash = (window.Ash = window.Ash || {});

  Ash.AFF_JOSS_NIGHT = 40;
  Ash.AFF_NIM_NIGHT = 40;

  Ash.ensureRomance = function (s) {
    s = s || Ash.state;
    if (!s.joss) s.joss = {};
    if (typeof s.joss.affection !== "number") s.joss.affection = 0;
    if (typeof s.joss.romance !== "boolean") s.joss.romance = false;
    if (!s.flags) s.flags = Ash.blankFlags ? Ash.blankFlags() : {};
    if (typeof s.flags.nimAffection !== "number") s.flags.nimAffection = 0;
    if (typeof s.flags.nimRomance !== "boolean") s.flags.nimRomance = false;
    if (typeof s.flags.jossRomanceNo !== "boolean") s.flags.jossRomanceNo = false;
    if (typeof s.flags.nimRomanceNo !== "boolean") s.flags.nimRomanceNo = false;
    if (typeof s.flags.wellRestedUntil !== "number") s.flags.wellRestedUntil = 0;
    if (typeof s.flags.jossDrinkShared !== "boolean") s.flags.jossDrinkShared = false;
  };

  Ash.bumpJoss = function (n, s, why) {
    s = s || Ash.state;
    Ash.ensureRomance(s);
    if (!s.joss.alive || s.joss.parted) return;
    s.joss.affection = Ash.clamp((s.joss.affection || 0) + n, 0, 100);
  };

  Ash.bumpNim = function (n, s) {
    s = s || Ash.state;
    Ash.ensureRomance(s);
    s.flags.nimAffection = Ash.clamp((s.flags.nimAffection || 0) + n, 0, 100);
  };

  Ash.wellRested = function (s) {
    s = s || Ash.state;
    Ash.ensureRomance(s);
    return (s.flags.wellRestedUntil || 0) >= s.day;
  };

  Ash.grantWellRested = function (days, s) {
    s = s || Ash.state;
    Ash.ensureRomance(s);
    s.flags.wellRestedUntil = Math.max(s.flags.wellRestedUntil || 0, s.day + (days || 2));
  };

  Ash.JOSS_FLIRT_LINES = {
    bunker: "Joss leans on a pipe that doesn't deserve it. \"You keep looking at me like the concrete isn't the ugliest thing in the room. Careful.\"",
    hatch: "\"If you're going to smile at ash, smile at me instead. Same dust. Better company.\"",
    silt: "She bumps your shoulder with hers, light as a dare. \"Don't get ideas. Or do. I'm off-duty from pretending I don't notice.\"",
    reed: "\"Farm politics make me want a drink. Or a distraction that walks. Guess which one's standing there.\"",
    tower: "\"Radio's loud. You're louder, somehow, without talking. Annoyingly.\"",
    scrap: "\"Ridge's sharp. So's your mouth when you're honest. Keep both.\"",
    coil: "She checks your silhouette against the cable. \"Stay where I can waste a bullet for you. Romantic, I know.\"",
    crater: "\"Glow's pretty. You're... less radioactive. I'll take it.\"",
    silent: "She keeps her voice under the cold. \"Hold my sleeve if you need to. I'm not saying that twice.\"",
  };

  Ash.jossTravelLine = function (loc, s) {
    s = s || Ash.state;
    Ash.ensureRomance(s);
    if (!s.joss.recruited || !s.joss.following || !s.joss.alive || s.joss.parted) return "";
    if ((s.joss.affection || 0) >= 25) return Ash.JOSS_FLIRT_LINES[loc] || "";
    return Ash.JOSS_LINES[loc] || "";
  };

  Ash.romanceRestOffer = function (s) {
    s = s || Ash.state;
    Ash.ensureRomance(s);
    if (s.dead || s.ending || s.modal === "combat") return false;

    var jossOk =
      !s.flags.jossRomanceNo &&
      !s.joss.romance &&
      (s.flags.jossRomanceDefer || 0) < s.day &&
      s.joss.recruited &&
      s.joss.alive &&
      !s.joss.parted &&
      (s.joss.following || s.location === "silt") &&
      (s.joss.affection || 0) >= Ash.AFF_JOSS_NIGHT &&
      ["silt", "hatch", "tower"].indexOf(s.location) !== -1;

    if (jossOk) {
      Ash.goto(s.location === "silt" ? "romance.joss.bunk" : "romance.joss.camp");
      s.note = "";
      return true;
    }

    var nimOk =
      !s.flags.nimRomanceNo &&
      !s.flags.nimRomance &&
      (s.flags.nimRomanceDefer || 0) < s.day &&
      s.flags.nim === "done" &&
      s.flags.metNim &&
      (s.flags.nimAffection || 0) >= Ash.AFF_NIM_NIGHT &&
      s.location === "silt";

    if (nimOk) {
      Ash.goto("romance.nim.tent");
      s.note = "";
      return true;
    }
    return false;
  };

  function N(id, def) {
    Ash.nodes[id] = def;
  }

  N("romance.joss.bunk", {
    scene: "silt",
    speaker: { id: "joss", name: "Joss" },
    text: "Silt's bunkroom is a borrowed lean-to behind the cistern: canvas, two blankets that have opinions, and a lamp that flickers like it's embarrassed. Joss sits on the edge of the cot and doesn't pretend she walked you here by accident.\n\n\"I'm not asking for a speech,\" she says. \"I'm asking if you want the night to be quieter. Together. Adults. Door stays closed. Or you can sleep on your own and I'll still be here in the morning with a worse joke.\"",
    choices: function () {
      return [
        { label: "Stay. Keep it between us.", goto: "romance.joss.fade" },
        {
          label: "Not tonight — but thank you.",
          fx: function (st) {
            st.flags.jossRomanceDefer = st.day + 1;
            st.note = "She nods once, no frost. \"Then rest. I'll keep the ridge honest.\"";
            if (Ash.finishRest) Ash.finishRest();
          },
          goto: "silt.square",
        },
        {
          label: "Don't ask again.",
          fx: function (st) {
            st.flags.jossRomanceNo = true;
            st.note = "\"Heard. Boundaries are a kind of aim.\" She leaves you the better blanket.";
            if (Ash.finishRest) Ash.finishRest();
          },
          goto: "silt.square",
        },
      ];
    },
  });

  N("romance.joss.camp", {
    scene: "hatch",
    speaker: { id: "joss", name: "Joss" },
    text: "The road fire is a small, stubborn orange. Ash ticks in the dark. Joss sits close enough that your knees share a temperature.\n\n\"I'm not good at soft,\" she says. \"I am good at deciding. Tonight I decide I'd rather sleep next to someone who didn't leave me on a ridge. If that's too much, say so. No scorekeeping.\"",
    choices: function (s) {
      return [
        { label: "Stay by the fire with her.", goto: "romance.joss.fade" },
        {
          label: "Keep your own side of the coals.",
          fx: function (st) {
            st.flags.jossRomanceDefer = st.day + 1;
            st.note = "\"Fair.\" She rolls her coat into a pillow and doesn't make it weird.";
            if (Ash.finishRest) Ash.finishRest();
          },
          goto: "@hub",
        },
        {
          label: "Don't ask again.",
          fx: function (st) {
            st.flags.jossRomanceNo = true;
            st.note = "She tips two fingers off her brow. \"Copy.\"";
            if (Ash.finishRest) Ash.finishRest();
          },
          goto: "@hub",
        },
      ];
    },
  });

  N("romance.joss.fade", {
    scene: "silt",
    speaker: { id: "joss", name: "Joss" },
    text: "She laughs that late laugh, then softer. Fingers find a sleeve, then a pulse. The lamp is turned down. The ash outside keeps its own counsel.\n\n—\n\nFADE TO BLACK\n\n—\n\nMorning smells like tin coffee and canvas. Joss is already laced into her boots, hair doing its usual rebellion. She tosses you a canteen without looking quite at your face.\n\n\"Well,\" she says. \"That happened. Still walking. Still not narrating it.\" A beat. \"You snore like a polite engine. It's almost charming.\"",
    choices: [
      {
        label: "Match her understatement.",
        fx: function (st) {
          st.joss.romance = true;
          Ash.bumpJoss(20, st);
          Ash.grantWellRested(2, st);
          Ash.advanceDays(1, st.location, st);
          var before = st.hp;
          Ash.heal(Math.floor(Ash.maxHp(st) * 0.4) + 6, st);
          st.note =
            "Well Rested. The worst of the road unclenches (" +
            (st.hp - before) +
            "). Joss pretends not to watch you stand.";
        },
        goto: "@hub",
      },
    ],
  });

  N("romance.nim.tent", {
    scene: "silt",
    speaker: { id: "nim", name: "Nim" },
    text: "Nim's tent is tidy in the way of someone who has scrubbed blood out of worse fabrics. She ties the flap, washes yellow from her wrists, and looks at you like a chart that finally makes sense.\n\n\"I'm thirty-four and tired of pretending medicine is the only thing I keep,\" she says, plain. \"If you want company tonight — real company, grown, with the lamp low — say so. If you don't, I still stitch you tomorrow. No invoice for the refusal.\"",
    choices: [
      { label: "Stay. Softly.", goto: "romance.nim.fade" },
      {
        label: "Not tonight.",
        fx: function (st) {
          st.flags.nimRomanceDefer = st.day + 1;
          st.note = "She shrugs, already kind. \"Sleep wherever the coughs are quieter.\"";
          if (Ash.finishRest) Ash.finishRest();
        },
        goto: "silt.square",
      },
      {
        label: "Don't ask again.",
        fx: function (st) {
          st.flags.nimRomanceNo = true;
          st.note = "\"Understood. Boundaries keep people breathing.\" She hands you a clean fold of cloth anyway.";
          if (Ash.finishRest) Ash.finishRest();
        },
        goto: "silt.square",
      },
    ],
  });

  N("romance.nim.fade", {
    scene: "silt",
    speaker: { id: "nim", name: "Nim" },
    text: "She sets the iodine aside. Your name is said once, carefully. The cot complains; she doesn't. Outside, Silt argues about water. Inside, nobody does.\n\n—\n\nFADE TO BLACK\n\n—\n\nDawn finds Nim already boiling cloth, sleeves rolled, a private smile she pretends is steam. She bumps a tin cup into your hands.\n\n\"Pulse is fine,\" she says. \"Yours. Mine. Don't make me chart it. And if anyone asks why you look rested — tell them the kits worked.\"",
    choices: [
      {
        label: "Drink the tea. Don't chart it.",
        fx: function (st) {
          st.flags.nimRomance = true;
          Ash.bumpNim(20, st);
          Ash.grantWellRested(2, st);
          Ash.advanceDays(1, "silt", st);
          var before = st.hp;
          Ash.heal(Math.floor(Ash.maxHp(st) * 0.45) + 8, st);
          Ash.addRads(-8, st);
          st.note = "Well Rested. Nim's tea does something medicine can't bill (" + (st.hp - before) + ").";
        },
        goto: "silt.square",
      },
    ],
  });
})();
