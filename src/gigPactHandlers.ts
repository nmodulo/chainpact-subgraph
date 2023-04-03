import {
    BigInt,
    Bytes, ethereum,
    store
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
    GigPactEntity, LogPaymentMade, PayData, GigTransactionEntity, ProposalPactEntity, ProposalTransactionEntity,
} from "../generated/schema";
import { PactState, PactType, TransactionType } from "./types";

export function addGigTx(event: ethereum.Event,
    pactType: number,
    pactId: Bytes,
    action: TransactionType,
): void {
    let transactionEntity = new ProposalTransactionEntity( 
        event.transaction.hash.concat(changetype<Bytes>(event.logIndex))
    );
    transactionEntity.action = action;
    transactionEntity.pactType = pactType as u32;
    transactionEntity.pactId = pactId;
    let receipt = event.receipt
    if (receipt) {
        transactionEntity.gasUsed = receipt.gasUsed.toString()
    } else {
        transactionEntity.gasUsed = "0"
    }

    transactionEntity.gasPrice = event.transaction.gasPrice.toString();
    transactionEntity.blockTimestamp = event.block.timestamp;
    transactionEntity.transactionHash = event.transaction.hash
    transactionEntity.from = event.transaction.from
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
    // let arbitrators = contract.getArbitratrators(event.params.pactid);
    let documentHash = contract.externalDocumentHash(event.params.pactid);

    disputeDataEntity.proposedAmount = payDataFromChain
        .getProposedAmount()
        .toString();
    disputeDataEntity.arbitratorProposer = pactData.getArbitratorProposer();
    disputeDataEntity.arbitratorProposedFlag = pactData.getArbitratorProposedFlag();
    disputeDataEntity.arbitratorAccepted = pactData.getArbitratorAccepted();
    // let proposedArbitrators: Bytes[] = [];
    // for (let i = 0; i < arbitrators.length; i++) {
        // proposedArbitrators.push(changetype<Bytes>(arbitrators[i]));
    // }
    disputeDataEntity.proposedArbitrators = [];
    disputeDataEntity.hasResolved = [];

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
    entity.pactStartedDate = BigInt.fromI32(0);
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

    disputeDataEntity.save();
    payData.save();
    entity.save();
    addGigTx(
        event,
        PactType.GIGPACT,
        event.params.pactid,
        TransactionType.CREATE_GP,
    );
}

export function handleLogPaymentMade(event: LogPaymentMadeEvent): void {
    let paymentEntity = new LogPaymentMade(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    );
    let gigPactEntity = GigPactEntity.load(event.params.pactid)

    paymentEntity.payer = event.params.payer;
    paymentEntity.pactId = event.params.pactid;
    paymentEntity.amount = event.params.value;
    paymentEntity.blockNumber = event.block.number;
    paymentEntity.timestamp = event.block.timestamp;
    paymentEntity.transactionHash = event.transaction.hash;
    if (gigPactEntity !== null) {
        paymentEntity.pact = gigPactEntity.id
    }
    addGigTx(
        event,
        PactType.GIGPACT,
        event.params.pactid,
        TransactionType.PAY
    );
    paymentEntity.save();
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

    let oldState = gigPactEntity.pactState
    gigPactEntity.stakeAmount = pactData.getStakeAmount().toString();
    let txType = TransactionType.EMPLOYEE_SIGN;
    if (event.params.newState === PactState.EMPLOYEE_SIGNED) {
        gigPactEntity.employeeSignedDate = event.block.timestamp;
    } else if (event.params.newState === PactState.EMPLOYER_SIGNED) {
        gigPactEntity.employerSignedDate = event.block.timestamp;
        txType = TransactionType.EMPLOYER_SIGN;
    } else if (event.params.newState === PactState.ALL_SIGNED) {
        //Check old state
        if (oldState === PactState.EMPLOYER_SIGNED) {
            gigPactEntity.employeeSignedDate = event.block.timestamp;
        } else {
            gigPactEntity.employerSignedDate = event.block.timestamp;
            txType = TransactionType.EMPLOYER_SIGN;
        }
        // entity.employeeSignedDate = event.block.timestamp
    } else if (event.params.newState === PactState.ACTIVE) {
        if (oldState === PactState.ALL_SIGNED) {
            gigPactEntity.pactStartedDate = event.block.timestamp;
            txType = TransactionType.START;
        } else {
            txType = TransactionType.RESUME;
        }
    } else if(event.params.newState === PactState.PAUSED) {
        txType = TransactionType.PAUSE
    } else if (event.params.newState === PactState.ARBITRATED) {
        let disputeDataEntity = DisputeData.load(event.params.pactid);
        if (disputeDataEntity) {
            disputeDataEntity.proposedAmount = payDataFromChain
                .getProposedAmount()
                .toString();
            disputeDataEntity.arbitratorProposer = pactData.getArbitratorProposer();
            disputeDataEntity.arbitratorProposedFlag = pactData.getArbitratorProposedFlag();
            disputeDataEntity.arbitratorAccepted = pactData.getArbitratorAccepted();
            let hasResolved: boolean[] = []
            let proposedArbitrators: Bytes[] = []
            let arbitrators = contract.getArbitratrators(event.params.pactid)
            for (let i = 0; i < arbitrators.length; i++) {
                proposedArbitrators.push(changetype<Bytes>(arbitrators[i].addr))
                hasResolved.push(arbitrators[i].hasResolved)
            }
            disputeDataEntity.proposedArbitrators = proposedArbitrators
            disputeDataEntity.hasResolved = hasResolved
            disputeDataEntity.save()
        }

    } else if (event.params.newState === PactState.RESIGNED) {
        txType = TransactionType.RESIGN
    } else if (event.params.newState === PactState.TERMINATED) {
        txType = TransactionType.TERMINATE
    } else if (event.params.newState === PactState.RETRACTED) {
        txType = TransactionType.RETRACT
    } else if (event.params.newState === PactState.FNF_EMPLOYEE) {
        txType = TransactionType.FNF_EMPLOYEE
    } else if (event.params.newState === PactState.FNF_EMPLOYER) {
        txType = TransactionType.FNF_EMPLOYER
    } else if (event.params.newState === PactState.FNF_SETTLED) {
        txType = TransactionType.FNF_SETTLE
    } else if (event.params.newState === PactState.ENDED) {
        txType = TransactionType.RECLAIM_STAKE
    } else {
        gigPactEntity.pactState = event.params.newState;
        payDataEntity.save();
        gigPactEntity.save();
        return
    }
    gigPactEntity.pactState = event.params.newState;
    addGigTx(event, PactType.GIGPACT, event.params.pactid, txType);
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
                for (let i = 0; i < delegatesGiven.length; i++) {
                    newDelegateArr.push(delegatesGiven[i])
                }
                gigPactEntity.employeeDelegates = newDelegateArr
            } else if (
                event.transaction.from.toString().toLowerCase() ===
                gigPactEntity.employer.toString().toLowerCase()
            ) {
                let newDelegateArr = gigPactEntity.employerDelegates
                for (let i = 0; i < delegatesGiven.length; i++) {
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
                for (let i = 0; i < delegatesGiven.length; i++) {
                    let index = gigPactEntity.employeeDelegates.indexOf(delegatesGiven[i]);
                    if (index >= 0) {
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
                for (let i = 0; i < delegatesGiven.length; i++) {
                    let index = gigPactEntity.employerDelegates.indexOf(delegatesGiven[i]);
                    if (index >= 0) {
                        newDelegateArr[index] = newDelegateArr[newDelegateArr.length - 1]
                        newDelegateArr.pop()
                    }
                }
                gigPactEntity.employerDelegates = newDelegateArr
            }
        }
    } else {
        let disputeDataEntity = DisputeData.load(event.params.pactid);

        if (disputeDataEntity) {
            disputeDataEntity.proposedAmount = payDataFromChain
                .getProposedAmount()
                .toString();
            disputeDataEntity.arbitratorProposer = pactData.getArbitratorProposer();
            disputeDataEntity.arbitratorProposedFlag = pactData.getArbitratorProposedFlag();
            disputeDataEntity.arbitratorAccepted = pactData.getArbitratorAccepted();
            let hasResolved: boolean[] = []
            let proposedArbitrators: Bytes[] = []
            let arbitrators = contract.getArbitratrators(event.params.pactid)
            for (let i = 0; i < arbitrators.length; i++) {
                proposedArbitrators.push(changetype<Bytes>(arbitrators[i].addr))
                hasResolved.push(arbitrators[i].hasResolved)
            }
            disputeDataEntity.proposedArbitrators = proposedArbitrators
            disputeDataEntity.hasResolved = hasResolved
            disputeDataEntity.save()
        }

        //proposeArbitrators
        if (functionSignature === "a7dc8bc0") {
            txType = TransactionType.PROPOSE_ARBITRATORS;
            // let existingArbitrators = disputeDataEntity.proposedArbitrators
            // for (let i = 0; i < existingArbitrators.length; i++) {
            //     store.remove("Arbitrator", existingArbitrators[i].toString())
            // }
            // for (let i = 0; i < arbitrators.length; i++) {
            // let arbitratorEntity = new Arbitrator(disputeDataEntity.id.concat(event.transaction.from))
            // arbitratorEntity.addr = arbitrators[i].addr
            // arbitratorEntity.hasResolved = false
            // arbitratorEntity.dispute = disputeDataEntity.id
            // arbitratorEntity.save()
            // }
        }

        //acceptOrRejectArbitrators - reject
        else if (functionSignature === "442e5e60") {
            txType = TransactionType.REJECT_ARBITRATORS;
        }

        //arbitratorResolve
        else if (functionSignature === "4844a1f9") {
            // let arbitratorEntity = Arbitrator.load(disputeDataEntity.id.concat(event.transaction.from))
            // if(arbitratorEntity){
            //     arbitratorEntity.hasResolved = true
            //     arbitratorEntity.save()
            // }
            txType = TransactionType.RESOLVE;
        }
    }

    addGigTx(event, PactType.GIGPACT, event.params.pactid, txType);
    payDataEntity.save();
    gigPactEntity.save();
}
