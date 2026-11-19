
from pathlib import Path
import random
import shutil

# Original dataset location
SOURCE = Path("dataset/raw/Bharatanatyam-Mudra-Dataset")

# Destination folders
OUTPUT = Path("dataset")

# Reproducible random split
random.seed(42)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}

SPLITS = {
    "train": 0.70,
    "validation": 0.15,
    "test": 0.15,
}

def clean_class_name(name):
    """Remove the (1) suffix without changing other class names."""
    if name.endswith("(1)"):
        return name[:-3]
    return name

def main():
    if not SOURCE.exists():
        raise FileNotFoundError(f"Dataset not found: {SOURCE}")

    classes = [
        folder for folder in SOURCE.iterdir()
        if folder.is_dir() and not folder.name.startswith(".")
    ]

    summary = {split: 0 for split in SPLITS}
    total_images = 0

    for class_folder in sorted(classes):
        class_name = clean_class_name(class_folder.name)

        images = [
            file for file in class_folder.iterdir()
            if file.is_file()
            and file.suffix.lower() in IMAGE_EXTENSIONS
        ]

        random.shuffle(images)

        total = len(images)
        train_end = int(total * 0.70)
        validation_end = train_end + int(total * 0.15)

        split_images = {
            "train": images[:train_end],
            "validation": images[train_end:validation_end],
            "test": images[validation_end:],
        }

        for split, split_files in split_images.items():
            destination = OUTPUT / split / class_name
            destination.mkdir(parents=True, exist_ok=True)

            for image_file in split_files:
                shutil.copy2(
                    image_file,
                    destination / image_file.name
                )

            summary[split] += len(split_files)

        total_images += total

        print(
            f"{class_name}: {len(split_images['train'])} train, "
            f"{len(split_images['validation'])} validation, "
            f"{len(split_images['test'])} test"
        )

    print("\n========== DATASET SUMMARY ==========")
    print(f"Classes: {len(classes)}")
    print(f"Total images: {total_images}")

    for split, count in summary.items():
        print(f"{split}: {count} images")

if __name__ == "__main__":
    main()
