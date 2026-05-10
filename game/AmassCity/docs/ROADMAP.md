# Amass City — Roadmap

A realistic phased plan. Each phase is a playable build.

## Phase 0 — Foundation (this PR)

- [x] UE5 project skeleton (`.uproject`, Build.cs, Target.cs).
- [x] Core C++ classes: `AmassCharacter`, `AmassVehicleBase`, `AmassGameMode`,
      `AmassPlayerController`, `AmassGameState`, `AmassHUD`, `AmassNPCCharacter`.
- [x] Components: `HealthComponent`, `WantedLevelComponent`.
- [x] World subsystem: `UMissionSystem`.
- [x] Config: `DefaultEngine.ini`, `DefaultGame.ini`, `DefaultInput.ini`.
- [x] UE5 `.gitignore`.
- [x] GDD + Roadmap.

## Phase 1 — Walkable prototype (4–6 weeks)

- [ ] Open the project in UE5 5.4, generate project files, compile.
- [ ] Create Blueprint child classes: `BP_AmassCharacter`, `BP_AmassVehicle_Sedan`.
- [ ] Author Enhanced Input assets (`IMC_Default`, `IMC_Vehicle`, `IA_Move`, etc.)
      and assign to BP defaults.
- [ ] Build a 1 km² placeholder block with simple buildings + roads (Modeling
      tools or Quixel Megascans).
- [ ] Spawn one driveable vehicle. Walk → enter → drive → exit loop works.

## Phase 2 — One district (8–12 weeks)

- [ ] Replace placeholder block with **Harbor Flats** (the smallest district).
- [ ] PCG: pedestrian goal points, parked car spawners.
- [ ] Civilian behavior tree (idle, walk, flee).
- [ ] Police behavior tree (patrol, investigate, pursue) + 3-star ladder.
- [ ] First 3 missions (intro, fetch, chase). Mission DataAsset pipeline.
- [ ] UMG HUD upgrade (minimap, mission tracker, dialog widget).

## Phase 3 — Combat & weapons (6–8 weeks)

- [ ] Gameplay Ability System: weapons as abilities, damage as gameplay effect.
- [ ] Three weapon classes: pistol, SMG, shotgun. All fictional.
- [ ] Cover system (auto on walls).
- [ ] Police escalation 4–5 (helicopter, SWAT van).
- [ ] Motorcycle vehicle class.

## Phase 4 — Full city (12–16 weeks)

- [ ] Stream the remaining five districts via World Partition.
- [ ] Day/night and weather react properly (wet roads = less grip).
- [ ] Side activities: races, taxi, vigilante, collectibles.
- [ ] Reputation system and ending branches wired.

## Phase 5 — Polish & ship (8–12 weeks)

- [ ] Audio pass: licensed (or commissioned) original radio tracks.
- [ ] Localization: EN, RO, ES, FR, DE.
- [ ] Performance: 60 fps target on RTX 4060 / PS5 equivalent.
- [ ] QA + accessibility pass.
- [ ] Store pages, marketing, launch.

## Estimates (real talk)

A real production of this scope is 3–5 years with a team of 30–80 people for
a polished, releasable game. Solo or small-team scope should aim for **Phase 1
+ Phase 2** as a vertical slice — that alone is ~6 months of focused work.
