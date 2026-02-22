from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from . import to_camel


class FieldError(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    field: str
    message: str


class ErrorResponse(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    code: str
    message: str
    details: Optional[List[FieldError]] = None
