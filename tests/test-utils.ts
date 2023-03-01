import { newMockEvent, newMockCall } from "matchstick-as"
import { ethereum, Address, Bytes } from "@graphprotocol/graph-ts"
// import { AdminChanged, BeaconUpgraded, Upgraded } from "../generated/test/test"
import {
  LogPactCreated as LogPactCreatedEvent,
  LogPaymentMade as LogPaymentMadeEventpactCreatedEvent
} from "../generated/gigpact/GigPact"
import { ProposalPact, LogPactCreated as LogProposalPactCreatedEvent, LogPactAction as ProposalPactActionEvent } from "../generated/proposalpact/ProposalPact"

// export function createAdminChangedEvent(
//   previousAdmin: Address,
//   newAdmin: Address
// ): AdminChanged {
//   let adminChangedEvent = <AdminChanged>(newMockEvent())

//   adminChangedEvent.parameters = new Array()

  // adminChangedEvent.parameters.push(
  //   new ethereum.EventParam(
  //     "previousAdmin",
  //     ethereum.Value.fromAddress(previousAdmin)
  //   )
  // )
  // adminChangedEvent.parameters.push(
  //   new ethereum.EventParam("newAdmin", ethereum.Value.fromAddress(newAdmin))
  // )

  // return adminChangedEvent
// }

// export function createBeaconUpgradedEvent(beacon: Address): BeaconUpgraded {
//   let beaconUpgradedEvent = <BeaconUpgraded>(newMockEvent())

//   beaconUpgradedEvent.parameters = new Array()

//   beaconUpgradedEvent.parameters.push(
//     new ethereum.EventParam("beacon", ethereum.Value.fromAddress(beacon))
//   )

//   return beaconUpgradedEvent
// }

// export function createUpgradedEvent(implementation: Address): Upgraded {
//   let upgradedEvent = <Upgraded>(newMockEvent())

//   upgradedEvent.parameters = new Array()

//   upgradedEvent.parameters.push(
//     new ethereum.EventParam(
//       "implementation",
//       ethereum.Value.fromAddress(implementation)
//     )
//   )

//   return upgradedEvent
// }

export function createLogPactCreatedEvent(
  creator: Address,
  pactId: Bytes
): LogPactCreatedEvent {
  let pactCreatedEvent = changetype<LogPactCreatedEvent>(newMockEvent())
  pactCreatedEvent.parameters = new Array()
  pactCreatedEvent.transaction.input = Bytes.fromHexString("0x919DC4e0cDd285dCa78b638F3aE7be5a30014a97")
  pactCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "creator",
      ethereum.Value.fromAddress(creator)
    )
  )
  pactCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "pactid",
      ethereum.Value.fromBytes(pactId)
    )
  )

  return pactCreatedEvent
}

export function createPactTextEditedvent(
  pactId: Bytes
): ProposalPactActionEvent {
  let pactCreatedEvent = changetype<ProposalPactActionEvent>(newMockEvent())
  pactCreatedEvent.parameters = new Array()
  pactCreatedEvent.transaction.input = Bytes.fromHexString("0xff8594fc0f569ccdc24a51587b707f02d4579cd3abd0b74a21cb9e2335833b7e6ba0bc960000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000e7465737420706f7374706f6e6520000000000000000000000000000000000000")
  pactCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "pactid",
      ethereum.Value.fromBytes(pactId)
    )
  )

  return pactCreatedEvent
}