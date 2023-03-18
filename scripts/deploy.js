// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
require("dotenv").config();

async function setupForTest(DEPOSIT_TOKEN, DEPOSIT_TOKEN_AMOUNT) {
  const ERC20 = await hre.ethers.getContractFactory("Foo");
  let depositToken = await ERC20.attach(DEPOSIT_TOKEN);
  const depositDecimals = (hre.ethers.BigNumber.from(10).pow(await depositToken.decimals()));

  // 0xf89d7b9c864f589bbF53a82105107622B35EaA40
  depositToken = depositToken.connect(await hre.ethers.getImpersonatedSigner("0xf89d7b9c864f589bbF53a82105107622B35EaA40"))
  let [buyer, s, ..._] = await hre.ethers.getSigners();
  let tx = await depositToken.transfer(buyer.address, hre.ethers.BigNumber.from(DEPOSIT_TOKEN_AMOUNT).mul(depositDecimals),)
  await tx.wait()
  console.log(`${await depositToken.balanceOf(buyer.address)} ${await depositToken.symbol()} for buyer`)
  tx = await depositToken.transfer(s.address, hre.ethers.BigNumber.from(DEPOSIT_TOKEN_AMOUNT).mul(depositDecimals),)
  await tx.wait()
  console.log(`${await depositToken.balanceOf(s.address)} ${await depositToken.symbol()} for seller`)
}


async function main() {
  let {DEPOSIT_TOKEN, DEPOSIT_TOKEN_AMOUNT, AIRDROP_TOKEN, AIRDROP_TOKEN_AMOUNT, DDL_TIME} = process.env;
  const ARBTOKEN = "0x912ce59144191c1204e64559fe8253a0e49e6548";
  const USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
  // timestamp for Thu Mar 23 2023 20:41:25 GMT+0800 plus 12 hours
  const DDL_TIMESTAMP = 1679575285 + 3600*12;

  DEPOSIT_TOKEN = DEPOSIT_TOKEN || USDT;
  AIRDROP_TOKEN = AIRDROP_TOKEN || ARBTOKEN;
  // parse timestamp of Thu Mar 23 2023 20:41:25 GMT+0800
  DDL_TIME = DDL_TIME || DDL_TIMESTAMP;

  const ERC20 = await hre.ethers.getContractFactory("Foo");
  const airdropToken = await ERC20.attach(AIRDROP_TOKEN);
  const airdropDecimals = await airdropToken.decimals();

  let depositToken = await ERC20.attach(DEPOSIT_TOKEN);
  const depositDecimals = await depositToken.decimals();

  const Seller = await hre.ethers.getContractFactory("AirdropSeller");
  const seller = await Seller.deploy(
    DEPOSIT_TOKEN,
    hre.ethers.BigNumber.from(DEPOSIT_TOKEN_AMOUNT).mul(hre.ethers.BigNumber.from(10).pow(depositDecimals)),
    AIRDROP_TOKEN,
    hre.ethers.BigNumber.from(AIRDROP_TOKEN_AMOUNT).mul(hre.ethers.BigNumber.from(10).pow(airdropDecimals)),
    hre.ethers.BigNumber.from(DDL_TIME),
  );

  await seller.deployed();

  let newDate = new Date();
  newDate.setTime(DDL_TIME*1000);
  console.log(
    `AirdropSeller deployed to: ${seller.address}
deposit token: ${await depositToken.symbol()} amount: ${DEPOSIT_TOKEN_AMOUNT}
airdrop token: ${await airdropToken.symbol()} amount: ${AIRDROP_TOKEN_AMOUNT}
ddlTime ${newDate.toISOString()}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
