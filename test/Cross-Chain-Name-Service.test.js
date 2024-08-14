const { ethers } = require("hardhat")
const { assert } = require("chai")

describe("CrossChainNameService Tests", () => {
    let CCIPLocalSimpulator, ccnsLookupSource, ccnsLookupReceiver, ccnsRegister, ccnsReceiver
    beforeEach(async () => {
        // console.log('Deploying contracts!!');

        const CCIPLocalSimpulatorFactory = await ethers.getContractFactory("CCIPLocalSimulator")
        CCIPLocalSimpulator = await CCIPLocalSimpulatorFactory.deploy();
        await CCIPLocalSimpulator.deployed();

        // console.log('configuring ChainLink Local...');
        [
            chainSelector_,
            sourceRouter_,
            destinationRouter_,
            wrappedNative_,
            linkToken_,
            ccipBnM_,
            ccipLnM_
        ] = await CCIPLocalSimpulator.configuration();
        // console.log("Source Router Address:", sourceRouter_);

        // Deploy CrossChainNameServiceLookup
        const CrossChainNameServiceLookup = await ethers.getContractFactory("CrossChainNameServiceLookup");
        ccnsLookupSource = await CrossChainNameServiceLookup.deploy();
        await ccnsLookupSource.deployed();

        ccnsLookupReceiver = await CrossChainNameServiceLookup.deploy();
        await ccnsLookupReceiver.deployed();

        // Deploy CrossChainNameServiceRegister
        const CrossChainNameServiceRegister = await ethers.getContractFactory("CrossChainNameServiceRegister");
        ccnsRegister = await CrossChainNameServiceRegister.deploy(sourceRouter_, ccnsLookupSource.address);
        await ccnsRegister.deployed();

        // Deploy CrossChainNameServiceReceiver
        const CrossChainNameServiceReceiver = await ethers.getContractFactory("CrossChainNameServiceReceiver");
        ccnsReceiver = await CrossChainNameServiceReceiver.deploy(sourceRouter_, ccnsLookupReceiver.address, chainSelector_);
        await ccnsReceiver.deployed();

        await ccnsRegister.enableChain(chainSelector_, ccnsReceiver.address, 500000); // Gas limit example

        // Source
        await ccnsLookupSource.setCrossChainNameServiceAddress(ccnsRegister.address);

        // Receiver
        await ccnsLookupReceiver.setCrossChainNameServiceAddress(ccnsReceiver.address);
    })

    it("Registering and testing", async () => {

        const accounts = await ethers.getSigners()
        const aliceEOA = accounts[1];
        // const aliceEOA = "0xAliceEOAAddressHere";
        const aliceConnectedRegister = ccnsRegister.connect(aliceEOA)
        await aliceConnectedRegister.register("alice.ccns");

        const registeredAddress = await ccnsLookupSource.lookup("alice.ccns");
        // console.log("Alice's EOA Address:", registeredAddress);
        // console.log(aliceEOA.address);

        assert.equal(registeredAddress, aliceEOA.address)
    })
})