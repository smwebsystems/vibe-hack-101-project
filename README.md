# ProofPass

ProofPass is a privacy-first credential verification demo focused on one clear
outcome:

> Verify age without revealing the source identity document.

The active product lives in
[/Users/raven/Desktop/vibe-hack-101-project/proofpass_package](/Users/raven/Desktop/vibe-hack-101-project/proofpass_package).

## Repo Contents

- [proofpass_package](/Users/raven/Desktop/vibe-hack-101-project/proofpass_package):
  deployed Next.js frontend
- [ocr_api_prod](/Users/raven/Desktop/vibe-hack-101-project/ocr_api_prod):
  deployed Railway OCR and attestation API
- [proofpass_package/DEV_BRIEF.md](/Users/raven/Desktop/vibe-hack-101-project/proofpass_package/DEV_BRIEF.md):
  product scope
- [proofpass_package/STYLE_GUIDE.md](/Users/raven/Desktop/vibe-hack-101-project/proofpass_package/STYLE_GUIDE.md):
  visual direction
- [proofpass_package/BRAND_VOICE.md](/Users/raven/Desktop/vibe-hack-101-project/proofpass_package/BRAND_VOICE.md):
  copy and messaging rules

## Current State

Implemented:

- live frontend deployed to Railway
- live OCR API deployed to Railway
- OCR-backed issuance flow
- verifier read flow
- wallet-based on-chain submission flow
- Polygon Amoy registry integration
- live runtime config fetched from the OCR API

The most useful product documentation is the app README:

- [proofpass_package/README.md](/Users/raven/Desktop/vibe-hack-101-project/proofpass_package/README.md)
