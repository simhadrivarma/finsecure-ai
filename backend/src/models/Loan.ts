// @ts-nocheck

const mongoose = require("mongoose");

/* Convert formatted currency values into numbers */
const moneyToNumber = (value: any) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return 0;
  }

  const clean = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\+/g, "")
    .trim();

  if (clean === "") {
    return 0;
  }

  const numberValue = Number(clean);

  return Number.isNaN(numberValue)
    ? NaN
    : numberValue;
};

/* Store money in Indian currency format */
const formatMoney = (value: any) => {
  const numberValue = moneyToNumber(value);

  if (Number.isNaN(numberValue)) {
    return value;
  }

  return `₹${numberValue.toLocaleString("en-IN")}`;
};

/* Clean account number without removing FS prefix */
const cleanAccountNumber = (value: any) => {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
};

const loanSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    customer: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },

    accountNumber: {
      type: String,
      required: [true, "Account number is required"],
      trim: true,
      uppercase: true,
      index: true,

      set: function (value: any) {
        return cleanAccountNumber(value);
      },

      validate: {
        validator: function (value: any) {
          const cleanedValue =
            cleanAccountNumber(value);

          return (
            cleanedValue.length >= 9 &&
            cleanedValue.length <= 20
          );
        },

        message:
          "Account number must contain 9 to 20 characters",
      },
    },

    type: {
      type: String,
      required: [true, "Loan type is required"],

      enum: {
        values: [
          "Home Loan",
          "Business Loan",
          "Personal Loan",
          "Vehicle Loan",
          "Education Loan",
          "Gold Loan",
        ],

        message: "Invalid loan type",
      },

      trim: true,
    },

    amount: {
      type: String,
      required: [true, "Loan amount is required"],

      set: function (value: any) {
        return formatMoney(value);
      },

      validate: {
        validator: function (value: any) {
          const numberValue =
            moneyToNumber(value);

          return (
            !Number.isNaN(numberValue) &&
            numberValue > 0
          );
        },

        message:
          "Loan amount must be greater than 0",
      },
    },

    interest: {
      type: String,
      required: [true, "Interest rate is required"],
      trim: true,

      validate: {
        validator: function (value: any) {
          const numberValue = Number(
            String(value || "")
              .replace(/%/g, "")
              .trim()
          );

          return (
            !Number.isNaN(numberValue) &&
            numberValue >= 0 &&
            numberValue <= 100
          );
        },

        message:
          "Interest rate must be between 0 and 100",
      },
    },

    startDate: {
      type: String,
      required: [true, "Start date is required"],
      trim: true,
    },

    endDate: {
      type: String,
      required: [true, "End date is required"],
      trim: true,
    },

    emi: {
      type: String,
      default: "₹0",

      set: function (value: any) {
        return formatMoney(value);
      },

      validate: {
        validator: function (value: any) {
          const numberValue =
            moneyToNumber(value);

          return (
            !Number.isNaN(numberValue) &&
            numberValue >= 0
          );
        },

        message:
          "Monthly EMI must be a valid number",
      },
    },

    paid: {
      type: String,
      default: "₹0",

      set: function (value: any) {
        return formatMoney(value);
      },

      validate: {
        validator: function (value: any) {
          const numberValue =
            moneyToNumber(value);

          return (
            !Number.isNaN(numberValue) &&
            numberValue >= 0
          );
        },

        message:
          "Paid amount must be a valid number",
      },
    },

    pending: {
      type: String,
      default: "₹0",

      set: function (value: any) {
        return formatMoney(value);
      },

      validate: {
        validator: function (value: any) {
          const numberValue =
            moneyToNumber(value);

          return (
            !Number.isNaN(numberValue) &&
            numberValue >= 0
          );
        },

        message:
          "Pending amount must be a valid number",
      },
    },

    officer: {
      type: String,
      default: "",
      trim: true,
    },

    /*
      Pending is included because a newly submitted loan
      application uses Pending as its initial status.
    */
    status: {
      type: String,

      enum: {
        values: [
          "Pending",
          "Review",
          "Under Review",
          "Approved",
          "Rejected",
          "Active",
          "Closed",
          "Defaulted",
        ],

        message:
          "`{VALUE}` is not a valid loan status",
      },

      default: "Pending",
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "loans",
  }
);

/* Remove internal and sensitive fields from responses */
loanSchema.set("toJSON", {
  transform: (
    _document: any,
    returnedObject: any
  ) => {
    delete returnedObject.__v;

    return returnedObject;
  },
});

loanSchema.set("toObject", {
  transform: (
    _document: any,
    returnedObject: any
  ) => {
    delete returnedObject.__v;

    return returnedObject;
  },
});

const Loan =
  mongoose.models.Loan ||
  mongoose.model("Loan", loanSchema);

module.exports = Loan;