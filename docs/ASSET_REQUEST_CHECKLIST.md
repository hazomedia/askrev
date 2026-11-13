# ASKR EV — CREATIVE ASSET REQUEST & AUTOMOTIVE IMAGERY CHECKLIST

**Official Brand Name:** ASKR EV  
**Official Website:** https://www.askrevdrive.com  
**Design Direction:** Luxury Automotive (Tesla, Porsche, Ather, BMW Motorrad benchmark)  
**Current Phase:** Phase 3F / Automotive Public Showcase  
**Operating Mode:** `COMPLIANCE_MODE=SIMULATION_ONLY`

---

## 1. Executive Summary & Current Status

In accordance with project branding instructions, ASKR EV presents three vehicle mobility categories:
1. **Electric Bikes (Production Series):** Verified production models (*ASKR Thunder Pro*, *ASKR City Cruise*, *ASKR Apex Sport*) connected to the live database catalog with verified technical specifications.
2. **Electric Cycles (Upcoming Concept Series):** Prototype showcase (*ASKR AeroTrek C1*) with hydroformed carbon aero frames and smart torque assist.
3. **Electric Jeeps (Upcoming Concept Series):** Prototype showcase (*ASKR TerraMax 4x4*) with dual-motor all-wheel electric drive and overland adventure capabilities.

To preserve integrity without inventing undocumented assets, high-precision SVG vector illustrations with authentic ground contact shadows and transparent alpha backgrounds are currently deployed as development artwork. This checklist specifies the exact asset requirements for the upcoming studio photoshoot and 3D digital asset pipeline.

---

## 2. Automotive Photography & 3D Render Specifications

### Technical Standards
- **Resolution:** Minimum `3840 x 2160` (4K UHD) per angle; Master delivery in 16-bit TIFF or lossless PNG with isolated transparent alpha channel.
- **Web Optimized Formats:** WebP (lossless/near-lossless, quality 92) and AVIF, plus transparent SVGs for scalable UI elements.
- **Aspect Ratio:** 16:9 for full-width cinematic hero banners; 4:3 and 1:1 for catalog showroom cards.
- **Color Space:** Display P3 / sRGB calibrated.
- **Stage & Lighting:**
  - Dark Studio / Carbon Floor (`#080A0D` / `#101318`) with subtle rim highlights.
  - Realistic ground contact occlusion shadows rendered on separate alpha layer.
  - Specular reflections highlighting hydroformed curves and aerodynamic body panels.

---

## 3. Category-by-Category Asset Requirements

### A. Electric Bikes (Production Fleet)
| Model | Required Angles | Color Variants | Detail Cutouts Needed |
| :--- | :--- | :--- | :--- |
| **ASKR Thunder Pro** | Side Profile (90°), Front 3/4 (45°), Rear 3/4 (45°), Dynamic Low-Angle | Sapphire Blue, Carbon Black, Cyber Lime | Twin Projector Headlamp, PMSM Motor Core, 7" Digital Cluster |
| **ASKR City Cruise** | Side Profile (90°), Front 3/4 (45°), Urban Lifestyle Rider Shot | Titanium Silver, Obsidian Black, Electric Blue | Portable Battery Module Ejection, Telescopic Forks, Pillion |
| **ASKR Apex Sport** | Track Side Profile, Low Front Angle, Rear Tail Light Sweep | Racing Green, Carbon Graphite, Electric Lime | Liquid-Cooling Radiator, Inverted Forks, Brembo-style CBS Calipers |

### B. Electric Cycles (Concept Series)
| Model | Required Angles | Color Variants | Detail Cutouts Needed |
| :--- | :--- | :--- | :--- |
| **ASKR AeroTrek C1** | Studio Profile (90°), 45° Cockpit Perspective, Overhead Frame View | Stealth Carbon, Electric Lime, Glacier Silver | Integrated Downtube Battery Latch, Gates Carbon Belt Drive, Stem OLED Display |
| **ASKR AeroTrek Trail** | Off-road Trail Environment, Dynamic Action | Matte Olive, Cyber Lime | Hydraulic Disc Rotors, Suspension Lockout, 29" All-Terrain Tread |

### C. Electric Jeeps (Concept Series)
| Model | Required Angles | Color Variants | Detail Cutouts Needed |
| :--- | :--- | :--- | :--- |
| **ASKR TerraMax 4x4** | Side Elevation, Aggressive Front 3/4 High-Angle, Full Frontal Cyber Lightbar | Deep Graphite Metallic, Off-Road Lime, Tactical Onyx | Underbody Skid Armor, Beadlock Rims & Knobby Tires, Roof Searchlights, V2L Power Ports |

---

## 4. Interactive 360-Degree & Color Switcher Assets

To enable the interactive 360-degree rotation module requested in the automotive roadmap:
- **Frame Count:** 36 equispaced rotational frames (10° increments) captured on a motorized turntable or exported from 3D CAD/Blender.
- **Camera Elevation:** Fixed 15° pitch, centered on vehicle wheel base.
- **Naming Convention:** `[model-code]_[color-code]_360_[01..36].webp`
- **Interactive Color Switching:** Multi-layer render passes (Base Metal, Clearcoat, Ambient Occlusion, Shadow, Emissive Lights) allowing client-side color modulation without asset duplication.

---

## 5. Brand Identity & Governance Standards

- **Brand Logo:** Official ASKR EV logo mark (rounded square badge `#165DAD` with white 'A', accompanied by "ASKR EV" typography).
- **Prohibited:** Never use "ASKR EV DRIVE" as the brand name. The domain `askrevdrive.com` is the web address only.
- **Legal Compliance:** All public imagery must clearly distinguish between Production Models (available for simulated reservation) and Concept Series (development prototype showcase).
- **Compliance Mode:** Platform operates strictly under `COMPLIANCE_MODE=SIMULATION_ONLY`. No unapproved financial or speed promises are advertised.
