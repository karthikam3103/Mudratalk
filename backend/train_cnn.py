
import os
import ssl
import json
import argparse
from pathlib import Path

# Fix sandbox env paths
os.environ.setdefault("KERAS_HOME", "/tmp/.keras")
os.environ.setdefault("MPLCONFIGDIR", "/tmp/.matplotlib")

import certifi
os.environ["SSL_CERT_FILE"] = certifi.where()
ssl._create_default_https_context = ssl._create_unverified_context

parser = argparse.ArgumentParser(description="Train Mudra Recognition CNN (ResNet50 / EfficientNetB0 / MobileNetV2)")
parser.add_argument(
    "--architecture",
    choices=["mobilenetv2", "resnet50", "efficientnetb0"],
    default="mobilenetv2",
    help="Backbone architecture to use"
)
parser.add_argument("--epochs", type=int, default=30, help="Number of training epochs")
args, _ = parser.parse_known_args()
SELECTED_ARCH = args.architecture.lower()
EPOCHS = args.epochs

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers


# --------------------------------------------------
# 1. PROJECT PATHS AND SETTINGS
# --------------------------------------------------

PROJECT_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_DIR / "dataset"

TRAIN_DIR = DATASET_DIR / "train"
VAL_DIR = DATASET_DIR / "validation"
TEST_DIR = DATASET_DIR / "test"

MODEL_PATH = Path(__file__).resolve().parent / "mudra_cnn.keras"
ARCH_MODEL_PATH = Path(__file__).resolve().parent / f"mudra_{SELECTED_ARCH}.keras"
BENCHMARK_PATH = Path(__file__).resolve().parent / "model_benchmarks.json"
CLASS_NAMES_PATH = Path(__file__).resolve().parent / "mudra_classes.json"

IMAGE_SIZE = (128, 128)
BATCH_SIZE = 32
EPOCHS = 30
SEED = 42

tf.keras.utils.set_random_seed(SEED)


# --------------------------------------------------
# 2. CHECK DATASET FOLDERS
# --------------------------------------------------

for folder in [TRAIN_DIR, VAL_DIR, TEST_DIR]:
    if not folder.exists():
        raise FileNotFoundError(f"Dataset folder not found: {folder}")

print("\nLoading dataset...")


# --------------------------------------------------
# 3. LOAD TRAINING DATA
# --------------------------------------------------

train_ds = keras.utils.image_dataset_from_directory(
    TRAIN_DIR,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=True,
    seed=SEED
)

class_names = train_ds.class_names
num_classes = len(class_names)

print(f"\nNumber of mudra classes: {num_classes}")

if num_classes != 50:
    raise ValueError(
        f"Expected 50 classes, but found {num_classes}"
    )


# --------------------------------------------------
# 4. LOAD VALIDATION AND TEST DATA
# --------------------------------------------------

val_ds = keras.utils.image_dataset_from_directory(
    VAL_DIR,
    class_names=class_names,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=False
)

test_ds = keras.utils.image_dataset_from_directory(
    TEST_DIR,
    class_names=class_names,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=False
)


# --------------------------------------------------
# 5. OPTIMIZE DATA LOADING
# --------------------------------------------------

AUTOTUNE = tf.data.AUTOTUNE

train_ds = train_ds.prefetch(buffer_size=AUTOTUNE)
val_ds = val_ds.prefetch(buffer_size=AUTOTUNE)
test_ds = test_ds.prefetch(buffer_size=AUTOTUNE)


# --------------------------------------------------
# 6. BUILD TRANSFER LEARNING MODEL (ResNet50 / EfficientNetB0 / MobileNetV2)
# --------------------------------------------------

print(f"\n[INFO] Selected Model Architecture: {SELECTED_ARCH.upper()}")

data_augmentation = keras.Sequential([
    layers.RandomRotation(0.08),
    layers.RandomZoom(0.12),
    layers.RandomTranslation(0.08, 0.08),
    layers.RandomFlip("horizontal"),
], name="data_augmentation")

inputs = layers.Input(shape=(128, 128, 3))
x = data_augmentation(inputs)

if SELECTED_ARCH == "resnet50":
    print("Loading pre-trained ResNet50 base...")
    x = tf.keras.applications.resnet50.preprocess_input(x)
    base_model = tf.keras.applications.ResNet50(
        input_shape=(128, 128, 3),
        include_top=False,
        weights="imagenet"
    )
elif SELECTED_ARCH == "efficientnetb0":
    print("Loading pre-trained EfficientNetB0 base...")
    x = tf.keras.applications.efficientnet.preprocess_input(x)
    base_model = tf.keras.applications.EfficientNetB0(
        input_shape=(128, 128, 3),
        include_top=False,
        weights="imagenet"
    )
else:
    print("Loading pre-trained MobileNetV2 base...")
    x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(128, 128, 3),
        include_top=False,
        weights="imagenet"
    )

base_model.trainable = False

x = base_model(x, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.35)(x)
x = layers.Dense(128, activation="relu")(x)
outputs = layers.Dense(num_classes, activation="softmax")(x)

model = keras.Model(inputs, outputs, name=f"mudra_{SELECTED_ARCH}")

# --------------------------------------------------
# 7. COMPILE MODEL
# --------------------------------------------------

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=0.001),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

model.summary()


# --------------------------------------------------
# 8. TRAINING CALLBACKS
# --------------------------------------------------

callbacks = [
    keras.callbacks.ModelCheckpoint(
        filepath=str(MODEL_PATH),
        monitor="val_accuracy",
        save_best_only=True,
        verbose=1
    ),

    keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=6,
        restore_best_weights=True,
        verbose=1
    ),

    keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.5,
        patience=3,
        min_lr=0.00001,
        verbose=1
    )
]


# --------------------------------------------------
# 9. TRAIN MODEL (STAGE 1: FEATURE EXTRACTION)
# --------------------------------------------------

print("\nStarting Stage 1: Feature Extraction Training (Top Layers)...\n")

history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=15,
    callbacks=callbacks
)

# --------------------------------------------------
# 9B. FINE-TUNING (STAGE 2: TOP MOBILENET LAYERS)
# --------------------------------------------------

print("\nStarting Stage 2: Fine-Tuning Top MobileNetV2 Layers...\n")
base_model.trainable = True
# Fine-tune only the top 30 layers
for layer in base_model.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=1e-5),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

fine_tune_callbacks = [
    keras.callbacks.ModelCheckpoint(
        filepath=str(MODEL_PATH),
        monitor="val_accuracy",
        save_best_only=True,
        verbose=1
    ),
    keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=4,
        restore_best_weights=True,
        verbose=1
    )
]

history_fine = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=10,
    callbacks=fine_tune_callbacks
)


# --------------------------------------------------
# 10. LOAD BEST MODEL AND EVALUATE
# --------------------------------------------------

print("\nLoading best saved model...")

best_model = keras.models.load_model(MODEL_PATH)

print("\nEvaluating on test dataset...")

test_loss, test_accuracy = best_model.evaluate(test_ds)

print("\n------------------------------")
print("CNN TRAINING COMPLETE")
print("------------------------------")
print(f"Test Loss: {test_loss:.4f}")
print(f"Test Accuracy: {test_accuracy * 100:.2f}%")
print("------------------------------")


# --------------------------------------------------
# 11. SAVE CLASS LABELS AND ARCHITECTURE BENCHMARK
# --------------------------------------------------

with open(CLASS_NAMES_PATH, "w", encoding="utf-8") as file:
    json.dump(class_names, file, indent=4)

# Also save copy as architecture specific model
import shutil
shutil.copyfile(MODEL_PATH, ARCH_MODEL_PATH)

benchmarks = {}
if BENCHMARK_PATH.exists():
    try:
        with open(BENCHMARK_PATH, "r", encoding="utf-8") as bf:
            benchmarks = json.load(bf)
    except Exception:
        benchmarks = {}

total_params = best_model.count_params()
model_size_mb = os.path.getsize(MODEL_PATH) / (1024 * 1024)

benchmarks[SELECTED_ARCH] = {
    "architecture": SELECTED_ARCH,
    "test_accuracy": round(float(test_accuracy), 4),
    "test_loss": round(float(test_loss), 4),
    "total_parameters": total_params,
    "model_size_mb": round(model_size_mb, 2),
    "epochs": EPOCHS
}

with open(BENCHMARK_PATH, "w", encoding="utf-8") as bf:
    json.dump(benchmarks, bf, indent=4)

print(f"\nModel saved at: {MODEL_PATH}")
print(f"Architecture model saved at: {ARCH_MODEL_PATH}")
print(f"Class labels saved at: {CLASS_NAMES_PATH}")
print(f"Benchmark updated at: {BENCHMARK_PATH}")
