import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet } from "viem/chains";

export const CRYPTOPUNKS_ADDRESS =
  "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB" as const;

export const CRYPTOPUNKS_DATA_ADDRESS =
  "0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2" as const;

export const WRAPPED_PUNKS_ADDRESS =
  "0xb7F7F6C52F2e2fdb1963Eab30438024864c313F6" as const;

export const CRYPTOPUNKS_721_ADDRESS =
  "0x000000000000003607fce1aC9e043a86675C5C2F" as const;

export const STASH_FACTORY_ADDRESS =
  "0x000000000000A6fA31F5fC51c1640aAc76866750" as const;

export const stashFactoryAbi = [
  // Reads — registry / versioning
  {
    type: "function",
    stateMutability: "view",
    name: "currentVersion",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "implementations",
    inputs: [{ name: "version", type: "uint256" }],
    outputs: [{ name: "implementation", type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "stashAddressFor",
    inputs: [{ name: "stashOwner", type: "address" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "ownerHasDeployed",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "isStash",
    inputs: [{ name: "stashAddress", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "isAuction",
    inputs: [{ name: "auctionAddress", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "stashVerifier",
    inputs: [],
    outputs: [{ type: "address" }],
  },

  // Reads — ownership / roles (Solady)
  {
    type: "function",
    stateMutability: "view",
    name: "owner",
    inputs: [],
    outputs: [{ name: "result", type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "ownershipHandoverExpiresAt",
    inputs: [{ name: "pendingOwner", type: "address" }],
    outputs: [{ name: "result", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "rolesOf",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "roles", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "hasAllRoles",
    inputs: [
      { name: "user", type: "address" },
      { name: "roles", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "hasAnyRole",
    inputs: [
      { name: "user", type: "address" },
      { name: "roles", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },

  // Writes
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "deployStash",
    inputs: [{ name: "_owner", type: "address" }],
    outputs: [{ name: "deployedAddress", type: "address" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "upgradeStash",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "addVersion",
    inputs: [{ name: "implementation", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "setAuction",
    inputs: [
      { name: "auction", type: "address" },
      { name: "_isAuction", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "requestOwnershipHandover",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "completeOwnershipHandover",
    inputs: [{ name: "pendingOwner", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "cancelOwnershipHandover",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "grantRoles",
    inputs: [
      { name: "user", type: "address" },
      { name: "roles", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "revokeRoles",
    inputs: [
      { name: "user", type: "address" },
      { name: "roles", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "renounceRoles",
    inputs: [{ name: "roles", type: "uint256" }],
    outputs: [],
  },
] as const;

export const cryptoPunks721Abi = [
  // Reads
  {
    type: "function",
    stateMutability: "pure",
    name: "name",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    stateMutability: "pure",
    name: "symbol",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    stateMutability: "pure",
    name: "licensingTerms",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "totalSupply",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "ownerOf",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "tokensOfOwner",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256[]" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "punkProxyForUser",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getApproved",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "isApprovedForAll",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "supportsInterface",
    inputs: [{ name: "interfaceId", type: "bytes4" }],
    outputs: [{ type: "bool" }],
  },

  // Writes
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "wrapPunk",
    inputs: [{ name: "punkIndex", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "wrapPunkBatch",
    inputs: [{ name: "punkIndexes", type: "uint256[]" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "unwrapPunk",
    inputs: [{ name: "punkIndex", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "unwrapPunkBatch",
    inputs: [{ name: "punkIndexes", type: "uint256[]" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "migrateLegacyWrappedPunks",
    inputs: [{ name: "punkIndexes", type: "uint256[]" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "rescuePunk",
    inputs: [{ name: "punkIndex", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "approve",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "setApprovalForAll",
    inputs: [
      { name: "operator", type: "address" },
      { name: "isApproved", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "transferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "safeTransferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "safeTransferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export const wrappedPunksAbi = [
  // Reads
  {
    type: "function",
    stateMutability: "view",
    name: "name",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "symbol",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "totalSupply",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "baseURI",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "tokenByIndex",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "tokenOfOwnerByIndex",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getApproved",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "isApprovedForAll",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "supportsInterface",
    inputs: [{ name: "interfaceId", type: "bytes4" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "proxyInfo",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "punkContract",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "owner",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "paused",
    inputs: [],
    outputs: [{ type: "bool" }],
  },

  // Writes
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "registerProxy",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "mint",
    inputs: [{ name: "punkIndex", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "burn",
    inputs: [{ name: "punkIndex", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "approve",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "setApprovalForAll",
    inputs: [
      { name: "to", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "transferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "safeTransferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "safeTransferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "_data", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "setBaseURI",
    inputs: [{ name: "baseUri", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "pause",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "unpause",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
  },
] as const;

export const cryptopunksDataAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "punkImageSvg",
    inputs: [{ type: "uint16", name: "index" }],
    outputs: [{ type: "string", name: "svg" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "punkAttributes",
    inputs: [{ type: "uint16", name: "index" }],
    outputs: [{ type: "string", name: "text" }],
  },
] as const;

export const cryptopunksAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "name",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "symbol",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "imageHash",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "totalSupply",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "punksRemainingToAssign",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "nextPunkIndexToAssign",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "punkIndexToAddress",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "balanceOf",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "punksOfferedForSale",
    inputs: [{ type: "uint256" }],
    outputs: [
      { name: "isForSale", type: "bool" },
      { name: "punkIndex", type: "uint256" },
      { name: "seller", type: "address" },
      { name: "minValue", type: "uint256" },
      { name: "onlySellTo", type: "address" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "punkBids",
    inputs: [{ type: "uint256" }],
    outputs: [
      { name: "hasBid", type: "bool" },
      { name: "punkIndex", type: "uint256" },
      { name: "bidder", type: "address" },
      { name: "value", type: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "pendingWithdrawals",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },

  // Writes
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "offerPunkForSale",
    inputs: [
      { name: "punkIndex", type: "uint256" },
      { name: "minSalePriceInWei", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "offerPunkForSaleToAddress",
    inputs: [
      { name: "punkIndex", type: "uint256" },
      { name: "minSalePriceInWei", type: "uint256" },
      { name: "toAddress", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "punkNoLongerForSale",
    inputs: [{ name: "punkIndex", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "buyPunk",
    inputs: [{ name: "punkIndex", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "enterBidForPunk",
    inputs: [{ name: "punkIndex", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "acceptBidForPunk",
    inputs: [
      { name: "punkIndex", type: "uint256" },
      { name: "minPrice", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "withdrawBidForPunk",
    inputs: [{ name: "punkIndex", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "transferPunk",
    inputs: [
      { name: "to", type: "address" },
      { name: "punkIndex", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "withdraw",
    inputs: [],
    outputs: [],
  },
] as const;

export const stashAbi = [
  // Reads
  {
    type: "function",
    stateMutability: "view",
    name: "owner",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "pure",
    name: "version",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "availableLiquidity",
    inputs: [{ name: "tokenAddress", type: "address" }],
    outputs: [{ name: "availableAmount", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getOrder",
    inputs: [{ name: "auction", type: "address" }],
    outputs: [
      {
        name: "order",
        type: "tuple",
        components: [
          { name: "numberOfUnits", type: "uint16" },
          { name: "pricePerUnit", type: "uint80" },
          { name: "auction", type: "address" },
        ],
      },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "punkAccountNonce",
    inputs: [],
    outputs: [{ type: "uint56" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "punkBidNonceUsesRemaining",
    inputs: [{ name: "punkBidNonce", type: "uint256" }],
    outputs: [{ name: "usesRemaining", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "usedPunkBidNonces",
    inputs: [{ name: "punkBidNonce", type: "uint256" }],
    outputs: [{ name: "isUsed", type: "bool" }],
  },

  // Writes
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "processPunkBid",
    inputs: [
      {
        name: "bid",
        type: "tuple",
        components: [
          {
            name: "order",
            type: "tuple",
            components: [
              { name: "numberOfUnits", type: "uint16" },
              { name: "pricePerUnit", type: "uint80" },
              { name: "auction", type: "address" },
            ],
          },
          { name: "accountNonce", type: "uint256" },
          { name: "bidNonce", type: "uint256" },
          { name: "expiration", type: "uint256" },
          { name: "root", type: "bytes32" },
        ],
      },
      { name: "punkIndex", type: "uint256" },
      { name: "signature", type: "bytes" },
      { name: "proof", type: "bytes32[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "cancelPunkBid",
    inputs: [{ name: "bidNonce", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "cancelAllPunkBids",
    inputs: [],
    outputs: [],
  },
] as const;

export function makeReadClient(): PublicClient {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/rpc`
      : "/api/rpc";
  return createPublicClient({
    chain: mainnet,
    transport: http(url),
  });
}
