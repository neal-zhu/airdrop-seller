// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AirdropSeller {
    using SafeERC20 for IERC20;
    // token used to buy the airdrop token
    address public immutable depositToken;
    uint public immutable depositTokenAmount;

    // airdrop token to be sold
    address public immutable airdropToken;
    uint public immutable airdropTokenAmount;

    uint public immutable ddlTimestamp;

    // enum
    enum State { 
        Created,         // created but seller not locked buyToken to contract
        Locked,          // seller locked buyToken to contract
        Finished,        // seller locked airdrop token to contract
        Breach,          // seller breached the contract
        Expired          // deadline passed and seller not locked buyToken to contract
    }
    State public state;

    address public buyer;
    address public seller;

    constructor(address _depositToken, uint _depositTokenAmount, address _airdropToken, uint _airdropTokenAmount, uint _ddlTimestamp) {
        depositToken = _depositToken;
        depositTokenAmount = _depositTokenAmount;
        airdropToken = _airdropToken;
        airdropTokenAmount = _airdropTokenAmount;
        ddlTimestamp = _ddlTimestamp;

        state = State.Created;
    }

    function finialized() public view returns (bool) {
        return state == State.Finished || state == State.Breach || state == State.Expired;
    }
    
    modifier runState() {
        if (!finialized()) {
            // check state is not finialized
            bool expired = block.timestamp > ddlTimestamp;
            if (expired) {
                if (state == State.Created) {
                    // if deadline passed and seller not locked buyToken to contract
                    state = State.Expired;
                } else if (state == State.Locked) {
                    // if deadline passed and seller locked buyToken to contract
                    state = State.Breach;
                } else {
                    require(false, "Invalid state");
                }
            }
        }
        _;
    }

    modifier inState(State _state) {
        require(state == _state, "Invalid state");
        _;
    }

    function buyerDeposit() public runState inState(State.Created) {
        require(buyer == address(0), "Buyer already locked buyToken");

        IERC20(depositToken).safeTransferFrom(msg.sender, address(this), depositTokenAmount);
        buyer = msg.sender;
        if (seller != address(0)) {
            state = State.Locked;
        }
    }

    function sellerDeposit() public runState inState(State.Created) {
        require(seller == address(0), "Seller already locked buyToken");
        require(buyer != address(0), "Buyer not locked buyToken");

        IERC20(depositToken).safeTransferFrom(msg.sender, address(this), depositTokenAmount);
        seller = msg.sender;

        if (buyer != address(0)) {
            state = State.Locked;
        }
    }

    function depositAirdropToken() public runState inState(State.Locked) {
        require(state == State.Locked);
        // allow anyone to deposit airdrop token
        IERC20(airdropToken).safeTransferFrom(msg.sender, address(this), airdropTokenAmount);
        state = State.Finished;
    }

    function buyerWithdraw() public runState {
        require(buyer == msg.sender, "Only buyer can withdraw");
        if (state == State.Finished) {
            // withdraw airdrop token
            IERC20(airdropToken).safeTransfer(msg.sender, airdropTokenAmount);
        } else if (state == State.Breach) {
            // withdraw buy token * 2
            IERC20(depositToken).safeTransfer(msg.sender, depositTokenAmount * 2);
        } else if (state == State.Expired) {
            // withdraw buy token
            IERC20(depositToken).safeTransfer(msg.sender, depositTokenAmount);
        } else {
            require(false, "Invalid state");
        }
        buyer = address(0);
    }

    function sellerWithdraw() public runState {
        require(seller == msg.sender, "Only seller can withdraw");
        if (state == State.Finished) {
            // withdraw buy token
            IERC20(depositToken).safeTransfer(msg.sender, depositTokenAmount * 2);
        } else {
            require(false, "Invalid state");
        }
        seller = address(0);
    }
}
