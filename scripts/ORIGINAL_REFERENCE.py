import os
from PIL import Image
import re

# Ask for property ID
property_id = input("Enter property ID (e.g., nkoroi): ").strip()

# Folder paths
project_root = os.path.dirname(os.getcwd())  # go up one level from 'scripts'
source_folder = os.path.join(project_root, "aman")
base_dest_folder = os.path.join(project_root, "img", "rental", property_id)
os.makedirs(base_dest_folder, exist_ok=True)

# Target max size (FIT INSIDE THIS, NO STRETCH, NO CROP, NO PADDING)
TARGET_SIZE = (1024, 683)

SUPPORTED_EXTENSIONS = (".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp", ".jfif", ".tiff")

def resize_preserve_ratio(img, target_size):
    """
    Resize image to FIT inside target_size
    - Preserves aspect ratio
    - No cropping
    - No padding
    - No stretching
    """
    target_w, target_h = target_size
    img_w, img_h = img.size

    scale = min(target_w / img_w, target_h / img_h)

    new_w = int(img_w * scale)
    new_h = int(img_h * scale)

    return img.resize((new_w, new_h), Image.Resampling.LANCZOS)

# Find images in source folder
files = [f for f in os.listdir(source_folder) if f.lower().endswith(SUPPORTED_EXTENSIONS)]
files.sort()

if not files:
    print("❌ No supported images found in source folder.")
    exit()

# Detect last used number in destination folder (if any)
existing_files = [f for f in os.listdir(base_dest_folder) if f.lower().endswith(".webp")]
pattern = re.compile(rf"^{re.escape(property_id)}-(\d+)\.webp$", re.IGNORECASE)

existing_numbers = [
    int(match.group(1))
    for f in existing_files
    if (match := pattern.match(f))
]

start_index = max(existing_numbers, default=0) + 1
print(f"📁 Found {len(existing_files)} existing images, starting from index {start_index}")

# Process and save new images
for i, file_name in enumerate(files, start=start_index):
    source_path = os.path.join(source_folder, file_name)
    dest_name = f"{property_id}-{i}.webp"
    dest_path = os.path.join(base_dest_folder, dest_name)

    try:
        with Image.open(source_path) as img:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            final_img = resize_preserve_ratio(img, TARGET_SIZE)
            final_img.save(dest_path, "WEBP", quality=90)

            print(f"✅ {file_name} → {dest_name} | Final Size: {final_img.size}")

    except Exception as e:
        print(f"❌ Error processing {file_name}: {e}")
        continue

    # Delete source after success
    try:
        os.remove(source_path)
        print(f"🗑️ Deleted original: {file_name}")
    except Exception as e:
        print(f"⚠️ Could not delete {file_name}: {e}")

print(f"🎉 Done! All images resized proportionally and saved to '{base_dest_folder}'.")
