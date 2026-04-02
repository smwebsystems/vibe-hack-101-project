// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProofPassKycRegistry} from "../src/ProofPassKycRegistry.sol";

contract ProofPassKycRegistryTest {
    function testInitialVerifierTrusted() external {
        address verifier = address(0xBEEF);
        ProofPassKycRegistry registry = new ProofPassKycRegistry(verifier);

        require(registry.trustedVerifiers(verifier), "verifier should be trusted");
    }

    function testOwnerCanSetTrustedVerifier() external {
        ProofPassKycRegistry registry = new ProofPassKycRegistry(address(0));
        address verifier = address(0xCAFE);

        registry.setTrustedVerifier(verifier, true);

        require(registry.trustedVerifiers(verifier), "verifier should be allowlisted");
    }

    function testSubjectVerificationEmptyByDefault() external {
        ProofPassKycRegistry registry = new ProofPassKycRegistry(address(0));
        ProofPassKycRegistry.SubjectVerification memory verification =
            registry.getSubjectVerification(address(0xBEEF));

        require(!verification.exists, "verification should be empty");
        require(verification.subject == address(0), "subject should be zero");
    }
}
