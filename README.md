# Orbit v3

> Release cycle: Nightly → Beta → Release Candidate → Stable
>
> Stable releases are typically published once per month (or every 3–4 weeks). Orbit Cloud instances use the Stable channel and are recommended for users who want the most reliable and thoroughly tested experience. Stable releases include new features, stability improvements, and bug fixes that have completed the release cycle.
>
> If you are self-hosting Orbit and want access to new features sooner, we recommend the Release Candidate channel. Release Candidates are generally stable, but may still contain bugs or stability issues that are resolved before the next Stable release.

## API Migration

Orbit v3 introduces a new API that is not backward compatible with v2. If you are migrating from v2, you will need to update your client code to use the new API.

All APIs are located under `/api/`, with each feature having its own versioned subdirectory. For example, the Forms API is available at `/api/v1/forms/`.

We recommend using the latest available version of each API to ensure compatibility with future releases. API versions allow us to make major changes without unexpectedly breaking clients that rely on older versions. When a breaking change is required, we can introduce a new API version while (not really) continuing to support the previous version.
