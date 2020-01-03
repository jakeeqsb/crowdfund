var Project = artifacts.require("./Project.sol");
const {web} = require("../web");

var instance; 
var goalFundAmount = 1000; 
var minimumContribution = 5;
var firstMileRequest = 200;
var manager; 
var user1;
var user2; 
var user3;
var participant1;
var participant2;
var participant3; 
var actor1; 


async function throwHelper (promise) {
  try {
    await promise;
  } catch (error) {
    // TODO: Check jump destination to destinguish between a throw
    //       and an actual invalid jump.
    const invalidJump = error.message.search('invalid JUMP') >= 0;
    // TODO: When we contract A calls contract B, and B throws, instead
    //       of an 'invalid jump', we get an 'out of gas' error. How do
    //       we distinguish this from an actual out of gas event? (The
    //       testrpc log actually show an 'invalid jump' event.)
    const outOfGas = error.message.search('out of gas') >= 0;
    const invalidMinimum = error.message.search("minimum contribution") >= 0;
    const investClose = error.message.search("project is closed") >= 0;
    const alreadyApproved = error.message.search("The sender has") >= 0;
    const mileCompleted = error.message.search('This mile has already been completed') >= 0;
    const invalidReward = error.message.search("undefined reward type") >= 0;

    assert(
      invalidJump || outOfGas || invalidMinimum || investClose || alreadyApproved || mileCompleted || invalidReward,
      "Expected throw, got '" + error + "' instead",
    );
    return;
  }
  assert.fail('Expected throw not received');
};

contract('miles_test', async function(accounts) {

  before(async function (){
    instance = await Project.deployed(goalFundAmount, minimumContribution);
    manager = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];
    user3 = accounts[3];
    participant1 = accounts[4];
    participant2 = accounts[5];
    participant3 = accounts[6];
    actor1 = accounts[7];
  });
  
  it("Contract Init Test", async function (){
    let manager = await instance.manager();
    let goalFund = await instance.goalFundAmount();
    let minimum = await instance.minimumContribution();

    assert(manager === accounts[0], "the manager and first accounts address should be same");
    assert(goalFund.toNumber() === goalFundAmount, "Initial goal fundamount is not matched");
    assert(minimum.toNumber() === minimumContribution, "MinimumContribution has not been satisfied");
  });


  it(`Invested from users and fund goal reached`, async function () {
    let investResult;
    let investLog; 
    let goalFundReached;
    let fundGoalLog; 

    investResult = await instance.invest({from: user1, value: 300});
    investLog = investResult.receipt.logs[0];
    //let fundGoalLog = result.receipt.logs[1];
    assert(investLog.event === "InvestReceipt", "Event name check for invest function");
    assert(investLog.args.backer === user1, `Backer: ${user1}`);
    assert(investLog.args.investAmount.toNumber() === 300, "Invest amount check");
    goalFundReached = await instance.goalFundReached();
    assert(goalFundReached === false, "goal fund has not reached yet");

    investResult = await instance.invest({from: user2, value: 400});
    investLog = investResult.receipt.logs[0];
    //let fundGoalLog = result.receipt.logs[1];
    assert(investLog.event === "InvestReceipt", "Event name check for invest function");
    assert(investLog.args.backer === user2, `Backer: ${user2}`);
    assert(investLog.args.investAmount.toNumber() === 400, "Invest amount check");
    goalFundReached = await instance.goalFundReached();
    assert(goalFundReached === false, "goal fund has not reached yet");

    investResult = await instance.invest({from: user3, value: 300});
    investLog = investResult.receipt.logs[0];
    fundGoalLog = investResult.receipt.logs[1];
    assert(investLog.event === "InvestReceipt", "Event name check for invest function");
    assert(investLog.args.backer === user3, `Backer: ${user3}`);
    assert(investLog.args.investAmount.toNumber() === 300, "Invest amount check");
  
    assert(fundGoalLog.event === "FundGoalSuccess", "Event name check for FundGoalSuccess");
    assert(fundGoalLog.args.manager === manager, "Manager Address check");
    assert(fundGoalLog.args.goalFundAmount.toNumber() === goalFundAmount, "Goal Fund Amount Check");
    assert(fundGoalLog.args.fundedAmount.toNumber() === goalFundAmount, "fundedAmount should be same");
    assert(fundGoalLog.args.goalFundReached, "goalFundReached check should be true");
  });

  it("Closing the funding", async function () {
    let result = await instance.closeInvest({from:manager});
    let closeInvestLog = result.receipt.logs[0];
    assert(closeInvestLog.event === "InvestClose", "Event name should be InvestClose");
    assert(closeInvestLog.args.manager === manager, "Manager address should be same");
    assert(closeInvestLog.args.goalFundAmount.toNumber() === goalFundAmount, "GoalFundedAmount should be same");
    assert(closeInvestLog.args.fundedAmount.toNumber() === goalFundAmount, "FundedAmount should be same");
  });

  it("Another user tries to invest the closed project", async function () {
    throwHelper(instance.invest({from:user2, value: 200}));
  });

  it("The first mile create", async function () {
    let request = firstMileRequest;
    let result = await instance.createMile([0], "Scene#1 is added", request, manager, [participant1, participant2, participant3],{from:manager});
    let log = result.receipt.logs[0];

    assert(log.event === "NewMileAdded", "The event name should be NewMileAdded");
    assert(log.args.mileNumber.toNumber() === 1, "This mile number should be 1");
    assert(log.args.dependingMile.toString() === "0", `dependingMile returned ${log.args.dependingMile}`);
    assert(log.args.description === "Scene#1 is added", "Mile description does not match");
    assert(log.args.value.toNumber() === request, `The reqeusted value for this mile should be ${request}`);
    assert(log.args.recipient === manager, `Returned recipient is not matched ${log.args.recipient}`);
    assert(log.args.participants.indexOf(participant1) >= 0 &&
            log.args.participants.indexOf(participant2) >= 0 &&
            log.args.participants.indexOf(participant3) >= 0, "Participants address should be same");
  });

  it(`Approve test for the first mile from ${user1}`, async function () {
    let mileNumner = 1;
    let approveResult; 
    let approveLog;
    let approveCheck; 
    let mileRequestAmountLog; 
    approveResult = await instance.approve(1,{from: user1});
    approveLog = approveResult.receipt.logs[0];
    assert(approveLog.event === "ApproveMile", `The event name retuend ${approveLog.event}`);
    assert(approveLog.args.mileNumber.toNumber() === 1, `Mile number is not matched`);
    assert(approveLog.args.approver === user1);
    throwHelper(instance.approve(1, {from:user1}));

    approveResult = await instance.approve(1,{from: user2});
    approveLog = approveResult.receipt.logs[0];
    assert(approveLog.event === "ApproveMile", `The event name retuend ${approveLog.event}`);
    assert(approveLog.args.mileNumber.toNumber() === 1, `Mile number is not matched`);
    assert(approveLog.args.approver === user2);
    throwHelper(instance.approve(1, {from:user2}));

    approveResult = await instance.approve(1,{from: user3});
    approveLog = approveResult.receipt.logs[0];    
    assert(approveLog.event === "ApproveMile", `The event name retuend ${approveLog.event}`);
    assert(approveLog.args.mileNumber.toNumber() === 1, `Mile number is not matched`);
    assert(approveLog.args.approver === user3);
    throwHelper(instance.approve(1, {from:user3}));

    mileRequestAmountLog = approveResult.receipt.logs[1];
    assert(mileRequestAmountLog.event === "MileRequestAmountTransfered", `The event name returned ${mileRequestAmountLog.event}`);
    assert(mileRequestAmountLog.args.mileNumber.toNumber() === 1, 
    `Mile number is not matched`);
    assert(mileRequestAmountLog.args.recipient === manager, 
    `recipient is not matched. Returned ${mileRequestAmountLog.args.recipient}`);
    assert(mileRequestAmountLog.args.amount.toNumber() === firstMileRequest, 
    `fund transferred is not matched ${mileRequestAmountLog.args.amount.toNumber()}`);
  });

  it("The second mile create", async function () {
    let request = 150;
    let result = await instance.createMile([0], "Scene#2 is added", request, manager, [participant1, participant2, participant3]);
    let log = result.receipt.logs[0];

    assert(log.event === "NewMileAdded", "The event name should be NewMileAdded");
    assert(log.args.mileNumber.toNumber() === 2, "This mile number should be 2");
    assert(log.args.dependingMile.toString() === "0",`dependingMile returned ${log.args.dependingMile}`);
    assert(log.args.description === "Scene#2 is added", "Mile description does not match");
    assert(log.args.value.toNumber() === request, `The reqeusted value for this mile should be ${request}`);
    assert(log.args.recipient === manager, "Recipient is not matched");
    assert(log.args.participants.indexOf(participant1) >= 0 &&
            log.args.participants.indexOf(participant2) >= 0 &&
            log.args.participants.indexOf(participant3) >= 0, "Participants address should be same");
  });

  it(`Approve test for the second mile from ${user1}`, async function () {
    let mileNumner = 2;
    let approveResult; 
    let approveLog;
    let approveCheck; 
    let mileRequestAmountLog; 
    approveResult = await instance.approve(2,{from: user1});
    approveLog = approveResult.receipt.logs[0];
    assert(approveLog.event === "ApproveMile", `The event name retuend ${approveLog.event}`);
    assert(approveLog.args.mileNumber.toNumber() === 2, `Mile number is not matched`);
    assert(approveLog.args.approver === user1);
    throwHelper(instance.approve(2, {from:user1}));

    approveResult = await instance.approve(2,{from: user2});
    approveLog = approveResult.receipt.logs[0];
    assert(approveLog.event === "ApproveMile", `The event name retuend ${approveLog.event}`);
    assert(approveLog.args.mileNumber.toNumber() === 2, `Mile number is not matched`);
    assert(approveLog.args.approver === user2);
    throwHelper(instance.approve(2, {from:user2}));

    approveResult = await instance.approve(2,{from: user3});
    approveLog = approveResult.receipt.logs[0];    
    assert(approveLog.event === "ApproveMile", `The event name retuend ${approveLog.event}`);
    assert(approveLog.args.mileNumber.toNumber() === 2, `Mile number is not matched`);
    assert(approveLog.args.approver === user3);
    throwHelper(instance.approve(2, {from:user3}));

    mileRequestAmountLog = approveResult.receipt.logs[1];
    assert(mileRequestAmountLog.event === "MileRequestAmountTransfered", `The event name returned ${mileRequestAmountLog.event}`);
    assert(mileRequestAmountLog.args.mileNumber.toNumber() === 2, 
    `Mile number is not matched`);
    assert(mileRequestAmountLog.args.recipient === manager, 
    `recipient is not matched. Returned ${mileRequestAmountLog.args.recipient}`);
    assert(mileRequestAmountLog.args.amount.toNumber() === 150, 
    `fund transferred is not matched ${mileRequestAmountLog.args.amount.toNumber()}`);
  });

  it("The third mile create", async function () {
    let request = 650;
    let result = await instance.createMile([1,2], "Scene#2 is added", request, manager, [participant1, participant2, participant3]);
    let log = result.receipt.logs[0];
  
    assert(log.event === "NewMileAdded", "The event name should be NewMileAdded");
    assert(log.args.mileNumber.toNumber() === 3, "This mile number should be 1");
    assert(log.args.dependingMile.toString() === "1,2",`dependingMile returned ${log.args.dependingMile}`);
    assert(log.args.description === "Scene#2 is added", "Mile description does not match");
    assert(log.args.value.toNumber() === request, `The reqeusted value for this mile should be ${request}`);
    assert(log.args.recipient === manager, "Recipient is not matched");
    assert(log.args.participants.indexOf(participant1) >= 0 &&
            log.args.participants.indexOf(participant2) >= 0 &&
            log.args.participants.indexOf(participant3) >= 0, "Participants address should be same");
  });

  it(`Approve test for the thrid mile`, async function () {
    let mileNumner = 3;
    let approveResult; 
    let approveLog;
    let approveCheck; 
    let mileRequestAmountLog; 
    approveResult = await instance.approve(3,{from: user1});
    approveLog = approveResult.receipt.logs[0];
    assert(approveLog.event === "ApproveMile", `The event name retuend ${approveLog.event}`);
    assert(approveLog.args.mileNumber.toNumber() === 3, `Mile number is not matched`);
    assert(approveLog.args.approver === user1);
    throwHelper(instance.approve(3, {from:user1}));

    approveResult = await instance.approve(3,{from: user2});
    approveLog = approveResult.receipt.logs[0];
    assert(approveLog.event === "ApproveMile", `The event name retuend ${approveLog.event}`);
    assert(approveLog.args.mileNumber.toNumber() === 3, `Mile number is not matched`);
    assert(approveLog.args.approver === user2);
    throwHelper(instance.approve(3, {from:user2}));

    approveResult = await instance.approve(3,{from: user3});
    approveLog = approveResult.receipt.logs[0];    
    assert(approveLog.event === "ApproveMile", `The event name retuend ${approveLog.event}`);
    assert(approveLog.args.mileNumber.toNumber() === 3, `Mile number is not matched`);
    assert(approveLog.args.approver === user3);
    throwHelper(instance.approve(3, {from:user3}));

    mileRequestAmountLog = approveResult.receipt.logs[1];
    assert(mileRequestAmountLog.event === "MileRequestAmountTransfered", `The event name returned ${mileRequestAmountLog.event}`);
    assert(mileRequestAmountLog.args.mileNumber.toNumber() === 3, 
    `Mile number is not matched`);
    assert(mileRequestAmountLog.args.recipient === manager, 
    `recipient is not matched. Returned ${mileRequestAmountLog.args.recipient}`);
    assert(mileRequestAmountLog.args.amount.toNumber() === 650, 
    `fund transferred is not matched ${mileRequestAmountLog.args.amount.toNumber()}`);
  });
  
  it(`Loyalty mint test for user1`, async function (){
    let mintResidualResult;
    let mintResidualLog;

    let start = new Date(2019,6,12).getTime();
    let end = new Date(2020,11,12).getTime();

    throwHelper(instance.mintResidual(user1, "backer", 10, start, end,0,0,""));
    mintResidualResult = await instance.mintResidual(user1, "backer", 1, start, end, 0,0,"");
    mintResidualLog = mintResidualResult.receipt.logs[0]; 
    assert(mintResidualLog.event === "NewResidual", `Mismatch event name is ${mintResidualLog.event}`);
    assert(mintResidualLog.args.residualID.toNumber() === 0, `Mismatch residualID ${mintResidualLog.args.residualID}`);
    assert(mintResidualLog.args.residualType.toNumber() === 1, `Mismatch residual Type ${mintResidualLog.args.residualType.toNumber()}`);
    assert(mintResidualLog.args.holderID === user1, `Mismatch holderID ${mintResidualLog.args.holderID}`);
    assert(mintResidualLog.args.holderType === 'backer', `Mismatch holderType ${mintResidualLog.args.holderType }`);
    assert(mintResidualLog.args.start.toNumber() === start, `Mismatch start ${mintResidualLog.args.start.toNumber()}`);
    assert(mintResidualLog.args.expiary.toNumber() === end, `Mismatch end ${mintResidualLog.args.expiary.toNumber()}`);
  });

  it(`Loyalty mint test for user1 by balanceOf`, async function(){
    let balanceOfResult; 
    let getResidualResult; 
    let start = new Date(2019,6,12).getTime();
    let end = new Date(2020,11,12).getTime();

    balanceOfResult = await instance.balanceOf({from:user1});
    getResidualResult = await instance.getResidual(balanceOfResult);

    assert(getResidualResult.residualID.toNumber() === 0, `Mismatch residualID ${getResidualResult.residualID}`);
    assert(getResidualResult.residualType.toNumber() === 1, `Mismatch residual Type ${getResidualResult.residualType.toNumber()}`);
    assert(getResidualResult.holderID === user1, `Mismatch holderID ${getResidualResult.holderID}`);
    assert(getResidualResult.holderType === 'backer', `Mismatch holderType ${getResidualResult.holderType }`);
    assert(getResidualResult.start.toNumber() === start, `Mismatch start ${getResidualResult.start.toNumber()}`);
    assert(getResidualResult.expiary.toNumber() === end, `Mismatch end ${getResidualResult.expiary.toNumber()}`);
  });


  it(`Loyalty mint test for actor1`, async function (){
    let mintResidualResult;
    let mintResidualLog;

    let start = new Date(2019,6,12).getTime();
    let end = new Date(2020,11,12).getTime();

    throwHelper(instance.mintResidual(actor1, "actor", 20, start, end,0,0,""));
    mintResidualResult = await instance.mintResidual(actor1, "actor", 0, start, end,0,0,"");
    mintResidualLog = mintResidualResult.receipt.logs[0]; 
    assert(mintResidualLog.event === "NewResidual", `Mismatch event name is ${mintResidualLog.event}`);
    assert(mintResidualLog.args.residualID.toNumber() === 1, `Mismatch residualID ${mintResidualLog.args.residualID}`);
    assert(mintResidualLog.args.residualType.toNumber() === 0, `Mismatch residual Type ${mintResidualLog.args.residualType.toNumber()}`);
    assert(mintResidualLog.args.holderID === actor1, `Mismatch holderID ${mintResidualLog.args.holderID}`);
    assert(mintResidualLog.args.holderType === 'actor', `Mismatch holderType ${mintResidualLog.args.holderType }`);
    assert(mintResidualLog.args.start.toNumber() === start, `Mismatch start ${mintResidualLog.args.start.toNumber()}`);
    assert(mintResidualLog.args.expiary.toNumber() === end, `Mismatch end ${mintResidualLog.args.expiary.toNumber()}`);
  });

  it(`Loyalty mint test for actor1 by balanceOf`, async function(){
    let balanceOfResult; 
    let getResidualResult; 
    let start = new Date(2019,6,12).getTime();
    let end = new Date(2020,11,12).getTime();

    balanceOfResult = await instance.balanceOf({from:actor1});
    getResidualResult = await instance.getResidual(balanceOfResult);

    assert(getResidualResult.residualID.toNumber() === 1, `Mismatch residualID ${getResidualResult.residualID}`);
    assert(getResidualResult.residualType.toNumber() === 0, `Mismatch residual Type ${getResidualResult.residualType.toNumber()}`);
    assert(getResidualResult.holderID === actor1, `Mismatch holderID ${getResidualResult.holderID}`);
    assert(getResidualResult.holderType === 'actor', `Mismatch holderType ${getResidualResult.holderType }`);
    assert(getResidualResult.start.toNumber() === start, `Mismatch start ${getResidualResult.start.toNumber()}`);
    assert(getResidualResult.expiary.toNumber() === end, `Mismatch end ${getResidualResult.expiary.toNumber()}`);
  });

  it(`Loyalty mint test for actor1 with OnlineStreaming`, async function (){
    let mintResidualResult;
    let mintResidualLog;

    let start = new Date(2019,6,12).getTime();
    let end = new Date(2020,11,12).getTime();

    throwHelper(instance.mintResidual(actor1, "actor", 20, start, end,0,0,""));
    mintResidualResult = await instance.mintResidual(actor1, "actor", 2, start, end, 456, 10, "Online Streaming");
    mintResidualLog = mintResidualResult.receipt.logs[0]; 
    assert(mintResidualLog.event === "NewResidual", `Mismatch event name is ${mintResidualLog.event}`);
    assert(mintResidualLog.args.residualID.toNumber() === 2, `Mismatch residualID ${mintResidualLog.args.residualID}`);
    assert(mintResidualLog.args.residualType.toNumber() === 2, `Mismatch residual Type ${mintResidualLog.args.residualType.toNumber()}`);
    assert(mintResidualLog.args.holderID === actor1, `Mismatch holderID ${mintResidualLog.args.holderID}`);
    assert(mintResidualLog.args.holderType === 'actor', `Mismatch holderType ${mintResidualLog.args.holderType }`);
    assert(mintResidualLog.args.start.toNumber() === start, `Mismatch start ${mintResidualLog.args.start.toNumber()}`);
    assert(mintResidualLog.args.expiary.toNumber() === end, `Mismatch end ${mintResidualLog.args.expiary.toNumber()}`);
    assert(mintResidualLog.args.weight.toNumber() === 456, `Mismatch end ${mintResidualLog.args.weight.toNumber()}`);
    assert(mintResidualLog.args.decimal.toNumber() === 10, `Mismatch end ${mintResidualLog.args.decimal.toNumber()}`);
    assert(mintResidualLog.args.media === "Online Streaming", `Mismatch end ${mintResidualLog.args.media}`);

  });

});
