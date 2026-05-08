import {
  CRYPTOPUNKS_721_ADDRESS,
  CRYPTOPUNKS_ADDRESS,
  CRYPTOPUNKS_DATA_ADDRESS,
  STASH_FACTORY_ADDRESS,
  WRAPPED_PUNKS_ADDRESS,
  cryptoPunks721Abi,
  cryptopunksAbi,
  cryptopunksDataAbi,
  stashAbi,
  stashFactoryAbi,
  wrappedPunksAbi,
} from "../lib/cryptopunks";
import { Footer, Header } from "../components/SiteChrome";
import { CryptopunksDataPanel } from "./CryptopunksDataPanel";
import { ProcessPunkBidPanel } from "./ProcessPunkBidPanel";
import { StashFactoryPanel } from "./StashFactoryPanel";

export const metadata = {
  title: "contracts // cryptopunks open source",
  description:
    "reference of every ethereum contract this site reads or writes.",
};

type AbiItem = {
  type: string;
  name?: string;
  stateMutability?: string;
  inputs?: ReadonlyArray<{ name?: string; type: string }>;
  outputs?: ReadonlyArray<{ name?: string; type: string }>;
};

const FUNCTION_DESCRIPTIONS: Record<string, string> = {
  // CryptoPunksMarket — reads
  name: "ERC-20-style token name (“CRYPTOPUNKS”).",
  symbol: "Token symbol (“C”).",
  imageHash:
    "SHA-256 of the original 10,000-Punks composite PNG, fixed at deploy.",
  totalSupply: "Total Punks ever minted (10,000).",
  punksRemainingToAssign:
    "Punks not yet claimed during the original 2017 distribution. Should be 0 today.",
  nextPunkIndexToAssign:
    "Internal pointer used during initial assignment. Vestigial post-2017.",
  punkIndexToAddress: "Current owner of a given Punk index.",
  balanceOf: "Number of Punks held by an address.",
  punksOfferedForSale:
    "Active sale listing for a Punk (isForSale, seller, minValue, optional onlySellTo).",
  punkBids: "Top standing bid for a Punk (hasBid, bidder, value).",
  pendingWithdrawals:
    "ETH owed to an address from sales / outbid refunds. Claim with withdraw().",

  // CryptoPunksMarket — writes
  offerPunkForSale:
    "Owner lists a Punk at a minimum sale price in wei.",
  offerPunkForSaleToAddress:
    "Owner lists a Punk to a specific buyer at a minimum price.",
  punkNoLongerForSale: "Owner cancels their active sale listing.",
  buyPunk:
    "Anyone can take a Punk that’s for sale by sending ≥ minValue.",
  enterBidForPunk:
    "Place a bid in ETH; previous top bidder is refunded into pendingWithdrawals.",
  acceptBidForPunk:
    "Owner accepts the current top bid (must specify a minimum acceptable price).",
  withdrawBidForPunk:
    "Bidder cancels their bid and reclaims the locked ETH.",
  transferPunk: "Owner transfers a Punk to another address. No payment.",
  withdraw: "Pull all ETH owed to msg.sender out of pendingWithdrawals.",

  // CryptopunksData
  punkImageSvg:
    "Render a Punk as an inline SVG (24×24 viewBox). Returns a data:image/svg+xml URL.",
  punkAttributes:
    "Comma-separated list of attributes. First entry is the head type (Male, Female, Zombie, Ape, Alien).",

  // WrappedPunks
  registerProxy:
    "One-time setup: deploys a UserProxy contract for msg.sender. The Punk must be transferred to this proxy before mint().",
  proxyInfo:
    "Returns the UserProxy address for a given user, or 0x0 if not registered.",
  punkContract:
    "Address of the underlying CryptoPunksMarket this wrapper is bound to.",
  mint:
    "Wrap a Punk: caller's UserProxy must already hold punkIndex. Mints a matching ERC-721 token to the caller.",
  burn:
    "Unwrap: burns the WPUNK and returns the underlying Punk to msg.sender.",
  ownerOf: "ERC-721 owner of a wrapped Punk token.",
  tokenURI: "Metadata URI for a wrapped token (concatenates baseURI + id).",
  baseURI: "Current base for tokenURI(); set by the contract owner.",
  tokenByIndex: "ERC-721 enumerable: token ID at the global index.",
  tokenOfOwnerByIndex:
    "ERC-721 enumerable: nth token held by a given owner.",
  getApproved: "ERC-721 single-token approval target.",
  isApprovedForAll: "ERC-721 operator approval status.",
  supportsInterface: "EIP-165 interface check.",
  approve: "ERC-721 approve another address to transfer a single token.",
  setApprovalForAll: "ERC-721 grant/revoke an operator over all of caller's tokens.",
  transferFrom: "ERC-721 transfer (no receiver-hook check).",
  safeTransferFrom: "ERC-721 transfer with onERC721Received hook on contract recipients.",
  setBaseURI: "Owner-only: update the tokenURI base.",
  pause: "Owner-only: halt mint / burn / transfer.",
  unpause: "Owner-only: resume operations.",
  paused: "Whether the contract is currently paused.",
  owner: "Current contract owner (Ownable).",
  transferOwnership: "Owner-only: hand ownership to another address.",
  renounceOwnership:
    "Owner-only: drop ownership permanently (sets owner to 0x0).",

  // CryptoPunks721
  wrapPunk:
    "Wrap a single Punk into a CryptoPunks721 token. Caller must have transferred the Punk to their punkProxyForUser first.",
  wrapPunkBatch: "Wrap many Punks in one transaction.",
  unwrapPunk:
    "Burn the ERC-721 and return the underlying Punk to the holder.",
  unwrapPunkBatch: "Unwrap many Punks at once.",
  migrateLegacyWrappedPunks:
    "Bulk-migrate WPUNKS (the 0xb7F7… legacy wrapper) into CryptoPunks721 tokens.",
  rescuePunk:
    "Recover a Punk transferred directly to this contract by mistake.",
  punkProxyForUser:
    "User's per-address proxy that holds Punks before wrapping. CryptoPunks721 deploys these on demand.",
  tokensOfOwner: "All token IDs an address currently holds.",
  licensingTerms: "Onchain pointer to the CryptoPunks license text.",

  // StashFactory — registry / versioning
  deployStash:
    "Deploy a new Stash for the given owner (CREATE2-style — predictable address via stashAddressFor).",
  stashAddressFor:
    "Deterministic stash address for an owner, whether or not it has been deployed yet.",
  ownerHasDeployed:
    "Whether an owner has already deployed their Stash via this factory.",
  isStash: "Registry check: was this address deployed by the factory?",
  isAuction:
    "Whether an address is on the factory's auction allow-list. Used by stashes to validate counterparties.",
  setAuction:
    "Owner-only: flip an address on/off the auction allow-list.",
  currentVersion:
    "Index of the latest registered stash implementation.",
  implementations:
    "Implementation address for a given version index.",
  addVersion:
    "Owner-only: register a new stash implementation as the current version.",
  upgradeStash:
    "Caller-initiated: upgrade msg.sender's stash to the latest registered implementation.",
  stashVerifier:
    "Address of the off-chain verifier component the factory points stashes at.",

  // Solady Ownable / OwnableRoles
  ownershipHandoverExpiresAt:
    "Expiration timestamp of a pending two-step handover request (Solady Ownable).",
  requestOwnershipHandover:
    "Caller opts into a two-step ownership handover from the current owner.",
  completeOwnershipHandover:
    "Owner finalizes a previously requested handover to pendingOwner.",
  cancelOwnershipHandover:
    "Caller cancels their own pending handover request.",
  grantRoles: "Owner grants a role bitmask to a user (Solady OwnableRoles).",
  revokeRoles: "Owner removes a role bitmask from a user.",
  renounceRoles: "Caller drops their own roles.",
  hasAllRoles: "Whether a user has every role in the given bitmask.",
  hasAnyRole: "Whether a user has at least one role in the bitmask.",
  rolesOf: "Bitmask of roles held by a user.",

  // Stash — reads
  version: "Implementation version of this stash.",
  availableLiquidity:
    "ETH/ERC-20 currently free for new bids on this stash, after subtracting locked balances.",
  getOrder:
    "Active resting order this stash exposes to a given auction (numberOfUnits, pricePerUnit, auction).",
  punkAccountNonce:
    "Current account nonce. Bumped to invalidate every outstanding bid in one shot.",
  punkBidNonceUsesRemaining:
    "How many fills are still allowed for a given bidNonce before it's exhausted.",
  usedPunkBidNonces:
    "Whether a specific bidNonce has been fully consumed.",

  // Stash — writes
  processPunkBid:
    "Auction-only: present a signed PunkBid + Merkle proof for a punk and have the stash pay for it.",
  cancelPunkBid: "Owner cancels a single bid by its bidNonce.",
  cancelAllPunkBids:
    "Owner bumps the account nonce, invalidating every outstanding bid at once.",
};

function fmtParams(
  params: ReadonlyArray<{ name?: string; type: string }> | undefined,
) {
  if (!params || params.length === 0) return "";
  return params
    .map((p) => (p.name ? `${p.type} ${p.name}` : p.type))
    .join(", ");
}

function fmtSignature(item: AbiItem) {
  const ins = fmtParams(item.inputs);
  const outs = fmtParams(item.outputs);
  return outs
    ? `${item.name}(${ins}) → (${outs})`
    : `${item.name}(${ins})`;
}

function ContractCard({
  name,
  address,
  addressNote,
  blurb,
  abi,
  interactive,
}: {
  name: string;
  address?: `0x${string}`;
  addressNote?: React.ReactNode;
  blurb: React.ReactNode;
  abi: ReadonlyArray<AbiItem>;
  interactive?: React.ReactNode;
}) {
  const reads = abi.filter(
    (i) =>
      i.type === "function" &&
      (i.stateMutability === "view" || i.stateMutability === "pure"),
  );
  const writes = abi.filter(
    (i) =>
      i.type === "function" &&
      (i.stateMutability === "nonpayable" || i.stateMutability === "payable"),
  );

  return (
    <section className="flex flex-col gap-3 border border-black p-4">
      <header className="flex flex-col gap-1">
        <h2 className="font-bold">
          <span className="text-pink">■</span> {name}
        </h2>
        {address ? (
          <a
            href={`https://etherscan.io/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="break-all"
          >
            {address}
          </a>
        ) : (
          addressNote && <span>{addressNote}</span>
        )}
      </header>

      <p>{blurb}</p>

      {interactive}

      {(reads.length > 0 || writes.length > 0) && (
        <details className="group">
          <summary className="cursor-pointer select-none hover:text-pink list-none [&::-webkit-details-marker]:hidden">
            <span className="text-pink group-open:hidden">▸</span>
            <span className="text-pink hidden group-open:inline">▾</span>{" "}
            view functions ({reads.length} read · {writes.length} write)
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            {reads.length > 0 && (
              <FunctionList
                title="read functions"
                items={reads}
                accent="var(--bid)"
              />
            )}
            {writes.length > 0 && (
              <FunctionList
                title="write functions"
                items={writes}
                accent="var(--offer)"
              />
            )}
          </div>
        </details>
      )}
    </section>
  );
}

function FunctionList({
  title,
  items,
  accent,
}: {
  title: string;
  items: ReadonlyArray<AbiItem>;
  accent: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-bold" style={{ color: accent }}>
        ■ {title}
      </h3>
      <ul className="flex flex-col gap-3 list-none pl-0">
        {items.map((item, idx) => {
          const desc = item.name && FUNCTION_DESCRIPTIONS[item.name];
          const payable = item.stateMutability === "payable";
          const key = `${item.name ?? "anon"}:${(item.inputs ?? [])
            .map((p) => p.type)
            .join(",")}:${idx}`;
          return (
            <li key={key} className="flex flex-col gap-1">
              <code className="bg-black text-white px-1 py-0.5 self-start break-all">
                {fmtSignature(item)}
                {payable && " [payable]"}
              </code>
              {desc && <p>{desc}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ContractsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 px-6 py-10 max-w-3xl w-full flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <p>
            every ethereum contract this site reads or writes, with the exact
            abi surface in use. addresses are mainnet.
          </p>
        </section>

        <ContractCard
          name="CryptoPunksMarket"
          address={CRYPTOPUNKS_ADDRESS}
          blurb={
            <>
              the marketplace contract deployed by Larva Labs in june 2017.
              tracks ownership, listings, bids, and pending balances. all buy /
              bid / transfer flows on the home page hit this contract.
            </>
          }
          abi={cryptopunksAbi as unknown as ReadonlyArray<AbiItem>}
        />

        <ContractCard
          name="CryptopunksData"
          address={CRYPTOPUNKS_DATA_ADDRESS}
          blurb={
            <>
              onchain image &amp; attribute data, added by Larva Labs in 2021.
              returns a punk’s pixel art as an svg and its trait list as a
              comma-separated string — the source for the rendered punk on
              the home page.
            </>
          }
          abi={cryptopunksDataAbi as unknown as ReadonlyArray<AbiItem>}
          interactive={<CryptopunksDataPanel />}
        />

        <ContractCard
          name="WrappedPunks (WPUNKS) — legacy"
          address={WRAPPED_PUNKS_ADDRESS}
          blurb={
            <>
              the original third-party erc-721 wrapper. to wrap, call{" "}
              <code className="bg-black text-white px-1">registerProxy()</code>{" "}
              once, transfer the punk to the resulting proxy, then call{" "}
              <code className="bg-black text-white px-1">
                mint(punkIndex)
              </code>
              . holders are encouraged to migrate to the newer{" "}
              cryptopunks721 below via{" "}
              <code className="bg-black text-white px-1">
                migrateLegacyWrappedPunks
              </code>
              .
            </>
          }
          abi={wrappedPunksAbi as unknown as ReadonlyArray<AbiItem>}
        />

        <ContractCard
          name="CryptoPunks721"
          address={CRYPTOPUNKS_721_ADDRESS}
          blurb={
            <>
              the current canonical erc-721 wrapper for cryptopunks. supports
              single and batch wrap / unwrap, direct migration from the legacy
              wpunks, and a{" "}
              <code className="bg-black text-white px-1">rescuePunk</code>{" "}
              path for punks sent here by mistake. each user gets a per-address
              proxy via{" "}
              <code className="bg-black text-white px-1">
                punkProxyForUser
              </code>
              ; transfer the punk to that proxy, then call{" "}
              <code className="bg-black text-white px-1">wrapPunk</code>.
            </>
          }
          abi={cryptoPunks721Abi as unknown as ReadonlyArray<AbiItem>}
        />

        <ContractCard
          name="StashFactory"
          address={STASH_FACTORY_ADDRESS}
          blurb={
            <>
              factory that deploys per-owner stash contracts at deterministic
              addresses. users call{" "}
              <code className="bg-black text-white px-1">deployStash</code> to
              create their stash, then{" "}
              <code className="bg-black text-white px-1">upgradeStash</code> to
              opt into newer implementations. also maintains a registry of
              valid stashes (
              <code className="bg-black text-white px-1">isStash</code>) and
              an allow-list of auction venues (
              <code className="bg-black text-white px-1">isAuction</code>).
            </>
          }
          abi={stashFactoryAbi as unknown as ReadonlyArray<AbiItem>}
          interactive={<StashFactoryPanel />}
        />

        <ContractCard
          name="Stash"
          addressNote={
            <>per-owner address — look yours up via the factory panel above.</>
          }
          blurb={
            <>
              the per-owner contract deployed by the factory above. holds the
              owner&apos;s liquidity and resting orders, and accepts signed{" "}
              <code className="bg-black text-white px-1">processPunkBid</code>{" "}
              calls from allow-listed auctions.
            </>
          }
          abi={stashAbi as unknown as ReadonlyArray<AbiItem>}
          interactive={<ProcessPunkBidPanel />}
        />
      </main>

      <Footer />
    </div>
  );
}
