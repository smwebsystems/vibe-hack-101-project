# ProofPass

ProofPass is a privacy-preserving credential verification demo.

The project goal is to prove a fact such as `age > 18` without exposing the
raw personal data behind it.

## Repo Summary

This repository currently contains:

- a Next.js + Tailwind frontend prototype in [proofpass_package](/Users/raven/Desktop/vibe-hack-101-project/proofpass_package)
- product/source docs for the demo concept, style, and brand voice
- a project-wide tracker in [TODO.md](/Users/raven/Desktop/vibe-hack-101-project/TODO.md)

## Current State

Implemented:
- landing page
- mock KYC entry screen
- verification gateway screen
- selective disclosure verification screen
- issuance / anchoring success screen
- UI cleanup pass and shared shell/components
- local dev/runtime stabilization for this machine

Not implemented yet:
- wallet integration
- client-side encryption flow
- IPFS upload
- issuer signing
- smart contract
- real end-to-end verification flow

## Project Structure

### Root
- [README.md](/Users/raven/Desktop/vibe-hack-101-project/README.md): repo-level overview
- [TODO.md](/Users/raven/Desktop/vibe-hack-101-project/TODO.md): project-wide task tracker
- [LICENSE](/Users/raven/Desktop/vibe-hack-101-project/LICENSE)

### ProofPass Package
- [README.md](/Users/raven/Desktop/vibe-hack-101-project/proofpass_package/README.md): app/project brief
- [DEV_BRIEF.md](/Users/raven/Desktop/vibe-hack-101-project/proofpass_package/DEV_BRIEF.md): product and technical brief
- [STYLE_GUIDE.md](/Users/raven/Desktop/vibe-hack-101-project/proofpass_package/STYLE_GUIDE.md): visual direction
- [BRAND_VOICE.md](/Users/raven/Desktop/vibe-hack-101-project/proofpass_package/BRAND_VOICE.md): messaging rules
- [app](/Users/raven/Desktop/vibe-hack-101-project/proofpass_package/app): Next.js app routes
- [components](/Users/raven/Desktop/vibe-hack-101-project/proofpass_package/components): shared UI/data helpers
- [scripts](/Users/raven/Desktop/vibe-hack-101-project/proofpass_package/scripts): local runtime support scripts

## Frontend Routes

The current frontend in `proofpass_package` exposes:

- `/` landing screen
- `/identity` mock KYC entry
- `/gateway` verification QR gateway
- `/verify` selective disclosure portal
- `/issued` issuance and anchoring success

## Run The Frontend

From [proofpass_package](/Users/raven/Desktop/vibe-hack-101-project/proofpass_package):

```bash
npm install
npm run dev
```

Notes:
- the project uses separate Next output directories for dev and build to avoid stale chunk issues
- the project includes a Node localStorage shim because this machine exposes a broken server-side `localStorage` object

## Next Steps

The highest-priority next tasks are:

1. Add shared client state across the demo flow.
2. Implement client-side encryption and payload hash generation.
3. Implement a mock issuer signing path.
4. Add wallet connection and Amoy registration flow.
5. Upgrade Next to a patched release and reverify dev/build.

For the full task list, see [TODO.md](/Users/raven/Desktop/vibe-hack-101-project/TODO.md).
