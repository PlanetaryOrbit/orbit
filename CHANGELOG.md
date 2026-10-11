# Changelog

<!--
All notable changes to Orbit are documented here. It is fetched by the backend.
-->

## [2.2.0] - 2026-10-10

- **Added** automatic workspace role synchronization on login, throttled to once per hour per user. (Thanks @tiagoodevs)
- **Added** a overview of who completed quota.
- **Added** promotion recommendations.
- **Added** a searchable representative picker when creating alliances, including permission-based eligibility indicators. (Thanks @tiagoodevs)
- **Added** a permission-protected API endpoint for searching alliance representatives. (Thanks @tiagoodevs)
- **Added** a three-step progress indicator to the setup wizard.
- **Added** documentation and GitHub links, along with the running Orbit version, to the setup page.
- **Added** support for customizing milestone messages.
- **Added** a login tint customization option.
- **Added** optimization improvements.
- **Added** potential fixes for CodeQL server-side request forgery and externally controlled format string findings.
- **Updated** role synchronization to invalidate relevant user and workspace caches after changes.
- **Updated** workspace membership handling to ensure newly granted workspace roles appear in the workspace list.
- **Updated** the policies page and policy dashboard to use a consistent documentation-style layout.
- **Updated** the setup page with improved colors, contrast, disabled states, and hover effects.
- **Updated** the HelpFloatingButton changelog dialog to display categorized entries with readable labels.
- **Updated** login page styling and cleaned up its implementation.
- **Updated** global font configuration and fixed font rendering issues.
- **Updated** the workspace synchronization button.
- **Updated** the media API and related endpoints.
- **Updated** the `.env.example` configuration.
- **Updated** URL references to use `planetaryapp.cloud`.
- **Updated** the build tooling to use Turbopack.
- **Updated** formatting and cleaned up various parts of the codebase.
- **Fixed** a double redirect in the setup flow.
- **Fixed** OAuth hostname handling by reverting the change that derived the hostname from the URL.
- **Fixed** security issues and improved API permission checks.
- **Fixed** various synchronization issues.
- **Removed** forced identity from webhooks.

### Contributors

Thanks to everyone who contributed to this release:

- @BuddyWinte
- @thecamerondev
- @tiagoodevs
- @nemusyy

## [2.1.12] - 2026-08-16

- **Added** an option to give a review comment when approving or denying inactivity notices / resignations. (Thanks @raadtotheraad)
- **Added** a password security bar. (Thanks @FirTheDeveloper)
- **Added** user location to the sessions menu, with IP-based location as a fallback when necessary.
- **Added** security and API improvements.
- **Added** the cancel permission.
- **Added** a contribution guide.
- **Updated** the Vercel documentation to reflect the support drop for newer versions. (Thanks @nemusyy)
- **Updated** Docker and Docker Compose configuration. (Thanks @FirTheDeveloper)
- **Updated** documentation. (Thanks @BuddyWinte)
- **Updated** session handling, making sessions significantly faster.
- **Updated** the styles and moved font configuration.
- **Updated** the configuration check to combine Discord and Google checks.
- **Updated** the HelpFloatingButton and cleaned up version handling.
- **Updated** development to main.
- **Fixed** AFK tracking. (Thanks @breadddevv and @coderabbitai)
- **Fixed** Roblox-related issues. (Thanks @BuddyWinte)
- **Fixed** forms being toggleable in Feature Flags.
- **Fixed** workspace button text colors and contrast.
- **Fixed** Roblox redirect handling.
- **Fixed** various security and API issues.
- **Remade** the sidebar.
- **Remade** redirects.
- **Remade** the activity tracker.
- **Removed** `ROBLOX_WORKSPACE_REDIRECTID`.
- **Removed** form routes.
- **Removed** search from the sidebar on the 404 page.
- **Removed** unused files and cleaned up the codebase.
- **Switched** to Bun and made general quality-of-life improvements.
- **Reverted** the GPL-3.0 copyright notice changes.
- **Updated** copyright notices for GPL-3.0 licensing.
- **Changed** the Roblox redirect URI to be more automatic.
- **Updated** various internal components and configuration.

### Contributors

Thanks to everyone who contributed to this release:

- @raadtotheraad
- @nemusyy
- @FirTheDeveloper
- @breadddevv
- @coderabbitai
- @BuddyWinte
- @Boopup
- @tucnak1111
- @carteraccs
- @FirTheDeveloper
