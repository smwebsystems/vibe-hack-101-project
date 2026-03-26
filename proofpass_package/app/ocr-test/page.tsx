"use client";

import { useMemo, useRef, useState } from "react";
import { ActionButton, PageIntro, PageShell, Panel, SecondaryButton } from "../../components/proofpass-ui";

type CropState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type OcrResult = {
  dob: string;
  extractedName: string;
  idNumber: string;
  confidence: number;
  isOver18: boolean;
};

type KycMatchResult = {
  dobMatches: boolean;
  extractedName: string;
  kycConfirmed: boolean;
  nameMatches: boolean;
};

type SaIdInterpretation = {
  dateOfBirth: string;
  sex: "Female" | "Male";
  citizenship: "SA Citizen" | "Permanent Resident";
  valid: boolean;
};

type MrzInterpretation = {
  format: "TD1" | "TD3";
  documentCode: string;
  issuingCountry: string;
  documentNumber: string;
  nationality: string;
  dateOfBirth: string;
  expiryDate: string;
  sex: string;
  surnames: string;
  givenNames: string;
  validBirthCheck: boolean;
  validExpiryCheck: boolean;
  validDocumentNumberCheck: boolean;
};

const initialCrop: CropState = {
  x: 40,
  y: 60,
  width: 44,
  height: 24,
};

const dobPatterns = [
  /\b(\d{2})[\/-](\d{2})[\/-](\d{4})\b/g,
  /\b(\d{4})[\/-](\d{2})[\/-](\d{2})\b/g,
];

const monthMap: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

function padDatePart(value: string) {
  return value.padStart(2, "0");
}

function isValidDateParts(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const candidate = new Date(`${year}-${padDatePart(String(month))}-${padDatePart(String(day))}T00:00:00`);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

function normalizeYear(yearText: string) {
  const currentYear = new Date().getFullYear();
  let year = Number(yearText);

  if (Number.isNaN(year)) {
    return 0;
  }

  if (year >= currentYear - 120 && year <= currentYear) {
    return year;
  }

  if (year < currentYear - 120) {
    const plusHundred = year + 100;
    if (plusHundred >= currentYear - 120 && plusHundred <= currentYear) {
      return plusHundred;
    }
  }

  if (year > currentYear && year - 100 >= currentYear - 120) {
    return year - 100;
  }

  return year;
}

function buildIsoDob(year: number, month: number, day: number) {
  if (!isValidDateParts(year, month, day)) {
    return "";
  }

  return `${year}-${padDatePart(String(month))}-${padDatePart(String(day))}`;
}

function normalizeDob(text: string) {
  const normalizedText = text.toUpperCase().replace(/\s+/g, " ");
  const ddmmyyyy = Array.from(text.matchAll(dobPatterns[0]));
  if (ddmmyyyy.length > 0) {
    const [, day, month, year] = ddmmyyyy[0];
    return buildIsoDob(normalizeYear(year), Number(month), Number(day));
  }

  const yyyymmdd = Array.from(text.matchAll(dobPatterns[1]));
  if (yyyymmdd.length > 0) {
    const [, year, month, day] = yyyymmdd[0];
    return buildIsoDob(normalizeYear(year), Number(month), Number(day));
  }

  const monthNameMatch = normalizedText.match(
    /\b(\d{1,2})[^\w]?([A-Z]{3})[^\w]?(\d{4})\b/,
  );
  if (monthNameMatch) {
    const [, day, monthName, year] = monthNameMatch;
    const month = monthMap[monthName];
    if (month) {
      return buildIsoDob(normalizeYear(year), month, Number(day));
    }
  }

  const tolerantMatch = normalizedText.match(/\b(\d{1,2})[^\d]?(\d{1,2})[^\d]?(\d{4})\b/);
  if (tolerantMatch) {
    const [, day, month, year] = tolerantMatch;
    return buildIsoDob(normalizeYear(year), Number(month), Number(day));
  }

  return "";
}

function normalizeIdNumber(text: string) {
  const normalizedText = text.toUpperCase().replace(/[OQ]/g, "0").replace(/[I|L]/g, "1");
  const digitGroups = normalizedText.match(/\b\d{6,17}\b/g) ?? [];

  const southAfricanId = digitGroups.find((group) => group.length === 13);
  if (southAfricanId) {
    return southAfricanId;
  }

  return digitGroups[0] ?? "";
}

function luhnCheck(value: string) {
  let sum = 0;
  let shouldDouble = false;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (Number.isNaN(digit)) {
      return false;
    }

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function mrzCharValue(character: string) {
  if (character === "<") {
    return 0;
  }

  if (/\d/.test(character)) {
    return Number(character);
  }

  const charCode = character.charCodeAt(0);
  if (charCode >= 65 && charCode <= 90) {
    return charCode - 55;
  }

  return -1;
}

function mrzCheckDigit(value: string) {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let index = 0; index < value.length; index += 1) {
    const charValue = mrzCharValue(value[index]);
    if (charValue < 0) {
      return -1;
    }

    sum += charValue * weights[index % weights.length];
  }

  return sum % 10;
}

function verifyMrzCheckDigit(value: string, checkDigit: string) {
  if (!/^\d$/.test(checkDigit)) {
    return false;
  }

  return mrzCheckDigit(value) === Number(checkDigit);
}

function inferMrzYear(twoDigitYear: number, mode: "birth" | "expiry") {
  const currentYear = new Date().getFullYear();
  const currentTwoDigitYear = currentYear % 100;

  if (mode === "birth") {
    return twoDigitYear <= currentTwoDigitYear ? 2000 + twoDigitYear : 1900 + twoDigitYear;
  }

  const thisCentury = 2000 + twoDigitYear;
  if (thisCentury <= currentYear + 20) {
    return thisCentury;
  }

  return 1900 + twoDigitYear;
}

function parseMrzDate(value: string, mode: "birth" | "expiry") {
  if (!/^\d{6}$/.test(value)) {
    return "";
  }

  const year = inferMrzYear(Number(value.slice(0, 2)), mode);
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));

  return buildIsoDob(year, month, day);
}

function normalizeMrzLine(line: string) {
  return line
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9<]/g, "");
}

function normalizeMrzAlpha(character: string) {
  if (character === "0") {
    return "O";
  }

  if (character === "1") {
    return "I";
  }

  if (character === "2") {
    return "Z";
  }

  if (character === "8") {
    return "B";
  }

  return character;
}

function normalizeMrzSex(character: string) {
  if (character === "P") {
    return "F";
  }

  if (character === "H") {
    return "M";
  }

  return character;
}

function parseMrzNames(value: string) {
  const [surnamePart = "", givenPart = ""] = value.split("<<");

  return {
    surnames: surnamePart.replace(/<+/g, " ").trim(),
    givenNames: givenPart.replace(/<+/g, " ").trim(),
  };
}

function extractMrzLines(texts: string[]) {
  const candidates = texts
    .flatMap((text) => text.split(/\r?\n/))
    .map((line) => normalizeMrzLine(line))
    .filter((line) => line.length >= 24 && /^[A-Z0-9<]+$/.test(line));

  const uniqueCandidates: string[] = [];

  for (const line of candidates) {
    if (!uniqueCandidates.includes(line)) {
      uniqueCandidates.push(line);
    }
  }

  return uniqueCandidates;
}

function looksLikeMrzCoreLine(value: string) {
  return /\d{6}\d[MFPH<]\d{6}\d/.test(value.replace(/</g, ""));
}

function looksLikeMrzDocumentCode(value: string) {
  return /^(P|I|A|C|V)</.test(value);
}

function parseTd3(lines: string[]): MrzInterpretation | null {
  for (let index = 0; index < lines.length - 1; index += 1) {
    const firstLine = lines[index];
    const secondLine = lines[index + 1];

    if (firstLine.length < 40 || secondLine.length < 40) {
      continue;
    }

    const line1 = firstLine.padEnd(44, "<").slice(0, 44);
    const line2 = secondLine.padEnd(44, "<").slice(0, 44);
    if (!looksLikeMrzDocumentCode(line1) || !/\d{6}/.test(line2.slice(13, 19))) {
      continue;
    }
    const { surnames, givenNames } = parseMrzNames(line1.slice(5));

    return {
      format: "TD3",
      documentCode: line1.slice(0, 2).replace(/</g, "").trim(),
      issuingCountry: line1.slice(2, 5).replace(/</g, "").trim(),
      surnames,
      givenNames,
      documentNumber: line2.slice(0, 9).replace(/</g, "").trim(),
      nationality: line2.slice(10, 13).replace(/</g, "").trim(),
      dateOfBirth: parseMrzDate(line2.slice(13, 19), "birth"),
      sex: line2[20] === "<" ? "Unspecified" : line2[20],
      expiryDate: parseMrzDate(line2.slice(21, 27), "expiry"),
      validDocumentNumberCheck: verifyMrzCheckDigit(line2.slice(0, 9), line2[9]),
      validBirthCheck: verifyMrzCheckDigit(line2.slice(13, 19), line2[19]),
      validExpiryCheck: verifyMrzCheckDigit(line2.slice(21, 27), line2[27]),
    };
  }

  return null;
}

function parseTd3SecondLineOnly(lines: string[]): MrzInterpretation | null {
  for (const rawLine of lines) {
    if (rawLine.length < 28) {
      continue;
    }

    const match = rawLine.match(
      /([A-Z0-9<]{9})(\d)([A-Z0-9<]{3})(\d{6})(\d)([A-Z0-9<PHMF])(\d{6})(\d)([A-Z0-9<]{7,18})/,
    );
    if (!match) {
      continue;
    }

    const [
      ,
      rawDocumentNumber,
      documentNumberCheck,
      rawNationality,
      birthDateRaw,
      birthCheck,
      rawSex,
      expiryDateRaw,
      expiryCheck,
    ] = match;

    const documentNumber = rawDocumentNumber.replace(/</g, "").trim();
    const nationality = rawNationality
      .split("")
      .map((character) => normalizeMrzAlpha(character))
      .join("")
      .replace(/</g, "")
      .trim();
    const sex = normalizeMrzSex(rawSex);
    const dateOfBirth = parseMrzDate(birthDateRaw, "birth");
    const expiryDate = parseMrzDate(expiryDateRaw, "expiry");

    if (!dateOfBirth || !expiryDate) {
      continue;
    }

    return {
      format: "TD3",
      documentCode: "P",
      issuingCountry: "",
      documentNumber,
      nationality,
      dateOfBirth,
      expiryDate,
      sex: sex === "<" ? "Unspecified" : sex,
      surnames: "",
      givenNames: "",
      validDocumentNumberCheck: verifyMrzCheckDigit(rawDocumentNumber, documentNumberCheck),
      validBirthCheck: verifyMrzCheckDigit(birthDateRaw, birthCheck),
      validExpiryCheck: verifyMrzCheckDigit(expiryDateRaw, expiryCheck),
    };
  }

  return null;
}

function parseTd1(lines: string[]): MrzInterpretation | null {
  for (let index = 0; index < lines.length - 2; index += 1) {
    const firstLine = lines[index];
    const secondLine = lines[index + 1];
    const thirdLine = lines[index + 2];

    if (firstLine.length < 28 || secondLine.length < 28 || thirdLine.length < 28) {
      continue;
    }

    const line1 = firstLine.padEnd(30, "<").slice(0, 30);
    const line2 = secondLine.padEnd(30, "<").slice(0, 30);
    const line3 = thirdLine.padEnd(30, "<").slice(0, 30);
    if (!looksLikeMrzDocumentCode(line1) || !/\d{6}/.test(line2.slice(0, 6))) {
      continue;
    }
    const { surnames, givenNames } = parseMrzNames(line3);

    return {
      format: "TD1",
      documentCode: line1.slice(0, 2).replace(/</g, "").trim(),
      issuingCountry: line1.slice(2, 5).replace(/</g, "").trim(),
      surnames,
      givenNames,
      documentNumber: line1.slice(5, 14).replace(/</g, "").trim(),
      nationality: line2.slice(15, 18).replace(/</g, "").trim(),
      dateOfBirth: parseMrzDate(line2.slice(0, 6), "birth"),
      sex: line2[7] === "<" ? "Unspecified" : line2[7],
      expiryDate: parseMrzDate(line2.slice(8, 14), "expiry"),
      validDocumentNumberCheck: verifyMrzCheckDigit(line1.slice(5, 14), line1[14]),
      validBirthCheck: verifyMrzCheckDigit(line2.slice(0, 6), line2[6]),
      validExpiryCheck: verifyMrzCheckDigit(line2.slice(8, 14), line2[14]),
    };
  }

  return null;
}

function interpretMrz(texts: string[]) {
  const mrzLines = extractMrzLines(texts);
  return parseTd3(mrzLines) ?? parseTd1(mrzLines) ?? parseTd3SecondLineOnly(mrzLines);
}

function interpretSouthAfricanId(idNumber: string): SaIdInterpretation | null {
  if (!/^\d{13}$/.test(idNumber)) {
    return null;
  }

  const yy = Number(idNumber.slice(0, 2));
  const month = Number(idNumber.slice(2, 4));
  const day = Number(idNumber.slice(4, 6));
  const sequence = Number(idNumber.slice(6, 10));
  const citizenshipDigit = idNumber[10];
  const currentYear = new Date().getFullYear();
  const currentTwoDigitYear = currentYear % 100;
  const fullYear = yy <= currentTwoDigitYear ? 2000 + yy : 1900 + yy;
  const dateOfBirth = buildIsoDob(fullYear, month, day);

  if (!dateOfBirth) {
    return null;
  }

  return {
    dateOfBirth,
    sex: sequence >= 5000 ? "Male" : "Female",
    citizenship: citizenshipDigit === "0" ? "SA Citizen" : "Permanent Resident",
    valid: luhnCheck(idNumber),
  };
}

function computeIsOver18(dob: string) {
  if (!dob) {
    return false;
  }

  const now = new Date();
  const birthDate = new Date(dob);
  let age = now.getFullYear() - birthDate.getFullYear();
  const birthdayPassed =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());

  if (!birthdayPassed) {
    age -= 1;
  }

  return age >= 18;
}

function buildJsonPreview(result: OcrResult | null) {
  if (!result) {
    return `{\n  "dob": "",\n  "extractedName": "",\n  "idNumber": "",\n  "confidence": 0,\n  "isOver18": false\n}`;
  }

  return JSON.stringify(result, null, 2);
}

function normalizePersonName(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNameFromTexts(texts: string[]) {
  for (const text of texts) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => normalizePersonName(line))
      .filter(Boolean);

    for (const line of lines) {
      const parts = line.split(" ").filter((part) => part.length >= 2);
      if (parts.length >= 2 && parts.length <= 4) {
        return parts.join(" ");
      }
    }
  }

  return "";
}

function compareNames(expectedName: string, extractedName: string) {
  const normalizedExpected = normalizePersonName(expectedName);
  const normalizedExtracted = normalizePersonName(extractedName);

  if (!normalizedExpected || !normalizedExtracted) {
    return false;
  }

  const expectedParts = normalizedExpected.split(" ").filter(Boolean);
  const extractedParts = normalizedExtracted.split(" ").filter(Boolean);

  return expectedParts.every((part) =>
    extractedParts.some((candidate) => candidate === part || candidate.includes(part) || part.includes(candidate)),
  );
}

function buildProcessedCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  options?: {
    brightness?: number;
    contrast?: number;
    grayscale?: boolean;
    threshold?: number;
    scale?: number;
    whitePadding?: {
      x: number;
      y: number;
    };
  },
) {
  const scale = options?.scale ?? 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context unavailable.");
  }

  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  if (!options?.grayscale && typeof options?.threshold !== "number") {
    return canvas;
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const baseLuminance = 0.299 * red + 0.587 * green + 0.114 * blue;
    const contrast = options?.contrast ?? 1;
    const brightness = options?.brightness ?? 0;
    const luminance = Math.max(
      0,
      Math.min(255, (baseLuminance - 128) * contrast + 128 + brightness),
    );
    const threshold = options?.threshold;

    if (typeof threshold === "number") {
      const color = luminance > threshold ? 255 : 0;
      data[index] = color;
      data[index + 1] = color;
      data[index + 2] = color;
    } else if (options?.grayscale) {
      data[index] = luminance;
      data[index + 1] = luminance;
      data[index + 2] = luminance;
    }
  }

  context.putImageData(imageData, 0, 0);

  if (typeof options?.threshold === "number") {
    return trimBinaryCanvas(canvas);
  }

  if (options?.whitePadding) {
    return addCanvasPadding(canvas, options.whitePadding.x, options.whitePadding.y);
  }

  return canvas;
}

function addCanvasPadding(sourceCanvas: HTMLCanvasElement, paddingX: number, paddingY: number) {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width + paddingX * 2;
  canvas.height = sourceCanvas.height + paddingY * 2;
  const context = canvas.getContext("2d");

  if (!context) {
    return sourceCanvas;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(sourceCanvas, paddingX, paddingY);
  return canvas;
}

function trimBinaryCanvas(sourceCanvas: HTMLCanvasElement) {
  const context = sourceCanvas.getContext("2d");
  if (!context) {
    return sourceCanvas;
  }

  const { width, height } = sourceCanvas;
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;

  function columnBlackRatio(column: number) {
    let blackPixels = 0;

    for (let row = 0; row < height; row += 1) {
      const index = (row * width + column) * 4;
      if (data[index] < 32) {
        blackPixels += 1;
      }
    }

    return blackPixels / height;
  }

  function columnWhiteRatio(column: number) {
    let whitePixels = 0;

    for (let row = 0; row < height; row += 1) {
      const index = (row * width + column) * 4;
      if (data[index] > 223) {
        whitePixels += 1;
      }
    }

    return whitePixels / height;
  }

  function rowBlackRatio(row: number) {
    let blackPixels = 0;

    for (let column = 0; column < width; column += 1) {
      const index = (row * width + column) * 4;
      if (data[index] < 32) {
        blackPixels += 1;
      }
    }

    return blackPixels / width;
  }

  let left = 0;
  const leftLimit = Math.max(1, Math.floor(width * 0.2));
  while (left < leftLimit) {
    const blackRatio = columnBlackRatio(left);
    const whiteRatio = columnWhiteRatio(left);
    const nextBlackRatio = left + 1 < width ? columnBlackRatio(left + 1) : 0;

    if (blackRatio > 0.82 || (blackRatio > 0.45 && whiteRatio < 0.35) || (blackRatio > 0.32 && nextBlackRatio > 0.32)) {
      left += 1;
      continue;
    }

    break;
  }

  let right = width - 1;
  const rightLimit = Math.max(left, Math.floor(width * 0.8));
  while (right > rightLimit) {
    const blackRatio = columnBlackRatio(right);
    const whiteRatio = columnWhiteRatio(right);
    const previousBlackRatio = right - 1 >= 0 ? columnBlackRatio(right - 1) : 0;

    if (
      blackRatio > 0.82 ||
      (blackRatio > 0.45 && whiteRatio < 0.35) ||
      (blackRatio > 0.32 && previousBlackRatio > 0.32)
    ) {
      right -= 1;
      continue;
    }

    break;
  }

  let top = 0;
  while (top < height - 1 && rowBlackRatio(top) > 0.9) {
    top += 1;
  }

  let bottom = height - 1;
  while (bottom > top && rowBlackRatio(bottom) > 0.9) {
    bottom -= 1;
  }

  const gutterRemoved = left > 0 || right < width - 1 || top > 0 || bottom < height - 1;
  if (!gutterRemoved) {
    return sourceCanvas;
  }

  const cleanedCanvas = document.createElement("canvas");
  cleanedCanvas.width = width;
  cleanedCanvas.height = height;
  const cleanedContext = cleanedCanvas.getContext("2d");
  if (!cleanedContext) {
    return sourceCanvas;
  }

  cleanedContext.drawImage(sourceCanvas, 0, 0);
  cleanedContext.fillStyle = "#ffffff";

  if (left > 0) {
    cleanedContext.fillRect(0, 0, left, height);
  }

  if (right < width - 1) {
    cleanedContext.fillRect(right + 1, 0, width - right - 1, height);
  }

  if (top > 0) {
    cleanedContext.fillRect(0, 0, width, top);
  }

  if (bottom < height - 1) {
    cleanedContext.fillRect(0, bottom + 1, width, height - bottom - 1);
  }

  return cleanedCanvas;
}

function extractDobFromTexts(texts: string[]) {
  for (const text of texts) {
    const parsed = normalizeDob(text);
    if (parsed) {
      return parsed;
    }
  }

  return "";
}

export default function OcrTestPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [crop, setCrop] = useState<CropState>(initialCrop);
  const [ocrText, setOcrText] = useState("");
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState("");
  const [dob, setDob] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [expectedDob, setExpectedDob] = useState("");
  const [expectedName, setExpectedName] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [extractedName, setExtractedName] = useState("");

  const result = useMemo<OcrResult | null>(() => {
    if (!dob) {
      return null;
    }

    return {
      dob,
      extractedName,
      idNumber,
      confidence,
      isOver18: computeIsOver18(dob),
    };
  }, [confidence, dob, extractedName, idNumber]);

  const saIdInterpretation = useMemo(
    () => interpretSouthAfricanId(idNumber),
    [idNumber],
  );
  const mrzInterpretation = useMemo(
    () => interpretMrz([ocrText]),
    [ocrText],
  );
  const kycMatch = useMemo<KycMatchResult | null>(() => {
    if (!expectedName && !expectedDob) {
      return null;
    }

    const resolvedName = mrzInterpretation
      ? [mrzInterpretation.givenNames, mrzInterpretation.surnames].filter(Boolean).join(" ")
      : extractedName;
    const dobMatches = Boolean(expectedDob && dob && expectedDob === dob);
    const nameMatches = Boolean(expectedName && compareNames(expectedName, resolvedName));

    return {
      dobMatches,
      extractedName: resolvedName,
      kycConfirmed:
        Boolean(expectedDob ? dobMatches : true) &&
        Boolean(expectedName ? nameMatches : true),
      nameMatches,
    };
  }, [dob, expectedDob, expectedName, extractedName, mrzInterpretation]);

  async function loadImage(file: File) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    setImageUrl(url);
    setImageElement(img);
    setFileName(file.name);
    setOcrText("");
    setProcessedPreviewUrl("");
    setDob("");
    setIdNumber("");
    setExtractedName("");
    setConfidence(0);
    setError("");
  }

  async function runOcr() {
    if (!imageElement || !canvasRef.current || !processedCanvasRef.current) {
      setError("Upload an image before running OCR.");
      return;
    }

    setIsRunning(true);
    setError("");

    try {
      const cropX = Math.round((crop.x / 100) * imageElement.naturalWidth);
      const cropY = Math.round((crop.y / 100) * imageElement.naturalHeight);
      const cropWidth = Math.max(
        24,
        Math.round((crop.width / 100) * imageElement.naturalWidth),
      );
      const cropHeight = Math.max(
        24,
        Math.round((crop.height / 100) * imageElement.naturalHeight),
      );
      const paddingX = Math.max(4, Math.round(cropWidth * 0.03));
      const paddingY = Math.max(4, Math.round(cropHeight * 0.12));
      const safeCropX = Math.max(0, cropX - paddingX);
      const safeCropY = Math.max(0, cropY - paddingY);
      const safeCropWidth = Math.min(
        imageElement.naturalWidth - safeCropX,
        cropWidth + paddingX * 2,
      );
      const safeCropHeight = Math.min(
        imageElement.naturalHeight - safeCropY,
        cropHeight + paddingY * 2,
      );

      const rawCanvas = canvasRef.current;
      const context = rawCanvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas context unavailable.");
      }

      rawCanvas.width = safeCropWidth;
      rawCanvas.height = safeCropHeight;
      context.clearRect(0, 0, safeCropWidth, safeCropHeight);
      context.drawImage(
        imageElement,
        safeCropX,
        safeCropY,
        safeCropWidth,
        safeCropHeight,
        0,
        0,
        safeCropWidth,
        safeCropHeight,
      );

      const isMrzLikeCrop = safeCropWidth / safeCropHeight >= 4.5;
      const thresholdCanvas = buildProcessedCanvas(rawCanvas, safeCropWidth, safeCropHeight, {
        grayscale: true,
        threshold: 165,
        scale: 4,
      });
      const mrzCanvas = buildProcessedCanvas(rawCanvas, safeCropWidth, safeCropHeight, {
        brightness: 18,
        contrast: 1.28,
        grayscale: true,
        scale: 5,
        whitePadding: {
          x: 20,
          y: 10,
        },
      });
      const previewSource = isMrzLikeCrop ? mrzCanvas : thresholdCanvas;
      const previewCanvas = processedCanvasRef.current;
      previewCanvas.width = previewSource.width;
      previewCanvas.height = previewSource.height;
      const previewContext = previewCanvas.getContext("2d");
      if (!previewContext) {
        throw new Error("Processed canvas context unavailable.");
      }
      previewContext.clearRect(0, 0, previewSource.width, previewSource.height);
      previewContext.drawImage(previewSource, 0, 0);
      setProcessedPreviewUrl(previewSource.toDataURL("image/png"));

      const { createWorker, PSM } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: () => undefined,
      });

      await worker.setParameters({
        tessedit_char_whitelist: "0123456789/-DOBEXPDATE ",
        preserve_interword_spaces: "1",
      });

      const firstPass = await worker.recognize(rawCanvas);

      await worker.setParameters({
        tessedit_char_whitelist: "0123456789/-",
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });

      const secondPass = await worker.recognize(thresholdCanvas);

      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
        preserve_interword_spaces: "0",
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });

      const thirdPass = await worker.recognize(isMrzLikeCrop ? mrzCanvas : thresholdCanvas);
      await worker.terminate();

      const extractedTexts = [
        firstPass.data.text.trim(),
        secondPass.data.text.trim(),
        thirdPass.data.text.trim(),
      ].filter(Boolean);
      const parsedMrz = interpretMrz(extractedTexts);
      const mrzLikeTextDetected = extractedTexts.some((text) =>
        text
          .split(/\r?\n/)
          .map((line) => normalizeMrzLine(line))
          .some((line) => looksLikeMrzCoreLine(line)),
      );
      const parsedDob =
        parsedMrz?.dateOfBirth ||
        (mrzLikeTextDetected ? "" : extractDobFromTexts(extractedTexts));
      const parsedIdNumber =
        parsedMrz?.documentNumber || normalizeIdNumber(extractedTexts.join(" "));
      const parsedName = parsedMrz
        ? [parsedMrz.givenNames, parsedMrz.surnames].filter(Boolean).join(" ")
        : extractNameFromTexts(extractedTexts);
      const combinedText = extractedTexts.join("\n\n---\n\n");
      const bestConfidence = Math.round(
        Math.max(firstPass.data.confidence, secondPass.data.confidence, thirdPass.data.confidence),
      );

      setOcrText(combinedText);
      setDob(parsedDob);
      setIdNumber(parsedIdNumber);
      setExtractedName(parsedName);
      setConfidence(bestConfidence);

      if (!parsedDob && !parsedIdNumber) {
        setError(
          "OCR ran, but no DOB or ID-number pattern was detected. Tighten the crop around the target text, then correct the result manually if needed.",
        );
      }
    } catch (ocrError) {
      setError(ocrError instanceof Error ? ocrError.message : "OCR failed.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <PageShell>
      <PageIntro
        eyebrow="OCR Test Bed"
        title="Extract DOB from an ID image in-browser"
        body="Upload an ID image, crop the date-of-birth region, run Tesseract.js locally in the browser, confirm or edit the result, and compute whether the subject is over 18."
      />

      <section className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Panel className="rounded-[2.25rem]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-headline text-2xl font-bold">1. Upload and crop</div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                  Raw images never leave the browser. The crop box should isolate the DOB
                  line for OCR reliability.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="cursor-pointer rounded-soft bg-proof-gradient px-5 py-3 font-headline text-sm font-bold uppercase tracking-[0.14em] text-on-primary steady-transition hover:brightness-110">
                  Select image
                  <input
                    accept="image/*"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }
                      await loadImage(file);
                    }}
                    type="file"
                  />
                </label>
                <ActionButton
                  onClick={() =>
                    setCrop({
                      x: 40,
                      y: 60,
                      width: 44,
                      height: 24,
                    })
                  }
                  tone="secondary"
                >
                  Use ID preset
                </ActionButton>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="space-y-4">
                <div className="rounded-[1.75rem] bg-surface-container-low p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Source image
                  </div>
                  <div className="mt-4 overflow-hidden rounded-[1.25rem] bg-surface-container-lowest">
                    {imageUrl ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt="Uploaded ID preview"
                          className="block max-h-[520px] w-full object-contain"
                          src={imageUrl}
                        />
                        <div
                          className="pointer-events-none absolute border-2 border-primary shadow-glow"
                          style={{
                            left: `${crop.x}%`,
                            top: `${crop.y}%`,
                            width: `${crop.width}%`,
                            height: `${crop.height}%`,
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm text-on-surface-variant">
                        Upload a clean ID or document image to start OCR testing.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {(
                    [
                      ["x", "Crop X", crop.x],
                      ["y", "Crop Y", crop.y],
                      ["width", "Crop width", crop.width],
                      ["height", "Crop height", crop.height],
                    ] as const
                  ).map(([key, label, value]) => (
                    <label key={key} className="rounded-[1.5rem] bg-surface-container-low p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                          {label}
                        </span>
                        <span className="font-headline text-sm text-primary">{value}%</span>
                      </div>
                      <input
                        className="mt-4 w-full accent-primary"
                        max={key === "width" || key === "height" ? 100 : 90}
                        min={0}
                        onChange={(event) =>
                          setCrop((current) => ({
                            ...current,
                            [key]: Number(event.target.value),
                          }))
                        }
                        type="range"
                        value={value}
                      />
                    </label>
                  ))}
                </div>

                <div className="rounded-[1.75rem] bg-surface-container-low p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Processed OCR crop
                  </div>
                  <div className="mt-4 overflow-hidden rounded-[1.25rem] bg-surface-container-lowest">
                    {processedPreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt="Preprocessed DOB crop preview"
                        className="block w-full object-contain"
                        src={processedPreviewUrl}
                      />
                    ) : (
                      <div className="flex min-h-[120px] items-center justify-center px-6 text-center text-sm text-on-surface-variant">
                        Run OCR to inspect the scaled black-and-white crop Tesseract will read.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Panel className="rounded-[1.75rem] bg-surface-container-low p-5">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Upload state
                  </div>
                  <div className="mt-3 font-headline text-lg font-semibold">
                    {fileName || "No image selected"}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                    Regex patterns supported:
                    <br />
                    <code className="text-primary">DD/MM/YYYY</code>,{" "}
                    <code className="text-primary">DD-MM-YYYY</code>,{" "}
                    <code className="text-primary">YYYY-MM-DD</code>,{" "}
                    <code className="text-primary">DD MON YYYY</code>
                    <br />
                    ID patterns supported:
                    <br />
                    <code className="text-primary">13-digit South African ID</code>
                    <br />
                    MRZ patterns supported:
                    <br />
                    <code className="text-primary">TD3 passport</code>,{" "}
                    <code className="text-primary">TD1 ID card</code>
                  </p>
                </Panel>

                <ActionButton disabled={!imageElement || isRunning} onClick={runOcr}>
                  {isRunning ? "Running OCR..." : "2. Run OCR"}
                </ActionButton>

                <SecondaryButton href="/identity">Return to credential flow</SecondaryButton>

                {error ? (
                  <div className="rounded-[1.5rem] bg-danger/10 px-4 py-4 text-sm leading-6 text-danger">
                    {error}
                  </div>
                ) : null}
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Panel className="rounded-[2.25rem]">
            <div className="font-headline text-2xl font-bold">2. Confirm or edit</div>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              OCR should suggest the DOB, but the user must always be able to correct it
              before using the result.
            </p>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="ml-1 font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  OCR text
                </span>
                <textarea
                  className="mt-2 min-h-[140px] w-full rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none ring-1 ring-transparent steady-transition focus:ring-primary/30"
                  onChange={(event) => setOcrText(event.target.value)}
                  placeholder="OCR output will appear here..."
                  value={ocrText}
                />
              </label>

              <label className="block">
                <span className="ml-1 font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  Date of birth
                </span>
                <input
                  className="mt-2 w-full rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none ring-1 ring-transparent steady-transition focus:ring-primary/30"
                  onChange={(event) => setDob(event.target.value)}
                  placeholder="YYYY-MM-DD"
                  value={dob}
                />
              </label>

              <label className="block">
                <span className="ml-1 font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  Extracted name
                </span>
                <input
                  className="mt-2 w-full rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none ring-1 ring-transparent steady-transition focus:ring-primary/30"
                  onChange={(event) => setExtractedName(event.target.value)}
                  placeholder="Extracted or MRZ-derived name"
                  value={extractedName}
                />
              </label>

              <label className="block">
                <span className="ml-1 font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  ID number
                </span>
                <input
                  className="mt-2 w-full rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none ring-1 ring-transparent steady-transition focus:ring-primary/30"
                  onChange={(event) => setIdNumber(event.target.value)}
                  placeholder="Extracted ID number"
                  value={idNumber}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block rounded-[1.5rem] bg-surface-container-low p-4">
                  <span className="ml-1 font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Expected name
                  </span>
                  <input
                    className="mt-2 w-full rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none ring-1 ring-transparent steady-transition focus:ring-primary/30"
                    onChange={(event) => setExpectedName(event.target.value)}
                    placeholder="Jane Mary Example"
                    value={expectedName}
                  />
                </label>

                <label className="block rounded-[1.5rem] bg-surface-container-low p-4">
                  <span className="ml-1 font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Expected DOB
                  </span>
                  <input
                    className="mt-2 w-full rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none ring-1 ring-transparent steady-transition focus:ring-primary/30"
                    onChange={(event) => setExpectedDob(event.target.value)}
                    placeholder="YYYY-MM-DD"
                    value={expectedDob}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Confidence
                  </div>
                  <div className="mt-2 font-headline text-2xl font-bold text-primary">
                    {confidence}%
                  </div>
                </div>

                <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Is over 18
                  </div>
                  <div className="mt-2 font-headline text-2xl font-bold text-tertiary">
                    {dob ? (computeIsOver18(dob) ? "true" : "false") : "n/a"}
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    ID detected
                  </div>
                  <div className="mt-2 font-headline text-2xl font-bold text-primary">
                    {idNumber ? "true" : "false"}
                  </div>
                </div>
              </div>

              <Panel className="rounded-[1.5rem] bg-surface-container-low p-5">
                <div className="font-headline text-xl font-bold">KYC confirmation</div>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Enter the claimed name and DOB, then compare them against the OCR or
                  MRZ result to confirm whether the document matches the user input.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-[1.25rem] bg-surface-container-lowest p-4">
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      Name match
                    </div>
                    <div className="mt-2 font-headline text-2xl font-bold text-on-surface">
                      {kycMatch ? (kycMatch.nameMatches ? "true" : "false") : "n/a"}
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] bg-surface-container-lowest p-4">
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      DOB match
                    </div>
                    <div className="mt-2 font-headline text-2xl font-bold text-on-surface">
                      {kycMatch ? (kycMatch.dobMatches ? "true" : "false") : "n/a"}
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] bg-surface-container-lowest p-4">
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      KYC confirmed
                    </div>
                    <div
                      className={`mt-2 font-headline text-2xl font-bold ${
                        kycMatch?.kycConfirmed ? "text-tertiary" : "text-danger"
                      }`}
                    >
                      {kycMatch ? (kycMatch.kycConfirmed ? "true" : "false") : "n/a"}
                    </div>
                  </div>
                </div>

                {kycMatch ? (
                  <div className="mt-4 rounded-[1.25rem] bg-surface-container-lowest p-4 text-sm leading-6 text-on-surface-variant">
                    Compared extracted name:
                    <br />
                    <code className="text-primary">{kycMatch.extractedName || "n/a"}</code>
                    <br />
                    Compared extracted DOB:
                    <br />
                    <code className="text-primary">{dob || "n/a"}</code>
                  </div>
                ) : null}
              </Panel>
            </div>
          </Panel>

          <Panel className="rounded-[2.25rem] bg-surface-container-low">
            <div className="font-headline text-2xl font-bold">13-digit interpretation</div>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              If the extracted ID matches the South African 13-digit format, derive DOB,
              sex, citizenship, and checksum validity from the number itself.
            </p>

            {saIdInterpretation ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    DOB from ID
                  </div>
                  <div className="mt-2 font-headline text-xl font-bold text-primary">
                    {saIdInterpretation.dateOfBirth}
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Sex
                  </div>
                  <div className="mt-2 font-headline text-xl font-bold text-on-surface">
                    {saIdInterpretation.sex}
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Citizenship
                  </div>
                  <div className="mt-2 font-headline text-xl font-bold text-on-surface">
                    {saIdInterpretation.citizenship}
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Luhn check
                  </div>
                  <div
                    className={`mt-2 font-headline text-xl font-bold ${
                      saIdInterpretation.valid ? "text-tertiary" : "text-danger"
                    }`}
                  >
                    {saIdInterpretation.valid ? "valid" : "invalid"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[1.5rem] bg-surface-container-lowest p-4 text-sm leading-6 text-on-surface-variant">
                No 13-digit South African ID interpretation available yet.
              </div>
            )}
          </Panel>

          <Panel className="rounded-[2.25rem] bg-surface-container-low">
            <div className="font-headline text-2xl font-bold">MRZ interpretation</div>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              If the OCR text contains a machine-readable zone, parse document number,
              issuing country, names, DOB, expiry, sex, and MRZ check digits.
            </p>

            {mrzInterpretation ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Format
                  </div>
                  <div className="mt-2 font-headline text-xl font-bold text-primary">
                    {mrzInterpretation.format}
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Document number
                  </div>
                  <div className="mt-2 font-headline text-xl font-bold text-on-surface">
                    {mrzInterpretation.documentNumber || "n/a"}
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Name
                  </div>
                  <div className="mt-2 font-headline text-lg font-bold text-on-surface">
                    {[mrzInterpretation.givenNames, mrzInterpretation.surnames]
                      .filter(Boolean)
                      .join(" ") || "n/a"}
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Issuer / nationality
                  </div>
                  <div className="mt-2 font-headline text-lg font-bold text-on-surface">
                    {[mrzInterpretation.issuingCountry, mrzInterpretation.nationality]
                      .filter(Boolean)
                      .join(" / ") || "n/a"}
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    DOB / expiry
                  </div>
                  <div className="mt-2 font-headline text-lg font-bold text-on-surface">
                    {[mrzInterpretation.dateOfBirth, mrzInterpretation.expiryDate]
                      .filter(Boolean)
                      .join(" -> ") || "n/a"}
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Sex / document code
                  </div>
                  <div className="mt-2 font-headline text-lg font-bold text-on-surface">
                    {[mrzInterpretation.sex, mrzInterpretation.documentCode]
                      .filter(Boolean)
                      .join(" / ") || "n/a"}
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Check digits
                  </div>
                  <div className="mt-2 text-sm leading-6 text-on-surface">
                    Doc: {mrzInterpretation.validDocumentNumberCheck ? "valid" : "invalid"}
                    <br />
                    DOB: {mrzInterpretation.validBirthCheck ? "valid" : "invalid"}
                    <br />
                    Expiry: {mrzInterpretation.validExpiryCheck ? "valid" : "invalid"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[1.5rem] bg-surface-container-lowest p-4 text-sm leading-6 text-on-surface-variant">
                No TD1 or TD3 MRZ was detected in the OCR text yet. Tighten the crop
                around the machine-readable lines and rerun OCR.
              </div>
            )}
          </Panel>

          <Panel className="rounded-[2.25rem] bg-surface-container-low">
            <div className="font-headline text-2xl font-bold">3. Output</div>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              This matches the OCR brief output contract.
            </p>

            <pre className="mt-5 overflow-x-auto rounded-[1.5rem] bg-surface-container-lowest p-4 text-xs leading-6 text-primary">
              {buildJsonPreview(result)}
            </pre>
          </Panel>
        </div>
      </section>

      <canvas className="hidden" ref={canvasRef} />
      <canvas className="hidden" ref={processedCanvasRef} />
    </PageShell>
  );
}
