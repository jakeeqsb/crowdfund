pragma solidity >=0.4.21 <0.6.0;

/// @title Project
/// @author Sunbum(Jake) Lee
contract Project {
  
  enum RewardType {CREDIT, FREEACCESS, PROFIT}
  RewardType rewardType;

  struct Miles {
    uint256 mileNumber;
    uint256[] dependingMile;
    string description;
    uint256 value;
    address payable recipient;
    bool complete;
    uint approvalCount; 
    address[] participants;
    mapping(address => bool) approvals;
  }

  struct Residual {
    uint256 residualID;
    RewardType residualType;
    address holderID;
    string holderType;
    uint256 start; 
    uint256 expiary;
    uint256 weight;
    uint256 decimal;
    string media;
  }

  //Public variables
  uint256 public totalMiles;
  address public manager; 
  uint256 public goalFundAmount;
  bool public goalFundReached;
  uint public minimumContribution; 
  uint256 public numberOfBackers;
  bool public investOpen; 
  uint256 public decisionMajority; 
  address public projectID; 
  uint256 public numOfResiduals; 

  //Mappings
  mapping(address => bool) public backers;
  mapping (uint256 => Miles) mileMap;
  mapping (uint256 => Residual) residualMapping;
  mapping (address => uint256[]) balance; 

  //Events
  event FundGoalSuccess(address indexed manager, uint goalFundAmount, uint fundedAmount, bool indexed goalFundReached);
  event InvestReceipt (address indexed backer, uint investAmount);
  event InvestClose(address indexed manager, uint goalFundAmount, uint indexed fundedAmount);
  event NewMileAdded(uint256 mileNumber, uint256[] dependingMile, string description, uint256 value, address indexed recipient, address[] participants);
  event MileRequestAmountTransfered(uint256 indexed mileNumber, address indexed recipient, uint256 indexed amount);
  event ApproveMile(uint256 indexed mileNumber, address indexed approver);
  event NewResidual(uint256 indexed residualID, uint256 residualType, address indexed holderID, string holderType, uint256 start,
   uint256 expiary, uint256 weight, uint256 decimal, string media);

  modifier restricted(){
    require(manager == msg.sender);
    _;
  }
  modifier backerOnly() {
    require(backers[msg.sender], "Only backers of this project can make approve decision");
    _;
  }

  constructor (uint256 _goalFundAmount, uint _minimumContribution) public {
    totalMiles = 0;
    goalFundAmount = _goalFundAmount;
    minimumContribution = _minimumContribution;
    manager = msg.sender;
    goalFundReached = false;
    investOpen = true;
    backers[msg.sender] = true;
    decisionMajority = 100;
  }
  
  /// invest
  /// @dev InvestReceipt: event emitted when a backer invests on this project
  /// @dev FundGoalSuccess: event emitted when the total fund has been reached
  function invest () external payable{
    require(investOpen, "Investment for the project is closed");
    require(msg.value >= minimumContribution, "Error minimum contribution is not satisfied");
    backers[msg.sender] = true;
    numberOfBackers++;
 
    emit InvestReceipt(msg.sender, msg.value);

    if (address(this).balance >= goalFundAmount && goalFundReached == false){
      goalFundReached = true;
      emit FundGoalSuccess(manager, goalFundAmount, address(this).balance , goalFundReached);
    }
  }
  
  
  //closeInvest
  //@emit InvestClose: event emitted when the funding is closed by the project director (manager)
  function closeInvest() external restricted {
    investOpen = false;
    emit InvestClose(manager, goalFundAmount, address(this).balance);
  }

  /// createMile
  /// creates a mile step of the project (campaign)
  /// @param _dependingMile the mile number that the new current mile is depending 
  /// @param _description description for the mile
  /// @param _value request amount of the fund from total funding 
  /// @param _recipient address of person that would be given the requsted _value 
  /// @param _participants list of address that working on this mile
  /// @dev NewMileAdded event emitted whena a new mile is added 
  function createMile (uint256[] memory _dependingMile, string memory _description, 
  uint256 _value, address payable _recipient, address[] memory _participants ) public restricted {
    
    require(!investOpen, "The funding process should be done first");
    require(_value <= goalFundAmount, "Invalid request amount passed");
    require(backers[msg.sender], "Can not find the manager address");

    totalMiles++;
    require(mileMap[totalMiles].mileNumber == 0, "This mile number(ID) already exists");

    Miles memory newMile = Miles({
      mileNumber : totalMiles,
      dependingMile: _dependingMile,
      description: _description,
      value: _value,
      recipient: _recipient,
      complete: false, 
      approvalCount: 0,
      participants: _participants
    });
    
  mileMap[totalMiles] = newMile;
  emit NewMileAdded(newMile.mileNumber, _dependingMile , _description, _value, _recipient, _participants);
  }

  /// approve
  /// - backers would approve on the mile step of the project if the mile
  /// step satisfies the backer's interest
  /// - once approvals' majority is over the decisionMajority, the fund 
  /// automatically is sent to the recipient. 
  /// @param mileNumber the mile number that the backer (request sender) wants to the requested fund to be sent 
  /// @dev ApproveMile event emitted when a backer sends approve request on finished mile 
  /// @dev MileRequestAmountTransfered event emitted when the approve condition to lock off the fund is satisfied to be sent to the recipient 
  function approve (uint256 mileNumber) external backerOnly{
    Miles storage aMile = mileMap[mileNumber];
    require(!aMile.complete, "This mile has already been completed");
    require(!aMile.approvals[msg.sender], "The sender has already approved");
    aMile.approvals[msg.sender] = true; 
    aMile.approvalCount ++;
    emit ApproveMile(aMile.mileNumber, msg.sender);

    if ((aMile.approvalCount/ numberOfBackers)*100 >= decisionMajority){
      aMile.recipient.transfer(aMile.value);
      aMile.complete = true; 
      emit MileRequestAmountTransfered(aMile.mileNumber, aMile.recipient, aMile.value);
    }
  }

  /// mintResidual
  /// generate residual for backers, investors, and other customers 
  /// @param _holderID the owner of the residual
  /// @param _holderType the type of the holder can be backer (investor), actors, any other merchants
  /// @param _rewardType type of the reward; what the holder was given
  /// @param _start the effective starting date of the residual
  /// @param _expiary the ending date of the effectiveness of the residual
  /// @param _weight the weight of the profit amount
  /// @param _decimal the decimal unit of the weight
  /// @dev NewResidual event emitted when a new residual is assigned to a holder
  function mintResidual(address _holderID, string memory _holderType, 
  uint256 _rewardType, uint256 _start, uint256 _expiary, uint256 _weight, uint256 _decimal,
  string memory _media) public {

    require(uint(RewardType.PROFIT) >= _rewardType, "undefined reward type");

    uint256 id = numOfResiduals;
    Residual memory residual = Residual({
      residualID: id,
      residualType: RewardType(_rewardType),
      holderID: _holderID,
      holderType: _holderType,
      start: _start, 
      expiary: _expiary,
      weight: _weight,
      decimal: _decimal,
      media: _media
    });

    residualMapping[id] = residual;
    balance[_holderID].push(id);
    numOfResiduals ++;
    emit NewResidual(id, _rewardType, _holderID, _holderType, _start, _expiary, _weight, _decimal, _media);
  }

  /// balanceOf
  /// returns the residual types that a holder has 
  function balanceOf() public view returns(uint256[] memory) {
    return balance[msg.sender];
  } 

  //getResidual 
  // - returns a residual details that _id indicates 
  ///@param _id the id (number) of the residual
  ///@return residualID the id of the residual 
  ///@return residualType the type of the residual
  ///@return holderID the address id of the holder
  ///@return holderType the type of the holder backer, investor, merchant, actors ... 
  ///@return start start date 
  ///@return expiary date when the residual expiary (0 -> permanant)
  ///@return weight the weight of the profit
  ///@return decimal the unit of the weight
  ///@return media the media type 
  function getResidual(uint256 _id) public view returns 
  (uint256 residualID, uint256 residualType, address holderID, string memory holderType,
  uint256 start, uint256 expiary, uint256 weight, uint256 decimal, string memory media){

    Residual memory residual = residualMapping[_id];

    residualID = residual.residualID;
    residualType = uint256(residual.residualType);
    holderID = residual.holderID;
    holderType = residual.holderType;
    start = residual.start;
    expiary = residual.expiary;
    weight = residual.weight;
    decimal = residual.decimal; 
    media = residual.media;
  }
}