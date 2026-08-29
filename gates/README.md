# Release evidence

`local-gate-report.json` records the reproducible local acceptance result and the
canonical digest of candidate source, configuration, tests, documentation, lock
data, and release workflow content.

The candidate digest deliberately excludes the report itself and generated
outputs. It also excludes `release-receipt.json` and `release-receipts/`, where
the integration owner may append the final committed candidate commit and tree
after creating them. Keeping that receipt separate avoids a self-referential
content digest.
