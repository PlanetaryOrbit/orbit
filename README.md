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

## neko corner

<div align="center">
  <table>
    <tr>
      <td><img src="https://nekos.best/api/v2/neko/73b3fa86-168b-4946-9c04-1ef2bbc9e9c9.png" width="150"></td>
      <td><img src="https://nekos.best/api/v2/neko/9f6d806e-37a3-43c7-bbb0-24f54d3f756d.png" width="150"></td>
      <td><img src="https://nekos.best/api/v2/neko/563815b1-9138-4ec3-9a11-8984805fc36f.png" width="150"></td>
    </tr>
  </table>
</div>
