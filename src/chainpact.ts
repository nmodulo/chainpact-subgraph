import {
  CreatePactCall,
  GigPact,
  LogPactCreated as LogPactCreatedEvent,
  LogPaymentMade as LogPaymentMadeEvent,
  LogStateUpdate as LogStateUpdateEvent,
  SignPactCall
} from "../generated/gigpact/GigPact"
import { ProposalPact, logPactCreated as LogProposalPactCreatedEvent, logvotingConcluded as LogvotingConcludedEvent, logContribution as LogContributionEvent, logAmountOut as LogAmountOutEvent, SetTextCall } from "../generated/proposalpact/ProposalPact"
import { DisputeData, GigPactEntity, TransactionEntity, LogPaymentMade, LogProposalPactCreated, PayData, UserInteractionData, VotingInfo } from "../generated/schema"
import { Address, Bytes, Entity, log } from '@graphprotocol/graph-ts'


export function handleLogPactCreated(event: LogPactCreatedEvent): void {
  let entity = new GigPactEntity(
    event.params.pactid
  )
  let disputeDataEntity = new DisputeData(event.params.pactid)
  let payData = new PayData(event.params.pactid)
  let transactionEntity = new TransactionEntity(event.transaction.hash.concat(event.params.creator))
  let contract = GigPact.bind(event.address)
  let pactData = contract.pactData(event.params.pactid)
  let payDataFromChain = contract.payData(event.params.pactid)
  let arbitrators = contract.getArbitratrators(event.params.pactid)
  let documentHash = contract.externalDocumentHash(event.params.pactid)

  disputeDataEntity.proposedAmount = payDataFromChain.getProposedAmount().toString()
  disputeDataEntity.arbitratorProposer = pactData.getArbitratorProposer()
  disputeDataEntity.arbitratorProposed = pactData.getArbitratorProposed()
  disputeDataEntity.arbitratorAccepted = pactData.getArbitratorAccepted()
  let proposedArbitrators:Bytes[] = []
  for (let i=0; i < arbitrators.length; i++) {
    proposedArbitrators.push(changetype<Bytes>(arbitrators[i]))
  }
  disputeDataEntity.proposedArbitrators = proposedArbitrators

  payData.pauseDuration = payDataFromChain.getPauseDuration()
  payData.pauseResumeTime = payDataFromChain.getPauseResumeTime()
  payData.lastPayTimeStamp = payDataFromChain.getLastPayTimeStamp()
  payData.lastPayAmount = payDataFromChain.getLastPayAmount().toString()
  payData.proposedAmount = payDataFromChain.getProposedAmount().toString()

  transactionEntity.action = 0
  transactionEntity.pactType = 0
  transactionEntity.pactId = event.params.pactid
  transactionEntity.gasFees = event.transaction.gasPrice.toString()
  transactionEntity.transactionHash = event.transaction.hash
  transactionEntity.blockTimestamp = event.block.timestamp

  entity.creator = event.params.creator
  entity.employer = pactData.getEmployer()
  entity.employee = pactData.getEmployee()
  entity.payAmount = pactData.getPayAmount().toString()
  entity.erc20TokenAddress = pactData.getErc20TokenAddress()
  entity.pactPayScheduleDays = pactData.getPayScheduleDays()
  entity.pactName = pactData.getPactName().toString()
  entity.employeeSignedDate = pactData.getEmployeeSignDate()
  entity.pactId = event.params.pactid
  entity.disputeData = disputeDataEntity.id
  entity.payData = payData.id
  entity.stakeAmount = pactData.getStakeAmount().toString()
  entity.pactState = pactData.getPactState()
  entity.documentHash = documentHash

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  disputeDataEntity.save()
  payData.save()
  transactionEntity.save()
  entity.save()
}

export function handleLogPaymentMade(event: LogPaymentMadeEvent): void {
  let entity = new LogPaymentMade(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.payer = event.params.payer
  entity.pactId = event.params.pactid
  entity.value = event.params.value

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleLogStateUpdate(event: LogStateUpdateEvent): void {
  let entity = GigPactEntity.load( event.params.pactid )
  if (!entity) return

  entity.pactState = event.params.newState

  if (event.params.newState === 1) {
    let transactionEntity = new TransactionEntity(event.transaction.hash.concat(event.params.pactid))

    transactionEntity.action = 3
    transactionEntity.blockTimestamp = event.block.timestamp
    transactionEntity.gasFees = event.transaction.gasPrice.toString()
    transactionEntity.pactId = event.params.pactid
    transactionEntity.pactType = 0
    transactionEntity.transactionHash = event.transaction.hash

    transactionEntity.save()
  } 
  // else if (event.params.newState === )

  entity.save()
}

export function handleLogProposalPactCreated(event: LogProposalPactCreatedEvent): void {
  let entity = new LogProposalPactCreated(
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
  let entity = LogProposalPactCreated.load(event.params.uid)

  if (!votingInfoEntity || !entity) return
  votingInfoEntity.votingConcluded = true

  votingInfoEntity.save()

  entity.votingInfo = votingInfoEntity.id

  entity.save()
}

export function handleLogContribution(event: LogContributionEvent): void {
  let proposalPactEntity = LogProposalPactCreated.load( event.params.uid )
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
}

export function handleLogAmountOut(event: LogAmountOutEvent): void {
  let proposalPactEntity = LogProposalPactCreated.load( event.params.uid )
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
}

// call handlers for gig pact
export function handleSignPact(call: SignPactCall): void {
  let entity = new TransactionEntity(call.transaction.hash.concat(call.inputs.pactid))
  let gigPact = GigPactEntity.load(call.inputs.pactid)

  if (!entity || !gigPact) return

  if (gigPact.employer == call.from) {
    entity.action = 1
  } else {
    entity.action = 2
  }
  entity.blockTimestamp = call.block.timestamp
  entity.pactType = 0
  entity.pactId = call.inputs.pactid
  entity.gasFees = call.transaction.gasPrice.toString()
  entity.transactionHash = call.transaction.hash

  entity.save()
}

// call handlers for proposal pact
export function handleSetText(call: SetTextCall): void {
  let proposalPactEntity = LogProposalPactCreated.load(call.inputs.pactid)
  if (!proposalPactEntity) return

  proposalPactEntity.pactText = call.inputs.pactText_

  proposalPactEntity.save()
}