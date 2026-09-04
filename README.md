# Orbit v3

> **Release cycle:** Nightly → Beta → Release Candidate → Stable

Orbit v3 is currently in **Nightly development**. Things are expected to change frequently, orbit v3 is not close to a stable release yet. Please use the `main` branch for Orbit v2.

### Release Cycle

- **Nightly** - Development builds containing the latest changes. They may include experimental features, bugs, breaking changes, small bug fixes, etc. Nightly builds are automatically built on **every commit**, but are only published every 24 hours.
- **Beta** - More complete builds intended for wider testing. Major features should be in place, but bugs and changes may still occur.
- **Release Candidate** - Feature-complete builds undergoing final testing. Major API and database changes are frozen, with only necessary fixes being made. This is basically stable.
- **Stable** - Production-ready releases recommended for general use and Orbit Cloud. These releases have completed the full testing and stabilization process.

Releases move between stages based on their readiness rather than a fixed schedule. Stable releases are expected to be published approximately every **3–4 weeks** once the project reaches the Stable release cycle.

## API Migration

Orbit v3 introduces a new API that is **not backward compatible with v2**. Applications using the v2 API will need to be updated for v3.

APIs are located under `/api/`, with each feature using its own versioned endpoint. For example, the Forms API is available at `/api/v1/forms/`.

API versions allow breaking changes to be introduced without immediately breaking existing clients. The latest API version should generally be used for new integrations.

## neko corner

<!-- GITHUB_ACTION_NEKO_CORNER_AUTO_REFRESH -->
<div align="center">
  <table>
    <tr>
      <td><img src="https://nekos.best/api/v2/neko/73b3fa86-168b-4946-9c04-1ef2bbc9e9c9.png" width="150"></td>
      <td><img src="https://nekos.best/api/v2/neko/9f6d806e-37a3-43c7-bbb0-24f54d3f756d.png" width="150"></td>
      <td><img src="https://nekos.best/api/v2/neko/563815b1-9138-4ec3-9a11-8984805fc36f.png" width="150"></td>
    </tr>
  </table>
</div>
<!-- END_GITHUB_ACTION_NEKO_CORNER_AUTO_REFRESH -->
