require("@nomicfoundation/hardhat-toolbox");
require("./tasks/buyer")
require("./tasks/seller")

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      forking: {
        url: "http://arb.rpc.cobo.one",
      },
    },
  },
};
