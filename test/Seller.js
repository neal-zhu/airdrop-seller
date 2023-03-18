const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Seller", function () {
  // price 1.2usdt/arb
  const arbAmount = ethers.utils.parseEther("100");
  const usdtAmount = ethers.utils.parseEther("120");
  let addr3;
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployAllContracts() {
    let seller, buyer, arbToken, usdtToken, airdropSeller;
    const ddlTime = ethers.BigNumber.from(await time.latest()).add(ethers.BigNumber.from(1000000));

    [buyer, seller, addr3, ..._] = await ethers.getSigners();
    const Foo = await hre.ethers.getContractFactory("Foo");
    arbToken = await Foo.deploy([seller.address, addr3.address], arbAmount);
    expect(await arbToken.balanceOf(seller.address)).to.equal(arbAmount);

    usdtToken = await Foo.deploy([seller.address, buyer.address, addr3.address], usdtAmount);
    expect(await usdtToken.balanceOf(seller.address)).to.equal(usdtAmount);
    expect(await usdtToken.balanceOf(buyer.address)).to.equal(usdtAmount);

    const AirdropSeller = await hre.ethers.getContractFactory("AirdropSeller");
    airdropSeller = await AirdropSeller.deploy(
      usdtToken.address,
      usdtAmount,
      arbToken.address,
      arbAmount,
      ddlTime,
    );

    // approve usdt for seller to transfer to airdropSeller
    let tx = await usdtToken.approve(airdropSeller.address, usdtAmount);
    await tx.wait();
    expect(await usdtToken.allowance(buyer.address, airdropSeller.address)).to.equal(usdtAmount);

    tx = await usdtToken.connect(seller).approve(airdropSeller.address, usdtAmount);
    await tx.wait();
    expect(await usdtToken.allowance(seller.address, airdropSeller.address)).to.equal(usdtAmount);

    // approve arb for seller to transfer to airdropSeller
    tx = await arbToken.connect(seller).approve(airdropSeller.address, arbAmount);
    await tx.wait();
    expect(await arbToken.allowance(seller.address, airdropSeller.address)).to.equal(arbAmount);

    // approve arb for addr3 to transfer to airdropSeller
    tx = await arbToken.connect(addr3).approve(airdropSeller.address, arbAmount);
    await tx.wait();
    expect(await arbToken.allowance(addr3.address, airdropSeller.address)).to.equal(arbAmount);

    return { arbToken, usdtToken, airdropSeller, buyer, seller, ddlTime };
  }

  async function sell() {
    const { usdtToken, arbToken, airdropSeller, ddlTime, buyer, seller } = await loadFixture(deployAllContracts);

    // seller cant deposit before buyer deposit
    await expect(airdropSeller.connect(seller).sellerDeposit()).to.be.rejectedWith(Error);

    // buyer deposit
    let tx;
    tx = await airdropSeller.connect(buyer).buyerDeposit();
    await tx.wait();

    // cant deposit airdrop token before seller deposit
    await expect(airdropSeller.connect(seller).depositAirdropToken()).to.be.rejectedWith(Error);

    // seller deposit
    tx = await airdropSeller.connect(seller).sellerDeposit();
    await tx.wait();

    // seller deposit airdrop token
    tx = await airdropSeller.connect(seller).depositAirdropToken();
    await tx.wait();

    tx = await airdropSeller.connect(buyer).buyerWithdraw();
    await tx.wait();

    tx = await airdropSeller.connect(seller).sellerWithdraw();
    await tx.wait();

    expect(await usdtToken.balanceOf(buyer.address)).to.equal(0);
    expect(await usdtToken.balanceOf(seller.address)).to.equal(usdtAmount.mul(2));
    expect(await arbToken.balanceOf(buyer.address)).to.equal(arbAmount);
    expect(await arbToken.balanceOf(seller.address)).to.equal(0);

    return { usdtToken, arbToken, airdropSeller, ddlTime, buyer, seller };
  }

  describe("Deployment", function () {
    it("Should set the right amount and token", async function () {
      const { usdtToken, arbToken, airdropSeller, ddlTime } = await loadFixture(deployAllContracts);
      expect(await airdropSeller.depositToken()).to.equal(usdtToken.address);
      expect(await airdropSeller.airdropToken()).to.equal(arbToken.address);
      expect(await airdropSeller.depositTokenAmount()).to.equal(usdtAmount);
      expect(await airdropSeller.airdropTokenAmount()).to.equal(arbAmount);
      expect(await airdropSeller.ddlTimestamp()).to.equal(ddlTime);
    });
  });

  describe("Sell", function () {
    it("Sell success", async function () {
      await sell();
    });

    it("Other address deposit airdrop toekn", async function () {
      const { usdtToken, arbToken, airdropSeller, ddlTime, buyer, seller } = await loadFixture(deployAllContracts);
      let tx;
      tx = await airdropSeller.connect(buyer).buyerDeposit();
      await tx.wait();

      // cant deposit airdrop token before seller deposit
      await expect(airdropSeller.connect(seller).depositAirdropToken()).to.be.rejectedWith(Error);

      tx = await airdropSeller.connect(seller).sellerDeposit();
      await tx.wait();

      // other address deposit airdrop token
      tx = await airdropSeller.connect(addr3).depositAirdropToken();
      await tx.wait();
      expect(await arbToken.balanceOf(addr3.address)).to.equal(0);

      tx = await airdropSeller.connect(buyer).buyerWithdraw();
      await tx.wait();

      tx = await airdropSeller.connect(seller).sellerWithdraw();
      await tx.wait();

      expect(await usdtToken.balanceOf(buyer.address)).to.equal(0);
      expect(await usdtToken.balanceOf(seller.address)).to.equal(usdtAmount.mul(2));
      expect(await arbToken.balanceOf(buyer.address)).to.equal(arbAmount);
    });

    it("Once its finished deposit and withdraw calls will failed", async function () {
      const { airdropSeller, buyer, seller } = await sell();
      await expect(airdropSeller.connect(buyer).buyerDeposit()).to.be.rejectedWith(Error);
      await expect(airdropSeller.connect(buyer).sellerDeposit()).to.be.rejectedWith(Error);
      await expect(airdropSeller.connect(buyer).buyerWithdraw()).to.be.rejectedWith(Error);
      await expect(airdropSeller.connect(seller).sellerWithdraw()).to.be.rejectedWith(Error);
    });

    it("Cant withdraw before its finianlized", async function () {
      const { airdropSeller, buyer, seller } = await loadFixture(deployAllContracts);
      let tx;
      tx = await airdropSeller.connect(buyer).buyerDeposit();
      await tx.wait();

      await expect(airdropSeller.connect(buyer).buyerWithdraw()).to.be.rejectedWith(Error);

      tx = await airdropSeller.connect(seller).sellerDeposit();
      await tx.wait();

      await expect(airdropSeller.connect(buyer).buyerWithdraw()).to.be.rejectedWith(Error);

    });

    it("Breach", async function () {
      const { usdtToken, arbToken, airdropSeller, ddlTime, buyer, seller } = await loadFixture(deployAllContracts);
      let tx;
      tx = await airdropSeller.connect(buyer).buyerDeposit();
      await tx.wait();

      tx = await airdropSeller.connect(seller).sellerDeposit();
      await tx.wait();

      await time.increaseTo(ddlTime.add(1));

      // seller cant deposit airdrop token after breach 
      await expect(airdropSeller.connect(seller).depositAirdropToken()).to.be.rejectedWith(Error);

      // seller cant withdraw when breach
      await expect(airdropSeller.connect(seller).sellerWithdraw()).to.be.rejectedWith(Error);

      // seller keep airdrop token but lose deposit
      expect(await usdtToken.balanceOf(seller.address)).to.equal(0);
      expect(await arbToken.balanceOf(seller.address)).to.equal(arbAmount);

      // buyer can withdraw double deposit
      tx = await airdropSeller.connect(buyer).buyerWithdraw();
      await tx.wait();
      expect(await usdtToken.balanceOf(buyer.address)).to.equal(usdtAmount.mul(2));
      expect(await arbToken.balanceOf(buyer.address)).to.equal(0);

    });

    it("Expire", async function () {
      const { usdtToken, arbToken, airdropSeller, ddlTime, buyer, seller } = await loadFixture(deployAllContracts);
      let tx;
      tx = await airdropSeller.connect(buyer).buyerDeposit();
      await tx.wait();

      await time.increaseTo(ddlTime.add(1));

      // seller cant deposit airdrop token after expire
      await expect(airdropSeller.connect(seller).depositAirdropToken()).to.be.rejectedWith(Error);

      // seller cant withdraw when expired
      await expect(airdropSeller.connect(seller).sellerWithdraw()).to.be.rejectedWith(Error);

      // seller keep airdrop token and deposit
      expect(await usdtToken.balanceOf(seller.address)).to.equal(usdtAmount);
      expect(await arbToken.balanceOf(seller.address)).to.equal(arbAmount);

      // buyer can withdraw deposit
      tx = await airdropSeller.connect(buyer).buyerWithdraw();
      await tx.wait();
      expect(await usdtToken.balanceOf(buyer.address)).to.equal(usdtAmount);
      expect(await arbToken.balanceOf(buyer.address)).to.equal(0);
    });
  });
});
