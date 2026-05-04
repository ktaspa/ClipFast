"""Default JSON for Job.processing_options when the client does not send custom settings."""

import json

DEFAULT_PROCESSING_OPTIONS_JSON = json.dumps(
    {
        "burn_captions": True,
        "burn_hook": True,
        "letterbox": True,
        "clip_min_seconds": 15,
        "clip_max_seconds": 90,
        "clip_count": 5,
    }
)
