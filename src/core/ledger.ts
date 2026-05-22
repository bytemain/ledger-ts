import { Decimal } from "decimal.js";
import {
  IAccount,
  IBalance,
  ICurrency,
  IDocument,
  ILedger,
  INote,
  IPrice,
  ITransaction,
} from "./type.js";

export class Ledger implements ILedger {
  public options: Record<string, string> = {};
  public plugins: string[] = [];
  public includes: string[] = [];
  public prices: IPrice[] = [];
  public transactions: ITransaction[] = [];
  public balances: IBalance[] = [];
  public notes: INote[] = [];
  public documents: IDocument[] = [];
  constructor(public accounts: IAccount[], public currencies: ICurrency[]) {}

  transaction(...transaction: ITransaction[]): void {
    this.transactions = this.transactions.concat(transaction);
  }

  price(price: IPrice): void {
    this.prices.push(price);
  }

  balance(balance: IBalance): void {
    this.balances.push(balance);
  }

  option(key: string, value: string): void {
    this.options[key] = value;
  }

  plugin(plugin: string): void {
    this.plugins.push(plugin);
  }

  include(file: string): void {
    this.includes.push(file);
  }

  note(note: INote): void {
    this.notes.push(note);
  }

  document(document: IDocument): void {
    this.documents.push(document);
  }

  validate(): void {
    const accountMap = new Map<IAccount, IAccount>(
      this.accounts.map((a) => [a, a])
    );

    for (const tr of this.transactions) {
      const dateStr = tr.date.toISOString().slice(0, 10);

      // Check account open/close dates
      for (const posting of tr.postings) {
        const account = posting.account;
        if (tr.date < account.openDate) {
          throw new Error(
            `Transaction "${tr.narration}" on ${dateStr}: account "${account.type}:${account.namespace.join(":")}" is not open until ${account.openDate.toISOString().slice(0, 10)}`
          );
        }
        if (account.closeDate && tr.date >= account.closeDate) {
          throw new Error(
            `Transaction "${tr.narration}" on ${dateStr}: account "${account.type}:${account.namespace.join(":")}" was closed on ${account.closeDate.toISOString().slice(0, 10)}`
          );
        }
      }

      // Check transaction balance (postings must sum to zero per currency)
      // Allow at most one posting without an explicit amount to be auto-computed
      const postingsWithAmount = tr.postings.filter((p) => p.amount != null);
      const currencyTotals = new Map<string, InstanceType<typeof Decimal>>();
      for (const posting of postingsWithAmount) {
        const symbol = posting.amount.currency.symbol;
        const current = currencyTotals.get(symbol) ?? new Decimal(0);
        currencyTotals.set(symbol, current.plus(posting.amount.value));
      }
      for (const [symbol, total] of currencyTotals) {
        if (!total.isZero()) {
          throw new Error(
            `Transaction "${tr.narration}" on ${dateStr}: postings do not balance for currency ${symbol} (sum = ${total.toString()})`
          );
        }
      }
    }
  }
}
