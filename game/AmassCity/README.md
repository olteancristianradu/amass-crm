# Amass City

Open-world action game built in **Unreal Engine 5.4**. Original IP — genre-
inspired by open-world action titles, not a clone of any specific game. All
characters, places, vehicles, and story are original.

## Status

**Phase 0 — Foundation.** C++ scaffolding compiles; gameplay content (Blueprints,
maps, art) lives in subsequent phases. See [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Repository layout

```
game/AmassCity/
├── AmassCity.uproject            # Project descriptor
├── Config/                       # Engine/Game/Input defaults
├── Source/
│   ├── AmassCity.Target.cs       # Game build target
│   ├── AmassCityEditor.Target.cs # Editor build target
│   └── AmassCity/
│       ├── AmassCity.Build.cs    # Module build rules
│       ├── AmassCity.{h,cpp}     # Module entry point
│       ├── Public/               # Headers (mirrors Private/)
│       └── Private/
│           ├── Player/           # AmassCharacter, AmassPlayerController
│           ├── Vehicles/         # AmassVehicleBase (Chaos)
│           ├── Game/             # AmassGameMode, AmassGameState
│           ├── Systems/          # Health, WantedLevel, MissionSystem
│           ├── AI/               # AmassNPCCharacter
│           └── UI/               # AmassHUD
├── docs/
│   ├── GAME_DESIGN_DOCUMENT.md
│   └── ROADMAP.md
└── .gitignore                    # UE5 derived/intermediate folders
```

## Requirements

- Unreal Engine **5.4** (5.3 may work; untested).
- Visual Studio 2022 (Windows) **or** Xcode 15 (macOS) **or** clang 16+ (Linux).
- ~150 GB free disk for engine + project derived data.

## First-time setup

### Windows

1. Install UE 5.4 from the Epic Games Launcher.
2. Right-click `AmassCity.uproject` → **Generate Visual Studio project files**.
3. Open `AmassCity.sln` in Visual Studio 2022.
4. Set solution config to `Development Editor`, platform `Win64`.
5. Build, then Debug → Start Without Debugging (the editor will launch).

### macOS / Linux

```bash
# from the engine install:
"<UE5>/Engine/Build/BatchFiles/Mac/GenerateProjectFiles.sh" \
  -project="<repo>/game/AmassCity/AmassCity.uproject" -game

"<UE5>/Engine/Build/BatchFiles/Linux/Build.sh" \
  AmassCityEditor Linux Development \
  -Project="<repo>/game/AmassCity/AmassCity.uproject"
```

## Architecture overview

| Layer       | Class / type                                      | Responsibility                              |
| ----------- | ------------------------------------------------- | ------------------------------------------- |
| Game flow   | `AAmassGameMode` / `AAmassGameState`              | Default classes, time-of-day                |
| Player      | `AAmassCharacter` / `AAmassPlayerController`      | TPS movement, vehicle entry, input         |
| Vehicles    | `AAmassVehicleBase` (Chaos)                       | Driving, camera, throttle/brake/steer      |
| Components  | `UHealthComponent`, `UWantedLevelComponent`       | Reusable, attachable to any actor          |
| World       | `UMissionSystem` (`UWorldSubsystem`)              | DataAsset-driven mission state machine     |
| AI          | `AAmassNPCCharacter`                              | Civilian / Police / Vendor / Hostile roles |
| UI          | `AAmassHUD`                                       | Stars, speedometer, minimap placeholder    |

Input uses **Enhanced Input**. Mapping contexts and actions are intended to
be authored as DataAssets in `/Game/Input/`, then assigned to the C++ defaults.

## Adding a mission

1. Create a `UDataAsset` deriving the FMissionDefinition pattern (or store the
   struct in a `UPrimaryDataAsset`).
2. At world start, register it: `UMissionSystem::RegisterMission(Definition)`.
3. Trigger via `StartMission(Id)` from a trigger volume / dialog choice.
4. Resolve via `CompleteMission(Id)` or `FailMission(Id)`.

## Licensing & IP boundaries

This repository contains **no** assets, code, dialogue, level layouts, or
trademarks from any third-party game. The project is structured so that all
gameplay content can be authored or licensed cleanly:

- Vehicle silhouettes are designed from category templates, not real cars.
- Any radio music must be commissioned or licensed for the project.
- Map districts and street layouts are invented for Amass City.

If you contribute, do not import reference imagery, models, audio, or text
from copyrighted sources. When in doubt, draft original work or skip it.

## License

TBD. Treat as private until a license is added.
