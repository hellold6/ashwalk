/* Layered location plates. Shapes, not people. */
(function () {
  "use strict";
  var Ash = (window.Ash = window.Ash || {});
  var dust =
    '<i class="mote m1"></i><i class="mote m2"></i><i class="mote m3"></i><i class="mote m4"></i><i class="mote m5"></i>';

  Ash.SCENES = {
    bunker:
      '<div class="scene scene-bunker" aria-hidden="true">' +
      '<div class="ceiling"></div>' +
      '<div class="col ca"></div><div class="col cb"></div><div class="col cc"></div>' +
      '<div class="pipe p1"></div><div class="pipe p2"></div>' +
      '<div class="vent"><b></b></div>' +
      '<div class="grit-stain"></div>' +
      '<div class="grate"></div>' +
      dust +
      "</div>",
    hatch:
      '<div class="scene scene-hatch" aria-hidden="true">' +
      '<div class="sky"></div><div class="hill"></div>' +
      '<div class="door"><b></b></div>' +
      '<div class="scree"></div>' +
      dust +
      "</div>",
    silt:
      '<div class="scene scene-silt" aria-hidden="true">' +
      '<div class="sky"></div>' +
      '<div class="arch a1"></div><div class="arch a2"></div><div class="arch a3"></div>' +
      '<div class="tent t1"></div><div class="tent t2"></div>' +
      '<div class="trough"></div><div class="line"></div>' +
      dust +
      "</div>",
    reed:
      '<div class="scene scene-reed" aria-hidden="true">' +
      '<div class="sky"></div><div class="cracks"></div>' +
      '<div class="shack"></div><div class="pump"></div><div class="bush"></div>' +
      dust +
      "</div>",
    tower:
      '<div class="scene scene-tower" aria-hidden="true">' +
      '<div class="sky"></div><div class="wire w1"></div><div class="wire w2"></div>' +
      '<div class="mast"><i></i></div><div class="blink"></div><div class="shack"></div>' +
      dust +
      "</div>",
    scrap:
      '<div class="scene scene-scrap" aria-hidden="true">' +
      '<div class="sky"></div><div class="ridge"></div>' +
      '<div class="car c1"></div><div class="car c2"></div><div class="car c3"></div>' +
      '<div class="wheel"></div>' +
      dust +
      "</div>",
    coil:
      '<div class="scene scene-coil" aria-hidden="true">' +
      '<div class="sky"></div><div class="truck"></div>' +
      '<div class="spool s1"></div><div class="spool s2"></div>' +
      '<div class="fire"></div><div class="dog dA"></div><div class="dog dB"></div>' +
      dust +
      "</div>",
    crater:
      '<div class="scene scene-crater" aria-hidden="true">' +
      '<div class="bowl"></div><div class="shard sh1"></div><div class="shard sh2"></div><div class="shard sh3"></div>' +
      '<div class="fig f1"></div><div class="fig f2"></div>' +
      dust +
      "</div>",
    silent:
      '<div class="scene scene-silent" aria-hidden="true">' +
      '<div class="fog"></div><div class="maw"></div><div class="cold"></div><div class="stair"></div>' +
      dust +
      "</div>",
  };

  Ash.sceneHTML = function (id) {
    return Ash.SCENES[id] || Ash.SCENES.silt;
  };
})();
