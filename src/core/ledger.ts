import { Decimal } from "decimal.js";
import {
  IAccount,
  IBalance,
  ICurrency,
  ICustom,
  IDocument,
  IEvent,
  ILedger,
  INote,
  IOption,
  IPrice,
  ITransaction,
} from "./type.js";

export interface ValidateOptions {
  tolerance?: number;
}

export class Ledger implements ILedger {
  public options: IOption[] = [];
  public plugins: string[] = [];
  public includes: string[] = [];
  public prices: IPrice[] = [];
  public transactions: ITransaction[] = [];
  public balances: IBalance[] = [];
  public notes: INote[] = [];
  public documents: IDocument[] = [];
  public events: IEvent[] = [];
  public customs: ICustom[] = [];
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
    this.options.push({ key, value });
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

  event(event: IEvent): void {
    this.events.push(event);
  }

  custom(custom: ICustom): void {
    this.customs.push(custom);
  }

  validate(options: ValidateOptions = {}): void {
    const accountSet = new Set<IAccount>(this.accounts);
    const tolerance = new Decimal(options.tolerance ?? 0).abs();

    for (const tr of this.transactions) {
      const dateStr = tr.date.toISOString().slice(0, 10);
      const transactionLabel = this.transactionLabel(tr);

      // Check account open/close dates
      for (const posting of tr.postings) {
        const account = posting.account;
        const accountName = this.accountName(account);
        if (!accountSet.has(account)) {
          throw new Error(
            `${transactionLabel} on ${dateStr}: account "${accountName}" is not registered in ledger`
          );
        }
        if (tr.date < account.openDate) {
          throw new Error(
            `${transactionLabel} on ${dateStr}: account "${accountName}" is not open until ${account.openDate.toISOString().slice(0, 10)}`
          );
        }
        if (account.closeDate && tr.date >= account.closeDate) {
          throw new Error(
            `${transactionLabel} on ${dateStr}: account "${accountName}" was closed on ${account.closeDate.toISOString().slice(0, 10)}`
          );
        }
      }

      // Check transaction balance (postings must sum to zero per currency)
      // Beancount can infer a single posting without an explicit amount.
      const postingsWithoutAmount = tr.postings.filter((p) => p.amount == null);
      if (postingsWithoutAmount.length > 1) {
        throw new Error(
          `${transactionLabel} on ${dateStr}: only one posting can omit amount`
        );
      }

      const hasPriceAnnotation = tr.postings.some((p) => p.held || p.as);
      if (postingsWithoutAmount.length > 0 || hasPriceAnnotation) {
        continue;
      }

      const postingsWithAmount = tr.postings.filter((p) => p.amount != null);
      const currencyTotals = new Map<string, InstanceType<typeof Decimal>>();
      for (const posting of postingsWithAmount) {
        const amount = posting.amount!;
        const symbol = amount.currency.symbol;
        const current = currencyTotals.get(symbol) ?? new Decimal(0);
        currencyTotals.set(symbol, current.plus(amount.value));
      }
      for (const [symbol, total] of currencyTotals) {
        if (total.abs().greaterThan(tolerance)) {
          throw new Error(
            `${transactionLabel} on ${dateStr}: postings do not balance for currency ${symbol} (sum = ${total.toString()}, tolerance = ${tolerance.toString()})`
          );
        }
      }
    }
  }

  private transactionLabel(tr: ITransaction): string {
    const title = tr.payee ? `"${tr.payee}" "${tr.narration}"` : `"${tr.narration}"`;
    return `Transaction ${title}`;
  }

  private accountName(account: IAccount): string {
    return `${account.type}:${account.namespace.join(":")}`;
  }
}
