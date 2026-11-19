import os
from PIL import Image, ImageDraw, ImageFont

ARTIFACT_DIR = r"C:\Users\New\.gemini\antigravity\brain\2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1\screenshots"
ORIG_DIR = r"d:\Projects\AskrEV\apps\web\public\images\real\original"
BRAND_DIR = r"d:\Projects\AskrEV\apps\web\public\images\real\branded"

try:
    font = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 22)
    font_sub = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 15)
except:
    font = ImageFont.load_default()
    font_sub = ImageFont.load_default()

def make_side_by_side(orig_crop, brand_crop, title_orig, title_brand, out_path, header_title):
    w, h = orig_crop.size
    margin = 30
    header_h = 70
    canvas_w = w * 2 + margin * 3
    canvas_h = h + header_h + margin * 2

    canvas = Image.new("RGB", (canvas_w, canvas_h), (13, 17, 23))
    draw = ImageDraw.Draw(canvas)

    # Header
    draw.text((margin, 18), header_title, font=font, fill=(240, 246, 252))
    draw.text((margin, 44), "Automotive Logo Rebranding & Panel Restoration QA", font=font_sub, fill=(139, 148, 158))

    # Paste Left (Original)
    canvas.paste(orig_crop, (margin, header_h))
    draw.rectangle([margin, header_h, margin + w, header_h + h], outline=(239, 68, 68), width=2)
    draw.rectangle([margin, header_h, margin + 220, header_h + 30], fill=(239, 68, 68))
    draw.text((margin + 8, header_h + 6), title_orig, font=font_sub, fill=(255, 255, 255))

    # Paste Right (Rebranded)
    x_right = margin * 2 + w
    canvas.paste(brand_crop, (x_right, header_h))
    draw.rectangle([x_right, header_h, x_right + w, header_h + h], outline=(34, 197, 94), width=2)
    draw.rectangle([x_right, header_h, x_right + 250, header_h + 30], fill=(34, 197, 94))
    draw.text((x_right + 8, header_h + 6), title_brand, font=font_sub, fill=(255, 255, 255))

    canvas.save(out_path, quality=95)
    print(f"✓ Saved {out_path}")

# 1. Loader Backrest (RILOX vs ASKR EV)
orig_loader = Image.open(os.path.join(ORIG_DIR, "real-rilox-commercial-loader.jpg"))
brand_loader = Image.open(os.path.join(BRAND_DIR, "askr-u01-commercial-loader.jpg"))
box_loader = (740, 380, 980, 500)
c_orig_loader = orig_loader.crop(box_loader).resize((480, 240), Image.Resampling.LANCZOS)
c_brand_loader = brand_loader.crop(box_loader).resize((480, 240), Image.Resampling.LANCZOS)
make_side_by_side(
    c_orig_loader,
    c_brand_loader,
    "ORIGINAL (Supplier 'RILOX')",
    "REBRANDED (Natural 'ASKR EV')",
    os.path.join(ARTIFACT_DIR, "comparison_loader_rilox_rebrand.png"),
    "ASKR EV U01 Commercial Loader — Seat Cushion Rebranding"
)

# 2. Jatayu Orange Scooter (JATAYU vs ASKR S03)
orig_jatayu = Image.open(os.path.join(ORIG_DIR, "real-jatayu-orange-studio.jpg"))
brand_jatayu = Image.open(os.path.join(BRAND_DIR, "askr-s03-performance.jpg"))
box_jatayu = (650, 290, 810, 360)
c_orig_jatayu = orig_jatayu.crop(box_jatayu).resize((480, 210), Image.Resampling.LANCZOS)
c_brand_jatayu = brand_jatayu.crop(box_jatayu).resize((480, 210), Image.Resampling.LANCZOS)
make_side_by_side(
    c_orig_jatayu,
    c_brand_jatayu,
    "ORIGINAL (Supplier 'JATAYU')",
    "REBRANDED (Natural 'ASKR S03')",
    os.path.join(ARTIFACT_DIR, "comparison_jatayu_rebrand.png"),
    "ASKR EV S03 Performance — Chrome Fairing Badge Rebranding"
)

# 3. Leo Fleet Lineup (LEO Decal vs ASKR S01)
orig_leo = Image.open(os.path.join(ORIG_DIR, "real-harsil-leo-scooter-lineup.jpg"))
brand_leo = Image.open(os.path.join(BRAND_DIR, "askr-s01-commuter-lineup.jpg"))
box_leo = (440, 610, 580, 730)
c_orig_leo = orig_leo.crop(box_leo).resize((420, 360), Image.Resampling.LANCZOS)
c_brand_leo = brand_leo.crop(box_leo).resize((420, 360), Image.Resampling.LANCZOS)
make_side_by_side(
    c_orig_leo,
    c_brand_leo,
    "ORIGINAL (Supplier 'LEO' Decal)",
    "REBRANDED (Sport 'S01' Badge)",
    os.path.join(ARTIFACT_DIR, "comparison_leo_rebrand.png"),
    "ASKR EV S01 Fleet — Front Cowl Decal Rebranding"
)
