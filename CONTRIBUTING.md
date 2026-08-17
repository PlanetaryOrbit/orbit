# Contributing to Orbit

First off, thanks for taking the time to contribute! :heart:

All types of contributions are encouraged and valued. See the [Table of Contents](#table-of-contents) for different ways to help and details about how this project handles them. Please make sure to read the relevant section before making your contribution. It will make things smoother for maintainers and contributors alike. The community looks forward to your contributions! 🐈

> If you like Orbit but don't have time to contribute code, that's okay! There are other ways to support the project:
>
> - Star the repository
> - Share Orbit with others
> - Mention Orbit in your project's README
> - Tell friends, colleagues, or local communities about the project

A quick note before you contribute:

> Orbit is an open source project owned by Planetary, a product of Sleepy Lab. Day-to-day development and community management are currently handled by @buddywinte on Planetary's behalf.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [I Have a Question](#i-have-a-question)
- [I Want To Contribute](#i-want-to-contribute)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)
- [Request For Comment (RFC)](#request-for-comment-rfc)
- [Your First Code Contribution](#your-first-code-contribution)
- [Improving The Documentation](#improving-the-documentation)
- [Styleguides](#styleguides)
- [Commit Messages](#commit-messages)
- [Join The Project Team](#join-the-project-team)

---

## Code of Conduct

This project and everyone participating in it is governed by the
[Orbit Code of Conduct](https://github.com/PlanetaryOrbit/orbit/blob/main/CODE_OF_CONDUCT.md).

By participating, you are expected to uphold this code.

Please report unacceptable behavior to [contact@sleepylab.ca](mailto:contact@sleepylab.ca).

---

## I Have a Question

> Before asking a question, please make sure you have read the available [documentation](https://docs.planetaryapp.us/).

Before asking, check whether your question has already been answered:

- Search existing [GitHub Issues](https://github.com/PlanetaryOrbit/orbit/issues).
- Check the documentation.
- Search for existing discussions or solutions online.
- Ask in our [Discord server](https://discord.gg/M3CX76KQsK).

Orbit does not use GitHub Discussions. Questions should either be asked through Issues or Discord.

If you still need help:

- Open a GitHub Issue.
- Provide as much context as possible.
- Include relevant versions and environment details.
- Explain what you have already tried.

---

# I Want To Contribute

> ## Contributor Agreement
>
> By contributing to Orbit, you confirm that:
>
> - You are the original author of your contribution, or have permission to submit it.
> - You have the necessary rights to submit the contribution.
> - Your contribution may be distributed, modified, and maintained as part of Orbit under the project's license.

There are many ways to contribute, including:

- Reporting bugs
- Suggesting improvements
- Improving documentation
- Fixing issues
- Adding features
- Helping review pull requests

For small changes, normal pull requests are welcome.

For large changes, please read the [Request For Comment (RFC)](#request-for-comment-rfc) section before starting work.

---

# Request For Comment (RFC)

RFCs (Request For Comment) are used for major changes that could significantly affect Orbit.

An RFC is required for changes such as:

- Large new features
- Major system additions
- New core functionality
- Significant architecture changes
- Database schema changes that affect many systems
- Replacing major dependencies or technologies
- Changes that affect how users interact with Orbit

Examples of changes that would require an RFC:

- Adding an entirely new system such as forms, workflows, or permissions.
- Replacing a major framework or service.
- Redesigning a core part of Orbit.

The purpose of an RFC is to allow maintainers and contributors to discuss the design before implementation begins.

## Creating an RFC

To create an RFC:

1. Open a pull request containing your RFC document.
2. Clearly explain:
   - What problem the change solves.
   - Why the change is needed.
   - How the proposed solution works.
   - Alternatives that were considered.
   - Any potential drawbacks or risks.
3. Allow time for community and maintainer feedback.

RFC pull requests are for discussion and feedback. They do not immediately merge the implementation.

After an RFC has been approved, implementation can begin through normal pull requests.

> Small fixes, bug fixes, and minor improvements do not require an RFC. Use your best judgment, or ask a maintainer if you are unsure.

---

# Reporting Bugs

## Before You Submit a Bug Report

Before opening an issue, please make sure the problem has not already been reported and is not caused by your environment.

Please:

- Ensure you are running the latest version of Orbit.
- Confirm the issue is not caused by unsupported software or configuration.
- Read the documentation.
- Search existing issues.
- Check whether others have experienced the same issue.

When preparing your report, include:

- Whether this is a self-hosted instance.
- Operating system, platform, and architecture.
- Orbit version.
- Steps to reproduce the issue.
- Whether it occurs on older versions.

> ## Unsupported Platforms
>
> Orbit does not officially support Vercel, Cloudflare Workers, or other serverless platforms.
>
> Issues caused by unsupported environments may be closed without investigation.

## How Do I Submit a Good Bug Report?

> ## Security Notice
>
> Do **not** report security vulnerabilities, exploits, or issues containing sensitive information publicly through GitHub Issues.
>
> Security-related reports should be sent privately to [IT@planetaryapp.us](mailto:IT@planetaryapp.us).

Orbit uses GitHub Issues to track bugs and unexpected behavior.

When opening a bug report:

- Use a clear and descriptive title.
- Explain what you expected to happen.
- Explain what actually happened.
- Include detailed reproduction steps.
- Include logs, screenshots, or recordings where helpful.
- Provide a minimal reproduction case if possible.

After submitting:

- A maintainer will review and triage the issue.
- Issues missing enough information may be marked as `needs-repro`.
- Confirmed bugs may be labeled `needs-fix`, `critical`, or other relevant labels.
- Confirmed issues may be picked up by contributors.

---

# Suggesting Enhancements

Enhancement suggestions include new features, improvements to existing functionality, and quality-of-life changes.

Before suggesting an enhancement:

- Make sure you are using the latest version.
- Read the documentation to ensure the feature does not already exist.
- Search existing issues to see if the suggestion has already been made.
- Consider whether the feature fits Orbit's goals and intended use cases.

Features should generally benefit a significant portion of Orbit users.

If your idea only benefits a very specific use case, consider whether it would be better suited as a plugin, extension, or external tool.

## How Do I Submit a Good Enhancement Suggestion?

Enhancement suggestions are tracked through GitHub Issues.

When creating one:

- Use a clear and descriptive title.
- Explain the problem your suggestion solves.
- Describe the current behavior.
- Describe the expected behavior.
- Explain why this would be useful for Orbit users.
- Include screenshots, mockups, or examples if applicable.
- Mention similar solutions from other projects if they exist.

Large feature suggestions may require an [RFC](#request-for-comment-rfc) before implementation.

---

# Your First Code Contribution

Before contributing code, make sure you have:

- [Node.js](https://nodejs.org/)
- [PNPM](https://pnpm.io/)
- [Docker](https://www.docker.com/)
- Git
- A Prisma-compatible database (PostgreSQL recommended)

> All pull requests containing code changes must be tested using Docker before being submitted.
>
> This ensures changes work in an environment close to how Orbit is deployed.

## Development Setup

### 1. Fork and Clone Orbit

```bash
git clone https://github.com/<your-username>/orbit.git
cd orbit
````

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and configure the required variables.

### 4. Setup the Database

Generate the Prisma client and apply the database schema:

```bash
pnpm exec prisma db push
pnpm exec prisma generate
```

Alternatively, you can start the database container:

```bash
docker compose up -d db
```

### 5. Start Orbit

```bash
pnpm run dev
```

Orbit should now be available at:

```
https://localhost:3000
```

(or another configured port)

---

# Improving The Documentation

Documentation improvements are always welcome.

Before submitting documentation changes:

* Read the existing documentation.
* Keep documentation accurate and easy to understand.
* Explain your documentation changes in your pull request.

Documentation changes usually do not require an RFC unless they introduce a major change to how Orbit works.

---

# Pull Request Guidelines

Before opening a pull request:

* Make sure your changes are tested.
* Keep commits focused and understandable.
* Update documentation when needed.
* Follow the project's coding style.
* Avoid unrelated changes in the same pull request.

For major changes, ensure an RFC has been approved before submitting implementation work.

Maintainers may request changes before a pull request can be merged.

---

# Commit Messages

Good commit messages make it easier to understand project history.

Recommended format:

```
type: short description
```

Examples:

```
feat: add workspace forms
fix: prevent websocket reconnect loop
docs: update contribution guide
refactor: simplify cache handling
```

Keep commit messages:

* Short and descriptive.
* Written in the present tense.
* Focused on one change.

---

# Join The Project Team

Orbit contributors who consistently provide helpful contributions may be invited to join the project team.

Maintainer access is given based on:

* Quality of contributions.
* Understanding of Orbit's goals.
* Ability to collaborate with other contributors.
* Long-term involvement.

Becoming a contributor does not automatically grant repository access. Maintainer roles are assigned by the existing project team.

---

# Legal Notice

Orbit is owned by Planetary, a product of Sleepy Lab (a division of Sleepy Lab Innovations Inc.).

© 2026 Sleepy Lab Innovations Inc. All rights reserved.

Planetary and Orbit are not affiliated with or endorsed by Relatio (formerly Tovy). References to the Tovy project are provided for attribution purposes only and do not imply any partnership or sponsorship.

Original Tovy code © 2022 Tovy. Modifications and new features © 2026 Planetary.

Sleepy Lab Innovations Inc. is not affiliated with Roblox Corporation or Discord Inc.

For legal inquiries, contact [contact@sleepylab.ca](mailto:contact@sleepylab.ca).
