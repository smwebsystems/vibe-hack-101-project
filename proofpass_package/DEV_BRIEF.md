# ProofPass – Dev Brief

## Concept
Privacy-preserving credential verification:
Prove facts (e.g., age > 18) without exposing raw personal data.

## Core Flow
1. User inputs mock KYC data (local only)
2. Data encrypted client-side
3. Encrypted payload uploaded to IPFS (CID)
4. Issuer signs credential (claim + CID)
5. Credential hash stored on-chain
6. User later proves claim via signed request
7. Contract verifies issuer + subject + hash
8. UI shows pass/fail only

## Principles
- No raw PII leaves device
- Blockchain = trust anchor, not storage
- Keep contract logic minimal
- Demo > correctness

## Smart Contract (Minimal)
- registerCredential(hash, issuer)
- verifyProof(subjectSig, issuerSig, claimHash)

Checks:
- issuer is trusted
- subject matches msg.sender
- hash exists

## Frontend
- Next.js + Tailwind
- wagmi + RainbowKit
- crypto-js (AES)
- IPFS (Pinata)

## Cut Scope
- No real ZK
- No revocation
- No multi-chain
- No backend

## Demo Goal
Fast, visual, undeniable:
“Verify age without revealing identity”
