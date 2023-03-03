export enum PactType {
    GIGPACT,
    PROPOSALPACT,
    ONETIMEPACT
}

export enum PactState {
    NULL,
    DEPLOYED,
    RETRACTED,
    EMPLOYER_SIGNED,
    EMPLOYEE_SIGNED,
    ALL_SIGNED,
    ACTIVE,
    PAUSED,
    TERMINATED,
    RESIGNED,
    FNF_EMPLOYER,
    FNF_EMPLOYEE,
    DISPUTED,
    ARBITRATED,
    FNF_SETTLED,
    DISPUTE_RESOLVED,
    ENDED
}

export enum TransactionType {
    DEPLOY,
    EMPLOYER_SIGN,
    EMPLOYEE_SIGN,
    RETRACT,
    DELEGATE,
    REVOKE_DELEGATE,
    START,
    PAUSE,
    RESUME,
    PAY,
    WITHDRAW,
    AUTOWITHDRAW,
    RESIGN,
    TERMINATE,
    ACCEPT_RESIGN,
    FNF_SETTLE,
    RECLAIM_STAKE,
    DISPUTE,
    PROPOSE_ARBITRATORS,
    ACCEPT_ARBITRATORS,
    REJECT_ARBITRATORS,
    RESOLVE,
    CREATE_PROPOSAL_PACT,
    EDIT_WP_TEXT,
    POSTPONE_WP_VOTING,
    END_WP_VOTE,
    CAST_WP_VOTE,
    ADD_WP_PARTICIPANTS,
    PP_PITCH_IN,
    CREATE_GP,
    APPROVE_TOKEN_ALLOWANCE,
}

// export const TransactionTypeName: {[txTypeIndex: number]: string} = {
//     0: "Deploy",
//     1: "Employer Sign",
//     2: "Employee Sign",
//     3: "Retract",
//     4: "Delegate",
//     5: "Revoke",
//     6: "Start Pact",
//     7: "Pause Pact",
//     8: "Resume Pact",
//     9: "Approve Pay",
//     10: "Withdraw",
//     11: "Auto-Withdraw",
//     12: "Resign",
//     13: "Terminate",
//     14: "Accept Resignation",
//     15: "Full n Final",
//     16: "Reclaim Stake",
//     17: "Raise Dispute",
//     18: "Propose Arbitrator",
//     19: "Accept Arbitrators",
//     20: "Reject Arbitrators",
//     21: "Resolve Dispute",
//     22: "Create Proposal Pact",
//     23: "Edit Text",
//     24: "Postpone Vote Window",
//     25: "Conclude Voting",
//     26: "Cast Vote",
//     27: "Add Participant",
//     28: "Pitch in",
//     29: "Create Gig pact",
//     30: "Approve token allowance"
// }