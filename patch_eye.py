with open('/home/omran-xy/Workspace/Lexplore/eglex/ml-service/app/services/eye_tracker/features.py', 'r') as f:
    code = f.read()

import re

# Add pipeline_metrics field
code = re.sub(
    r'features_data: list\[dict\] = field\(default_factory=list\)',
    r'features_data: list[dict] = field(default_factory=list)\n    pipeline_metrics: dict = field(default_factory=dict)',
    code
)

# Update return
old_return = """        return TaskProcessingResult(
            sequences=padded_sequences,
            total_gaze_points=len(gaze_points),
            valid_fixations=int(valid_mask.sum()),
            mean_fixation_duration_ms=float(valid_durations.mean()),
            features_data=features_data,
        )"""

new_return = """        durations_std = float(valid_durations.std()) if valid_mask.sum() > 0 else 0.0
        retention_pct = (valid_mask.sum() / len(gaze_points)) * 100 if len(gaze_points) > 0 else 0.0
        
        valid_amps = amp_px[valid_mask]
        mean_amp = float(valid_amps.mean()) if len(valid_amps) > 0 else 0.0
        
        valid_x = x_px[valid_mask]
        regressions = int(np.sum(np.diff(valid_x) < 0)) if len(valid_x) > 1 else 0
        
        jitter = float(np.std(x_px[valid_mask]) + np.std(y_px[valid_mask])) / 2 if valid_mask.sum() > 0 else 0.0

        pipeline_metrics = {
            "total_fixations": int(valid_mask.sum()),
            "mean_fixation_duration_ms": float(valid_durations.mean()) if valid_mask.sum() > 0 else 0.0,
            "fixation_duration_sd": durations_std,
            "data_retention_pct": float(retention_pct),
            "mean_saccade_amplitude": mean_amp,
            "total_regressions": regressions,
            "intra_fixation_jitter": jitter
        }

        return TaskProcessingResult(
            sequences=padded_sequences,
            total_gaze_points=len(gaze_points),
            valid_fixations=int(valid_mask.sum()),
            mean_fixation_duration_ms=float(valid_durations.mean()),
            features_data=features_data,
            pipeline_metrics=pipeline_metrics,
        )"""

code = code.replace(old_return, new_return)

with open('/home/omran-xy/Workspace/Lexplore/eglex/ml-service/app/services/eye_tracker/features.py', 'w') as f:
    f.write(code)
