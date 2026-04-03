import sys
import os
sys.path.append("/home/omran-xy/Workspace/Lexplore/eglex/ml-service")
from app.schemas.prediction import PipelineMetrics, to_camel
pm = PipelineMetrics(feature_extraction_ms=1.1, **{"total_fixations": 45, "mean_saccade_amplitude": 12.0})
print(pm.model_dump(by_alias=True))
