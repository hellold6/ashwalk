# Ashwalk

A single-player browser CRPG. Bunker 7 is running out of air. The surface is a dry argument about water, cable, and a glowing hole in the ground.

**Ashwalk is original work inspired by classic post-apocalyptic CRPGs and is not affiliated with Bethesda or Microsoft.**

## Run it

Any static file server works. From this folder:

```bash
python3 -m http.server 8741
```

Then open `http://127.0.0.1:8741`.

You can also open `index.html` directly. The game does not need a build step, a network, or an account. After the page loads it stays offline. Saves live in `localStorage` on this machine: one autosave and three named slots.

## Play

- **New Game** — name, background, five attribute points, three tagged skills.
- Number keys **1–9** pick choices. **M** map, **I** pack, **C** sheet, **R** rest.
- The same controls work with a pointer or a thumb.
- The Lungs have about fourteen days. Travel and rest spend them. Bring a filter core home, or don't.

Backgrounds: Bunker Technician, Gate Guard, Archive Clerk.
