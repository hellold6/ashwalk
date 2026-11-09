/* Draw the plates. All input is delegated. */
(function () {
  "use strict";
  var Ash = (window.Ash = window.Ash || {});

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function prose(text) {
    return esc(text)
      .split(/\n\n+/)
      .map(function (p) {
        return "<p>" + p.replace(/\n/g, "<br>") + "</p>";
      })
      .join("");
  }

  function sumAttrs(attrs) {
    var n = 0;
    Ash.ATTRS.forEach(function (a) {
      n += attrs[a[0]] || 0;
    });
    return n;
  }

  function preview() {
    var d = Ash.draft;
    var s = Ash.defaultState();
    s.attrs = Object.assign({}, d.attrs);
    s.tags = d.tags.slice();
    s.perks = [Ash.BACKGROUNDS[d.background].perk];
    s.level = 1;
    s.rads = 0;
    return s;
  }

  function choiceLabel(c, i) {
    var label = c.label;
    if (c.check) {
      var name = c.check.name || (Ash.SKILLS[c.check.skill] && Ash.SKILLS[c.check.skill].name) || "Check";
      label += " [" + name + " " + Ash.chanceOf(c.check) + "%]";
    }
    var n = i < 9 ? i + 1 + ". " : "";
    return n + label;
  }

  function titleHTML() {
    var can = Ash.save.hasAuto();
    return (
      '<div class="screen title-screen">' +
      '<div class="title-scene" aria-hidden="true"><div class="dune far"></div><div class="dune"></div><div class="hatch-mini"><b></b></div></div>' +
      '<div class="plate">' +
      '<p class="stamp">Bunker 7 · Surface order</p>' +
      '<h1 class="logo">Ashwalk<span class="s1"></span><span class="s2"></span></h1>' +
      "<p class=\"sub\">You were born under concrete. The scrubber is dying. The surface is worse.</p>" +
      '<div class="menu">' +
      '<button type="button" class="btn primary" data-act="new">New Game</button>' +
      '<button type="button" class="btn" data-act="continue"' +
      (can ? "" : " disabled") +
      ">Continue</button>" +
      '<button type="button" class="btn" data-act="open-load">Load</button>' +
      '<button type="button" class="btn" data-act="credits">Credits</button>' +
      "</div>" +
      '<p class="keys">Keys 1–9 choose. M map. I pack. C sheet. R rest.</p>' +
      "</div></div>" +
      (Ash.state.modal === "load" ? loadSheet(true) : "")
    );
  }

  function creditsHTML() {
    return (
      '<div class="screen credits">' +
      "<h1>Ashwalk</h1>" +
      "<p>Ashwalk is original work inspired by classic post-apocalyptic CRPGs. It is not affiliated with Bethesda or Microsoft.</p>" +
      "<p>No accounts. No network. Saves stay in this browser. The ash does not phone home.</p>" +
      "<p>Strength, Perception, Endurance, Charm, Intellect, Agility, Luck. Spend them like water.</p>" +
      '<button type="button" class="btn" data-act="title">Back</button>' +
      "</div>"
    );
  }

  function createHTML() {
    var d = Ash.draft;
    var bg = Ash.BACKGROUNDS[d.background];
    var left = Ash.ATTR_TOTAL - sumAttrs(d.attrs);
    var ps = preview();
    var cards = Object.keys(Ash.BACKGROUNDS)
      .map(function (id) {
        var b = Ash.BACKGROUNDS[id];
        var perk = Ash.PERKS[b.perk];
        return (
          '<button type="button" class="bg-card' +
          (id === d.background ? " on" : "") +
          '" data-act="bg" data-id="' +
          id +
          '"><b>' +
          esc(b.name) +
          "</b><small>" +
          esc(b.blurb) +
          " Perk: " +
          esc(perk.name) +
          ".</small></button>"
        );
      })
      .join("");
    var attrs = Ash.ATTRS.map(function (a) {
      return (
        '<div class="attr-row"><span class="name">' +
        esc(a[1]) +
        '</span><button type="button" class="step" data-act="attr" data-key="' +
        a[0] +
        '" data-d="-1" aria-label="Lower ' +
        esc(a[1]) +
        '">−</button><span class="val">' +
        d.attrs[a[0]] +
        '</span><button type="button" class="step" data-act="attr" data-key="' +
        a[0] +
        '" data-d="1" aria-label="Raise ' +
        esc(a[1]) +
        '">+</button></div>'
      );
    }).join("");
    var skills = Object.keys(Ash.SKILLS)
      .map(function (id) {
        var on = d.tags.indexOf(id) !== -1;
        var shown = Ash.skillValue(id, ps);
        return (
          '<div class="skill-row"><button type="button" class="tagbtn' +
          (on ? " on" : "") +
          '" data-act="tag" data-id="' +
          id +
          '" aria-pressed="' +
          (on ? "true" : "false") +
          '"><b>' +
          esc(Ash.SKILLS[id].name) +
          "</b> · " +
          shown +
          (on ? " · tagged" : "") +
          "</button></div>"
        );
      })
      .join("");
    return (
      '<div class="screen create">' +
      '<button type="button" class="btn ghost" data-act="title">Title</button>' +
      "<h1>Papers</h1>" +
      "<p class=\"lede\">" +
      esc(bg.flavor) +
      "</p>" +
      (d.error ? '<p class="err">' + esc(d.error) + "</p>" : "") +
      '<label class="field"><span>Name</span><input id="pc-name" type="text" maxlength="16" autocomplete="off" value="' +
      esc(d.name) +
      '" placeholder="What they call you"></label>' +
      "<h2>Background</h2><div class=\"cards\">" +
      cards +
      "</div>" +
      "<h2>Attributes <span class=\"pool\">" +
      left +
      " to spend</span></h2>" +
      "<p>Base is set by the life you had. Five points on top of that. Nothing under 1, nothing over 10.</p>" +
      attrs +
      "<h2>Tag three skills</h2>" +
      skills +
      '<div class="preview">' +
      "<div>HP <b>" +
      Ash.maxHp(ps) +
      "</b></div><div>AP <b>" +
      Ash.maxAp(ps) +
      "</b></div><div>Carry <b>" +
      Ash.carryMax(ps) +
      "</b></div><div>Rad resist <b>" +
      Ash.radResist(ps) +
      "</b></div><div>Speech bonus <b>+" +
      Ash.speechBonus(ps) +
      "</b></div><div>Perk <b>" +
      esc(Ash.PERKS[bg.perk].name) +
      "</b></div></div>" +
      '<p><button type="button" class="btn primary" data-act="confirm">Confirm and open the hatch</button></p>' +
      "</div>"
    );
  }

  function hudHTML(s) {
    var max = Ash.maxHp(s);
    var low = s.hp * 3 < max;
    var lungs = s.flags.lungsSaved ? 14 : Math.max(0, s.lungs);
    var pct = s.flags.lungsSaved ? 100 : Math.max(0, Math.round((s.lungs / 14) * 100));
    var cls = s.flags.lungsSaved ? "hold" : s.lungs <= 2 ? "bad" : s.lungs <= 5 ? "warn" : "";
    var label = s.flags.lungsSaved ? "Holding" : s.lungs + "d";
    return (
      '<header class="hud">' +
      '<div class="hud-top"><div class="locname">' +
      esc((Ash.LOCATIONS[s.location] || {}).name || "") +
      '</div><div class="day">Day ' +
      s.day +
      "</div></div>" +
      '<div class="hud-stats">' +
      '<div class="stat' +
      (low ? " low" : "") +
      '">HP <b>' +
      s.hp +
      "/" +
      max +
      "</b></div>" +
      '<div class="stat">AP <b>' +
      Ash.maxAp(s) +
      "</b></div>" +
      '<div class="stat">Rads <b>' +
      s.rads +
      "</b></div>" +
      '<div class="stat">Scrip <b>' +
      s.scrip +
      "</b></div>" +
      "</div>" +
      '<div class="lungs ' +
      cls +
      '"><span>Lungs</span><span class="track"><i style="width:' +
      pct +
      '%"></i></span><span>' +
      label +
      "</span></div></header>"
    );
  }

  function playHTML() {
    var s = Ash.state;
    var speaker = Ash.currentSpeaker();
    var who = speaker
      ? '<div class="who"><div class="mark mark-' +
        esc(speaker.id) +
        '"></div><div class="nm">' +
        esc(speaker.name) +
        "</div></div>"
      : "";
    var choices = Ash.choiceList()
      .map(function (c, i) {
        return (
          '<button type="button" class="choice" data-act="choice" data-i="' +
          i +
          '">' +
          esc(choiceLabel(c, i)) +
          "</button>"
        );
      })
      .join("");
    var safe = Ash.safeToRest(s);
    return (
      '<div class="screen play">' +
      hudHTML(s) +
      '<div class="stage">' +
      Ash.sceneHTML(Ash.currentScene()) +
      '<article class="paper">' +
      who +
      (s.checkNote ? '<div class="checknote">' + esc(s.checkNote) + "</div>" : "") +
      (s.note ? '<div class="note">' + esc(s.note) + "</div>" : "") +
      '<div class="prose" id="prose" aria-live="polite">' +
      prose(Ash.currentText()) +
      "</div>" +
      '<div class="choices">' +
      choices +
      "</div></article></div>" +
      '<nav class="dock">' +
      '<button type="button" data-act="open-map">Map</button>' +
      '<button type="button" data-act="open-pack">Pack</button>' +
      '<button type="button" data-act="open-sheet">Sheet</button>' +
      '<button type="button" data-act="rest"' +
      (safe ? "" : ' class="off"') +
      ">Rest</button></nav></div>" +
      overlay()
    );
  }

  function overlay() {
    var s = Ash.state;
    if (s.modal === "inventory") return sheetWrap("Pack", inventoryInner());
    if (s.modal === "character") return sheetWrap("Sheet", sheetInner());
    if (s.modal === "map") return sheetWrap("Ash Range", mapInner());
    if (s.modal === "shop") return sheetWrap(s.shop && s.shop.vendor === "moss" ? "Moss" : "Pebble", shopInner());
    if (s.modal === "levelup") return sheetWrap("Level " + s.level, levelInner(), true);
    if (s.modal === "combat" && s.combat) return sheetWrap("Contact", combatInner(), true);
    if (s.modal === "load") return loadSheet(false);
    return "";
  }

  function sheetWrap(title, inner, locked) {
    return (
      '<div class="overlay" role="dialog" aria-modal="true">' +
      '<div class="sheet"><div class="sheet-head"><h2>' +
      esc(title) +
      "</h2>" +
      (locked ? "" : '<button type="button" class="icon-x" data-act="close" aria-label="Close">×</button>') +
      "</div>" +
      inner +
      "</div></div>"
    );
  }

  function inventoryInner() {
    var s = Ash.state;
    var w = Ash.invWeight(s);
    var max = Ash.carryMax(s);
    var pct = Math.min(100, Math.round((w / max) * 100));
    var rows = Object.keys(s.inv)
      .filter(function (id) {
        return s.inv[id] > 0 && Ash.ITEMS[id];
      })
      .map(function (id) {
        var item = Ash.ITEMS[id];
        var eq = s.equip.weapon === id || s.equip.armor === id;
        var acts = "";
        if (item.kind === "consumable") acts += '<button type="button" class="mini" data-act="use" data-id="' + id + '">Use</button>';
        if (item.kind === "weapon" || item.kind === "armor") {
          acts +=
            '<button type="button" class="mini' +
            (eq ? " on" : "") +
            '" data-act="equip" data-id="' +
            id +
            '">' +
            (eq ? "Unequip" : "Equip") +
            "</button>";
        }
        if (item.kind === "quest") acts += '<button type="button" class="mini" data-act="inspect" data-id="' + id + '">Look</button>';
        else acts += '<button type="button" class="mini" data-act="drop" data-id="' + id + '">Drop</button>';
        return (
          '<div class="inv-row"><div class="meta"><b>' +
          esc(item.name) +
          (s.inv[id] > 1 ? " ×" + s.inv[id] : "") +
          (eq ? " · worn" : "") +
          "</b><small>" +
          esc(item.desc) +
          " · " +
          (item.w || 0) +
          " wt</small></div><div class=\"acts\">" +
          acts +
          "</div></div>"
        );
      })
      .join("");
    if (!rows) rows = "<p>Pack's empty except for dust and intention.</p>";
    var confirm = "";
    if (s.pendingDrop && Ash.ITEMS[s.pendingDrop]) {
      confirm =
        '<p class="note">Drop the ' +
        esc(Ash.ITEMS[s.pendingDrop].name) +
        ' in the ash?</p><button type="button" class="btn" data-act="drop-yes">Drop it</button> <button type="button" class="btn ghost" data-act="drop-no">Keep it</button>';
    }
    return (
      '<div class="wt">Weight ' +
      w +
      " / " +
      max +
      '</div><div class="track' +
      (w > max ? " over" : "") +
      '"><i style="width:' +
      pct +
      '%"></i></div>' +
      confirm +
      rows
    );
  }

  function sheetInner() {
    var s = Ash.state;
    var attrs = Ash.ATTRS.map(function (a) {
      return "<div>" + esc(a[1]) + " <b>" + s.attrs[a[0]] + "</b></div>";
    }).join("");
    var skills = Object.keys(Ash.SKILLS)
      .map(function (id) {
        var tagged = s.tags.indexOf(id) !== -1;
        return (
          "<div>" +
          esc(Ash.SKILLS[id].name) +
          (tagged ? " · tag" : "") +
          " <b>" +
          Ash.skillValue(id, s) +
          "</b></div>"
        );
      })
      .join("");
    var perks = s.perks
      .map(function (id) {
        var p = Ash.PERKS[id];
        if (!p) return "";
        return "<p><b>" + esc(p.name) + ".</b> " + esc(p.desc) + "</p>";
      })
      .join("");
    var reps = Ash.FACTIONS.map(function (f) {
      var v = s.rep[f[0]] || 0;
      var pct = (v + 100) / 2;
      return (
        '<div class="rep"><div>' +
        esc(f[1]) +
        " " +
        v +
        '</div><div class="track"><i style="width:' +
        pct +
        '%"></i></div></div>'
      );
    }).join("");
    var quests = Ash.quests(s)
      .map(function (q) {
        return (
          '<p class="quest"><b>' +
          esc(q.name) +
          " — " +
          esc(q.status) +
          "</b><br>" +
          esc(q.detail) +
          "</p>"
        );
      })
      .join("");
    var next = Ash.XP_TABLE[s.level + 1];
    var xpLine = next ? s.xp + " / " + next : String(s.xp);
    var slots = Ash.save.list()
      .map(function (slot) {
        var sum = slot.data
          ? esc(slot.data.label) + " · " + esc(slot.data.summary.loc) + " · day " + slot.data.summary.day
          : "Empty";
        return (
          "<p><b>Slot " +
          slot.n +
          "</b> — " +
          sum +
          '<br><button type="button" class="mini" data-act="save-slot" data-slot="' +
          slot.n +
          '">Save</button> <button type="button" class="mini" data-act="load-slot" data-slot="' +
          slot.n +
          '"' +
          (slot.data ? "" : " disabled") +
          ">Load</button></p>"
        );
      })
      .join("");
    return (
      "<p>" +
      esc(s.name) +
      " · " +
      esc(Ash.BACKGROUNDS[s.background].name) +
      " · level " +
      s.level +
      " · XP " +
      xpLine +
      " · karma " +
      Ash.karmaWord(s) +
      " (" +
      s.karma +
      ")</p>" +
      '<div class="sec"><h3>Attributes</h3><div class="preview">' +
      attrs +
      "</div></div>" +
      '<div class="sec"><h3>Skills</h3><div class="preview">' +
      skills +
      "</div></div>" +
      '<div class="sec"><h3>Perks</h3>' +
      (perks || "<p>None yet.</p>") +
      "</div>" +
      '<div class="sec"><h3>Reputation</h3>' +
      reps +
      "</div>" +
      '<div class="sec"><h3>Work</h3>' +
      quests +
      "</div>" +
      '<div class="sec"><h3>Ledger</h3>' +
      '<label class="field"><span>Slot name</span><input id="slot-name" type="text" maxlength="40" value="' +
      esc(s.name + " — day " + s.day) +
      '"></label>' +
      slots +
      '<p><button type="button" class="btn" data-act="title-from-play">Title screen</button></p></div>'
    );
  }

  function mapInner() {
    var s = Ash.state;
    var order = Object.keys(Ash.LOCATIONS);
    var lines = Ash.ROADS.map(function (r) {
      var A = Ash.LOCATIONS[r[0]];
      var B = Ash.LOCATIONS[r[1]];
      var known = s.known.indexOf(r[0]) !== -1 && s.known.indexOf(r[1]) !== -1;
      return (
        '<line x1="' +
        A.x +
        '" y1="' +
        A.y +
        '" x2="' +
        B.x +
        '" y2="' +
        B.y +
        '" stroke="' +
        (known ? "#6e3424" : "#8a7358") +
        '" stroke-width="' +
        (known ? "1.2" : "0.4") +
        '" stroke-dasharray="' +
        (known ? "0" : "1.5 1.2") +
        '"/>'
      );
    }).join("");
    var pins = order
      .map(function (id) {
        var loc = Ash.LOCATIONS[id];
        var known = s.known.indexOf(id) !== -1;
        if (!known) {
          return '<span class="pin unknown" style="left:' + loc.x + "%;top:" + loc.y + '%" aria-hidden="true"></span>';
        }
        var here = s.location === id ? " here" : "";
        return (
          '<button type="button" class="pin' +
          here +
          '" style="left:' +
          loc.x +
          "%;top:" +
          loc.y +
          '%" data-act="travel" data-to="' +
          id +
          '">' +
          esc(loc.name) +
          "</button>"
        );
      })
      .join("");
    var unknown = 0;
    var list = order
      .map(function (id) {
        var loc = Ash.LOCATIONS[id];
        var known = s.known.indexOf(id) !== -1;
        if (!known) {
          unknown++;
          return "";
        }
        var rt = Ash.route(s.location, id);
        var days = !rt || id === s.location ? "here" : rt.days + (rt.days === 1 ? " day" : " days");
        return (
          '<p class="quest"><button type="button" class="choice" data-act="travel" data-to="' +
          id +
          '">' +
          esc(loc.name) +
          " — " +
          days +
          "</button><br>" +
          esc(loc.blurb) +
          "</p>"
        );
      })
      .join("");
    if (unknown) {
      list +=
        "<p><b>" +
        unknown +
        (unknown === 1 ? " trace has" : " traces have") +
        "</b> no name yet. The paper stays blank on purpose.</p>";
    }
    return (
      '<div class="map-wrap"><svg viewBox="0 0 100 100" preserveAspectRatio="none">' +
      lines +
      '</svg>' +
      pins +
      "</div><p>Travel spends the days on the button. The road is not a promise.</p>" +
      list
    );
  }

  function shopInner() {
    var s = Ash.state;
    var vendor = s.shop.vendor;
    var stock = Ash.shopStock(vendor)
      .map(function (id) {
        var item = Ash.ITEMS[id];
        var price = Ash.priceOf(id, true, s);
        return (
          '<div class="inv-row"><div class="meta"><b>' +
          esc(item.name) +
          "</b><small>" +
          price +
          " scrip · " +
          esc(item.desc) +
          '</small></div><button type="button" class="mini" data-act="buy" data-id="' +
          id +
          '">Buy</button></div>'
        );
      })
      .join("");
    var sell = Object.keys(s.inv)
      .filter(function (id) {
        var item = Ash.ITEMS[id];
        return item && item.kind !== "quest" && s.inv[id] > 0 && item.value;
      })
      .map(function (id) {
        return (
          '<div class="inv-row"><div class="meta"><b>' +
          esc(Ash.ITEMS[id].name) +
          "</b><small>Sell " +
          Ash.priceOf(id, false, s) +
          ' scrip</small></div><button type="button" class="mini" data-act="sell" data-id="' +
          id +
          '">Sell</button></div>'
        );
      })
      .join("");
    return (
      (s.note ? '<p class="note">' + esc(s.note) + "</p>" : "") +
      "<p>Your scrip: <b>" +
      s.scrip +
      "</b></p><h3>For sale</h3>" +
      (stock || "<p>Nothing today.</p>") +
      "<h3>You could sell</h3>" +
      (sell || "<p>Nothing she'll price.</p>")
    );
  }

  function levelInner() {
    var s = Ash.state;
    var d = s.levelDraft || { spends: {}, perk: null };
    var spent = 0;
    Object.keys(d.spends).forEach(function (k) {
      spent += d.spends[k] || 0;
    });
    var left = s.bankedSkills - spent;
    var rows = Object.keys(Ash.SKILLS)
      .map(function (id) {
        var add = d.spends[id] || 0;
        var shown = Math.min(100, Ash.skillValue(id, s) + add * 5);
        return (
          '<div class="attr-row"><span class="name">' +
          esc(Ash.SKILLS[id].name) +
          " " +
          shown +
          '</span><button type="button" class="step" data-act="skill" data-id="' +
          id +
          '" data-d="-1">−</button><span class="val">' +
          add +
          '</span><button type="button" class="step" data-act="skill" data-id="' +
          id +
          '" data-d="1">+</button></div>'
        );
      })
      .join("");
    var perks = "";
    if (s.bankedPerks > 0) {
      perks =
        "<h3>Pick a perk</h3>" +
        Ash.PERK_PICKS.filter(function (id) {
          return s.perks.indexOf(id) === -1;
        })
          .map(function (id) {
            var p = Ash.PERKS[id];
            return (
              '<button type="button" class="bg-card' +
              (d.perk === id ? " on" : "") +
              '" data-act="perk" data-id="' +
              id +
              '"><b>' +
              esc(p.name) +
              "</b><small>" +
              esc(p.desc) +
              "</small></button>"
            );
          })
          .join("");
    }
    return (
      "<p>Four points, five skill each. " +
      left +
      " left. Unspent points wait.</p>" +
      rows +
      perks +
      '<p><button type="button" class="btn primary" data-act="level-ok">Write it down</button></p>'
    );
  }

  function combatInner() {
    var s = Ash.state;
    var c = s.combat;
    var foes = c.enemies
      .filter(function (e) {
        return e.hp > 0;
      })
      .map(function (e) {
        var pct = Math.max(0, Math.round((e.hp / e.maxHp) * 100));
        return (
          '<div class="foe"><div class="mark mark-' +
          esc(e.mark || "raider") +
          '"></div><div class="meta"><b>' +
          esc(e.name) +
          "</b> " +
          e.hp +
          "/" +
          e.maxHp +
          '<div class="hpbar"><i style="width:' +
          pct +
          '%"></i></div></div></div>'
        );
      })
      .join("");
    var joss = "";
    if (s.joss.recruited && s.joss.following && s.joss.alive) {
      joss = "<p>Joss " + s.joss.hp + "/" + s.joss.maxHp + "</p>";
    } else if (s.joss.recruited && !s.joss.alive) {
      joss = "<p>Joss is down.</p>";
    }
    var log = c.log
      .map(function (line) {
        return "<p>" + esc(line) + "</p>";
      })
      .join("");
    var w = Ash.combat.weapon();
    var ammo = "";
    if (w.item.ammo) ammo = " · " + (s.inv[w.item.ammo] || 0) + " rounds";
    var buttons = "";
    var nbtn = 1;
    function cbtn(act, label, attrs, disabled) {
      var html =
        '<button type="button" class="choice" data-act="' +
        act +
        '"' +
        (attrs || "") +
        (disabled ? " disabled" : "") +
        ">" +
        nbtn +
        ". " +
        label +
        "</button>";
      nbtn += 1;
      return html;
    }
    if (c.aimOpen) {
      ["head", "arm", "leg"].forEach(function (part) {
        var cost = Ash.combat.attackCost(part);
        buttons += cbtn("strike", part + " (" + cost + " AP)", ' data-aim="' + part + '"', c.ap < cost);
      });
      buttons += cbtn("aim-close", "Back");
    } else if (c.itemOpen) {
      var meds = Object.keys(s.inv).filter(function (id) {
        return Ash.ITEMS[id] && Ash.ITEMS[id].kind === "consumable" && s.inv[id] > 0;
      });
      if (!meds.length) buttons += "<p>Nothing in the pack you can use with one hand.</p>";
      meds.forEach(function (id) {
        buttons += cbtn("combat-item", esc(Ash.ITEMS[id].name) + " (2 AP)", ' data-id="' + id + '"', c.ap < 2);
      });
      buttons += cbtn("item-close", "Back");
    } else {
      var cost = Ash.combat.attackCost(false);
      buttons += cbtn(
        "strike",
        "Attack with " + esc(w.item.name) + " (" + cost + " AP)" + esc(ammo),
        "",
        c.ap < cost
      );
      buttons += cbtn("aim-open", "Aimed shot", "", c.ap < Ash.combat.attackCost("head"));
      buttons += cbtn("item-open", "Item (2 AP)", "", c.ap < 2);
      buttons += cbtn("defend", "Defend (2 AP)", "", c.ap < 2);
      if (c.talk && !c.talkUsed) {
        var tname = c.talk.impossible ? "no purchase" : c.talk.skill || "speech";
        buttons += cbtn("talk", "Talk [" + esc(tname) + "] (3 AP)", "", c.ap < 3);
      }
      buttons += cbtn("flee", "Flee (4 AP)", "", c.ap < 4);
      buttons += cbtn("end-turn", "End turn");
    }
    return (
      "<p>You " +
      s.hp +
      "/" +
      Ash.maxHp(s) +
      " · AP " +
      c.ap +
      "/" +
      Ash.maxAp(s) +
      " · round " +
      c.round +
      "</p>" +
      joss +
      '<div class="foes">' +
      foes +
      '</div><div class="combat-log">' +
      log +
      "</div>" +
      buttons
    );
  }

  function loadSheet(onTitle) {
    var slots = Ash.save.list()
      .map(function (slot) {
        var sum = slot.data
          ? esc(slot.data.summary.name) + " · day " + slot.data.summary.day + " · " + esc(slot.data.summary.loc)
          : "Empty";
        return (
          '<button type="button" class="choice" data-act="load-slot" data-slot="' +
          slot.n +
          '"' +
          (slot.data ? "" : " disabled") +
          ">Slot " +
          slot.n +
          " — " +
          sum +
          "</button>"
        );
      })
      .join("");
    var auto = Ash.save.read("ashwalk.auto");
    var autoBtn = auto
      ? '<button type="button" class="choice" data-act="continue">Autosave — ' +
        esc(auto.summary.name) +
        " · day " +
        auto.summary.day +
        "</button>"
      : "";
    return (
      '<div class="overlay"><div class="sheet"><div class="sheet-head"><h2>Load</h2><button type="button" class="icon-x" data-act="close-load" aria-label="Close">×</button></div>' +
      autoBtn +
      slots +
      (onTitle ? "" : "") +
      "</div></div>"
    );
  }

  function endingHTML() {
    var s = Ash.state;
    var ep = Ash.epitaph(s);
    return (
      '<div class="screen ending"><article class="file">' +
      '<div class="closed">File closed</div>' +
      "<h2>" +
      esc(ep.title) +
      "</h2><p>" +
      esc(ep.body) +
      "</p><p>" +
      esc(ep.foot) +
      '</p><p class="meta-line">' +
      esc(ep.meta) +
      "</p>" +
      '<button type="button" class="btn primary" data-act="new">New Game</button>' +
      "</article></div>"
    );
  }

  function deadHTML() {
    var can = Ash.save.hasAuto();
    return (
      '<div class="screen dead"><article class="file">' +
      '<div class="closed">Down</div>' +
      "<h2>The ash takes the rest.</h2>" +
      "<p>" +
      esc(Ash.state.name) +
      " stops here. The gauge, wherever it is, does not pause for a body.</p>" +
      '<button type="button" class="btn primary" data-act="reload"' +
      (can ? "" : " disabled") +
      ">Reload last step</button>" +
      '<p><button type="button" class="btn" data-act="open-load">Load a slot</button></p>' +
      '<p><button type="button" class="btn ghost" data-act="title">Title</button></p>' +
      "</article>" +
      (Ash.state.modal === "load" ? loadSheet(false) : "") +
      "</div>"
    );
  }

  var typing = null;
  function paintProse(el, text) {
    el.innerHTML = prose(text);
  }
  function typewrite() {
    if (typing) {
      clearInterval(typing);
      typing = null;
    }
    var el = document.getElementById("prose");
    if (!el) return;
    var full = (Ash.currentText && Ash.currentText()) || el.textContent || "";
    if (!Ash.state.typewriter || full.length < 48) return;
    var i = 0;
    paintProse(el, "");
    typing = setInterval(function () {
      i += 4;
      paintProse(el, full.slice(0, i));
      if (i >= full.length) {
        clearInterval(typing);
        typing = null;
        paintProse(el, full);
      }
    }, 12);
    el.onclick = function () {
      if (typing) clearInterval(typing);
      typing = null;
      paintProse(el, full);
    };
  }

  Ash.ui = {
    render: function () {
      var root = document.getElementById("app");
      if (!root) return;
      var s = Ash.state;
      var html = "";
      if (s.screen === "credits") html = creditsHTML();
      else if (s.screen === "create") html = createHTML();
      else if (s.screen === "ending") html = endingHTML();
      else if (s.screen === "dead" || s.dead) html = deadHTML();
      else if (s.screen === "play") html = playHTML();
      else html = titleHTML();
      root.innerHTML = html;
      if (s.screen === "play" && !s.modal) typewrite();
    },
  };

  function readName() {
    var input = document.getElementById("pc-name");
    if (input && Ash.draft) Ash.draft.name = input.value;
  }

  function onClick(e) {
    var btn = e.target.closest("[data-act]");
    if (!btn || btn.disabled) return;
    var act = btn.getAttribute("data-act");
    var s = Ash.state;
    if (act === "new") {
      var bg = Ash.BACKGROUNDS.tech;
      Ash.draft = { name: "", background: "tech", attrs: Object.assign({}, bg.base), tags: [], error: "" };
      s.screen = "create";
      s.modal = null;
      Ash.ui.render();
      return;
    }
    if (act === "title" || act === "title-from-play") {
      s.screen = "title";
      s.modal = null;
      s.dead = false;
      Ash.ui.render();
      return;
    }
    if (act === "credits") {
      s.screen = "credits";
      Ash.ui.render();
      return;
    }
    if (act === "continue" || act === "reload") {
      if (Ash.save.load("ashwalk.auto")) Ash.ui.render();
      return;
    }
    if (act === "open-load") {
      s.modal = "load";
      Ash.ui.render();
      return;
    }
    if (act === "close" || act === "close-load") {
      s.modal = null;
      s.pendingDrop = null;
      Ash.ui.render();
      return;
    }
    if (act === "bg") {
      readName();
      var id = btn.getAttribute("data-id");
      Ash.draft.background = id;
      Ash.draft.attrs = Object.assign({}, Ash.BACKGROUNDS[id].base);
      Ash.ui.render();
      return;
    }
    if (act === "attr") {
      readName();
      var key = btn.getAttribute("data-key");
      var dlt = parseInt(btn.getAttribute("data-d"), 10);
      var attrs = Ash.draft.attrs;
      var next = attrs[key] + dlt;
      if (next >= 1 && next <= 10) {
        var sum = sumAttrs(attrs) - attrs[key] + next;
        if (sum <= Ash.ATTR_TOTAL) attrs[key] = next;
      }
      Ash.ui.render();
      return;
    }
    if (act === "tag") {
      readName();
      var sid = btn.getAttribute("data-id");
      var tags = Ash.draft.tags;
      var at = tags.indexOf(sid);
      if (at >= 0) tags.splice(at, 1);
      else if (tags.length < 3) tags.push(sid);
      Ash.ui.render();
      return;
    }
    if (act === "confirm") {
      readName();
      var d = Ash.draft;
      var name = (d.name || "").trim();
      if (!name) {
        d.error = "The form wants a name.";
        Ash.ui.render();
        return;
      }
      if (sumAttrs(d.attrs) !== Ash.ATTR_TOTAL) {
        d.error = "Spend the points until none are left in the pool.";
        Ash.ui.render();
        return;
      }
      if (d.tags.length !== 3) {
        d.error = "Tag three skills. Not two. Not four.";
        Ash.ui.render();
        return;
      }
      d.name = name;
      Ash.newGame(d);
      Ash.ui.render();
      return;
    }
    if (act === "choice") {
      Ash.choose(parseInt(btn.getAttribute("data-i"), 10));
      Ash.ui.render();
      return;
    }
    if (act === "open-map") {
      s.modal = "map";
      Ash.ui.render();
      return;
    }
    if (act === "open-pack") {
      s.modal = "inventory";
      s.pendingDrop = null;
      Ash.ui.render();
      return;
    }
    if (act === "open-sheet") {
      s.modal = "character";
      Ash.ui.render();
      return;
    }
    if (act === "rest") {
      s.modal = null;
      Ash.rest();
      Ash.ui.render();
      return;
    }
    if (act === "travel") {
      var to = btn.getAttribute("data-to");
      s.modal = null;
      Ash.travel(to);
      Ash.ui.render();
      return;
    }
    if (act === "use") {
      s.note = Ash.useConsumable(btn.getAttribute("data-id"));
      if (s.dead) s.modal = null;
      Ash.ui.render();
      return;
    }
    if (act === "inspect") {
      var it = Ash.ITEMS[btn.getAttribute("data-id")];
      s.note = it ? it.desc : "";
      Ash.ui.render();
      return;
    }
    if (act === "equip") {
      var eid = btn.getAttribute("data-id");
      var item = Ash.ITEMS[eid];
      if (!item) return;
      if (item.kind === "weapon") s.equip.weapon = s.equip.weapon === eid ? null : eid;
      if (item.kind === "armor") s.equip.armor = s.equip.armor === eid ? null : eid;
      Ash.ui.render();
      return;
    }
    if (act === "drop") {
      s.pendingDrop = btn.getAttribute("data-id");
      Ash.ui.render();
      return;
    }
    if (act === "drop-yes") {
      if (s.pendingDrop) Ash.invRemove(s.pendingDrop, 1, s);
      s.pendingDrop = null;
      Ash.ui.render();
      return;
    }
    if (act === "drop-no") {
      s.pendingDrop = null;
      Ash.ui.render();
      return;
    }
    if (act === "buy") {
      Ash.buyItem(btn.getAttribute("data-id"));
      Ash.ui.render();
      return;
    }
    if (act === "sell") {
      Ash.sellItem(btn.getAttribute("data-id"));
      Ash.ui.render();
      return;
    }
    if (act === "save-slot") {
      var input = document.getElementById("slot-name");
      var label = input ? input.value : "";
      var n = btn.getAttribute("data-slot");
      if (Ash.save.slot(n, label)) s.note = "Written to slot " + n + ".";
      else s.note = "The ledger wouldn't take it.";
      Ash.ui.render();
      return;
    }
    if (act === "load-slot") {
      if (Ash.save.load("ashwalk.slot." + btn.getAttribute("data-slot"))) {
        s = Ash.state;
        s.modal = null;
      }
      Ash.ui.render();
      return;
    }
    if (act === "skill") {
      if (!s.levelDraft) return;
      var sk = btn.getAttribute("data-id");
      var dir = parseInt(btn.getAttribute("data-d"), 10);
      var cur = s.levelDraft.spends[sk] || 0;
      var spent = 0;
      Object.keys(s.levelDraft.spends).forEach(function (k) {
        spent += s.levelDraft.spends[k] || 0;
      });
      if (dir > 0 && spent < s.bankedSkills && Ash.skillValue(sk, s) + (cur + 1) * 5 <= 100) {
        s.levelDraft.spends[sk] = cur + 1;
      }
      if (dir < 0 && cur > 0) s.levelDraft.spends[sk] = cur - 1;
      Ash.ui.render();
      return;
    }
    if (act === "perk") {
      if (s.levelDraft) s.levelDraft.perk = btn.getAttribute("data-id");
      Ash.ui.render();
      return;
    }
    if (act === "level-ok") {
      var draft = s.levelDraft;
      if (!draft) return;
      if (s.bankedPerks > 0 && !draft.perk) {
        s.note = "Pick a perk. The form is not optional.";
        Ash.ui.render();
        return;
      }
      Ash.confirmLevel();
      Ash.ui.render();
      return;
    }
    if (act === "strike") {
      Ash.combat.strike(btn.getAttribute("data-aim") || null);
      Ash.ui.render();
      return;
    }
    if (act === "aim-open") {
      s.combat.aimOpen = true;
      s.combat.itemOpen = false;
      Ash.ui.render();
      return;
    }
    if (act === "aim-close") {
      s.combat.aimOpen = false;
      Ash.ui.render();
      return;
    }
    if (act === "item-open") {
      s.combat.itemOpen = true;
      s.combat.aimOpen = false;
      Ash.ui.render();
      return;
    }
    if (act === "item-close") {
      s.combat.itemOpen = false;
      Ash.ui.render();
      return;
    }
    if (act === "combat-item") {
      Ash.combat.useItem(btn.getAttribute("data-id"));
      Ash.ui.render();
      return;
    }
    if (act === "defend") {
      Ash.combat.defend();
      Ash.ui.render();
      return;
    }
    if (act === "talk") {
      Ash.combat.talk();
      Ash.ui.render();
      return;
    }
    if (act === "flee") {
      Ash.combat.flee();
      Ash.ui.render();
      return;
    }
    if (act === "end-turn") {
      Ash.combat.endTurn();
      Ash.ui.render();
      return;
    }
  }

  Ash.ui.bind = function () {
    var root = document.getElementById("app");
    root.addEventListener("click", onClick);
    root.addEventListener("input", function (e) {
      if (e.target && e.target.id === "pc-name" && Ash.draft) Ash.draft.name = e.target.value;
    });
    document.addEventListener("keydown", function (e) {
      var tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        if (e.key === "Escape") e.target.blur();
        return;
      }
      var st = Ash.state;
      if (e.key === "Escape") {
        if (st.modal && st.modal !== "combat" && st.modal !== "levelup") {
          st.modal = null;
          st.pendingDrop = null;
          Ash.ui.render();
        }
        var proseEl = document.getElementById("prose");
        if (proseEl && proseEl.onclick) proseEl.onclick();
        return;
      }
      if (st.screen === "play" && !st.modal && !st.dead && !st.ending) {
        if (e.key >= "1" && e.key <= "9") {
          Ash.choose(parseInt(e.key, 10) - 1);
          Ash.ui.render();
          e.preventDefault();
        } else if (e.key === "m" || e.key === "M") {
          st.modal = "map";
          Ash.ui.render();
        } else if (e.key === "i" || e.key === "I") {
          st.modal = "inventory";
          Ash.ui.render();
        } else if (e.key === "c" || e.key === "C") {
          st.modal = "character";
          Ash.ui.render();
        } else if (e.key === "r" || e.key === "R") {
          Ash.rest();
          Ash.ui.render();
        } else if (e.key === " " || e.key === "Enter") {
          var proseEl2 = document.getElementById("prose");
          if (proseEl2 && proseEl2.onclick) proseEl2.onclick();
        }
      }
    });
  };
})();
