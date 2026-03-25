# ProofPass

ProofPass is a privacy-preserving credential verification demo.

The core idea is simple: prove a fact such as `age > 18` without exposing the
raw personal data behind it.

## Project Brief

### Concept
- Privacy-preserving credential verification
- Prove facts, not identity records
- Keep the demo visual, fast, and easy to understand

### Core Flow
1. The user enters mock KYC data locally.
2. The frontend encrypts the data client-side.
3. The encrypted payload is uploaded to IPFS and returns a CID.
4. An issuer signs the credential claim plus CID.
5. The credential hash is stored on-chain.
6. The user later signs a proof request.
7. A contract verifies issuer, subject, and hash.
8. The UI returns pass/fail only.

### Principles
- No raw PII leaves the device.
- Blockchain is the trust anchor, not the storage layer.
- Smart contract logic stays minimal.
- Demo clarity matters more than protocol completeness.

### Minimal Contract Scope
- `registerCredential(hash, issuer)`
- `verifyProof(subjectSig, issuerSig, claimHash)`

Checks:
- issuer is trusted
- subject matches `msg.sender`
- hash exists

### Frontend Stack
- Next.js
- Tailwind CSS
- wagmi + RainbowKit
- `crypto-js` for demo encryption
- IPFS / Pinata

### Explicitly Out of Scope
- No real zero-knowledge proving
- No revocation
- No multi-chain support
- No backend

### Demo Goal
Verify age without revealing identity.

## Current Frontend Routes
- `/` landing screen
- `/identity` mock KYC entry
- `/gateway` verification QR gateway
- `/verify` selective disclosure portal
- `/issued` issuance and anchoring success

## Run
```bash
npm install
npm run dev
```

## Notes
- `npm run dev` clears `.next` before startup to avoid stale chunk issues.
- The project includes a small Node localStorage shim because this environment
  exposes a broken server-side `localStorage` object under Node 25.
