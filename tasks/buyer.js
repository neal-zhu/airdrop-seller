const { task } = require("hardhat/config");
require("dotenv").config()
const { getAirdropSeller } = require("./util")
const distributor = require("./distributor")

task("buyer_deposit", "", async (taskArgs, hre) => {
    const airdropSeller = await getAirdropSeller(taskArgs.contract);
    const token = (await hre.ethers.getContractFactory("Foo")).attach(await airdropSeller.depositToken());
    let tx;
    tx = await token.approve(airdropSeller.address, await airdropSeller.depositTokenAmount());
    await tx.wait();
    console.log(`approve ${await airdropSeller.depositTokenAmount()} ${await token.symbol()} to ${airdropSeller.address}`)

    tx = await airdropSeller.buyerDeposit();
    await tx.wait();
    console.log(`buyer deposit ${await airdropSeller.depositTokenAmount()} ${await token.symbol()}`)
}).addParam("contract", "The address of the contract to call")

task("buyer_withdraw", "", async (taskArgs, hre) => {
    const airdropSeller = await getAirdropSeller(taskArgs.contract);
    let tx = await airdropSeller.buyerWithdraw();
    await tx.wait();
    console.log(`buyer withdraw`)
}).addParam("contract", "The address of the contract to call")