import dayjs from "dayjs";
import {
  IAccount,
  IBalance,
  ICurrency,
  IDocument,
  ILedger,
  INote,
  IPostings,
  IPrice,
  ITransaction,
  Metadata,
} from "../core/type.js";
import { compareDate, compareString, mergeSortResult } from "./sort.js";

class BeanCount {
  private accountPad = 70;
  private currencyPad = 15;

  private indent(deep: number, str: string) {
    return new Array(deep).fill(" ").join("") + str;
  }

  serializationLedger(ledger: ILedger) {
    const parts: string[] = [];

    const options = this.serializationOptions(ledger.options, ledger.plugins, ledger.includes);
    if (options) parts.push(options);

    parts.push(this.serializationCurrencies(ledger.currencies));
    parts.push(this.serializationAccounts(ledger.accounts));

    const prices = this.serializationPrices(ledger.prices);
    if (prices) parts.push(prices);

    parts.push(this.serializationTransactions(ledger.transactions));
    parts.push(this.serializationBalances(ledger.balances));

    const notes = this.serializationNotes(ledger.notes ?? []);
    if (notes) parts.push(notes);

    const documents = this.serializationDocuments(ledger.documents ?? []);
    if (documents) parts.push(documents);

    return parts.filter((p) => p.trim()).join("\n\n");
  }

  serializationOptions(
    options?: Record<string, string>,
    plugins?: string[],
    includes?: string[]
  ): string {
    const lines: string[] = [];

    if (options) {
      for (const key of Object.keys(options).sort()) {
        lines.push(`option "${key}" "${options[key]}"`);
      }
    }

    if (plugins) {
      for (const plugin of plugins) {
        lines.push(`plugin "${plugin}"`);
      }
    }

    if (includes) {
      for (const file of includes) {
        lines.push(`include "${file}"`);
      }
    }

    return lines.join("\n");
  }

  serializationCurrencies(currencies: ICurrency[]) {
    return currencies
      .map((p) => {
        let line = `${this.formateDate(p.date)} commodity ${p.symbol}`;
        return this.mergeLines(0, [
          line,
          this.serializationMetadata(1, p.metadata),
        ]);
      })
      .join("\n\n");
  }

  serializationPrices(prices: IPrice[]): string {
    return prices
      .sort((a, b) => {
        return mergeSortResult([
          compareDate(a.date, b.date),
          compareString(a.currency.symbol, b.currency.symbol),
        ]);
      })
      .map((p) => {
        return `${this.formateDate(p.date)} price ${p.currency.symbol}          ${p.amount.value} ${p.amount.currency.symbol}`;
      })
      .join("\n");
  }

  private mergeLines(deep: number, lines: string[] | Array<string[]>): string {
    return lines
      .flat()
      .filter((p) => !!p.trim())
      .map((o) => this.indent(deep, o))
      .join("\n");
  }

  private serializationMetadata(deep: number, metadata?: Metadata | null) {
    if (!metadata) {
      return "";
    }
    return this.mergeLines(
      deep,
      Object.keys(metadata)
        .sort()
        .map((key) => {
          return `${key}: ${JSON.stringify(metadata[key])}`;
        })
    );
  }

  serializationAccounts(accounts: IAccount[]): string {
    return accounts
      .sort((a, b) => {
        return mergeSortResult([
          compareDate(a.openDate, b.openDate),
          compareString(this.accountName(a), this.accountName(b)),
        ]);
      })
      .map((p) => {
        let res = "";
        if (p.openDate) {
          res += `${this.formateDate(p.openDate)} open ${this.accountName(
            p,
            this.accountPad - (this.currencyPad - 13)
          )} ${p.currencies.map((o) => o.symbol).join(",")}`;
        }
        if (p.closeDate) {
          res += `\n${this.formateDate(p.openDate)} close ${this.accountName(
            p
          )}`;
        }
        return res;
      })
      .join("\n\n");
  }

  serializationBalances(balances: IBalance[]): string {
    return balances
      .sort((a, b) => {
        return mergeSortResult([
          compareDate(a.date, b.date),
          compareString(
            this.accountName(a.account),
            this.accountName(b.account)
          ),
        ]);
      })
      .map((p) => {
        let pad = "";
        if (p.pad) {
          const lastDay = dayjs(p.date).subtract(1, "day").toDate();
          pad = `${this.formateDate(lastDay)} pad     ${this.accountName(
            p.account,
            0
          )} ${this.accountName(p.pad, 0)}`;
        }
        return `
${pad}
${this.formateDate(p.date)} balance ${this.accountName(p.account)} ${
          p.amount.value
        } ${p.amount.currency.symbol}`.trim();
      })
      .join("\n\n");
  }

  serializationNotes(notes: INote[]): string {
    return notes
      .sort((a, b) => {
        return mergeSortResult([
          compareDate(a.date, b.date),
          compareString(this.accountName(a.account), this.accountName(b.account)),
        ]);
      })
      .map((p) => {
        return `${this.formateDate(p.date)} note ${this.accountName(p.account, 0)} "${p.comment}"`;
      })
      .join("\n");
  }

  serializationDocuments(documents: IDocument[]): string {
    return documents
      .sort((a, b) => {
        return mergeSortResult([
          compareDate(a.date, b.date),
          compareString(this.accountName(a.account), this.accountName(b.account)),
        ]);
      })
      .map((p) => {
        return `${this.formateDate(p.date)} document ${this.accountName(p.account, 0)} "${p.path}"`;
      })
      .join("\n");
  }

  private accountName(account: IAccount, pad?: number): string {
    return `${account.type}:${account.namespace.join(":")}`.padEnd(
      pad ?? this.accountPad
    );
  }

  serializationTransactions(transactions: ITransaction[]): string {
    return transactions
      .sort((a, b) => {
        return mergeSortResult([
          compareDate(a.date, b.date),
          compareString(a.payee, b.payee),
          compareString(a.narration, b.narration),
        ]);
      })
      .map((p) => {
        let payeeAndNarration;
        if (p.payee) {
          payeeAndNarration = `"${p.payee}" "${p.narration}"`;
        } else {
          payeeAndNarration = `"${p.narration}"`;
        }

        const tagsAndLinks: string[] = [];
        if (p.tags) {
          for (const tag of p.tags) {
            tagsAndLinks.push(`#${tag}`);
          }
        }
        if (p.links) {
          for (const link of p.links) {
            tagsAndLinks.push(`^${link}`);
          }
        }
        const tagsAndLinksStr = tagsAndLinks.length > 0 ? ` ${tagsAndLinks.join(" ")}` : "";

        const res = this.mergeLines(0, [
          `${this.formateDate(p.date)} ${p.flag} ${payeeAndNarration}${tagsAndLinksStr}`,
          this.serializationMetadata(2, p.metadata),
          this.mergeLines(
            2,
            p.postings
              .sort((a, b) => {
                return b.amount.value - a.amount.value;
              })
              .map((o) => {
                return [
                  `${this.accountName(o.account)} ${this.formatPostingsPrice(
                    o
                  )}`,
                  this.serializationMetadata(2, o.metadata),
                ];
              })
          ),
        ]);

        return res;
      })
      .join("\n\n");
  }

  private formatPostingsPrice(postings: IPostings) {
    const amount = postings.amount;

    const price = [
      `${amount.value} ${amount.currency.symbol}`.padStart(this.currencyPad),
    ];

    if (postings.held) {
      const held = postings.held;
      switch (held.type) {
        case "price": {
          price.push(`{ ${held.amount.value} ${held.amount.currency.symbol} }`);
          break;
        }
        case "cost": {
          price.push(
            `{ # ${held.amount.value} ${held.amount.currency.symbol} }`
          );
          break;
        }
        case "auto": {
          price.push(`{}`);
          break;
        }
      }
    }

    if (postings.as) {
      const as = postings.as;
      switch (as.type) {
        case "price": {
          price.push(`@ ${as.amount.value} ${as.amount.currency.symbol}`);
          break;
        }
        case "cost": {
          price.push(`@@ ${as.amount.value} ${as.amount.currency.symbol}`);
          break;
        }
      }
    }
    return price.join(" ");
  }

  /**
   *
   * @returns YYYY-MM-DD
   */
  private formateDate(date: Date): string {
    return dayjs(date).format("YYYY-MM-DD");
  }
}

export const beanCount = new BeanCount();
