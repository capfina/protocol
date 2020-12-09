pragma solidity ^0.7.3;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract DaiMock is ERC20 {

    // bytes32 public constant PERMIT_TYPEHASH = keccak256('Permit(address holder,address spender,uint256 nonce,uint256 expiry,bool allowed)');
    bytes32 public constant PERMIT_TYPEHASH = 0xea2aa0a1be11a07ed86d755c93467f4f82362b452371d1ba94d1715123511acb;

    mapping (address => uint) public nonces;

    bytes32 public DOMAIN_SEPARATOR;

    address public owner;

    mapping (address => bool) private _faucetAddresses;

    constructor() public ERC20('Dai Stablecoin', 'DAI') {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }

        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
            keccak256(bytes('Dai Stablecoin')),
            keccak256(bytes('1')),
            chainId,
            address(this)
        ));

        owner = msg.sender;
    }

    function permit(address holder, address spender, uint256 nonce, uint256 expiry, bool allowed, uint8 v, bytes32 r, bytes32 s) external {

        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                DOMAIN_SEPARATOR, 
                keccak256(
                    abi.encode(
                        PERMIT_TYPEHASH, 
                        holder, 
                        spender, 
                        nonce, 
                        expiry, 
                        allowed
                    )
                )
            )
        );

        require(holder != address(0), 'Dai/invalid-address-0');
        require(holder == ecrecover(digest, v, r, s), 'Dai/invalid-permit');
        require(expiry == 0 || block.timestamp <= expiry, 'Dai/permit-expired');
        require(nonce == nonces[holder]++, 'Dai/invalid-nonce');
        uint wad = allowed ? uint(-1) : 0;
        _approve(holder, spender, wad);

    }

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function faucetRequest() external {
        require(!_faucetAddresses[msg.sender], '!allowed');
        _faucetAddresses[msg.sender] = true;
        _mint(msg.sender, 10000 * 10**uint256(decimals()));
    }

    /* ========== MOFIFIERS ========== */

    modifier onlyOwner() {
        require(msg.sender == owner, '!authorized');
        _;
    }

}