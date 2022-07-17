import { Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
// const fs = require('fs/promises');
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

    const observed_data : Array<any> = [];
    const generate_deploy_info = async function (contract : Contract, name : string, type : string){
  
      let deploy_info : {_id : string, trx : string, name:string, block:object, type:string, created:object, chainID: string} = {_id : '', trx : '', name : '', block : {}, type : '',created:{}, chainID: ''};
      deploy_info._id = contract.address;
      deploy_info.chainID = "0x24c";
      deploy_info.trx = contract.deployTransaction.hash;
      let blockNumber;
      deploy_info.name = name;
      {
        blockNumber = (await ethers.provider.getTransaction(contract.deployTransaction.hash)).blockNumber;
        deploy_info.block = {
          "$numberLong": `\"${blockNumber.toString()}\"`
        }
      }
      deploy_info.type = type;
      {
        const timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp
        deploy_info.created = {
          "$date": {
            "$numberLong": `\"${timestamp.toString()}000\"`
          }
        }
      }
  
      return deploy_info;
    }
    
    {
      const deploy_info = await generate_deploy_info(marketplace, "ApparelMarketplace", "market3");
      observed_data.push(deploy_info)
    }
    //////// Auction
    const Auction = await ethers.getContractFactory('ApparelAuction');
    const auction = await upgrades.deployProxy(Auction, [TREASURY_ADDRESS]);
    await auction.deployed();
    console.log('ApparelAuction deployed to:', auction.address);
    ////////
    {
      const deploy_info = await generate_deploy_info(auction, "ApparelAuction", "auction3");
      observed_data.push(deploy_info)
    }

    ////////
    const NFTFactory = await ethers.getContractFactory('ApparelNFTFactory');
    const nftFactory = await NFTFactory.deploy(
        auction.address,
        marketplace.address,
        '100000000000000000',
        TREASURY_ADDRESS,
        '750000000000000000'
    );
    await nftFactory.deployed();
    {
      const deploy_info = await generate_deploy_info(nftFactory, "ApparelNFTFactory", "nft_factory");
      observed_data.push(deploy_info)
    }
    console.log('ApparelNFTFactory deployed to:', nftFactory.address);
    ////////    
    const ArtFactory = await ethers.getContractFactory('ApparelArtFactory');
    const artFactory = await ArtFactory.deploy(
        marketplace.address,
        '100000000000000000',
        TREASURY_ADDRESS,
        '750000000000000000'
    );
    await artFactory.deployed();
    {
      const deploy_info = await generate_deploy_info(artFactory, "ApparelArtFactory", "art_factory");
      observed_data.push(deploy_info)
    }
    console.log('ApparelArtFactory deployed to:', artFactory.address);

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
    {
      const deploy_info = await generate_deploy_info(tokenRegistry, "ApparelTokenRegistry", "token_registry");
      observed_data.push(deploy_info)
    }

    ////////
    const AddressRegistry = await ethers.getContractFactory('ApparelAddressRegistry');
    const addressRegistry = await AddressRegistry.deploy();

    await addressRegistry.deployed();

    console.log('ApparelAddressRegistry deployed to', addressRegistry.address);
    const APPAREL_ADDRESS_REGISTRY = addressRegistry.address;
    ////////
    {
      const deploy_info = await generate_deploy_info(addressRegistry, "ApparelAddressRegistry", "address_registry");
      observed_data.push(deploy_info)
    }

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
    await addressRegistry.updateNFTFactory(nftFactory.address);
    await addressRegistry.updateArtFactory(artFactory.address);
    await addressRegistry.updateTokenRegistry(tokenRegistry.address);
    await addressRegistry.updatePriceFeed(priceFeed.address);

    await tokenRegistry.add(WRAPPED_ETH_MAINNET);
    await tokenRegistry.add(PEAK_ADDRESS);

    const content = JSON.stringify(observed_data)
      console.log(content);
    //   await fs.writeFile("observed.json", content, {
    //     encoding: 'utf-8'
    // })
      
  }
  
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

