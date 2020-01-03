const Web3 = require('web3')

let web3; 

if (typeof window !== 'undefined' && window.web3 !== 'undefined') {
    // We are in the browser and metamask is running. 
    web3 = new Web3(window.web3.currentProvider);
}else {
    // we are on the server or the user is not running metamask 
    const provider = new Web3.providers.HttpProvider(
        'https://rinkeby.infura.io/v3/4f8e07a2b9584fc28a0399eba46f20e0'
    );
    web3 = new Web3(provider);
}

exports.module={web3};