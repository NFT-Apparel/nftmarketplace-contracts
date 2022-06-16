import { expect, util } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";
import { Signer } from "ethers";
import { Contract } from "ethers";
const { time } = require('@openzeppelin/test-helpers');

describe("Contract Test", function () {
    const WETH = String(process.env.WETH);
    const feeReceiver = "0x44A33a4a822194d3C8402629932dd88B0FF49b09";
    const decimal18 =  BigNumber.from(10).pow(18);
    let accounts: Signer[];
    let Marketplace: Contract;
    let AddressRegistry: Contract;
    let NFTFactory: Contract;
    let NFTTradable: Contract;
    let PriceFeed: Contract;
    let TokenRegistry: Contract;
    let ERC20Token: Contract;
    let admin: Signer;
    let creator: Signer;
    let artist: Signer;
    let buyer: Signer;
    let bidder: Signer;
    let user: Signer;
    let receiver: Signer;

    beforeEach(async function () {
        accounts = await ethers.getSigners();
        admin = accounts[0];
        creator = accounts[1];
        artist = accounts[2];
        buyer = accounts[3];
        bidder = accounts[4];
        user = accounts[5];
        receiver = accounts[6];
    });
    describe("1. Contract Deployment", function () {
        it("Marketplace Deployment", async function() {
            const MarketplaceFactory = await ethers.getContractFactory("ApparelMarketplace");
            Marketplace = await upgrades.deployProxy(MarketplaceFactory, [feeReceiver, 30]);
            await Marketplace.deployed();
            console.log("ApparelMarketplace: ", Marketplace.address);
        });
        it("AddressRegistry Deployment", async function() {
            const AddressRegistryFactory = await ethers.getContractFactory("ApparelAddressRegistry");
            AddressRegistry = await AddressRegistryFactory.deploy();
            await AddressRegistry.deployed();
            console.log("ApparelAddressRegistry: ", Marketplace.address);
        });    

        it("NFTFactory Deployment", async function() {
            const NFTFactoryFactory = await ethers.getContractFactory("ApparelNFTFactory");
            NFTFactory = await NFTFactoryFactory.deploy(Marketplace.address, ethers.utils.parseEther("0.1"), feeReceiver, 30);
            await NFTFactory.deployed();
            console.log("ApparelNFTFactory: ", NFTFactory.address);
        });

        it("NFTTradable Deployment", async function() {
            const NFTTradableFactory = await ethers.getContractFactory("ApparelNFTTradable");
            NFTTradable = await NFTTradableFactory.deploy("Apparel NFT", "TRD", Marketplace.address, ethers.utils.parseEther("0.01"), feeReceiver);
            await NFTTradable.deployed();
            console.log("ApparelNFTTradable: ", NFTTradable.address);
        });

        it("TokenRegistry Deployment", async function() {
            const TokenRegistryFactory = await ethers.getContractFactory("ApparelTokenRegistry");
            TokenRegistry = await TokenRegistryFactory.deploy();
            await TokenRegistry.deployed();
            console.log("ApparelTokenRegistry: ", TokenRegistry.address);
        });

        it("PriceFeed Deployment", async function() {
            const PriceFeedFactory = await ethers.getContractFactory("ApparelPriceFeed");
            PriceFeed = await PriceFeedFactory.deploy(AddressRegistry.address, WETH);
            await PriceFeed.deployed();
            console.log("ApparelPriceFeed: ", PriceFeed.address);
        });

        it("ERC20 Token Creation", async function () {
            const TestERC20 = await ethers.getContractFactory("TestERC20");
            const buyerAddr = await buyer.getAddress();
            const bidderAddr = await bidder.getAddress();

            ERC20Token = await TestERC20.deploy(ethers.utils.parseEther("10000000"), "Testing DAI", "DAI");

            await ERC20Token.deployed();
            await ERC20Token.connect(admin).transfer(buyerAddr, ethers.utils.parseEther("1000"));
            await ERC20Token.connect(admin).transfer(bidderAddr, ethers.utils.parseEther("1000"));
            console.log("ERC20 Token: ", ERC20Token.address);
        });
    });

    describe("2. Token Registry Check", function () {
        it("Add Token To Token Registry", async function () {
            await TokenRegistry.add(ERC20Token.address);
            expect(await TokenRegistry.enabled(ERC20Token.address)).to.equal(true);

            await TokenRegistry.add(feeReceiver);
            expect(await TokenRegistry.enabled(feeReceiver)).to.equal(true);
        });

        it("Remove Test Token From Token Registry", async function () {
            await TokenRegistry.remove(feeReceiver);
            expect(await TokenRegistry.enabled(feeReceiver)).to.equal(false);
        });
    });

    describe("3. Address Registry Check", function () {        
        it("Update Marketplace Contract Address", async function () {
            await AddressRegistry.updateMarketplace(Marketplace.address);
            expect(await AddressRegistry.marketplace()).to.equal(Marketplace.address);
        });

        it("Update NFT Factory Contract Address", async function () {
            await AddressRegistry.updateNFTFactory(NFTFactory.address);
            expect(await AddressRegistry.factory()).to.equal(NFTFactory.address);
        });

        it("Update Token Registery Contract Address", async function () {
            await AddressRegistry.updateTokenRegistry(TokenRegistry.address);
            expect(await AddressRegistry.tokenRegistry()).to.equal(TokenRegistry.address);
        });

        it("Update Price Feed Contract Address", async function () {
            await AddressRegistry.updatePriceFeed(PriceFeed.address);
            expect(await AddressRegistry.priceFeed()).to.equal(PriceFeed.address);
        });
    });

    describe("4. Apparel NFT Contract Check", function () {
        it("NFT Mint Method & Token URI Check : (Mint 1,2)", async function () {
            const artistAddr = await artist.getAddress();
            const creatorAddr = await creator.getAddress();
            const tokenURI = "https://gateway.pinata.cloud/ipfs/TestNFT";

            await expect(await NFTTradable.connect(creator).mint(artistAddr, tokenURI, {value: ethers.utils.parseEther("1")}))
                .to.emit(NFTTradable, "Minted")
                .withArgs(1, artistAddr, tokenURI, creatorAddr);
            
            await expect(await NFTTradable.connect(creator).mint(artistAddr, tokenURI, {value: ethers.utils.parseEther("1")}))
                .to.emit(NFTTradable, "Minted")
                .withArgs(2, artistAddr, tokenURI, creatorAddr);
            expect(await NFTTradable.tokenURI(1)).to.equal(tokenURI);
        });

        it("NFT Burn Method Method - Operator & Approve Check : (Burn 1)", async function () {
            const artistAddr = await artist.getAddress();
            const creatorAddr = await creator.getAddress();

            await expect(NFTTradable.connect(creator).burn(1))
                .to.be.revertedWith("Only garment owner or approved");

            await NFTTradable.connect(artist).approve(creatorAddr, 1);

            expect(await NFTTradable.isApproved(1, creatorAddr)).to.be.equal(true);

            await expect(NFTTradable.connect(creator).burn(1))
                .to.be.emit(NFTTradable, "Transfer")
                .withArgs(artistAddr, "0x0000000000000000000000000000000000000000", 1);
        });

        it("NFT Burn Method Method - Owner : (Burn 2)", async function () {
            const artistAddr = await artist.getAddress();

            await expect(NFTTradable.connect(artist).burn(2))
                .to.be.emit(NFTTradable, "Transfer")
                .withArgs(artistAddr, "0x0000000000000000000000000000000000000000", 2);
        });

        it("Platform Fee Check (Mint 3, 4)", async function () {
            const artistAddr = await artist.getAddress();
            const creatorAddr = await creator.getAddress();
            const tokenURI = "https://gateway.pinata.cloud/ipfs/TestNFT3";

            await NFTTradable.connect(admin).updatePlatformFee(ethers.utils.parseEther("1"));
            expect(await NFTTradable.platformFee()).to.equal(ethers.utils.parseEther("1"));
            
            await expect(NFTTradable.connect(creator).mint(artistAddr, tokenURI, {value: ethers.utils.parseEther("0.1")}))
                .to.be.revertedWith("insufficient funds for intrinsic transaction cost");

            await expect(await NFTTradable.connect(creator).mint(artistAddr, tokenURI, {value: ethers.utils.parseEther("1")}))
                .to.emit(NFTTradable, "Minted")
                .withArgs(3, artistAddr, tokenURI, creatorAddr);
            expect(await NFTTradable.tokenURI(3)).to.equal(tokenURI);

            await NFTTradable.connect(creator).mint(artistAddr, tokenURI, {value: ethers.utils.parseEther("1")});
            
        });
    });

    describe("5. Apparel NFT Factory Check", function () {
        it("Create NFT Contract", async function () {
            const tx = await NFTFactory.connect(creator).createNFTContract("Apparel Test", "TERT", {value: ethers.utils.parseEther("1")});
            const resp = await tx.wait();
            const contractAddr = resp.events[0].address

            expect(await NFTFactory.exists(contractAddr)).to.equal(true);

            console.log("NFT Contract Created at: ", contractAddr);
        });

        it("Register NFT Contract", async function () {
            const adminAddr = await admin.getAddress();
            const contractAddr = NFTTradable.address;

            expect(await NFTFactory.connect(admin).registerTokenContract(contractAddr))
                .to.emit(NFTFactory, "ContractCreated")
                .withArgs(adminAddr, contractAddr);

            expect(await NFTFactory.exists(contractAddr)).to.equal(true);
        });

        it("Disable NFT Contract", async function () {
            const adminAddr = await admin.getAddress();
            const contractAddr = NFTTradable.address;

            expect(await NFTFactory.connect(admin).disableTokenContract(contractAddr))
                .to.emit(NFTFactory, "ContractDisabled")
                .withArgs(adminAddr, contractAddr);

            expect(await NFTFactory.exists(contractAddr)).to.equal(false);
        });
    });

    describe("6. Apparel NFT Marketplace Check", function () {
        it("Marketplace Configuration", async function () {
            await Marketplace.updateAddressRegistry(AddressRegistry.address);

            expect(await Marketplace.addressRegistry()).to.equal(AddressRegistry.address);
        });

        it("Update Platform Fee to 5%", async function () {
            await Marketplace.updatePlatformFee(50);

            expect(await Marketplace.platformFee()).to.equal(50);
        });

        it("Update Platform Fee Receiver", async function () {
            const receiverAddr = await receiver.getAddress();

            await Marketplace.updatePlatformFeeRecipient(receiverAddr);

            expect(await Marketplace.feeReceipient()).to.equal(receiverAddr);
        });

        it("List NFT Item: (Token ID 3 by Creator)", async function () {
            const startListing = (await time.latest()).add(time.duration.days(1));
            const artistAddr = await artist.getAddress();

            expect(await Marketplace.connect(artist).listItem(NFTTradable.address, 3, 1, ERC20Token.address, ethers.utils.parseEther("100"), startListing.toString()))
                .to.be.emit(Marketplace, "ItemListed");

            const listing = await Marketplace.listings(NFTTradable.address, 3, artistAddr);

            expect(listing.quantity).to.equal(1);
            expect(listing.payToken).to.equal(ERC20Token.address);
            expect(listing.startingTime).to.equal(startListing.toString());
            expect(listing.pricePerItem).to.equal(ethers.utils.parseEther("100"));
            expect(await NFTTradable.ownerOf(3)).to.equal(Marketplace.address);
        });

        it("Cancel Listing", async function () {
            const artistAddr = await artist.getAddress();

            expect(await Marketplace.connect(artist).cancelListing(NFTTradable.address, 3))
                .to.be.emit(Marketplace, "ItemCanceled");

            const listing = await Marketplace.listings(NFTTradable.address, 3, artistAddr);

            expect(listing.quantity).to.equal(0);
        });

        it("Update Listing", async function () {
            const startListing = (await time.latest()).add(time.duration.days(1));
            const artistAddr = await artist.getAddress();

            expect(await Marketplace.connect(artist).listItem(NFTTradable.address, 3, 1, ERC20Token.address, ethers.utils.parseEther("1"), startListing.toString()))
                .to.be.emit(Marketplace, "ItemListed");

            expect(await Marketplace.connect(artist).updateListing(NFTTradable.address, 3, ERC20Token.address, ethers.utils.parseEther("10")))
                .to.be.emit(Marketplace, "ItemUpdated");
            
            const listing = await Marketplace.listings(NFTTradable.address, 3, artistAddr);
            
            expect(listing.pricePerItem).to.equal(ethers.utils.parseEther("10"));
        });

        it("Buy NFT", async function () {
            const buyerAddr = await buyer.getAddress();
            const artistAddr = await artist.getAddress();

            console.log("ERC20 Token Balance of Buyer: ", ethers.utils.formatEther(await ERC20Token.balanceOf(buyerAddr)));

            expect(Marketplace.connect(buyer).buyItem(NFTTradable.address, 3, ERC20Token.address, artistAddr))
                .to.be.revertedWith('item not buyable');

            await time.increaseTo((await time.latest()).add(time.duration.days(2)));

            await ERC20Token.connect(buyer).approve(Marketplace.address, ethers.utils.parseEther("10"));
            expect(await Marketplace.connect(buyer).buyItem(NFTTradable.address, 3, ERC20Token.address, artistAddr))
                .to.be.emit(Marketplace, "ItemSold");

            console.log("ERC20 Token Balance After Purchase: ", ethers.utils.formatEther(await ERC20Token.balanceOf(buyerAddr)));
            console.log("ERC20 Token Balance for Artist: ", ethers.utils.formatEther(await ERC20Token.balanceOf(artistAddr)));
        });

        it("Create Offer", async function () {
            const deadline = (await time.latest()).add(time.duration.days(1));
            const bidderAddr = await bidder.getAddress();

            expect(await Marketplace.connect(bidder).createOffer(NFTTradable.address, 4, ERC20Token.address, 1, ethers.utils.parseEther("1"), deadline.toString()))
                .to.be.emit(Marketplace, "OfferCreated");
            
            let offer = await Marketplace.offers(NFTTradable.address, 4, bidderAddr);

            expect(offer.payToken).to.equal(ERC20Token.address);
            expect(offer.quantity).to.equal(1);
            expect(offer.pricePerItem).to.equal(ethers.utils.parseEther("1"));
            expect(offer.deadline).to.equal(deadline.toString());

            const userAddr = await user.getAddress();

            expect(await Marketplace.connect(user).createOffer(NFTTradable.address, 4, ERC20Token.address, 1, ethers.utils.parseEther("1.5"), deadline.toString()))
                .to.be.emit(Marketplace, "OfferCreated");
            
            offer = await Marketplace.offers(NFTTradable.address, 4, userAddr);

            expect(offer.payToken).to.equal(ERC20Token.address);
            expect(offer.quantity).to.equal(1);
            expect(offer.pricePerItem).to.equal(ethers.utils.parseEther("1.5"));
            expect(offer.deadline).to.equal(deadline.toString());
        });

        it("Cancel Offer", async function () {
            const userAddr = await user.getAddress();

            expect(await Marketplace.connect(user).cancelOffer(NFTTradable.address, 4))
                .to.be.emit(Marketplace, "OfferCanceled");
            
            const offer = await Marketplace.offers(NFTTradable.address, 4, userAddr);

            expect(offer.quantity).to.equal(0);
            expect(offer.pricePerItem).to.equal(0);
            expect(offer.deadline).to.equal(0);
        });

        it("Accept Offer", async function () {
            const bidderAddr = await bidder.getAddress();

            await ERC20Token.connect(bidder).approve(Marketplace.address, ethers.utils.parseEther("1"));

            expect(await Marketplace.connect(artist).acceptOffer(NFTTradable.address, 4, bidderAddr))
                .to.be.emit(Marketplace, "ItemSold");
            
            expect(await NFTTradable.ownerOf(4)).to.equal(bidderAddr);
        });

        it("Register Royality - Contract Owner ", async function () {
            const bidderAddr = await bidder.getAddress();

            await Marketplace.connect(admin).registerCollectionRoyalty(NFTTradable.address, bidderAddr, 300, feeReceiver);

            const collectionRoyality = await Marketplace.collectionRoyalties(NFTTradable.address);

            expect(collectionRoyality.royalty).to.equal(300);
            expect(collectionRoyality.creator).to.equal(bidderAddr);
            expect(collectionRoyality.feeRecipient).to.equal(feeReceiver);
        });

        it("Register Royality - User ", async function () {
            const bidderAddr = await bidder.getAddress();

            await NFTFactory.connect(admin).registerTokenContract(NFTTradable.address)
            await Marketplace.connect(bidder).registerRoyalty(NFTTradable.address, 4, 300);

            expect(await Marketplace.minters(NFTTradable.address, 4)).to.equal(bidderAddr);
            expect(await Marketplace.royalties(NFTTradable.address, 4)).to.equal(300);
        });
    });
});