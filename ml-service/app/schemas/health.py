from pydantic import BaseModel, ConfigDict

from . import to_camel


class HealthResponse(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    status: str
    version: str
