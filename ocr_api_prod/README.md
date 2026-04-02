# ProofPass OCR API (Production)

Deployable FastAPI service for:

- OCR extraction through OpenRouter
- name and date-of-birth extraction from ID/passport images
- MRZ extraction and parsing
- EIP-712 attestation generation
- verifier-side local signing with a private key
- public frontend settings lookup

## Endpoints

- `GET /health`
- `GET /settings/public`
- `POST /ocr/id-card/file`
- `POST /ocr/id-card/url`

## Why this version exists

This `ocr_api_prod` package is the deployable variant for Railway and testnet use.

Unlike the local demo API, it does **not** rely on an unlocked local RPC account for
`eth_signTypedData_v4`. Instead, it signs attestations locally using the verifier's
private key from environment variables.

## Required environment

Copy `.env.example` and fill in the real values.

Important:
- set `OCR_ATTESTATION_CONTRACT_ADDRESS` after the registry is deployed to Amoy
- set `OCR_ATTESTATION_VERIFIER_ADDRESS` and `OCR_ATTESTATION_VERIFIER_PRIVATE_KEY`
  from your testnet verifier account
- set `ALLOWED_ORIGINS` to the deployed frontend domain

There is a local file at:

- `/Users/raven/Desktop/vibe-hack-101-project/testnet_creds.txt`

Use that file as the source for the verifier account when you are ready to configure
Railway secrets, but do not commit those secrets into the repo.

## Local run

```bash
cd /Users/raven/Desktop/vibe-hack-101-project/ocr_api_prod
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
cp .env.example .env
uvicorn app.main:app --reload --port 8001
```

## Railway deploy

Create a Railway service with root directory:

```text
ocr_api_prod
```

This folder already includes:

- `pyproject.toml`
- `railway.json`

Railway can build it directly with Nixpacks.

Set these Railway variables:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_SITE_URL`
- `OPENROUTER_APP_NAME`
- `ALLOWED_ORIGINS`
- `OCR_ATTESTATION_TTL_SECONDS`
- `OCR_ATTESTATION_RPC_URL`
- `OCR_ATTESTATION_CHAIN_ID`
- `OCR_ATTESTATION_CHAIN_NAME`
- `OCR_ATTESTATION_CHAIN_CURRENCY_NAME`
- `OCR_ATTESTATION_CHAIN_CURRENCY_SYMBOL`
- `OCR_ATTESTATION_EXPLORER_BASE_URL`
- `OCR_ATTESTATION_CONTRACT_ADDRESS`
- `OCR_ATTESTATION_VERIFIER_ADDRESS`
- `OCR_ATTESTATION_VERIFIER_PRIVATE_KEY`

## Frontend integration

The frontend can call:

```text
GET /settings/public
```

Example response:

```json
{
  "chainId": 80002,
  "chainName": "Polygon Amoy",
  "rpcUrl": "https://polygon-amoy.g.alchemy.com/v2/...",
  "contractAddress": "0xYourDeployedRegistry",
  "verifierAddress": "0xYourVerifierAccount",
  "explorerBaseUrl": "https://amoy.polygonscan.com",
  "nativeCurrencyName": "POL",
  "nativeCurrencySymbol": "POL",
  "attestationTtlSeconds": 3600
}
```

That lets the frontend read live verifier and chain config from the API instead of
hardcoding it.

## Example OCR request

```bash
curl -X POST http://127.0.0.1:8001/ocr/id-card/file \
  -F "file=@/absolute/path/to/id-card.jpg" \
  -F "subject=0xYourSubjectWallet"
```
