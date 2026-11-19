import os
from PIL import Image

image_dir = r"apps/web/public/images/real"
images = [f for f in os.listdir(image_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

print(f"Total images in {image_dir}: {len(images)}\n")
for img_name in sorted(images):
    path = os.path.join(image_dir, img_name)
    with Image.open(path) as img:
        print(f"{img_name:40} | Size: {img.size[0]}x{img.size[1]} | Mode: {img.mode} | Format: {img.format}")
