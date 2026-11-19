"""
ASKR EV — Vehicle Image Rebranding and Asset Pipeline
Creates pristine backups in apps/web/public/images/real/original/
Generates ASKR EV branded derivatives in apps/web/public/images/real/branded/
"""

import os
import shutil
from PIL import Image, ImageDraw, ImageFilter, ImageFont

BASE_DIR = r"d:\Projects\AskrEV\apps\web\public\images\real"
ORIGINAL_DIR = os.path.join(BASE_DIR, "original")
BRANDED_DIR = os.path.join(BASE_DIR, "branded")

os.makedirs(ORIGINAL_DIR, exist_ok=True)
os.makedirs(BRANDED_DIR, exist_ok=True)

# 1. Back up all original images
print("Step 1: Backing up all original photos to original/ directory...")
for f in os.listdir(BASE_DIR):
    if f.endswith(".jpg") or f.endswith(".png"):
        src = os.path.join(BASE_DIR, f)
        dst = os.path.join(ORIGINAL_DIR, f)
        if not os.path.exists(dst):
            shutil.copy2(src, dst)
            print(f"  Backed up {f}")

# 2. Rebrand real-rilox-commercial-loader.jpg -> askr-u01-commercial-loader.jpg
print("Step 2: Rebranding 3W commercial loader (RILOX -> ASKR EV)...")
loader_path = os.path.join(ORIGINAL_DIR, "real-rilox-commercial-loader.jpg")
if os.path.exists(loader_path):
    loader = Image.open(loader_path).copy()
    w, h = loader.size

    # Leather patch over "RILOX" backrest cushion (800..950, 412..455)
    # Clone patch from leather below (790..960, 458..498)
    patch_box = (790, 458, 960, 498)
    patch = loader.crop(patch_box)
    pw, ph = patch.size
    mask = Image.new("L", (pw, ph), 255)
    mdraw = ImageDraw.Draw(mask)
    for i in range(12):
        alpha = int(255 * (i / 12.0))
        mdraw.rectangle([i, i, pw - 1 - i, ph - 1 - i], outline=alpha)
    mask = mask.filter(ImageFilter.GaussianBlur(3))
    loader.paste(patch, (790, 412), mask)

    # Render embossed ASKR EV badge
    badge_w, badge_h = 130 * 4, 32 * 4
    badge_img = Image.new("RGBA", (badge_w, badge_h), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(badge_img)
    try:
        font = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 20 * 4)
    except:
        font = ImageFont.load_default()

    text = "ASKR EV"
    # Deep shadow
    bdraw.text((14 + 4, 8 + 4), text, font=font, fill=(0, 0, 0, 240))
    # Metallic chrome
    bdraw.text((14, 8), text, font=font, fill=(215, 228, 240, 255))
    # Bevel highlight
    bdraw.text((14 - 2, 8 - 2), text, font=font, fill=(255, 255, 255, 190))

    badge_down = badge_img.resize((130, 32), Image.Resampling.LANCZOS)
    loader.paste(badge_down, (815, 418), badge_down)

    out_loader = os.path.join(BRANDED_DIR, "askr-u01-commercial-loader.jpg")
    loader.save(out_loader, quality=95)
    print(f"  Saved {out_loader}")

# 3. Rebrand real-jatayu-orange-studio.jpg -> askr-s03-performance.jpg
print("Step 3: Rebranding Jatayu orange studio scooter (JATAYU -> ASKR S03)...")
jatayu_path = os.path.join(ORIGINAL_DIR, "real-jatayu-orange-studio.jpg")
if os.path.exists(jatayu_path):
    jatayu = Image.open(jatayu_path).copy()
    
    # Inpaint chrome badge area at (685, 310, 780, 338)
    # Clone metallic panel surface below (685, 335, 780, 360)
    patch = jatayu.crop((685, 335, 780, 360)).resize((95, 28))
    pw, ph = patch.size
    mask = Image.new("L", (pw, ph), 255)
    mdraw = ImageDraw.Draw(mask)
    for i in range(8):
        alpha = int(255 * (i / 8.0))
        mdraw.rectangle([i, i, pw - 1 - i, ph - 1 - i], outline=alpha)
    mask = mask.filter(ImageFilter.GaussianBlur(2))
    jatayu.paste(patch, (685, 310), mask)

    # Render chrome ASKR S03 badge
    badge_w, badge_h = 95 * 4, 25 * 4
    badge_img = Image.new("RGBA", (badge_w, badge_h), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(badge_img)
    try:
        font = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 15 * 4)
    except:
        font = ImageFont.load_default()

    text = "ASKR S03"
    bdraw.text((8 + 4, 6 + 4), text, font=font, fill=(20, 20, 20, 220))
    bdraw.text((8, 6), text, font=font, fill=(238, 244, 250, 255))
    bdraw.text((8 - 2, 6 - 2), text, font=font, fill=(255, 255, 255, 190))

    badge_down = badge_img.resize((95, 25), Image.Resampling.LANCZOS)
    jatayu.paste(badge_down, (685, 312), badge_down)

    out_jatayu = os.path.join(BRANDED_DIR, "askr-s03-performance.jpg")
    jatayu.save(out_jatayu, quality=95)
    print(f"  Saved {out_jatayu}")

# 4. Rebrand real-harsil-leo-scooter-lineup.jpg -> askr-s01-commuter-lineup.jpg
print("Step 4: Rebranding Harsil Leo fleet lineup (LEO -> ASKR S01)...")
leo_path = os.path.join(ORIGINAL_DIR, "real-harsil-leo-scooter-lineup.jpg")
if os.path.exists(leo_path):
    leo = Image.open(leo_path).copy()
    
    # Inpaint the decal at (465, 630, 550, 710) with clean white cowl finish
    cowl_patch = leo.crop((550, 630, 635, 710))
    pw, ph = cowl_patch.size
    mask = Image.new("L", (pw, ph), 255)
    mdraw = ImageDraw.Draw(mask)
    for i in range(10):
        alpha = int(255 * (i / 10.0))
        mdraw.rectangle([i, i, pw - 1 - i, ph - 1 - i], outline=alpha)
    mask = mask.filter(ImageFilter.GaussianBlur(3))
    leo.paste(cowl_patch, (465, 630), mask)

    # Render modern ASKR S01 sport badge
    badge_w, badge_h = 75 * 4, 24 * 4
    badge_img = Image.new("RGBA", (badge_w, badge_h), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(badge_img)
    try:
        font = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 15 * 4)
    except:
        font = ImageFont.load_default()

    text = "S01"
    bdraw.text((10 + 3, 4 + 3), text, font=font, fill=(0, 0, 0, 180))
    bdraw.text((10, 4), text, font=font, fill=(245, 130, 32, 255)) # matching orange racing accent
    bdraw.text((10 - 1, 4 - 1), text, font=font, fill=(255, 255, 255, 140))

    badge_down = badge_img.resize((75, 24), Image.Resampling.LANCZOS)
    leo.paste(badge_down, (475, 645), badge_down)

    out_leo = os.path.join(BRANDED_DIR, "askr-s01-commuter-lineup.jpg")
    leo.save(out_leo, quality=95)
    print(f"  Saved {out_leo}")

# 5. Crop clean vehicles from factory sheets
print("Step 5: Extracting clean vehicle photographs from specification sheets...")
# 3W Loader Trolley
p3w_path = os.path.join(ORIGINAL_DIR, "real-pricesheet-3w-loader-trolley.jpg")
if os.path.exists(p3w_path):
    p3w = Image.open(p3w_path)
    # Vehicle is between y=360 and y=760
    crop_3w = p3w.crop((50, 360, 1080, 760))
    out_3w = os.path.join(BRANDED_DIR, "askr-u01-loader-crop.jpg")
    crop_3w.save(out_3w, quality=95)
    print(f"  Saved {out_3w}")

# 2W Cargo Delivery
p2w_path = os.path.join(ORIGINAL_DIR, "real-pricesheet-2w-cargo-delivery.jpg")
if os.path.exists(p2w_path):
    p2w = Image.open(p2w_path)
    # Vehicle is between y=350 and y=820
    crop_2w = p2w.crop((50, 350, 1080, 820))
    out_2w = os.path.join(BRANDED_DIR, "askr-u02-cargo-delivery.jpg")
    crop_2w.save(out_2w, quality=95)
    print(f"  Saved {out_2w}")

# 6. Copy other clean vehicle photographs with ASKR model codes
print("Step 6: Copying and standardizing remaining vehicle photographs...")
image_mapping = {
    "real-eko-tejas-sport-black.jpg": "askr-s02-sport-black.jpg",
    "real-eko-tejas-sport-red.jpg": "askr-s02-sport-red.jpg",
    "real-eko-tejas-sport-blue-studio.jpg": "askr-s02-sport-blue.jpg",
    "real-eko-tejas-sport-crimson-studio.jpg": "askr-s02-sport-crimson.jpg",
    "real-eko-tejas-peach-showroom.jpg": "askr-s02-sport-peach.jpg",
    "real-retro-classic-5colors.jpg": "askr-s04-retro-lineup.jpg",
    "real-harsil-tri-star-blue.jpg": "askr-s05-tristar-blue.jpg",
    "real-harsil-tri-star-red.jpg": "askr-s05-tristar-red.jpg",
    "real-harsil-monarch-grey.jpg": "askr-s05-tristar-grey.jpg",
    "real-harsil-executive-white.jpg": "askr-s06-executive-white.jpg",
    "real-r4-racing-sports-front.jpg": "askr-b01-racing-front.jpg",
    "real-r4-racing-sports-side.jpg": "askr-b01-racing-side.jpg",
    "real-monster-jeep-black-front.jpg": "askr-j01-monster-front.jpg",
    "real-monster-jeep-black-rear.jpg": "askr-j01-monster-rear.jpg",
    "real-cruiser-jeep-black-road.jpg": "askr-j02-cruiser-road.jpg",
    "real-mini-monster-jeep-grey.jpg": "askr-j03-mini-monster-grey.jpg",
}

for orig_name, branded_name in image_mapping.items():
    src = os.path.join(ORIGINAL_DIR, orig_name)
    dst = os.path.join(BRANDED_DIR, branded_name)
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"  Standardized {orig_name} -> {branded_name}")

print("\nImage rebranding pipeline complete! All branded derivatives generated.")
