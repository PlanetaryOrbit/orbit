# LLM Usage Policy

_Last Updated / Effective Date:_ September 24th, 2026

This policy establishes the rules for using large language models (LLMs) when contributing to Orbit.

Orbit allows contributors to use LLMs as private tools for understanding, research, debugging, and reviewing their own work. Contributions submitted to Orbit must, however, be authored by the contributor themselves.

## 1. Who This Applies To

This policy applies to contributors who do not have write access to the Orbit repository.

It covers material submitted to or published through the repository, including:

- Issues and discussions
- Pull requests and commits
- Security reports
- Documentation
- Source-code comments
- Review comments
- Release notes
- Images, audio, and video
- Any other material submitted to the Orbit project

The policy applies regardless of the interface used to access an LLM, including chatbots, coding assistants, editor integrations, and autonomous agents.

## 2. What Counts as LLM-Generated

For this policy, LLM-generated content is any material produced by a generative model, including material that has subsequently been:

- Edited
- Rewritten
- Paraphrased
- Translated
- Expanded or shortened
- Reformatted
- Combined with independently written material

Changing the wording of generated material does not make the resulting material independent work.

Independent work is material created by the contributor from their own knowledge, reasoning, and judgement without reproducing LLM output.

## 3. Acceptable LLM Use

Contributors MAY use an LLM privately while working on a contribution.

Examples of acceptable use include:

- Learning how an unfamiliar technology works.
- Asking questions about existing Orbit code.
- Investigating an error message or test failure.
- Understanding documentation or external technical material.
- Discussing possible implementation approaches.
- Thinking through the design of a change.
- Reviewing code or documentation that the contributor wrote themselves.
- Identifying potential bugs or edge cases for the contributor to investigate independently.

LLM output used for these purposes MUST remain private.

If an LLM proposes an implementation, solution, explanation, or wording, the contributor must independently determine whether the underlying information is correct and then perform the actual work themselves.

The contributor MUST NOT reproduce the LLM's response in their contribution, even if they have modified it.

## 4. Contributions Must Be Human-Authored

A contribution to Orbit MUST be written and produced by the person submitting it.

An LLM MUST NOT be used to create or modify material that is subsequently submitted to the project.

This includes, but is not limited to:

- Source code
- Tests
- Documentation
- Comments
- Commit messages
- Pull request descriptions
- Issue reports
- Discussion posts
- Security reports
- Review comments
- Release notes
- Images, audio, or video

The same restriction applies when an LLM is used through an IDE, editor extension, automated workflow, or other tool rather than directly through a chatbot.

## 5. Autonomous and Agentic Tools

Contributors MUST NOT give an autonomous or semi-autonomous AI agent permission to create, modify, submit, or publish contributions to Orbit.

This includes agents that can independently:

- Modify repository files.
- Create commits.
- Open or modify pull requests.
- Create or modify issues.
- Post in discussions.
- Submit security reports.
- Respond to reviews.

Using an agent to investigate or explain a problem privately is permitted, provided that its output is not submitted as part of the contribution.

## 6. Translation

Machine translation MAY be used when translating material that the contributor independently wrote.

The contributor MUST:

1. Disclose that machine translation was used.
2. Verify the translated version against the original.
3. Include the original text when necessary to resolve ambiguity.

Machine translation MUST NOT be used to write, rewrite, expand, summarize, or improve a contribution.

## 7. Tools That Are Not LLMs

This policy does not prohibit ordinary deterministic development tools.

Examples include:

- Formatters
- Linters
- Compilers
- Minifiers
- Codemods
- Type generators
- Repository-owned code generators
- Ordinary editor features such as bracket completion and fixed snippets

A tool that uses a generative model to produce or modify content remains subject to this policy, even if it is presented as an editor feature.

## 8. Contributor Responsibility

The person submitting a contribution is responsible for everything contained within it.

Contributors MUST understand the material they submit and MUST be able to explain:

- What it does.
- Why it was added or changed.
- Why it is appropriate for Orbit.
- How they determined that it works correctly.

Using an LLM for private review does not transfer responsibility for mistakes to the model.

LLM-assisted review also does not replace testing, human review, or maintainer review.

## 9. Maintainer Review

Maintainers may ask a contributor to explain portions of their contribution when there is a reasonable need to establish authorship or understanding.

A contribution may be closed when it does not comply with this policy.

A contributor may submit a new version provided that the new submission is independently produced and otherwise complies with the project's contribution requirements.

Maintainers are not required to determine whether every contribution involved an LLM. Suspicion based solely on writing style is not sufficient evidence of a violation.

Contributors MUST NOT harass or publicly accuse another contributor solely because they suspect that an LLM was used.

## 10. Violations

The following may result in a contributor being restricted or blocked from participating in the Orbit repository:

- Knowingly submitting LLM-generated material.
- Deliberately concealing prohibited LLM use.
- Allowing an autonomous agent to submit material on their behalf.
- Repeated violations of this policy.
- Knowingly submitting fabricated information, including fabricated security reports.

A good-faith report that turns out to be incorrect is not considered fabricated merely because it was wrong.

Disclosure of LLM use does not make otherwise prohibited material acceptable.

## 11. Purpose

This policy is intended to preserve meaningful human authorship of contributions to Orbit while allowing contributors to use modern tools for private learning and investigation.

The purpose is not to prohibit contributors from learning with AI. It is to ensure that when someone submits work to Orbit, that work represents their own understanding, decisions, and effort.
