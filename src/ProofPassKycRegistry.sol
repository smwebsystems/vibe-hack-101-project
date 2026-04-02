// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ProofPassKycRegistry {
    struct KycAttestation {
        address subject;
        bool isOver18;
        uint8 quality;
        bytes32 commitment;
        uint64 issuedAt;
        uint64 expiresAt;
        uint256 nonce;
    }

    struct SubjectVerification {
        address subject;
        bool isOver18;
        uint8 quality;
        bytes32 commitment;
        uint64 issuedAt;
        uint64 expiresAt;
        uint256 nonce;
        address verifier;
        bytes32 digest;
        bytes32 attestationKey;
        bool exists;
    }

    error NotOwner();
    error InvalidSubject();
    error SelfAttestationNotAllowed();
    error SignatureExpired();
    error DigestAlreadyUsed();
    error UntrustedVerifier();
    error InvalidSignatureLength();
    error InvalidSignature();

    event AttestationAccepted(
        bytes32 indexed attestationKey,
        bytes32 indexed digest,
        address indexed verifier,
        address subject,
        bool isOver18,
        uint64 expiresAt,
        bytes32 commitment
    );

    string public constant NAME = "ProofPassKycRegistry";
    string public constant VERSION = "1";

    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
    bytes32 private constant KYC_ATTESTATION_TYPEHASH =
        keccak256(
            "KycAttestation(address subject,bool isOver18,uint8 quality,bytes32 commitment,uint64 issuedAt,uint64 expiresAt,uint256 nonce)"
        );
    bytes32 private constant NAME_HASH = keccak256(bytes(NAME));
    bytes32 private constant VERSION_HASH = keccak256(bytes(VERSION));

    address public owner;
    mapping(address => bool) public trustedVerifiers;
    mapping(bytes32 => bool) public usedDigests;
    mapping(bytes32 => bool) public attestationExists;
    mapping(address => SubjectVerification) private subjectVerifications;

    constructor(address initialVerifier) {
        owner = msg.sender;
        if (initialVerifier != address(0)) {
            trustedVerifiers[initialVerifier] = true;
        }
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setTrustedVerifier(address verifier, bool trusted) external onlyOwner {
        trustedVerifiers[verifier] = trusted;
    }

    function submitAttestation(
        KycAttestation calldata attestation,
        bytes calldata signature
    ) external returns (bytes32 digest, bytes32 attestationKey, address verifier) {
        if (msg.sender != attestation.subject) revert InvalidSubject();
        if (attestation.expiresAt < block.timestamp) revert SignatureExpired();

        digest = hashTypedData(attestation);
        if (usedDigests[digest]) revert DigestAlreadyUsed();

        verifier = recoverSigner(digest, signature);
        if (!trustedVerifiers[verifier]) revert UntrustedVerifier();
        if (verifier == attestation.subject) revert SelfAttestationNotAllowed();

        attestationKey = computeAttestationKey(attestation);
        usedDigests[digest] = true;
        attestationExists[attestationKey] = true;
        subjectVerifications[attestation.subject] = SubjectVerification({
            subject: attestation.subject,
            isOver18: attestation.isOver18,
            quality: attestation.quality,
            commitment: attestation.commitment,
            issuedAt: attestation.issuedAt,
            expiresAt: attestation.expiresAt,
            nonce: attestation.nonce,
            verifier: verifier,
            digest: digest,
            attestationKey: attestationKey,
            exists: true
        });

        emit AttestationAccepted(
            attestationKey,
            digest,
            verifier,
            attestation.subject,
            attestation.isOver18,
            attestation.expiresAt,
            attestation.commitment
        );
    }

    function computeAttestationKey(
        KycAttestation calldata attestation
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    attestation.subject,
                    attestation.commitment,
                    attestation.nonce
                )
            );
    }

    function hashTypedData(
        KycAttestation calldata attestation
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                KYC_ATTESTATION_TYPEHASH,
                attestation.subject,
                attestation.isOver18,
                attestation.quality,
                attestation.commitment,
                attestation.issuedAt,
                attestation.expiresAt,
                attestation.nonce
            )
        );

        bytes32 domainSeparator = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                NAME_HASH,
                VERSION_HASH,
                block.chainid,
                address(this)
            )
        );

        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    function recoverSigner(
        bytes32 digest,
        bytes calldata signature
    ) public pure returns (address signer) {
        if (signature.length != 65) revert InvalidSignatureLength();

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v < 27) {
            v += 27;
        }
        if (v != 27 && v != 28) revert InvalidSignature();

        signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert InvalidSignature();
    }

    function getSubjectVerification(
        address subject
    ) external view returns (SubjectVerification memory) {
        return subjectVerifications[subject];
    }
}
