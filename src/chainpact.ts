import {
  LogPactCreated as LogPactCreatedEvent,
  LogPaymentMade as LogPaymentMadeEvent
} from "../generated/gigpact/GigPact"
import { ProposalPact, logPactCreated as LogProposalPactCreatedEvent, ProposalPact__userInteractionDataResult } from "../generated/proposalpact/ProposalPact"
import { LogPactCreated, LogPaymentMade, LogProposalPactCreated, UserInteractionData, VotingInfo } from "../generated/schema"
import { Address, Bytes, log } from '@graphprotocol/graph-ts'


export function handleLogPactCreated(event: LogPactCreatedEvent): void {
  let entity = new LogPactCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.creator = event.params.creator
  entity.pactId = event.params.pactid

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

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

export function handleLogProposalPactCreated(event: LogProposalPactCreatedEvent): void {
  let entity = new LogProposalPactCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32()) 
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
  let votingInfoEntity = new VotingInfo(event.transaction.hash.concatI32(event.logIndex.toI32()))
  let contract = ProposalPact.bind(event.address)
  let votingInfoFromChain = contract.votingInfo(event.params.uid)

  votingInfoEntity.votingEnabled = votingInfoFromChain.getVotingEnabled()
  votingInfoEntity.openParticipation = votingInfoFromChain.getOpenParticipation()
  votingInfoEntity.refundOnVotedYes = votingInfoFromChain.getRefundOnVotedYes()
  votingInfoEntity.refundOnVotedNo = votingInfoFromChain.getRefundOnVotedNo()
  votingInfoEntity.votingConcluded = votingInfoFromChain.getVotingConcluded()
  votingInfoEntity.duration = votingInfoFromChain.getDuration()
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