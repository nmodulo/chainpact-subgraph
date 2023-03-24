import {
    BigInt,
    Bytes, ethereum
} from "@graphprotocol/graph-ts";
import {
    GigPact,
    LogPactAction as LogPactActionEvent,
    LogPactCreated as LogPactCreatedEvent,
    LogPaymentMade as LogPaymentMadeEvent,
    LogStateUpdate as LogStateUpdateEvent
} from "../generated/gigpact/GigPact";
import {
    DisputeData,
    GigPactEntity, LogPaymentMade, PayData, TransactionEntity
} from "../generated/schema";
import { PactState, PactType, TransactionType } from "./types";

export function addTransaction(
    event: ethereum.Event,
    pactType: number,
    pactId: Bytes,
    action: TransactionType
): void {
    let transactionEntity = new TransactionEntity(
        event.transaction.hash.concat(pactId)
    );
    transactionEntity.action = action;
    transactionEntity.pactType = pactType as i32;
    transactionEntity.pactId = pactId;
    transactionEntity.gasLimit = event.transaction.gasLimit.toString();
    transactionEntity.gasPrice = event.transaction.gasPrice.toString();
    transactionEntity.blockTimestamp = event.block.timestamp;
    transactionEntity.transactionHash = event.transaction.hash
    transactionEntity.save();
}

export function handleLogPactCreated(event: LogPactCreatedEvent): void {
    let entity = new GigPactEntity(event.params.pactid);

    let disputeDataEntity = new DisputeData(event.params.pactid);
    let payData = new PayData(event.params.pactid);
    // let transactionEntity = new TransactionEntity(event.transaction.hash.concat(event.params.pactid))

    let contract = GigPact.bind(event.address);
    let pactData = contract.pactData(event.params.pactid);
    let payDataFromChain = contract.payData(event.params.pactid);
    let arbitrators = contract.getArbitratrators(event.params.pactid);
    let documentHash = contract.externalDocumentHash(event.params.pactid);

    disputeDataEntity.proposedAmount = payDataFromChain
        .getProposedAmount()
        .toString();
    disputeDataEntity.arbitratorProposer = pactData.getArbitratorProposer();
    disputeDataEntity.arbitratorProposedFlag = pactData.getArbitratorProposedFlag();
    disputeDataEntity.arbitratorAccepted = pactData.getArbitratorAccepted();
    let proposedArbitrators: Bytes[] = [];
    for (let i = 0; i < arbitrators.length; i++) {
        proposedArbitrators.push(changetype<Bytes>(arbitrators[i]));
    }
    disputeDataEntity.proposedArbitrators = proposedArbitrators;

    payData.pauseDuration = payDataFromChain.getPauseDuration();
    payData.pauseResumeTime = payDataFromChain.getPauseResumeTime();
    payData.lastPayTimeStamp = payDataFromChain.getLastPayTimeStamp();
    payData.lastPayAmount = payDataFromChain.getLastPayAmount().toString();
    payData.proposedAmount = payDataFromChain.getProposedAmount().toString();

    entity.creator = event.params.creator;
    entity.created = event.block.timestamp;
    entity.employer = pactData.getEmployer();
    entity.employee = pactData.getEmployee();
    entity.payAmount = pactData.getPayAmount().toString();
    entity.erc20TokenAddress = pactData.getErc20TokenAddress();
    entity.pactPayScheduleDays = pactData.getPayScheduleDays();
    entity.pactName = pactData.getPactName().toString();
    entity.employeeSignedDate = pactData.getEmployeeSignDate();
    entity.employerSignedDate = BigInt.fromI32(0);
    entity.pactId = event.params.pactid;
    entity.disputeData = disputeDataEntity.id;
    entity.payData = payData.id;
    entity.stakeAmount = pactData.getStakeAmount().toString();
    entity.pactState = pactData.getPactState();
    entity.documentHash = documentHash;
    entity.inputData = event.transaction.input;
    entity.employeeDelegates = []
    entity.employerDelegates = []
    entity.blockNumber = event.block.number;
    entity.blockTimestamp = event.block.timestamp;
    entity.transactionHash = event.transaction.hash;

    addTransaction(
        event,
        PactType.GIGPACT,
        event.params.pactid,
        TransactionType.CREATE_GP
    );

    disputeDataEntity.save();
    payData.save();
    // transactionEntity.save()
    entity.save();
}

export function handleLogPaymentMade(event: LogPaymentMadeEvent): void {
    let gigPactEntity = new LogPaymentMade(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    );
    gigPactEntity.payer = event.params.payer;
    gigPactEntity.pactId = event.params.pactid;
    gigPactEntity.value = event.params.value;
    gigPactEntity.blockNumber = event.block.number;
    gigPactEntity.blockTimestamp = event.block.timestamp;
    gigPactEntity.transactionHash = event.transaction.hash;
    addTransaction(
        event,
        PactType.GIGPACT,
        event.params.pactid,
        TransactionType.PAY
    );
    gigPactEntity.save();
}

export function handleLogStateUpdate(event: LogStateUpdateEvent): void {
    let gigPactEntity = GigPactEntity.load(event.params.pactid);
    let payDataEntity = PayData.load(event.params.pactid);
    let contract = GigPact.bind(event.address);
    let pactData = contract.pactData(event.params.pactid);
    let payDataFromChain = contract.payData(event.params.pactid);
    if (!gigPactEntity || !payDataEntity) return;

    payDataEntity.pauseDuration = payDataFromChain.getPauseDuration();
    payDataEntity.pauseResumeTime = payDataFromChain.getPauseResumeTime();
    payDataEntity.lastPayTimeStamp = payDataFromChain.getLastPayTimeStamp();
    payDataEntity.lastPayAmount = payDataFromChain.getLastPayAmount().toString();
    payDataEntity.proposedAmount = payDataFromChain
        .getProposedAmount()
        .toString();

    gigPactEntity.stakeAmount = pactData.getStakeAmount().toString();
    let txType = TransactionType.EMPLOYEE_SIGN;
    if (event.params.newState === PactState.EMPLOYEE_SIGNED) {
        gigPactEntity.employeeSignedDate = event.block.timestamp;
    } else if (event.params.newState === PactState.EMPLOYER_SIGNED) {
        gigPactEntity.employerSignedDate = event.block.timestamp;
        txType = TransactionType.EMPLOYER_SIGN;
    } else if (event.params.newState === PactState.ALL_SIGNED) {
        //Check old state
        if (gigPactEntity.pactState === PactState.EMPLOYER_SIGNED) {
            gigPactEntity.employeeSignedDate = event.block.timestamp;
        } else {
            gigPactEntity.employerSignedDate = event.block.timestamp;
            txType = TransactionType.EMPLOYER_SIGN;
        }
        // entity.employeeSignedDate = event.block.timestamp
    } else if (event.params.newState === PactState.ACTIVE) {
        if (gigPactEntity.pactState === PactState.ALL_SIGNED) {
            gigPactEntity.pactStartedDate = event.block.timestamp;
            txType = TransactionType.START;
        }
        txType = TransactionType.RESUME;
    } else if (event.params.newState === PactState.ARBITRATED) {
        let disputeDataEntity = DisputeData.load(event.params.pactid);
        if (!disputeDataEntity) return
        disputeDataEntity.proposedAmount = payDataFromChain
            .getProposedAmount()
            .toString();
        disputeDataEntity.arbitratorProposer = pactData.getArbitratorProposer();
        disputeDataEntity.arbitratorProposedFlag = pactData.getArbitratorProposedFlag();
        disputeDataEntity.arbitratorAccepted = pactData.getArbitratorAccepted();
    }
    gigPactEntity.pactState = event.params.newState;
    addTransaction(event, PactType.GIGPACT, event.params.pactid, txType);
    payDataEntity.save();
    gigPactEntity.save();
}

export function handleGigPactLogPactAction(event: LogPactActionEvent): void {
    let gigPactEntity = GigPactEntity.load(event.params.pactid);
    let payDataEntity = PayData.load(event.params.pactid);
    let contract = GigPact.bind(event.address);
    let pactData = contract.pactData(event.params.pactid);
    let payDataFromChain = contract.payData(event.params.pactid);

    if (!gigPactEntity || !payDataEntity) return;

    payDataEntity.pauseDuration = payDataFromChain.getPauseDuration();
    payDataEntity.pauseResumeTime = payDataFromChain.getPauseResumeTime();
    payDataEntity.lastPayTimeStamp = payDataFromChain.getLastPayTimeStamp();
    payDataEntity.lastPayAmount = payDataFromChain.getLastPayAmount().toString();
    payDataEntity.proposedAmount = payDataFromChain
        .getProposedAmount()
        .toString();

    gigPactEntity.stakeAmount = pactData.getStakeAmount().toString();
    let txType = TransactionType.DELEGATE;

    const functionSignature = event.transaction.input.toHexString().slice(0, 10);
    const inputDataHexString = event.transaction.input.toHexString().slice(10);

    if (functionSignature === "c4c901f6") {
        //delegatePact
        const hexStringToDecode =
            "0x0000000000000000000000000000000000000000000000000000000000000020" +
            inputDataHexString;
        const dataToDecode = Bytes.fromByteArray(
            Bytes.fromHexString(hexStringToDecode)
        );
        let decoded = ethereum.decode("(bytes32,address[],bool)", dataToDecode);
        if (!decoded) return;

        let decodedTuple = decoded.toTuple();
        let addOrRemove = decodedTuple[2].toBoolean();
        let delegatesGiven = decodedTuple[1].toBytesArray();
        if (addOrRemove) {
            if (
                event.transaction.from.toString().toLowerCase() ===
                gigPactEntity.employee.toString().toLowerCase()
            ) {
                //Sender is employee
                let newDelegateArr = gigPactEntity.employeeDelegates
                for(let i = 0; i<delegatesGiven.length; i++){
                    newDelegateArr.push(delegatesGiven[i])
                }
                gigPactEntity.employeeDelegates = newDelegateArr
            } else if (
                event.transaction.from.toString().toLowerCase() ===
                gigPactEntity.employer.toString().toLowerCase()
            ) {
                let newDelegateArr = gigPactEntity.employerDelegates
                for(let i = 0; i<delegatesGiven.length; i++){
                    newDelegateArr.push(delegatesGiven[i]);
                }
                gigPactEntity.employerDelegates = newDelegateArr
            }
        } 
        
        else {
            if (
                event.transaction.from.toString().toLowerCase() ===
                gigPactEntity.employee.toString().toLowerCase()
            ) {
                let newDelegateArr = gigPactEntity.employeeDelegates
                for(let i = 0; i<delegatesGiven.length; i++){
                    let index = gigPactEntity.employeeDelegates.indexOf(delegatesGiven[i]);
                    if(index >= 0){
                        newDelegateArr[index] = newDelegateArr[newDelegateArr.length - 1]
                        newDelegateArr.pop()
                    }
                }
                gigPactEntity.employeeDelegates = newDelegateArr
            }
         else if (
                event.transaction.from.toString().toLowerCase() ===
                gigPactEntity.employer.toString().toLowerCase()
            ) {
                let newDelegateArr = gigPactEntity.employerDelegates
                for(let i = 0; i<delegatesGiven.length; i++){
                    let index = gigPactEntity.employerDelegates.indexOf(delegatesGiven[i]);
                    if(index >= 0){
                        newDelegateArr[index] = newDelegateArr[newDelegateArr.length - 1]
                        newDelegateArr.pop()
                    }
                }
                gigPactEntity.employerDelegates = newDelegateArr
            }
        }
    } else {
        let disputeDataEntity = DisputeData.load(event.params.pactid);
        if (!disputeDataEntity) return;

        let arbitrators = contract.getArbitratrators(event.params.pactid);
        disputeDataEntity.proposedAmount = payDataFromChain
            .getProposedAmount()
            .toString();
        disputeDataEntity.arbitratorProposer = pactData.getArbitratorProposer();
        disputeDataEntity.arbitratorProposedFlag = pactData.getArbitratorProposedFlag();
        disputeDataEntity.arbitratorAccepted = pactData.getArbitratorAccepted();
        let proposedArbitrators: Bytes[] = [];
        for (let i = 0; i < arbitrators.length; i++) {
            proposedArbitrators.push(changetype<Bytes>(arbitrators[i]));
        }
        disputeDataEntity.proposedArbitrators = proposedArbitrators;

        disputeDataEntity.save();

        //proposeArbitrators
        if (functionSignature === "a7dc8bc0") {
            txType = TransactionType.PROPOSE_ARBITRATORS;
        }

        //acceptOrRejectArbitrators - reject
        else if (functionSignature === "442e5e60") {
            txType = TransactionType.REJECT_ARBITRATORS;
        }

        //arbitratorResolve
        else if (functionSignature === "4844a1f9") {
            txType = TransactionType.RESOLVE;
        }
    }

    addTransaction(event, PactType.GIGPACT, event.params.pactid, txType);
    payDataEntity.save();
    gigPactEntity.save();
}
