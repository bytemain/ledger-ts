import { Decimal } from "decimal.js";
import { Account, ITransaction } from "../index.js";

export function padAccount(account: Account) {
  return (old: ITransaction): ITransaction => {
    let init = new Decimal(0);
    old.postings.forEach((posting) => {
      if (!posting.amount) {
        return;
      }

      if (posting.as) {
        if (posting.as.type === "cost") {
          if (posting.amount.value < 0) {
            init = init.minus(posting.as.amount.value);
          } else {
            init = init.add(posting.as.amount.value);
          }
        } else if (posting.as.type === "price") {
          init = init.add(
            new Decimal(posting.as.amount.value)
              .mul(new Decimal(posting.amount.value))
              .toNumber()
          );
        } else {
          // auto: fall back to raw amount
          init = init.add(posting.amount.value);
        }
      } else if (posting.held) {
        if (posting.held.type === "cost") {
          if (posting.amount.value < 0) {
            init = init.minus(posting.held.amount.value);
          } else {
            init = init.add(posting.held.amount.value);
          }
        } else if (posting.held.type === "price") {
          init = init.add(
            new Decimal(posting.held.amount.value)
              .mul(new Decimal(posting.amount.value))
              .toNumber()
          );
        } else {
          // auto lot matching: fall back to raw amount
          init = init.add(posting.amount.value);
        }
      } else {
        init = init.add(posting.amount.value);
      }
    });
    const newPosting = [
      ...old.postings,
      account.posting(new Decimal(0).minus(init).toNumber()),
    ];
    return {
      ...old,
      postings: newPosting,
    };
  };
}
