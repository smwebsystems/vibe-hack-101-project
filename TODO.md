# ProofPass Project TODOs

This file tracks project progress across the whole repo.

## Current Status

### Done
- [x] Package docs reviewed and distilled into an agent guide inside `proofpass_package`
- [x] Next.js + Tailwind frontend scaffold created in `proofpass_package`
- [x] Core demo routes implemented:
  - [x] landing page
  - [x] mock KYC entry
  - [x] verification gateway
  - [x] selective disclosure verification portal
  - [x] issuance / anchoring success screen
- [x] README updated with the project brief
- [x] UI cleanup pass completed using the UI/UX skill
- [x] Dev runtime stabilized for this machine:
  - [x] localStorage shim added for broken Node server global
  - [x] dev/build output directories separated to avoid stale chunk errors

### In Progress
- [ ] Convert the frontend from static demo screens into a real end-to-end demo flow

### Known Environment Notes
- [ ] Restart `npm run dev` after runtime script changes so the current dev server picks up the inherited shim
- [ ] Investigate where `--localstorage-file` is being injected into Node on this machine and remove that warning at the source
- [ ] Upgrade `next@15.3.0` to a patched version and reverify build/runtime

## Product TODOs

### Demo Flow
- [ ] Wire route-to-route state so the user’s mock identity input flows through the experience
- [ ] Define the exact claim model for the demo:
  - [ ] age over 18
  - [ ] issuer id
  - [ ] credential hash
  - [ ] IPFS CID
- [ ] Decide what data is persisted locally during the demo and what is just mocked in memory
- [ ] Add explicit pass/fail outcomes in the verification route

### Copy and Story
- [ ] Review all UI copy against the brand voice
- [ ] Remove any language that sounds like real ZK if the implementation is not real ZK
- [ ] Tighten the demo narration for a live presentation

## Frontend TODOs

### Functional Integration
- [ ] Add wallet connection with wagmi + RainbowKit
- [ ] Add client-side encryption flow with `crypto-js`
- [ ] Add IPFS upload flow with Pinata
- [ ] Add claim signing and proof signing interactions
- [ ] Show realistic async states:
  - [ ] encrypting
  - [ ] uploading
  - [ ] signing
  - [ ] anchoring
  - [ ] verified / failed

### State and Data
- [ ] Add a shared client state layer for demo flow data
- [ ] Define typed models for:
  - [ ] mock KYC payload
  - [ ] encrypted payload metadata
  - [ ] credential
  - [ ] proof request
  - [ ] verification result
- [ ] Replace hardcoded values in screens with state-driven data

### UX Polish
- [ ] Add disabled/loading button states
- [ ] Add inline validation for KYC inputs
- [ ] Add empty/error handling for wallet, IPFS, and signature failures
- [ ] Test mobile layout at 375px and 430px
- [ ] Test desktop layout at 1280px and 1440px

## Smart Contract TODOs

### Contract Scope
- [ ] Implement the minimal contract described in the brief
- [ ] Add `registerCredential(hash, issuer)`
- [ ] Add `verifyProof(subjectSig, issuerSig, claimHash)`
- [ ] Enforce checks for:
  - [ ] trusted issuer
  - [ ] `msg.sender` matches subject
  - [ ] hash exists

### Contract Tooling
- [ ] Decide the contract stack:
  - [ ] Hardhat
  - [ ] Foundry
- [ ] Add deployment config for Polygon Amoy
- [ ] Add a local/mock deploy path for demo development

### Contract Testing
- [ ] Add unit tests for issuer trust checks
- [ ] Add unit tests for hash existence checks
- [ ] Add unit tests for subject/signature verification flow

## Integration TODOs

### Frontend <-> Contract
- [ ] Define how the frontend constructs the credential hash
- [ ] Define what exactly is signed by issuer and subject
- [ ] Add contract write for credential registration
- [ ] Add contract read/verify flow for the proof result

### Mock Issuer
- [ ] Decide whether the issuer signature is:
  - [ ] hardcoded demo key
  - [ ] browser-generated mock issuer
  - [ ] separate script/tool
- [ ] Implement the simplest acceptable mock issuer path for the demo

## Demo Readiness TODOs

### Presentation
- [ ] Prepare a golden path demo script
- [ ] Prepare a fallback offline/mock mode in case wallet or IPFS fails live
- [ ] Add a seeded demo identity so the flow can be shown quickly
- [ ] Add one verifier scenario with a clear business context

### QA
- [ ] Run the full flow from landing to verified outcome
- [ ] Test fresh install on a clean terminal session
- [ ] Verify no raw PII is logged to console or sent over the network in plaintext
- [ ] Verify the UI only reveals pass/fail in the final proof step

## Repo Hygiene TODOs
- [ ] Decide whether `BRAND_VOICE.md`, `DEV_BRIEF.md`, and `STYLE_GUIDE.md` should be committed
- [ ] Decide whether the stitch export folders and zip files should remain in the repo
- [ ] Add a root `.gitignore` if those local artifacts should stay untracked
- [ ] Remove stale `.next`, `.next-dev`, and `.next-build` directories from local working state when not needed

## Recommended Next 5 Tasks
- [ ] Add a small client state layer so all routes share one mock credential flow
- [ ] Implement client-side encryption + payload hash generation
- [ ] Implement a mock issuer signing path
- [ ] Add wallet connection and Amoy registration flow
- [ ] Upgrade Next to a patched release and reverify dev/build
