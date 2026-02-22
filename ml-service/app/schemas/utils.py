from enum import Enum


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase for JSON serialization."""
    parts = string.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class RiskLevel(str, Enum):
    """Dyslexia risk classification based on prediction probability."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

    @classmethod
    def from_probability(
        cls,
        probability: float,
        low_threshold: float = 0.33,
        high_threshold: float = 0.66,
    ) -> "RiskLevel":
        """
        Classify probability into risk level.

        Default thresholds: low < 0.33, medium 0.33-0.66, high > 0.66
        """
        if probability < low_threshold:
            return cls.LOW
        elif probability < high_threshold:
            return cls.MEDIUM
        else:
            return cls.HIGH
