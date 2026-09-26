import os

# Tests must never export spans to the shared Application Insights resource.
os.environ["OTEL_ENABLED"] = "false"
os.environ["OTEL_USE_FOUNDRY_APP_INSIGHTS"] = "false"
os.environ["ENABLE_INSTRUMENTATION"] = "false"
