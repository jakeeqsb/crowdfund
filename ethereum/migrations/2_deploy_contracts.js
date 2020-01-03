var Project = artifacts.require("./Project.sol");

module.exports = function(deployer) {
  deployer.deploy(Project, 1000, 5);
};
