import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
  createMockedFunction
} from "matchstick-as/assembly/index"
import { Address, Bytes, ethereum, log } from "@graphprotocol/graph-ts"
// import { AdminChanged } from "../generated/schema"
// import { AdminChanged as AdminChangedEvent } from "../generated/test/test"
import { handleLogPactCreated } from "../src/chainpact"
import { createLogPactCreatedEvent } from "./test-utils"
import {ProposalPact} from "../generated/proposalpact/ProposalPact"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

// describe("Describe entity assertions", () => {
//   beforeAll(() => {
    // let previousAdmin = Address.fromString(
    //   "0x0000000000000000000000000000000000000001"
    // )
    // let newAdmin = Address.fromString(
    //   "0x0000000000000000000000000000000000000001"
    // )
    // let newAdminChangedEvent = createAdminChangedEvent(previousAdmin, newAdmin)
    // handleAdminChanged(newAdminChangedEvent)
//   })

//   afterAll(() => {
//     clearStore()
//   })

//   // For more test scenarios, see:
//   // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

//   test("AdminChanged created and stored", () => {
    // assert.entityCount("AdminChanged", 1)

    // // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    // assert.fieldEquals(
    //   "AdminChanged",
    //   "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
    //   "previousAdmin",
    //   "0x0000000000000000000000000000000000000001"
    // )
    // assert.fieldEquals(
    //   "AdminChanged",
    //   "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
    //   "newAdmin",
    //   "0x0000000000000000000000000000000000000001"
    // )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  // })
// })
describe("Entity checkup for GigPact", () => {
  beforeAll(() => {
    let creator = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let pactId = Bytes.fromHexString(
      "0x7ccab383b928eeaec5fd48c295eac05c2e9ace2073bc0d9b94c893e0c4c1ebd8"
    )
    let newPactCreatedEvent = createLogPactCreatedEvent(creator, pactId)
    handleLogPactCreated(newPactCreatedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  test("LogPactCreated created and stored", () => {
    // assert.entityCount("LogPactCreated", 0)
  })
})

// describe("Smart contract checkup for ProposalPact", () => {
//   beforeAll(() => {
//     let contractAddress = Address.fromString('0x2f6c844213c9a638C6eFC974b13aceCb001eea2a')
//     let pactId = Bytes.fromHexString("0xd7d14b42b4193bbd9aa6143bfafe2464913dca6b75e1f3326297f56f55bec57f")
//     createMockedFunction(contractAddress, 'createPact', 'createPact(bytes32):(uint32,uint32,uint128,bool,bool,address,bytes32,string)')
//       .withArgs([ethereum.Value.fromBytes(pactId)])
//     let proposalPact = ProposalPact.bind(contractAddress)
//     log.info("🚀🚀 Pact Text : {}", [proposalPact.pacts(pactId).getPactText()])
//   })

//   afterAll(() => {
//     clearStore()
//   })

//   test("ProposalPact created and stored", () => {
    
//     assert.entityCount("LogPactCreated", 1)
//   })
// })