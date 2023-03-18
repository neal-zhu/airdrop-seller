async function getAirdropSeller(address, signer=undefined) {
  const AirdropSeller = await hre.ethers.getContractFactory("AirdropSeller");
  if (signer) {
    return await AirdropSeller.attach(address).connect(signer);
  } else {
    return await AirdropSeller.attach(address);
  }
}

module.exports = {
    getAirdropSeller,
};