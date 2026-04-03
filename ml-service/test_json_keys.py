import json
from app.schemas.prediction import PipelineMetrics, PredictionMetadata
from pprint import pprint

pm = PipelineMetrics(feature_extraction_ms=1.1, total_fixations=45, mean_saccade_amplitude=12.0)
meta = PredictionMetadata(sequences_analyzed=82, total_fixations=65, pipeline_metrics=pm)

print("model_dump by alias:")
pprint(meta.model_dump(by_alias=True))
print("model_dump by_alias=False:")
pprint(meta.model_dump(by_alias=False))
