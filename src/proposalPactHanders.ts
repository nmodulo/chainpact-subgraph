import { ProposalPact, LogPactCreated as LogProposalPactCreatedEvent, LogvotingConcluded as LogvotingConcludedEvent, LogContribution as LogContributionEvent, LogAmountOut as LogAmountOutEvent, LogPactAction as ProposalPactActionEvent } from "../generated/proposalpact/ProposalPact"
import {
    DisputeData, GigPactEntity,
    // TransactionEntity,
    LogPaymentMade, ProposalPactEntity, PayData, UserInteractionData, VotingInfo
} from "../generated/schema"
import { Address, BigInt, Bytes, Entity, ethereum, log } from '@graphprotocol/graph-ts'
import { PactState, PactType, TransactionType } from "./types"
import { addTransaction } from "./gigPactHandlers"

export function handleLogProposalPactCreated(event: LogProposalPactCreatedEvent): void {
    let entity = new ProposalPactEntity(
        event.params.uid
    )
    let contract = ProposalPact.bind(event.address)
    let pactInfoFromChain = contract.pacts(event.params.uid)
    let participantsInfoFromChain = contract.getParticipants(event.params.uid)

    entity.creator = event.params.creator
    entity.uid = event.params.uid
    entity.isEditable = pactInfoFromChain.getIsEditable()
    entity.pactText = pactInfoFromChain.getPactText()
    entity.refundAvailable = pactInfoFromChain.getRefundAvailable()
    entity.totalValue = pactInfoFromChain.getTotalValue().toString()
    entity.yesVotes = pactInfoFromChain.getYesVotes()
    entity.noVotes = pactInfoFromChain.getNoVotes()
    entity.votingInfo = loadVotingInfo(event).id
    entity.voters = participantsInfoFromChain.getValue0().map<Bytes>((each: Bytes) => each)
    entity.yesBeneficiaries = participantsInfoFromChain.getValue1().map<Bytes>((each: Bytes) => each)
    entity.noBeneficiaries = participantsInfoFromChain.getValue2().map<Bytes>((each: Bytes) => each)

    const voters = participantsInfoFromChain.getValue0()
    let userInteractionDatas: Bytes[] = []

    for (let index = 0; index < voters.length; index++) {
        userInteractionDatas.push(
            loadUserInteractionData(event.address, event.params.uid, voters[index]).id
        )
    }

    entity.userInteractionData = userInteractionDatas

    log.info("hey there 🚀 {}", ["pact data test!!!"])


    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    addTransaction(
        event,
        PactType.PROPOSALPACT,
        event.params.uid,
        TransactionType.CREATE_PROPOSAL_PACT
    );


    entity.save()
}

export function loadVotingInfo(event: LogProposalPactCreatedEvent): VotingInfo {
    let votingInfoEntity = new VotingInfo(event.params.uid)
    let contract = ProposalPact.bind(event.address)
    let votingInfoFromChain = contract.votingInfo(event.params.uid)

    votingInfoEntity.votingEnabled = votingInfoFromChain.getVotingEnabled()
    votingInfoEntity.openParticipation = votingInfoFromChain.getOpenParticipation()
    votingInfoEntity.refundOnVotedYes = votingInfoFromChain.getRefundOnVotedYes()
    votingInfoEntity.refundOnVotedNo = votingInfoFromChain.getRefundOnVotedNo()
    votingInfoEntity.votingConcluded = votingInfoFromChain.getVotingConcluded()
    votingInfoEntity.duration = votingInfoFromChain.getDuration().toI32()
    votingInfoEntity.votingStartTimestamp = votingInfoFromChain.getVotingStartTimestamp()
    votingInfoEntity.minContribution = votingInfoFromChain.getMinContribution().toString()

    votingInfoEntity.save()

    return votingInfoEntity
}

export function loadUserInteractionData(contractAddr: Address, pactId: Bytes, voter: Address): UserInteractionData {
    let entity = new UserInteractionData(pactId.concat(voter))
    let contract = ProposalPact.bind(contractAddr)
    let userInteractionData = contract.userInteractionData(pactId, voter)

    entity.canVote = userInteractionData.getCanVote()
    entity.hasVoted = userInteractionData.getHasVoted()
    entity.castedVote = userInteractionData.getCastedVote()
    entity.contribution = userInteractionData.getContribution().toString()

    entity.save()

    return entity
}

export function handleLogVotingConcluded(event: LogvotingConcludedEvent): void {
    let votingInfoEntity = VotingInfo.load(event.params.uid)
    let entity = ProposalPactEntity.load(event.params.uid)

    if (!votingInfoEntity || !entity) return
    votingInfoEntity.votingConcluded = true
    votingInfoEntity.save()
    entity.votingInfo = votingInfoEntity.id

    entity.save()

    addTransaction(
        event,
        PactType.PROPOSALPACT,
        event.params.uid,
        TransactionType.CONCLUDE_PP_VOTE
    );
}

export function handleLogContribution(event: LogContributionEvent): void {
    let proposalPactEntity = ProposalPactEntity.load(event.params.uid)
    if (!proposalPactEntity) return

    let userInteractionDataEntity = UserInteractionData.load(event.params.uid.concat(event.params.payer))
    let contract = ProposalPact.bind(event.address)
    let userInteractionData = contract.userInteractionData(event.params.uid, event.params.payer)

    if (!userInteractionDataEntity) {
        userInteractionDataEntity = new UserInteractionData(event.params.uid.concat(event.params.payer))
    }

    userInteractionDataEntity.canVote = userInteractionData.getCanVote()
    userInteractionDataEntity.hasVoted = userInteractionData.getHasVoted()
    userInteractionDataEntity.castedVote = userInteractionData.getCastedVote()
    userInteractionDataEntity.contribution = userInteractionData.getContribution().toString()

    proposalPactEntity.totalValue = contract.pacts(event.params.uid).getTotalValue().toString()

    userInteractionDataEntity.save()
    proposalPactEntity.save()

    addTransaction(
        event,
        PactType.PROPOSALPACT,
        event.params.uid,
        TransactionType.PP_PITCH_IN
    );
}

export function handleLogAmountOut(event: LogAmountOutEvent): void {
    let proposalPactEntity = ProposalPactEntity.load(event.params.uid)
    if (!proposalPactEntity) return

    let userInteractionDataEntity = UserInteractionData.load(event.params.uid.concat(event.params.payee))
    let contract = ProposalPact.bind(event.address)
    let userInteractionData = contract.userInteractionData(event.params.uid, event.params.payee)

    if (!userInteractionDataEntity) {
        userInteractionDataEntity = new UserInteractionData(event.params.uid.concat(event.params.payee))
    }

    userInteractionDataEntity.canVote = userInteractionData.getCanVote()
    userInteractionDataEntity.hasVoted = userInteractionData.getHasVoted()
    userInteractionDataEntity.castedVote = userInteractionData.getCastedVote()
    userInteractionDataEntity.contribution = userInteractionData.getContribution().toString()

    proposalPactEntity.totalValue = contract.pacts(event.params.uid).getTotalValue().toString()

    userInteractionDataEntity.save()
    proposalPactEntity.save()

    addTransaction(
        event,
        PactType.PROPOSALPACT,
        event.params.uid,
        TransactionType.PP_AMOUNT_OUT
    );
}

export function handleProposalPactLogPactAction(event: ProposalPactActionEvent): void {
    let proposalPactEntity = ProposalPactEntity.load(event.params.uid)
    let contract = ProposalPact.bind(event.address)
    let UserInteractionDataEntity = UserInteractionData.load(event.params.uid.concat(event.transaction.from))
    let pactInfoFromChain = contract.pacts(event.params.uid)
    let votingInfoFromChain = contract.votingInfo(event.params.uid)

    if (!proposalPactEntity) return
    let votingInfoEntity = VotingInfo.load(proposalPactEntity.votingInfo)
    if (!votingInfoEntity) return

    const functionSignature = event.transaction.input.toHexString().slice(0, 10);
    const inputDataHexString = event.transaction.input.toHexString().slice(10);

    // log.info("🚀🚀 The transaction.input value 0x028669f9 {}", [functionSignature])
    let txType = TransactionType.POSTPONE_PP_VOTING
    if (functionSignature === "0x1774931e") {
        // postpone voting window
        votingInfoEntity.votingStartTimestamp = votingInfoFromChain.getVotingStartTimestamp()
        votingInfoEntity.save()
        proposalPactEntity.votingInfo = votingInfoEntity.id
    } else if (functionSignature == "0x0fee5347") {
        // voting action
        txType = TransactionType.CAST_PP_VOTE
        if (inputDataHexString.substr(-1) == "1") {
            proposalPactEntity.yesVotes = proposalPactEntity.yesVotes.plus(BigInt.fromI32(1))
        } else {
            proposalPactEntity.noVotes = proposalPactEntity.noVotes.plus(BigInt.fromI32(1))
        }
    } else if (functionSignature == "0x028669f9") {
        // conclude voting
        txType = TransactionType.CONCLUDE_PP_VOTE
        votingInfoEntity.votingConcluded = true
        votingInfoEntity.save()
        proposalPactEntity.votingInfo = votingInfoEntity.id
    } else if (functionSignature == "0xff8594fc") {
        // set text
        txType = TransactionType.EDIT_PP_TEXT
        const hexStringToDecode = '0x0000000000000000000000000000000000000000000000000000000000000020' + inputDataHexString;
        const dataToDecode = Bytes.fromByteArray(Bytes.fromHexString(hexStringToDecode));
        let decoded = ethereum.decode('(bytes32,string)', dataToDecode);
        if (!decoded) return

        proposalPactEntity.pactText = decoded.toTuple()[1].toString()
    }

    proposalPactEntity.save()
    addTransaction(
        event,
        PactType.PROPOSALPACT,
        event.params.uid,
        txType
    );
}

export function handleContribution(event: LogContributionEvent): void {
    const entity = ProposalPactEntity.load(event.params.uid);
    let contract = ProposalPact.bind(event.address)
    let pactInfoFromChain = contract.pacts(event.params.uid)

    if (!entity) return
    entity.totalValue = pactInfoFromChain.getTotalValue().toString()
    
    entity.save()
}
