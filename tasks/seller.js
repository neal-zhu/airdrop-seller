const { task } = require("hardhat/config");
require("dotenv").config()
const { getAirdropSeller } = require("./util")

task("seller_deposit", "", async (taskArgs, hre) => {
    const signer = (await hre.ethers.getSigners())[1];
    const airdropSeller = await getAirdropSeller(taskArgs.contract, signer);
    const token = (await hre.ethers.getContractFactory("Foo")).attach(await airdropSeller.depositToken()).connect(signer);

    let tx;
    tx = await token.approve(airdropSeller.address, await airdropSeller.depositTokenAmount());
    await tx.wait();
    console.log(`approve ${await airdropSeller.depositTokenAmount()} ${await token.symbol()} to ${airdropSeller.address}`)

    tx = await airdropSeller.sellerDeposit();
    await tx.wait();
    console.log(`seller deposit ${await airdropSeller.depositTokenAmount()} ${await token.symbol()}`)
}).addParam("contract", "The address of the contract to call")

task("seller_withdraw", "", async (taskArgs, hre) => {
    const signer = (await hre.ethers.getSigners())[1];
    const airdropSeller = await getAirdropSeller(taskArgs.contract, signer);

    let tx;
    tx = await airdropSeller.sellerWithdraw();
    await tx.wait();
    console.log(`seller withdraw`)
}).addParam("contract", "The address of the contract to call")

async function depositAirdropToken() {
    const airdropSeller = await getAirdropSeller(taskArgs.contract);
    const token = (await hre.ethers.getContractFactory("Foo")).attach(await airdropSeller.airdropToken());

    let tx;
    // approve airdrop token
    tx = await token.approve(airdropSeller.address, await airdropSeller.airdropTokenAmount());
    await tx.wait();
    console.log(`approve ${await airdropSeller.airdropTokenAmount()} ${await token.symbol()} to ${airdropSeller.address}`)

    // deposit airdrop token
    tx = await airdropSeller.depositAirdropToken();
    await tx.wait();
    console.log(`deposit ${await airdropSeller.airdropTokenAmount()} ${await token.symbol()}`)
}

task("seller_claim_deposit_airdrop", "", async (taskArgs, hre) => {
    let tx;

    // claim $ARB
    const dis = await hre.ethers.getContractAt(distributor.abi, distributor.address);
    tx = await dis.claim();
    await tx.wait();
    console.log(`claim $ARB`)

    await depositAirdropToken();
}).addParam("contract", "The address of the contract to call")


task("seller_deposit_airdrop", "", async (taskArgs, hre) => {
    await depositAirdropToken();
}).addParam("contract", "The address of the contract to call")

task("detail", "", async (taskArgs, hre) => {
    const signer = (await hre.ethers.getSigners())[1];
    const airdropSeller = await getAirdropSeller(taskArgs.contract, signer);
    const depositToken = (await hre.ethers.getContractFactory("Foo")).attach(await airdropSeller.depositToken()).connect(signer);
    const airdropToken = (await hre.ethers.getContractFactory("Foo")).attach(await airdropSeller.airdropToken()).connect(signer);
    let newDate = new Date();
    newDate.setTime((await airdropSeller.ddlTimestamp()).toNumber() * 1000);
    console.log(`AirdropSeller deployed to: ${airdropSeller.address}
deposit token: ${await depositToken.symbol()}(${depositToken.address}) amount: ${(await airdropSeller.depositTokenAmount()).div(hre.ethers.BigNumber.from(10).pow(await depositToken.decimals()))}
airdrop token: ${await airdropToken.symbol()}(${airdropToken.address}) amount: ${(await airdropSeller.airdropTokenAmount()).div(hre.ethers.BigNumber.from(10).pow(await airdropToken.decimals()))}
ddlTime ${newDate.toISOString()}`
  );
}).addParam("contract", "The address of the contract to call")
