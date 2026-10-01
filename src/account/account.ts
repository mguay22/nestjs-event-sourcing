export type AccountEvent =
  | { type: 'AccountOpened'; data: { accountId: string; owner: string } }
  | { type: 'MoneyDeposited'; data: { amount: number } }
  | { type: 'MoneyWithdrawn'; data: { amount: number } };

export interface AccountState {
  exists: boolean;
  owner?: string;
  balance: number;
}

export const initialState: AccountState = { exists: false, balance: 0 };

export function evolve(state: AccountState, event: AccountEvent): AccountState {
  switch (event.type) {
    case 'AccountOpened':
      return { exists: true, owner: event.data.owner, balance: 0 };
    case 'MoneyDeposited':
      return { ...state, balance: state.balance + event.data.amount };
    case 'MoneyWithdrawn':
      return { ...state, balance: state.balance - event.data.amount };
  }
}
