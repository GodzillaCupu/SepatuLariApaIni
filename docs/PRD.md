# Product Requirements Document (PRD) & Roadmap: LariYuk

**Project Name:** LariYuk  
**Type:** Open-Source Web Application (Mobile-First PWA)  
**Vision:** An open-source, community-driven AI shoe scanner that helps runners identify any running shoe model and instantly understand its intended rotation category (Easy, Tempo, Long Run, Race) backed by lab-tested metrics.  
**Version:** 1.0.0 (MVP)  
**Date:** October 2026  
**Status note:** Dokumen visi awal. Implementasi saat ini berbeda: data berada di database (Drizzle + SQLite/Turso) bukan `data/shoes.json`, fitur AI Vision Scan ditangguhkan, dan skema/status terkini ada di `docs/PROJECT_NOTES.md`, `docs/ARCHITECTURE.md` serta `scripts/README.md`.  

---

## 1. Executive Summary & Problem Statement

### 1.1 The Problem
The running shoe market has become overwhelming. Brands release dozens of models each year featuring complex proprietary foams (ZoomX, FF Blast+, Lightstrike, PWRRUN) and plate technologies (Nylon, TPU, Carbon Fiber). 
* **Beginner runners** frequently buy shoes unsuited to their training (e.g., buying a stiff carbon-plated race shoe for slow recovery runs, leading to injury).
* **Shoe shoppers in stores or race expos** have no frictionless, instant way to look up whether a shoe is intended for daily training, intervals, or marathons.
* **Review sites like RunRepeat** have world-class lab data, but lack an instant visual scanner to bridge physical shoes with their digital lab specs.

### 1.2 The Solution: LariYuk
A zero-friction, mobile-first web app that allows runners to take or upload a photo of any running shoe, uses AI Vision to identify the exact brand, model, and year, and presents a comprehensive profile detailing:
1. **The Shoe's Primary Role in a Rotation** (Daily Trainer, Max Cushion, Tempo, Race Day, Trail).
2. **Pace & Workout Suitability** (e.g., "Ideal for Zone 2 easy paces between 5:30–7:00 min/km").
3. **Lab-Grade Technical Specs** (Drop, Stack Height, Weight, Foam softness, Plate type).
4. **Community & RunRepeat-grade Pros/Cons**.

---

## 2. Target Personas

| Persona | Motivation | Key Pain Point |
| :--- | :--- | :--- |
| **Budi, The Beginner Runner** | Wants to train for his first 10K without getting shin splints. | Confused by sales jargon at shoe stores; doesn't know what shoe fits his pace. |
| **Siti, The Half-Marathoner** | Wants to build a proper 3-shoe rotation (Daily + Tempo + Race). | Needs to know if a shoe on discount can replace her worn-out tempo trainer. |
| **Eko, The Shoe Geek / Open Source Dev** | Passionate about gear, lab data, and tech. | Wants to contribute shoe data, add missing models, and customize the tool. |

---

## 3. Product Architecture

```
[ User Smartphone ] ──> [ Mobile Web / PWA ] ──> [ Camera / Gallery Upload ]
                                                          │
                                                (Image Base64)
                                                          ▼
                                              [ /api/detect-shoe ]
                                                          │
                                     ┌────────────────────┴────────────────────┐
                                      ▼                                         ▼
                         [ Gemini 2.5 Flash Vision ]              [ Local data/shoes.json ]
                         (Identifies Brand & Model)               (Lab Specs & RunRepeat Data)
                                     │                                         │
                                     └────────────────────┬────────────────────┘
                                                          ▼
                                             [ Complete Shoe Profile ]
                                            - Rotation Category Badge
                                            - Target Pace & Workout
                                            - Lab Specs & Verdict
```

---

## 4. Key Features & Functional Requirements

### FR-1: Multi-Angle Capture & Upload (Mobile-First)
* Support direct camera snapshot using standard HTML5 capture (`<input capture="environment">`) or live WebRTC stream.
* Allow users to upload photos directly from their phone gallery.
* Visual guide overlay encouraging the runner to take a **side profile (lateral)** or **heel/outsole** photo for maximum recognition accuracy.

### FR-2: AI Visual Recognition Engine
* Multimodal Vision API (Gemini 2.5 Flash / Flash-Lite).
* Extract key visual attributes:
  * Brand (Nike, Asics, Hoka, Saucony, Adidas, New Balance, Puma, Brooks, etc.).
  * Model & Edition (e.g., *Novablast 4*, *Pegasus 41*, *Endorphin Speed 4*, *Vaporfly 3*).
  * Colorway / Year estimation.
* Graceful fallback: If exact edition is ambiguous (e.g., Pegasus 39 vs 40), display the closest match with a model selector dropdown.

### FR-3: RunRepeat-Grade Shoe Knowledge Base
Each shoe profile presents structured data based on lab metrics:
* **Shoe Classification Badge:**
  * 🟢 **Daily Trainer** (Workhorse, versatile, high durability)
  * 🟡 **Max Cushion / Recovery** (Ultra plush, protects joints on long slow runs)
  * 🟠 **Tempo / Speedwork** (Responsive, lightweight, plated or rocker)
  * 🔴 **Race Day / Super Shoe** (PEBA foam + Full Carbon Plate, aggressive)
  * 🟤 **Trail Running** (Grippy lugs, rock plate, reinforced upper)
* **Lab Metrics:** Weight (grams), Heel-to-Toe Drop (mm), Heel Stack (mm), Forefoot Stack (mm), Foam Type, Plate Type.
* **Target Pace Range:** Recommended pace in `min/km`.
* **Verdict & Real-World Pros/Cons**.
* **Attribution Link:** Direct link to full lab review on RunRepeat where applicable.

### FR-4: Open Source Community & "Bring Your Own Key" (BYOK)
* **Local JSON Database (`data/shoes.json`):** Clean, human-readable schema allowing anyone to submit a Pull Request to add their favorite shoes.
* **Bring Your Own API Key:** Optional setting modal where power users or self-hosters can input their own Google Gemini or OpenAI API key.
* **"Contribute Shoe" CTA:** If an unknown shoe is scanned, a pre-filled GitHub Issue link allows the user to suggest adding it to the repository.

---

## 5. Shoe Data Schema (`data/shoes.json`)

```typescript
export interface RunningShoe {
  id: string; // e.g. "asics-novablast-4"
  brand: string; // e.g. "Asics"
  model: string; // e.g. "Novablast 4"
  releaseYear: number;
  category: "daily_trainer" | "max_cushion" | "tempo_speed" | "race_day" | "trail";
  primaryUse: string; // "Easy Runs, Daily Miles, Long Runs"
  secondaryUse?: string; // "Progressive Runs"
  targetPaceRange: string; // "5:00 - 7:00 min/km"
  runnerType: "Neutral" | "Mild Stability" | "Stability";
  surface: "Road" | "Trail" | "All-Terrain";
  specs: {
    weightGrams: number; // e.g. 260
    dropMm: number; // e.g. 8
    heelStackMm: number; // e.g. 41.5
    forefootStackMm: number; // e.g. 33.5
    foamType: string; // e.g. "FF BLAST+ ECO"
    plateType: "None" | "Nylon" | "Carbon Fiber" | "TPU";
    cushionFeel: "Plush" | "Balanced" | "Firm";
  };
  verdict: {
    summary: string;
    pros: string[];
    cons: string[];
  };
  runRepeatUrl?: string;
}
```

---

## 6. Implementation Roadmap

### Phase 1: Database & Seed Dataset (Current Milestone)
- [ ] Define TypeScript interfaces and validation schema (Zod).
- [ ] Create `data/shoes.json` with a seed collection of the **top 20 most popular running shoes** in Indonesia and globally:
  - *Daily:* Nike Pegasus 41, Asics Novablast 4, Hoka Clifton 9, Brooks Ghost 16, New Balance 1080 v13.
  - *Max Cushion:* Asics Gel-Nimbus 26, Hoka Bondi 8, Saucony Triumph 22.
  - *Tempo/Speed:* Saucony Endorphin Speed 4, Asics Magic Speed 4, Adidas Boston 12.
  - *Race Day:* Nike Vaporfly 3, Nike Alphafly 3, Adidas Adios Pro 3, Asics Metaspeed Sky Paris.
  - *Trail:* Hoka Speedgoat 5, Nike Zegama 2.
- [ ] Write a helper script (`scripts/seed-runner.ts`) to validate and add shoe entries.

### Phase 2: Mobile-First Frontend & Camera
- [ ] Initialize Next.js (App Router) + Tailwind CSS + Lucide Icons.
- [ ] Build mobile-responsive layout (looks and feels like an iOS native app inside Safari/Chrome).
- [ ] Implement camera snapshot / gallery upload component with preview.
- [ ] Build the Shoe Detail Card component displaying rotation badge, specs meter, and pros/cons.

### Phase 3: AI Detection Pipeline
- [ ] Create `/api/detect-shoe` backend route.
- [ ] Implement Gemini Vision prompt optimized for shoe silhouette, branding, and colorway identification.
- [ ] Add fuzzy matching algorithm to link AI vision predictions to `data/shoes.json`.
- [ ] Support fallback to AI-synthesized specs when a model is not yet in the local database.

### Phase 4: Open Source Readiness & Deployment
- [ ] Add "Bring Your Own API Key" in local storage.
- [ ] Add PWA support (`manifest.json`, app icons, offline capability).
- [ ] Write comprehensive `README.md` and `CONTRIBUTING.md` on how to add shoes via GitHub PR.
- [ ] 1-Click Deploy to Vercel.

---

## 7. Non-Functional Requirements & Metrics

1. **Scan-to-Result Speed:** Under 3 seconds on a standard 4G mobile connection.
2. **Zero App Store Barrier:** Runs on any mobile browser without installation.
3. **PWA Offline Support:** Once loaded, the database of shoes can be browsed offline.
4. **Accuracy Benchmark:** Target >= 90% accuracy on the top 50 running shoes using clear side-profile photos.
 