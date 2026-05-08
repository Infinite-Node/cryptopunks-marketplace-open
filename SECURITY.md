# Security Policy

## Reporting a vulnerability

If you discover a security issue in this repository, please report it privately to **dev@nodefoundation.com**.

Do **not** open a public GitHub issue or pull request describing the vulnerability. Public disclosure before a fix is in place puts forks of this template at risk.

When you report, please include:

- A description of the issue and its impact
- Steps to reproduce, or a proof of concept
- Any suggested mitigation if you have one

We will acknowledge receipt and follow up with next steps. Because this repository is published as a template (see [CONTRIBUTING.md](CONTRIBUTING.md)), fixes may be applied here and forkers will need to pull them into their own deployments.

## Scope

In scope:

- Bugs in this codebase that could compromise users of a deployment (e.g. leaking the server-side `RPC_URL`, exposing the proxy to abuse, mishandling wallet interactions, transaction-construction errors).
- Issues in the build / dependency surface specific to how this repo wires things up.

Out of scope:

- Vulnerabilities in the underlying CryptoPunks contracts themselves — those are deployed and immutable.
- Issues in upstream dependencies (Next.js, wagmi, RainbowKit, viem). Please report those to the respective projects.
- Configuration mistakes in a specific fork's deployment (e.g. exposing `RPC_URL` as `NEXT_PUBLIC_*`, missing rate limiting). These are operator responsibilities.

Thank you for helping keep the ecosystem safe.
