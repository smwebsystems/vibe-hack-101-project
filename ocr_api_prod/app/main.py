from __future__ import annotations

import base64
import json
import os
import re
from io import BytesIO
from dataclasses import dataclass
from typing import Any

import httpx
from dotenv import load_dotenv
from eth_account import Account
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel, ConfigDict, Field
import zxingcpp


load_dotenv()

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
SUPPORTED_IMAGE_TYPES = {
    "image/jpeg": "jpeg",
    "image/jpg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}
MONTH_MAP = {
    "JAN": 1,
    "FEB": 2,
    "MAR": 3,
    "APR": 4,
    "MAY": 5,
    "JUN": 6,
    "JUL": 7,
    "AUG": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DEC": 12,
}
KECCAK_ROUND_CONSTANTS = [
    0x0000000000000001,
    0x0000000000008082,
    0x800000000000808A,
    0x8000000080008000,
    0x000000000000808B,
    0x0000000080000001,
    0x8000000080008081,
    0x8000000000008009,
    0x000000000000008A,
    0x0000000000000088,
    0x0000000080008009,
    0x000000008000000A,
    0x000000008000808B,
    0x800000000000008B,
    0x8000000000008089,
    0x8000000000008003,
    0x8000000000008002,
    0x8000000000000080,
    0x000000000000800A,
    0x800000008000000A,
    0x8000000080008081,
    0x8000000000008080,
    0x0000000080000001,
    0x8000000080008008,
]
KECCAK_ROTATION_OFFSETS = [
    [0, 36, 3, 41, 18],
    [1, 44, 10, 45, 2],
    [62, 6, 43, 15, 61],
    [28, 55, 25, 21, 56],
    [27, 20, 39, 8, 14],
]


def rotl64(value: int, shift: int) -> int:
    mask = (1 << 64) - 1
    shift %= 64
    return ((value << shift) & mask) | (value >> (64 - shift))


def keccak_f1600(state: list[int]) -> None:
    mask = (1 << 64) - 1
    for round_constant in KECCAK_ROUND_CONSTANTS:
        c = [state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20] for x in range(5)]
        d = [c[(x - 1) % 5] ^ rotl64(c[(x + 1) % 5], 1) for x in range(5)]

        for x in range(5):
            for y in range(5):
                state[x + 5 * y] ^= d[x]

        b = [0] * 25
        for x in range(5):
            for y in range(5):
                new_x = y
                new_y = (2 * x + 3 * y) % 5
                b[new_x + 5 * new_y] = rotl64(state[x + 5 * y], KECCAK_ROTATION_OFFSETS[x][y])

        for x in range(5):
            for y in range(5):
                state[x + 5 * y] = b[x + 5 * y] ^ ((~b[((x + 1) % 5) + 5 * y]) & b[((x + 2) % 5) + 5 * y])
                state[x + 5 * y] &= mask

        state[0] ^= round_constant


def keccak256(data: bytes) -> bytes:
    rate_bytes = 136
    state = [0] * 25
    padded = bytearray(data)
    padded.append(0x01)
    while len(padded) % rate_bytes != rate_bytes - 1:
        padded.append(0x00)
    padded.append(0x80)

    for offset in range(0, len(padded), rate_bytes):
        block = padded[offset : offset + rate_bytes]
        for lane_index in range(rate_bytes // 8):
            lane = int.from_bytes(block[lane_index * 8 : (lane_index + 1) * 8], "little")
            state[lane_index] ^= lane
        keccak_f1600(state)

    output = bytearray()
    while len(output) < 32:
        for lane in state[: rate_bytes // 8]:
            output.extend(lane.to_bytes(8, "little"))
        if len(output) >= 32:
            break
        keccak_f1600(state)

    return bytes(output[:32])


class MrzInterpretation(BaseModel):
    format: str
    document_code: str = ""
    issuing_country: str = ""
    document_number: str = ""
    nationality: str = ""
    date_of_birth: str = ""
    expiry_date: str = ""
    sex: str = ""
    surnames: str = ""
    given_names: str = ""
    valid_document_number_check: bool = False
    valid_birth_check: bool = False
    valid_expiry_check: bool = False


class OcrResponse(BaseModel):
    full_text: str = Field(default="")
    name: str = Field(default="")
    date_of_birth: str = Field(default="")
    document_number: str = Field(default="")
    mrz_raw: str = Field(default="")
    barcode_raw: str = Field(default="")
    barcode_name: str = Field(default="")
    barcode_date_of_birth: str = Field(default="")
    barcode_document_number: str = Field(default="")
    mrz: MrzInterpretation | None = None
    kyc_data_hash: str = Field(default="")
    commitment_salt: str = Field(default="")
    attestation: "KycAttestationPayload | None" = None
    submission: "SignedAttestationSubmission | None" = None
    model: str


class ImageUrlRequest(BaseModel):
    image_url: str
    subject: str = ""
    commitment_salt: str = ""
    nonce: str = ""
    expires_in_seconds: int = 3600


class KycAttestationPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    subject: str = ""
    is_over_18: bool = Field(default=False, alias="isOver18")
    quality: int = 0
    commitment: str = ""
    issued_at: int = Field(default=0, alias="issuedAt")
    expires_at: int = Field(default=0, alias="expiresAt")
    nonce: str = ""


class SignedAttestationSubmission(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    contract_address: str = Field(default="", alias="contractAddress")
    verifier: str = ""
    signature: str = ""


class PublicSettingsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    chain_id: int = Field(alias="chainId")
    chain_name: str = Field(alias="chainName")
    rpc_url: str = Field(alias="rpcUrl")
    contract_address: str = Field(alias="contractAddress")
    verifier_address: str = Field(alias="verifierAddress")
    explorer_base_url: str = Field(alias="explorerBaseUrl")
    native_currency_name: str = Field(alias="nativeCurrencyName")
    native_currency_symbol: str = Field(alias="nativeCurrencySymbol")
    attestation_ttl_seconds: int = Field(alias="attestationTtlSeconds")


class OpenRouterImageUrl(BaseModel):
    url: str


class OpenRouterContentItem(BaseModel):
    type: str
    text: str | None = None
    image_url: OpenRouterImageUrl | None = None


class OpenRouterMessage(BaseModel):
    role: str
    content: list[OpenRouterContentItem] | str


@dataclass(frozen=True)
class Settings:
    api_key: str
    model: str
    site_url: str
    app_name: str
    allowed_origins: list[str]
    default_attestation_ttl_seconds: int
    attestation_rpc_url: str
    attestation_chain_id: int
    attestation_chain_name: str
    attestation_native_currency_name: str
    attestation_native_currency_symbol: str
    attestation_contract_address: str
    verifier_address: str
    verifier_private_key: str
    explorer_base_url: str


@dataclass(frozen=True)
class BarcodeExtraction:
    raw: str = ""
    name: str = ""
    date_of_birth: str = ""
    document_number: str = ""


def build_public_settings_from_env() -> PublicSettingsResponse:
    verifier_private_key = normalize_private_key(
        os.getenv("OCR_ATTESTATION_VERIFIER_PRIVATE_KEY", "").strip(),
    )
    configured_verifier_address = os.getenv(
        "OCR_ATTESTATION_VERIFIER_ADDRESS",
        "",
    ).strip()
    verifier_address = (
        resolve_verifier_address(verifier_private_key, configured_verifier_address)
        if verifier_private_key
        else normalize_eth_address(configured_verifier_address)
    )

    return PublicSettingsResponse(
        chainId=int(os.getenv("OCR_ATTESTATION_CHAIN_ID", "80002").strip()),
        chainName=os.getenv("OCR_ATTESTATION_CHAIN_NAME", "Polygon Amoy").strip(),
        rpcUrl=os.getenv("OCR_ATTESTATION_RPC_URL", "").strip(),
        contractAddress=normalize_eth_address(
            os.getenv("OCR_ATTESTATION_CONTRACT_ADDRESS", "").strip(),
        ),
        verifierAddress=verifier_address,
        explorerBaseUrl=os.getenv(
            "OCR_ATTESTATION_EXPLORER_BASE_URL",
            "https://amoy.polygonscan.com",
        ).strip(),
        nativeCurrencyName=os.getenv(
            "OCR_ATTESTATION_CHAIN_CURRENCY_NAME",
            "POL",
        ).strip(),
        nativeCurrencySymbol=os.getenv(
            "OCR_ATTESTATION_CHAIN_CURRENCY_SYMBOL",
            "POL",
        ).strip(),
        attestationTtlSeconds=max(
            60,
            int(os.getenv("OCR_ATTESTATION_TTL_SECONDS", "3600").strip()),
        ),
    )


def parse_allowed_origins(raw_value: str) -> list[str]:
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


def normalize_private_key(value: str) -> str:
    candidate = value.strip()
    if not candidate:
        return ""
    candidate = candidate if candidate.startswith("0x") else f"0x{candidate}"
    if not re.fullmatch(r"0x[a-fA-F0-9]{64}", candidate):
        raise RuntimeError("OCR_ATTESTATION_VERIFIER_PRIVATE_KEY must be a 32-byte hex private key.")
    return candidate


def resolve_verifier_address(verifier_private_key: str, configured_address: str) -> str:
    derived_address = Account.from_key(verifier_private_key).address.lower()
    normalized_configured = normalize_eth_address(configured_address) if configured_address else ""

    if normalized_configured and normalized_configured != derived_address:
        raise RuntimeError(
            "OCR_ATTESTATION_VERIFIER_ADDRESS does not match OCR_ATTESTATION_VERIFIER_PRIVATE_KEY.",
        )

    return normalized_configured or derived_address


def get_settings() -> Settings:
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not configured.")

    verifier_private_key = normalize_private_key(
        os.getenv("OCR_ATTESTATION_VERIFIER_PRIVATE_KEY", "").strip(),
    )
    if not verifier_private_key:
        raise RuntimeError("OCR_ATTESTATION_VERIFIER_PRIVATE_KEY is not configured.")

    configured_verifier_address = os.getenv(
        "OCR_ATTESTATION_VERIFIER_ADDRESS",
        "",
    ).strip()
    verifier_address = resolve_verifier_address(
        verifier_private_key,
        configured_verifier_address,
    )

    public_settings = build_public_settings_from_env()

    return Settings(
        api_key=api_key,
        model=os.getenv("OPENROUTER_MODEL", "openai/gpt-5.4-nano").strip(),
        site_url=os.getenv("OPENROUTER_SITE_URL", "http://localhost:8001").strip(),
        app_name=os.getenv("OPENROUTER_APP_NAME", "ProofPass OCR API").strip(),
        allowed_origins=parse_allowed_origins(
            os.getenv(
                "ALLOWED_ORIGINS",
                "http://localhost:3000,http://127.0.0.1:3000",
            ).strip(),
        ),
        default_attestation_ttl_seconds=max(
            60,
            int(os.getenv("OCR_ATTESTATION_TTL_SECONDS", "3600").strip()),
        ),
        attestation_rpc_url=public_settings.rpc_url,
        attestation_chain_id=public_settings.chain_id,
        attestation_chain_name=public_settings.chain_name,
        attestation_native_currency_name=public_settings.native_currency_name,
        attestation_native_currency_symbol=public_settings.native_currency_symbol,
        attestation_contract_address=public_settings.contract_address,
        verifier_address=verifier_address,
        verifier_private_key=verifier_private_key,
        explorer_base_url=public_settings.explorer_base_url,
    )


def get_public_settings() -> PublicSettingsResponse:
    return build_public_settings_from_env()


def iso_date(year: int, month: int, day: int) -> str:
    try:
        import datetime as dt

        return dt.date(year, month, day).isoformat()
    except ValueError:
        return ""


def normalize_name(value: str) -> str:
    collapsed = re.sub(r"\s+", " ", value.strip())
    return collapsed.upper()


def normalize_eth_address(value: str) -> str:
    candidate = value.strip()
    if not candidate:
        return ""
    if not re.fullmatch(r"0x[a-fA-F0-9]{40}", candidate):
        raise HTTPException(status_code=400, detail="subject must be a valid EVM address.")
    return candidate.lower()


def normalize_date_of_birth(value: str) -> str:
    text = value.strip().upper()
    if not text:
        return ""

    if match := re.search(r"\b(\d{4})[-/](\d{2})[-/](\d{2})\b", text):
        year, month, day = map(int, match.groups())
        return iso_date(year, month, day)

    if match := re.search(r"\b(\d{2})[-/](\d{2})[-/](\d{4})\b", text):
        day, month, year = map(int, match.groups())
        return iso_date(year, month, day)

    if match := re.search(r"\b(\d{1,2})\s+([A-Z]{3})\s+(\d{4})\b", text):
        day_text, month_text, year_text = match.groups()
        month = MONTH_MAP.get(month_text)
        if month:
            return iso_date(int(year_text), month, int(day_text))

    return ""


def split_barcode_payload(value: str) -> list[str]:
    return [part.strip() for part in value.split("|") if part.strip()]


def normalize_document_number(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", value.upper())


def extract_barcode_document_number(value: str) -> str:
    normalized = normalize_document_number(value)
    if not normalized:
        return ""

    thirteen_digit = re.search(r"\d{13}", normalized)
    if thirteen_digit:
        return thirteen_digit.group(0)

    generic = re.search(r"[A-Z0-9]{6,24}", normalized)
    return generic.group(0) if generic else ""


def merge_barcode_name(given_names: str, surname: str) -> str:
    combined = " ".join(part for part in [given_names, surname] if part.strip())
    return normalize_name(combined)


def parse_barcode_candidates(barcodes: list[zxingcpp.Barcode]) -> BarcodeExtraction:
    raw_values: list[str] = []
    best_name = ""
    best_dob = ""
    best_document_number = ""

    for barcode in barcodes:
        raw_text = str(getattr(barcode, "text", "") or "").strip()
        if not raw_text:
            continue
        raw_values.append(raw_text)

        parts = split_barcode_payload(raw_text)
        if len(parts) >= 6:
            surname = parts[0]
            given_names = parts[1]
            candidate_name = merge_barcode_name(given_names, surname)
            candidate_dob = normalize_date_of_birth(parts[5])
            candidate_document_number = extract_barcode_document_number(parts[4])

            if candidate_name and not best_name:
                best_name = candidate_name
            if candidate_dob and not best_dob:
                best_dob = candidate_dob
            if candidate_document_number and not best_document_number:
                best_document_number = candidate_document_number

        if not best_document_number:
            candidate_document_number = extract_barcode_document_number(raw_text)
            if candidate_document_number:
                best_document_number = candidate_document_number

    return BarcodeExtraction(
        raw="\n".join(raw_values),
        name=best_name,
        date_of_birth=best_dob,
        document_number=best_document_number,
    )


def decode_barcodes(file_bytes: bytes) -> BarcodeExtraction:
    try:
        image = Image.open(BytesIO(file_bytes))
        barcodes = zxingcpp.read_barcodes(image)
    except Exception:
        return BarcodeExtraction()

    if not barcodes:
        return BarcodeExtraction()

    return parse_barcode_candidates(barcodes)


def compute_is_over_18(date_of_birth: str) -> bool:
    if not date_of_birth:
        return False

    import datetime as dt

    today = dt.date.today()
    year, month, day = map(int, date_of_birth.split("-"))
    birth_date = dt.date(year, month, day)
    age = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        age -= 1
    return age >= 18


def estimate_quality(
    *,
    full_text: str,
    extracted_name: str,
    extracted_dob: str,
    mrz: MrzInterpretation | None,
) -> int:
    score = 12
    if full_text:
        score += 22
    if extracted_name:
        score += 22
    if extracted_dob:
        score += 22
    if mrz and mrz.document_number:
        score += 10

    mrz_checks = sum(
        1
        for value in [
            mrz.valid_document_number_check if mrz else False,
            mrz.valid_birth_check if mrz else False,
            mrz.valid_expiry_check if mrz else False,
        ]
        if value
    )
    score += mrz_checks * 8
    return min(100, score)


def normalize_hex32(value: str) -> str:
    candidate = value.strip().lower()
    if not candidate:
        return ""
    if not re.fullmatch(r"0x[a-f0-9]{64}", candidate):
        raise HTTPException(status_code=400, detail="Hex values must be 32-byte 0x-prefixed strings.")
    return candidate


def build_kyc_data_hash(
    *,
    extracted_name: str,
    extracted_dob: str,
    document_number: str,
    mrz: MrzInterpretation | None,
) -> str:
    payload = {
        "name": extracted_name,
        "date_of_birth": extracted_dob,
        "document_number": document_number or (mrz.document_number if mrz else ""),
        "issuing_country": mrz.issuing_country if mrz else "",
        "nationality": mrz.nationality if mrz else "",
    }
    return "0x" + keccak256(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    ).hex()


def encode_abi_bytes32(value: str) -> bytes:
    return bytes.fromhex(value[2:])


def encode_abi_address(value: str) -> bytes:
    return bytes.fromhex(value[2:]).rjust(32, b"\x00")


def generate_nonce() -> str:
    return "0x" + os.urandom(32).hex()


def generate_salt() -> str:
    return "0x" + os.urandom(32).hex()


def build_commitment(kyc_data_hash: str, subject: str, salt: str) -> str:
    return "0x" + keccak256(
        encode_abi_bytes32(kyc_data_hash)
        + encode_abi_address(subject)
        + encode_abi_bytes32(salt)
    ).hex()


def build_attestation_payload(
    *,
    subject: str,
    extracted_name: str,
    extracted_dob: str,
    document_number: str,
    mrz: MrzInterpretation | None,
    settings: Settings,
    commitment_salt: str,
    nonce: str,
    expires_in_seconds: int,
) -> tuple[str, KycAttestationPayload]:
    import time

    safe_ttl = max(60, expires_in_seconds or settings.default_attestation_ttl_seconds)
    now = int(time.time())
    kyc_data_hash = build_kyc_data_hash(
        extracted_name=extracted_name,
        extracted_dob=extracted_dob,
        document_number=document_number,
        mrz=mrz,
    )
    commitment = build_commitment(kyc_data_hash, subject, commitment_salt)
    attestation = KycAttestationPayload(
        subject=subject,
        isOver18=compute_is_over_18(extracted_dob),
        quality=estimate_quality(
            full_text="",
            extracted_name=extracted_name,
            extracted_dob=extracted_dob,
            mrz=mrz,
        ),
        commitment=commitment,
        issuedAt=now,
        expiresAt=now + safe_ttl,
        nonce=nonce,
    )
    return kyc_data_hash, attestation


def build_typed_data(
    *,
    chain_id: int,
    contract_address: str,
    attestation: KycAttestationPayload,
) -> dict[str, Any]:
    return {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "KycAttestation": [
                {"name": "subject", "type": "address"},
                {"name": "isOver18", "type": "bool"},
                {"name": "quality", "type": "uint8"},
                {"name": "commitment", "type": "bytes32"},
                {"name": "issuedAt", "type": "uint64"},
                {"name": "expiresAt", "type": "uint64"},
                {"name": "nonce", "type": "uint256"},
            ],
        },
        "primaryType": "KycAttestation",
        "domain": {
            "name": "ProofPassKycRegistry",
            "version": "1",
            "chainId": chain_id,
            "verifyingContract": contract_address,
        },
        "message": attestation.model_dump(by_alias=True),
    }


async def build_submission(
    *,
    settings: Settings,
    attestation: KycAttestationPayload,
) -> SignedAttestationSubmission | None:
    contract_address = normalize_eth_address(settings.attestation_contract_address)
    verifier = normalize_eth_address(settings.verifier_address)
    if not contract_address or not verifier or not settings.verifier_private_key:
        return None
    if verifier.lower() == attestation.subject.lower():
        raise HTTPException(
            status_code=400,
            detail="Verifier must be different from the attestation subject.",
        )

    typed_data = build_typed_data(
        chain_id=settings.attestation_chain_id,
        contract_address=contract_address,
        attestation=attestation,
    )
    try:
        signed = Account.sign_typed_data(
            private_key=settings.verifier_private_key,
            full_message=typed_data,
        )
    except Exception as exc:  # pragma: no cover - library error path
        raise HTTPException(status_code=502, detail="Verifier signing failed.") from exc

    signature = signed.signature.hex()
    if not signature.startswith("0x"):
        signature = f"0x{signature}"

    return SignedAttestationSubmission(
        contractAddress=contract_address,
        verifier=verifier,
        signature=signature,
    )


def mrz_char_value(character: str) -> int:
    if character == "<":
        return 0
    if character.isdigit():
        return int(character)
    if "A" <= character <= "Z":
        return ord(character) - 55
    return -1


def mrz_check_digit(value: str) -> int:
    weights = [7, 3, 1]
    total = 0
    for index, character in enumerate(value):
        char_value = mrz_char_value(character)
        if char_value < 0:
            return -1
        total += char_value * weights[index % len(weights)]
    return total % 10


def verify_mrz_check_digit(value: str, check_digit: str) -> bool:
    return check_digit.isdigit() and mrz_check_digit(value) == int(check_digit)


def normalize_mrz_line(line: str) -> str:
    return re.sub(r"[^A-Z0-9<]", "", line.upper().replace(" ", ""))


def parse_mrz_names(value: str) -> tuple[str, str]:
    surname_part, _, given_part = value.partition("<<")
    surnames = re.sub(r"<+", " ", surname_part).strip()
    given_names = re.sub(r"<+", " ", given_part).strip()
    return surnames, given_names


def infer_mrz_year(two_digit_year: int, mode: str) -> int:
    import datetime as dt

    current_year = dt.date.today().year
    current_two_digit = current_year % 100
    if mode == "birth":
        return 2000 + two_digit_year if two_digit_year <= current_two_digit else 1900 + two_digit_year
    this_century = 2000 + two_digit_year
    if this_century <= current_year + 20:
        return this_century
    return 1900 + two_digit_year


def parse_mrz_date(value: str, mode: str) -> str:
    if not re.fullmatch(r"\d{6}", value):
        return ""
    year = infer_mrz_year(int(value[0:2]), mode)
    month = int(value[2:4])
    day = int(value[4:6])
    return iso_date(year, month, day)


def extract_mrz_candidates(*texts: str) -> list[str]:
    candidates: list[str] = []
    for text in texts:
        for raw_line in text.splitlines():
            line = normalize_mrz_line(raw_line)
            if len(line) >= 24 and re.fullmatch(r"[A-Z0-9<]+", line):
                if line not in candidates:
                    candidates.append(line)
    return candidates


def parse_td3(lines: list[str]) -> MrzInterpretation | None:
    for index in range(len(lines) - 1):
        first_line = lines[index]
        second_line = lines[index + 1]
        if len(first_line) < 40 or len(second_line) < 40:
            continue

        line1 = first_line.ljust(44, "<")[:44]
        line2 = second_line.ljust(44, "<")[:44]
        if not re.match(r"^(P|I|A|C|V)<", line1):
            continue

        surnames, given_names = parse_mrz_names(line1[5:])
        return MrzInterpretation(
            format="TD3",
            document_code=line1[0:2].replace("<", "").strip(),
            issuing_country=line1[2:5].replace("<", "").strip(),
            document_number=line2[0:9].replace("<", "").strip(),
            nationality=line2[10:13].replace("<", "").strip(),
            date_of_birth=parse_mrz_date(line2[13:19], "birth"),
            expiry_date=parse_mrz_date(line2[21:27], "expiry"),
            sex="Unspecified" if line2[20] == "<" else line2[20],
            surnames=surnames,
            given_names=given_names,
            valid_document_number_check=verify_mrz_check_digit(line2[0:9], line2[9]),
            valid_birth_check=verify_mrz_check_digit(line2[13:19], line2[19]),
            valid_expiry_check=verify_mrz_check_digit(line2[21:27], line2[27]),
        )
    return None


def parse_td1(lines: list[str]) -> MrzInterpretation | None:
    for index in range(len(lines) - 2):
        first_line = lines[index]
        second_line = lines[index + 1]
        third_line = lines[index + 2]
        if len(first_line) < 28 or len(second_line) < 28 or len(third_line) < 28:
            continue

        line1 = first_line.ljust(30, "<")[:30]
        line2 = second_line.ljust(30, "<")[:30]
        line3 = third_line.ljust(30, "<")[:30]
        if not re.match(r"^(P|I|A|C|V)<", line1):
            continue

        surnames, given_names = parse_mrz_names(line3)
        return MrzInterpretation(
            format="TD1",
            document_code=line1[0:2].replace("<", "").strip(),
            issuing_country=line1[2:5].replace("<", "").strip(),
            document_number=line1[5:14].replace("<", "").strip(),
            nationality=line2[15:18].replace("<", "").strip(),
            date_of_birth=parse_mrz_date(line2[0:6], "birth"),
            expiry_date=parse_mrz_date(line2[8:14], "expiry"),
            sex="Unspecified" if line2[7] == "<" else line2[7],
            surnames=surnames,
            given_names=given_names,
            valid_document_number_check=verify_mrz_check_digit(line1[5:14], line1[14]),
            valid_birth_check=verify_mrz_check_digit(line2[0:6], line2[6]),
            valid_expiry_check=verify_mrz_check_digit(line2[8:14], line2[14]),
        )
    return None


def interpret_mrz(*texts: str) -> MrzInterpretation | None:
    candidates = extract_mrz_candidates(*texts)
    return parse_td3(candidates) or parse_td1(candidates)


def build_prompt() -> str:
    return (
        "You are extracting KYC data from an identity card image. "
        "Read the image carefully and return only the requested fields. "
        "Extract the full visible OCR text, the person's full name, the person's date of birth, "
        "and any MRZ text if it exists. Also inspect any visible barcode or 2D barcode region and try to extract barcode-associated text or inferred values from it. "
        "If a barcode, PDF417, QR-like block, or machine-readable code is visible on the back of the card, attempt to return the raw barcode text or inferred payload plus any name, date of birth, or document number you can read from it. "
        "If a value is missing or uncertain, return an empty string for that field. "
        "Do not guess. "
        "Normalize the person's name as it appears on the document. "
        "Prefer YYYY-MM-DD for date_of_birth when possible."
    )


def build_response_format() -> dict[str, Any]:
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "proofpass_id_card_ocr",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "full_text": {"type": "string"},
                    "name": {"type": "string"},
                    "date_of_birth": {"type": "string"},
                    "mrz_raw": {"type": "string"},
                    "barcode_raw": {"type": "string"},
                    "barcode_name": {"type": "string"},
                    "barcode_date_of_birth": {"type": "string"},
                    "barcode_document_number": {"type": "string"},
                },
                "required": [
                    "full_text",
                    "name",
                    "date_of_birth",
                    "mrz_raw",
                    "barcode_raw",
                    "barcode_name",
                    "barcode_date_of_birth",
                    "barcode_document_number"
                ],
                "additionalProperties": False,
            },
        },
    }


def build_openrouter_payload(image_url: str, model: str) -> dict[str, Any]:
    messages = [
        OpenRouterMessage(role="system", content=build_prompt()),
        OpenRouterMessage(
            role="user",
            content=[
                OpenRouterContentItem(type="text", text="Extract name and date of birth from this ID card."),
                OpenRouterContentItem(type="image_url", image_url=OpenRouterImageUrl(url=image_url)),
            ],
        ),
    ]

    return {
        "model": model,
        "temperature": 0,
        "messages": [message.model_dump(exclude_none=True) for message in messages],
        "response_format": build_response_format(),
    }


def parse_openrouter_json(data: dict[str, Any]) -> dict[str, Any]:
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="OpenRouter returned an unexpected response shape.") from exc

    if isinstance(content, list):
        content = "".join(
            item.get("text", "") for item in content if isinstance(item, dict)
        )

    if not isinstance(content, str):
        raise HTTPException(status_code=502, detail="OpenRouter returned non-text content.")

    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="OpenRouter returned invalid JSON content.") from exc


async def call_openrouter(
    image_url: str,
    *,
    barcode_extraction: BarcodeExtraction | None = None,
    subject: str = "",
    commitment_salt: str = "",
    nonce: str = "",
    expires_in_seconds: int | None = None,
) -> OcrResponse:
    settings = get_settings()
    barcode_extraction = barcode_extraction or BarcodeExtraction()
    full_text = ""
    extracted_name = barcode_extraction.name
    extracted_dob = barcode_extraction.date_of_birth
    mrz_raw = ""
    barcode_raw = barcode_extraction.raw
    barcode_name = barcode_extraction.name
    barcode_dob = barcode_extraction.date_of_birth
    barcode_document_number = barcode_extraction.document_number
    mrz = None

    if not (extracted_name and extracted_dob):
        headers = {
            "Authorization": f"Bearer {settings.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.site_url,
            "X-Title": settings.app_name,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=build_openrouter_payload(image_url=image_url, model=settings.model),
            )

        if response.status_code >= 400:
            detail = response.text
            raise HTTPException(
                status_code=502,
                detail=f"OpenRouter request failed with status {response.status_code}: {detail}",
            )

        parsed = parse_openrouter_json(response.json())
        full_text = str(parsed.get("full_text", "")).strip()
        extracted_name = normalize_name(str(parsed.get("name", "")))
        extracted_dob = normalize_date_of_birth(str(parsed.get("date_of_birth", "")))
        mrz_raw = str(parsed.get("mrz_raw", "")).strip()
        llm_barcode_raw = str(parsed.get("barcode_raw", "")).strip()
        llm_barcode_name = normalize_name(str(parsed.get("barcode_name", "")))
        llm_barcode_dob = normalize_date_of_birth(str(parsed.get("barcode_date_of_birth", "")))
        llm_barcode_document_number = re.sub(
            r"\s+",
            "",
            str(parsed.get("barcode_document_number", "")).strip().upper(),
        )
        if llm_barcode_raw:
            barcode_raw = "\n".join(
                part for part in [barcode_raw, llm_barcode_raw] if part
            )
        barcode_name = barcode_name or llm_barcode_name
        barcode_dob = barcode_dob or llm_barcode_dob
        barcode_document_number = (
            barcode_document_number or llm_barcode_document_number
        )
        mrz = interpret_mrz(full_text, mrz_raw)

        if mrz:
            mrz_name = normalize_name(
                " ".join(part for part in [mrz.given_names, mrz.surnames] if part),
            )
            if mrz_name:
                extracted_name = mrz_name
            if mrz.date_of_birth:
                extracted_dob = mrz.date_of_birth

        if barcode_name and not extracted_name:
            extracted_name = barcode_name
        if barcode_dob and not extracted_dob:
            extracted_dob = barcode_dob

    resolved_document_number = (
        mrz.document_number
        if mrz and mrz.document_number
        else barcode_document_number
    )

    normalized_subject = normalize_eth_address(subject)
    normalized_salt = normalize_hex32(commitment_salt) if commitment_salt.strip() else ""
    normalized_nonce = normalize_hex32(nonce) if nonce.strip() else ""
    quality = estimate_quality(
        full_text=full_text,
        extracted_name=extracted_name,
        extracted_dob=extracted_dob,
        mrz=mrz,
    )

    kyc_data_hash = ""
    attestation = None
    submission = None
    if normalized_subject:
        final_salt = normalized_salt or generate_salt()
        final_nonce = normalized_nonce or generate_nonce()
        kyc_data_hash, attestation = build_attestation_payload(
            subject=normalized_subject,
            extracted_name=extracted_name,
            extracted_dob=extracted_dob,
            document_number=resolved_document_number,
            mrz=mrz,
            settings=settings,
            commitment_salt=final_salt,
            nonce=final_nonce,
            expires_in_seconds=expires_in_seconds or settings.default_attestation_ttl_seconds,
        )
        attestation.quality = quality
        submission = await build_submission(settings=settings, attestation=attestation)
    else:
        final_salt = ""

    return OcrResponse(
        full_text=full_text,
        name=extracted_name,
        date_of_birth=extracted_dob,
        document_number=resolved_document_number,
        mrz_raw=mrz_raw,
        barcode_raw=barcode_raw,
        barcode_name=barcode_name,
        barcode_date_of_birth=barcode_dob,
        barcode_document_number=barcode_document_number,
        mrz=mrz,
        kyc_data_hash=kyc_data_hash,
        commitment_salt=final_salt,
        attestation=attestation,
        submission=submission,
        model=settings.model,
    )


def file_to_data_url(file_bytes: bytes, content_type: str) -> str:
    image_format = SUPPORTED_IMAGE_TYPES.get(content_type.lower())
    if not image_format:
        supported = ", ".join(sorted(SUPPORTED_IMAGE_TYPES))
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported content type '{content_type}'. Supported types: {supported}.",
        )

    encoded = base64.b64encode(file_bytes).decode("utf-8")
    return f"data:{content_type};base64,{encoded}"


async def fetch_remote_image(image_url: str) -> tuple[bytes, str]:
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.get(image_url)

    if response.status_code >= 400:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to fetch image URL. Remote server returned {response.status_code}.",
        )

    content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
    if content_type not in SUPPORTED_IMAGE_TYPES:
        supported = ", ".join(sorted(SUPPORTED_IMAGE_TYPES))
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported remote content type '{content_type}'. Supported types: {supported}.",
        )

    return response.content, content_type


app = FastAPI(title="ProofPass OCR API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_allowed_origins(
        os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).strip(),
    ),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    settings = get_settings()
    return {"status": "ok", "model": settings.model}


@app.get("/settings/public", response_model=PublicSettingsResponse)
async def settings_public() -> PublicSettingsResponse:
    return get_public_settings()


@app.post("/ocr/id-card/file", response_model=OcrResponse)
async def ocr_id_card_file(
    file: UploadFile = File(...),
    subject: str = Form(default=""),
    commitment_salt: str = Form(default=""),
    nonce: str = Form(default=""),
    expires_in_seconds: int = Form(default=3600),
) -> OcrResponse:
    if not file.content_type:
        raise HTTPException(status_code=400, detail="Uploaded file is missing a content type.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    barcode_extraction = decode_barcodes(file_bytes)
    image_url = file_to_data_url(file_bytes, file.content_type)
    return await call_openrouter(
        image_url,
        barcode_extraction=barcode_extraction,
        subject=subject,
        commitment_salt=commitment_salt,
        nonce=nonce,
        expires_in_seconds=expires_in_seconds,
    )


@app.post("/ocr/id-card/url", response_model=OcrResponse)
async def ocr_id_card_url(request: ImageUrlRequest) -> OcrResponse:
    if not request.image_url.strip():
        raise HTTPException(status_code=400, detail="image_url is required.")

    file_bytes, _content_type = await fetch_remote_image(request.image_url.strip())
    barcode_extraction = decode_barcodes(file_bytes)
    return await call_openrouter(
        request.image_url.strip(),
        barcode_extraction=barcode_extraction,
        subject=request.subject,
        commitment_salt=request.commitment_salt,
        nonce=request.nonce,
        expires_in_seconds=request.expires_in_seconds,
    )
