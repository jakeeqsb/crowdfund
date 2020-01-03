### Movie Crowdfunding with milestones and residual (loyalty) record 

### Prerequisite and setup
- Solidity: v >=4.21 < 0.6.0
- solc: v0.5.1
- Web3: 1.0.0beta.52
- ganache or ganache-cli required 

### Network structure
```JSON
{
  "networks": {
    "development": {
      "host": "127.0.0.1",
      "port": 8545,
      "network_id": "*",
    }
  }
}
```


### SmartContract methods
- invest
  - @dev InvestReceipt: event emitted when a backer invests on this project
  - @dev FundGoalSuccess: event emitted when the total fund has been reached

- closeInvest
  - @emit InvestClose: event emitted when the funding is closed by the project director (manager)

- createMile
  - creates a mile step of the project (campaign)
  - @param _dependingMile the mile number that the new current mile is depending 
  - @param _description description for the mile
  - @param _value request amount of the fund from total funding 
  - @param _recipient address of person that would be given the requsted _value 
  - @param _participants list of address that working on this mile
  - @dev NewMileAdded event emitted whena a new mile is added 

- approve
  - backers would approve on the mile step of the project if the mile step satisfies the backer's interest
  - once approvals' majority is over the decisionMajority, the fund automatically is sent to the recipient. 
  - @param mileNumber the mile number that the backer (request sender) wants to the requested fund to be sent 
  - @dev ApproveMile event emitted when a backer sends approve request on finished mile 
  - @dev MileRequestAmountTransfered event emitted when the approve condition to lock off the fund is satisfied to be sent to the recipient

- mintResidual
  - generate residual for backers, investors, and other customers 
  - @param _holderID the owner of the residual
  - @param _holderType the type of the holder can be backer (investor), actors, any other merchants
  - @param _rewardType type of the reward; what the holder was given
  - @param _start the effective starting date of the residual
  - @param _expiary the ending date of the effectiveness of the residual
  - @param _weight the weight of the profit amount
  - @param _decimal the decimal unit of the weight
  - @dev NewResidual event emitted when a new residual is assigned to a holder

- balanceOf
  - returns the residual types that a holder has 

- getResidual 
  - returns a residual details that _id indicates 
  - @param _id the id (number) of the residual
  - @return residualID the id of the residual 
  - @return residualType the type of the residual
  - @return holderID the address id of the holder
  - @return holderType the type of the holder backer, investor, merchant, actors ... 
  - @return start start date 
  - @return expiary date when the residual expiary (0 -> permanant)
  - @return weight the weight of the profit
  - @return decimal the unit of the weight
  - @return media the media type 


### Run the test
- ganache-cli (or use the ganache app)
- truffle test