from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class PredictionResult:
    probability: float
    threshold: float
    prediction: str
    confidence: float
    age_group: str
    model_version: str


@dataclass
class GroupModel:
    name: str
    age_min: int
    age_max: int
    threshold: float
    feature_names: list[str]
    questions: list[int]
    pipeline: Any
    model_version: str


class GamifiedPredictor:
    """Loads age-group model packages and routes inference by participant age."""

    def __init__(self, config_path: str, model_dir: str | None = None):
        self.groups: dict[str, GroupModel] = {}
        self.group_names: list[str] = []
        self.feature_names: list[str] = []
        self.threshold: float = 0.0
        self.model_version = "multi-group-1.0"
        self._demographic_features = ["Gender", "Nativelang", "Otherlang", "Age"]
        self._measures = ["Clicks", "Hits", "Misses", "Score", "Accuracy", "Missrate"]
        self._load_models(config_path, model_dir)

    def _build_feature_names(self, questions: list[int]) -> list[str]:
        features = list(self._demographic_features)
        for question in questions:
            for measure in self._measures:
                features.append(f"{measure}{question}")
        return features

    def _extract_model_from_package(self, package: Any) -> tuple[Any, list[str], float, str]:
        if isinstance(package, dict):
            model = package.get("pipeline") or package.get("model")
            features = package.get("feat_cols") or package.get("feature_names")
            threshold = float(package.get("threshold", 0.24))
            version = str(package.get("version", "1.0"))
            return model, list(features or []), threshold, version

        # Support direct model objects if needed.
        if hasattr(package, "predict_proba"):
            return package, [], 0.24, "1.0"

        raise ValueError("Unsupported model package format")

    def _load_models(self, config_path: str, model_dir: str | None) -> None:
        resolved_config = Path(config_path).expanduser().resolve()
        if not resolved_config.exists():
            raise FileNotFoundError(f"Question config file not found: {resolved_config}")

        with resolved_config.open("r", encoding="utf-8") as handle:
            config = json.load(handle)

        self._demographic_features = list(
            config.get("demographic_features", self._demographic_features)
        )
        self._measures = list(config.get("measures_per_question", self._measures))

        groups_cfg = config.get("groups")
        if not isinstance(groups_cfg, dict) or len(groups_cfg) == 0:
            raise ValueError("question_config.json must include a non-empty 'groups' object")

        resolved_model_dir = (
            Path(model_dir).expanduser().resolve() if model_dir else resolved_config.parent
        )

        for group_name, group_cfg in groups_cfg.items():
            age_range = group_cfg.get("age_range", [])
            if not isinstance(age_range, list) or len(age_range) != 2:
                raise ValueError(f"Invalid age_range for group '{group_name}'")

            age_min, age_max = int(age_range[0]), int(age_range[1])
            questions = [int(question) for question in group_cfg.get("questions", [])]
            model_file = str(group_cfg.get("model_file", "")).strip()

            if not model_file:
                raise ValueError(f"Missing model_file for group '{group_name}'")

            package_path = resolved_model_dir / model_file
            if not package_path.exists():
                raise FileNotFoundError(
                    f"Model file for group '{group_name}' not found: {package_path}"
                )

            package = joblib.load(package_path)
            pipeline, feature_names, package_threshold, package_version = (
                self._extract_model_from_package(package)
            )

            if pipeline is None:
                raise ValueError(f"Model package for group '{group_name}' has no predictor")

            if len(feature_names) == 0:
                feature_names = self._build_feature_names(questions)

            threshold = float(group_cfg.get("threshold", package_threshold))
            model_version = package_version if package_version else f"{group_name}-1.0"

            self.groups[group_name] = GroupModel(
                name=group_name,
                age_min=age_min,
                age_max=age_max,
                threshold=threshold,
                feature_names=feature_names,
                questions=questions,
                pipeline=pipeline,
                model_version=model_version,
            )

            logger.info(
                "Loaded group %s from %s (features=%s, threshold=%.3f)",
                group_name,
                package_path,
                len(feature_names),
                threshold,
            )

        if len(self.groups) == 0:
            raise RuntimeError("No group models could be loaded")

        self.group_names = sorted(self.groups.keys(), key=lambda name: self.groups[name].age_min)
        default_group = max(self.groups.values(), key=lambda group: len(group.feature_names))
        self.feature_names = default_group.feature_names
        self.threshold = default_group.threshold
        self.model_version = "multi-group:" + ",".join(self.group_names)

    def is_ready(self) -> bool:
        return len(self.groups) > 0

    def get_group_for_age(self, age: int) -> GroupModel:
        for group_name in self.group_names:
            group = self.groups[group_name]
            if group.age_min <= age <= group.age_max:
                return group

        raise ValueError(f"Age {age} is out of supported range (7-17)")

    def get_group_summaries(self) -> dict[str, dict[str, Any]]:
        summaries: dict[str, dict[str, Any]] = {}
        for group_name in self.group_names:
            group = self.groups[group_name]
            summaries[group_name] = {
                "age_range": [group.age_min, group.age_max],
                "threshold": group.threshold,
                "questions": group.questions,
                "features": group.feature_names,
            }
        return summaries

    def validate_payload(self, payload: dict[str, Any]) -> tuple[bool, str]:
        age = payload.get("Age")
        if age is None:
            return False, "Age must be provided"

        try:
            age_value = int(age)
        except (TypeError, ValueError):
            return False, "Age must be an integer between 7 and 17"

        if not (7 <= age_value <= 17):
            return False, "Age must be between 7 and 17"

        try:
            group = self.get_group_for_age(age_value)
        except ValueError as exc:
            return False, str(exc)

        for field in ("Gender", "Nativelang", "Otherlang"):
            value = payload.get(field)
            if value not in (0, 1):
                return False, f"{field} must be 0 or 1"

        missing = [name for name in group.feature_names if name not in payload]
        if missing:
            sample = ", ".join(missing[:6])
            return False, f"Missing required feature(s) for {group.name}: {sample}"

        return True, ""

    def predict(self, payload: dict[str, Any]) -> PredictionResult:
        if not self.is_ready():
            raise RuntimeError("Predictor is not ready")

        age_value = int(payload["Age"])
        group = self.get_group_for_age(age_value)

        vector = np.array(
            [float(payload.get(feature, 0.0)) for feature in group.feature_names],
            dtype=float,
        )
        frame = pd.DataFrame([vector], columns=group.feature_names)
        probability = float(group.pipeline.predict_proba(frame)[0, 1])
        prediction = "Dyslexia Risk" if probability >= group.threshold else "No Risk"

        # Confidence as distance from uncertainty (0.5), scaled to [0, 1].
        confidence = min(1.0, abs(probability - 0.5) * 2)

        return PredictionResult(
            probability=probability,
            threshold=group.threshold,
            prediction=prediction,
            confidence=confidence,
            age_group=group.name,
            model_version=group.model_version,
        )
