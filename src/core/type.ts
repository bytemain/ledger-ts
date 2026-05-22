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
  amount?: IAmount | null;
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

export interface IOption {
  key: string;
  value: string;
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
  metadata?: Metadata;
}

export interface IDocument {
  type: "document";
  date: Date;
  account: IAccount;
  path: string;
  metadata?: Metadata;
}

export interface IEvent {
  type: "event";
  date: Date;
  name: string;
  value: string;
  metadata?: Metadata;
}

export type CustomValue = string | number | boolean | Date | IAmount | IAccount;

export interface ICustom {
  type: "custom";
  date: Date;
  name: string;
  values?: CustomValue[];
  metadata?: Metadata;
}

export interface ILedger {
  options?: IOption[];
  plugins?: string[];
  includes?: string[];
  prices: IPrice[];
  transactions: ITransaction[];
  accounts: IAccount[];
  currencies: ICurrency[];
  balances: IBalance[];
  notes: INote[];
  documents: IDocument[];
  events: IEvent[];
  customs: ICustom[];
}

export type MetadataValue = string | number | boolean | Date;

export type Metadata = Record<string, MetadataValue>;
