// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProofPassKycRegistry} from "../src/ProofPassKycRegistry.sol";

interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
}

abstract contract Script {
    Vm internal constant VM =
        Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
}

contract ProofPassKycRegistryScript is Script {
    address internal constant DEFAULT_VERIFIER =
        0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;

    function run() external returns (ProofPassKycRegistry deployed) {
        VM.startBroadcast();
        deployed = new ProofPassKycRegistry(DEFAULT_VERIFIER);
        VM.stopBroadcast();
    }
}
