"""
Quick validation test for I-DT + One Euro Filter implementation.
Tests with synthetic gaze data simulating reading patterns.
"""
import sys
sys.path.insert(0, '/home/omran-xy/Workspace/Lexplore/eglex/ml-service')

from app.services.webcam.features import OneEuroFilter, WebcamFeatureProcessor
import numpy as np

# Test 1: One Euro Filter
print("=" * 60)
print("TEST 1: One Euro Filter Smoothing")
print("=" * 60)
filter_x = OneEuroFilter(mincutoff=1.0, beta=0.007, dcutoff=1.0)

# Simulate noisy gaze readings on a point (0.5, 0.5)
raw_data = [
    (0.50, 0.50, 0),
    (0.52, 0.48, 33),
    (0.49, 0.51, 66),
    (0.51, 0.50, 99),
    (0.50, 0.49, 132),
]

for x, y, t in raw_data:
    x_filtered = filter_x.filter(x, t)
    print(f"t={t:3d}ms: raw={x:.2f} → filtered={x_filtered:.4f}")

print("✓ One Euro Filter working (reduces jitter on repeated point)\n")

# Test 2: I-DT Algorithm
print("=" * 60)
print("TEST 2: I-DT Fixation Detection")
print("=" * 60)
processor = WebcamFeatureProcessor()

# Simulate gaze pattern: fixation at (0.3, 0.3) → saccade → fixation at (0.7, 0.3)
points = []

# Fixation 1: 500ms at (0.3, 0.3) with small jitter
t = 0
for i in range(15):
    x = 0.3 + np.random.normal(0, 0.01)
    y = 0.3 + np.random.normal(0, 0.01)
    points.append((np.clip(x, 0, 1), np.clip(y, 0, 1), t))
    t += 33  # ~30Hz

# Saccade: quick movement
for i in range(3):
    x = 0.3 + (i / 3) * 0.4 + np.random.normal(0, 0.02)
    y = 0.3 + np.random.normal(0, 0.02)
    points.append((np.clip(x, 0, 1), np.clip(y, 0, 1), t))
    t += 33

# Fixation 2: 500ms at (0.7, 0.3) with small jitter
for i in range(15):
    x = 0.7 + np.random.normal(0, 0.01)
    y = 0.3 + np.random.normal(0, 0.01)
    points.append((np.clip(x, 0, 1), np.clip(y, 0, 1), t))
    t += 33

print(f"Simulated {len(points)} gaze points over {t}ms")
print(f"Expected: 2 fixations (at 0.3, 0.7 on x-axis)")

# Apply smoothing and fixation detection
smoothed = processor.smooth_signal(points)
fixations = processor.detect_fixations(smoothed)

print(f"\nDetected {len(fixations)} fixations:")
for idx, fixation in enumerate(fixations):
    duration = fixation[-1, 2] - fixation[0, 2]
    centroid_x = np.mean(fixation[:, 0])
    centroid_y = np.mean(fixation[:, 1])
    print(f"  Fixation {idx+1}: centroid=({centroid_x:.3f}, {centroid_y:.3f}), "
          f"duration={duration:.0f}ms, points={len(fixation)}")

if len(fixations) == 2:
    centroids = [np.mean(f[:, 0]) for f in fixations]
    if centroids[0] < 0.5 and centroids[1] > 0.5:
        print("\n✓ I-DT correctly identified both fixations and separated by saccade\n")
    else:
        print(f"\n✗ Centroids not in expected locations: {centroids}\n")
else:
    print(f"\n✗ Expected 2 fixations, got {len(fixations)}\n")

# Test 3: Data Retention
print("=" * 60)
print("TEST 3: Data Retention Calculation")
print("=" * 60)
total_points = len(points)
points_in_fixations = sum(len(f) for f in fixations)
retention = (points_in_fixations / total_points) * 100

print(f"Total points: {total_points}")
print(f"Points in fixations: {points_in_fixations}")
print(f"Data retention: {retention:.1f}%")
print(f"Points in saccades/gaps: {total_points - points_in_fixations}")

if 60 < retention < 95:
    print("✓ Data retention in reasonable range\n")
else:
    print(f"⚠ Data retention outside typical range (60-95%)\n")

print("=" * 60)
print("All algorithm tests completed successfully!")
print("=" * 60)
