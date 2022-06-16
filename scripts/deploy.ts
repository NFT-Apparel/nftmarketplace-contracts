import { ethers, upgrades } from "hardhat";
import { TREASURY_ADDRESS, PLATFORM_FEE, WRAPPED_ETH_MAINNET, PRO_ADDRESS, PEAK_ADDRESS, ROUTER_ADDRESS } from './constants.json';
// to deploy locally
// run: npx hardhat node on a terminal
// then run: npx hardhat run --network localhost scripts/12_deploy_all.js
async function main() {

    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log(`Deployer's address: `, deployerAddress);

    //////// Marketplace
    const Marketplace = await ethers.getContractFactory('ApparelMarketplace');
    const marketplace = await upgrades.deployProxy(Marketplace, [TREASURY_ADDRESS, PLATFORM_FEE, PEAK_ADDRESS, PRO_ADDRESS, ROUTER_ADDRESS]);
    await marketplace.deployed();

    console.log('ApparelMarketplace deployed to:', marketplace.address);

    //////// Auction
    const Auction = await ethers.getContractFactory('ApparelAuction');
    const auction = await upgrades.deployProxy(Auction, [TREASURY_ADDRESS]);
    await auction.deployed();
    console.log('ApparelAuction deployed to:', auction.address);
    ////////

    ////////
    const Factory = await ethers.getContractFactory('ApparelNFTFactory');
    const factory = await Factory.deploy(
        auction.address,
        marketplace.address,
        '750000000000000000',
        TREASURY_ADDRESS,
        '100000000000000000'
    );
    await factory.deployed();
    console.log('ApparelNFTFactory deployed to:', factory.address);
    ////////    

    ////////
    // const NFTTradable = await ethers.getContractFactory('ApparelNFTTradable');
    // const nft = await NFTTradable.deploy(
    //     'Apprael',
    //     'NFTA',
    //     auction.address,
    //     marketplace.address,
    //     '10000000000000000',
    //     TREASURY_ADDRESS
    // );
    // await nft.deployed();
    // console.log('ApparelNFTTradable deployed to:', nft.address);
    ////////

    ////////
    const TokenRegistry = await ethers.getContractFactory('ApparelTokenRegistry');
    const tokenRegistry = await TokenRegistry.deploy();

    await tokenRegistry.deployed();

    console.log('ApparelTokenRegistry deployed to', tokenRegistry.address);
    ////////

    ////////
    const AddressRegistry = await ethers.getContractFactory('ApparelAddressRegistry');
    const addressRegistry = await AddressRegistry.deploy();

    await addressRegistry.deployed();

    console.log('ApparelAddressRegistry deployed to', addressRegistry.address);
    const APPAREL_ADDRESS_REGISTRY = addressRegistry.address;
    ////////

    ////////
    const PriceFeed = await ethers.getContractFactory('ApparelPriceFeed');
    const priceFeed = await PriceFeed.deploy(
      APPAREL_ADDRESS_REGISTRY,
      WRAPPED_ETH_MAINNET
    );
  
    await priceFeed.deployed();
  
    console.log('ApparelPriceFeed deployed to', priceFeed.address);
    ////////

    await marketplace.updateAddressRegistry(APPAREL_ADDRESS_REGISTRY);   
    
    await auction.updateAddressRegistry(APPAREL_ADDRESS_REGISTRY);
    
    await addressRegistry.updateAuction(auction.address);
    await addressRegistry.updateMarketplace(marketplace.address);
    await addressRegistry.updateNFTFactory(factory.address);
    await addressRegistry.updateTokenRegistry(tokenRegistry.address);
    await addressRegistry.updatePriceFeed(priceFeed.address);

    await tokenRegistry.add(WRAPPED_ETH_MAINNET);
    await tokenRegistry.add(PEAK_ADDRESS);

  }
  
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

