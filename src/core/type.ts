export interface ICurrency {
  date: Date;
  /**
   * @eg USD
   */
  symbol: string;

  metadata?: Metadata;
}

export interface IAmount {
  value: number;
  currency: ICurrency;
}

export type IPostingsPrice =
  | {
      type: "price";
      amount: IAmount;
    }
  | {
      type: "cost";
      amount: IAmount;
    }
  | {
      type: "auto";
    };

export interface IPostings {
  account: IAccount;
  amount: IAmount;
  metadata?: Metadata | null;

  /**
   * price: 5 CNY { 20 JPY }
   * cost:  5 CNY { # 100 JPY }
   */
  held?: IPostingsPrice;
  /**
   * price: 5 CNY @ 20 JPY
   * cost:  5 CNY @@ 100 JPY
   */
  as?: IPostingsPrice;
}

export interface IAccount {
  namespace: string[];
  type: EAccountType;
  currencies: ICurrency[];
  openDate: Date;
  closeDate?: Date;
}

export type TTransactionFlag = "*" | "!";

export interface ITransaction {
  type: "transaction";
  date: Date;
  flag: TTransactionFlag;
  payee?: string;
  narration: string;
  postings: IPostings[];
  metadata?: Metadata;
  tags?: string[];
  links?: string[];
}

export interface IPrice {
  type: "price";
  date: Date;
  currency: ICurrency;
  amount: IAmount;
  metadata?: Metadata;
}

export enum EAccountType {
  Assets = "Assets",
  Expenses = "Expenses",
  Income = "Income",
  Liabilities = "Liabilities",
  Equity = "Equity",
}

export interface IBalance {
  date: Date;
  amount: IAmount;
  account: IAccount;
  pad?: IAccount;
}

export interface INote {
  type: "note";
  date: Date;
  account: IAccount;
  comment: string;
}

export interface IDocument {
  type: "document";
  date: Date;
  account: IAccount;
  path: string;
}

export interface ILedger {
  options?: Record<string, string>;
  plugins?: string[];
  includes?: string[];
  prices: IPrice[];
  transactions: ITransaction[];
  accounts: IAccount[];
  currencies: ICurrency[];
  balances: IBalance[];
  notes: INote[];
  documents: IDocument[];
}

export type Metadata = Record<string, string | number>;
