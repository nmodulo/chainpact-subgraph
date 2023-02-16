import {
  GigPact,
  LogPactCreated as LogPactCreatedEvent,
  LogPaymentMade as LogPaymentMadeEvent,
  LogStateUpdate as LogStateUpdateEvent
} from "../generated/gigpact/GigPact"
import { ProposalPact, logPactCreated as LogProposalPactCreatedEvent, ProposalPact__userInteractionDataResult, ProposalPact__pactsResult, logvotingConcluded as LogvotingConcludedEvent } from "../generated/proposalpact/ProposalPact"
import { DisputeData, GigPactEntity, LogPaymentMade, LogProposalPactCreated, PayData, UserInteractionData, VotingInfo } from "../generated/schema"
import { Address, Bytes, log } from '@graphprotocol/graph-ts'


export function handleLogPactCreated(event: LogPactCreatedEvent): void {
  let entity = new GigPactEntity(
    event.params.pactid
  )
  let disputeDataEntity = new DisputeData(event.params.pactid)
  let payData = new PayData(event.params.pactid)
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