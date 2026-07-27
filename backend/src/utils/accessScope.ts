// @ts-nocheck

/*
 * Scope helpers for records that may not yet contain branch/IFSC fields.
 * Older loans and transactions are also matched through customers belonging
 * to the logged-in employee's branch. This prevents both empty branch screens
 * and cross-branch data exposure.
 */

const Customer = require("../models/Customer");
const auth = require("../middleware/authMiddleware");

const normalizeRole = auth.normalizeRole;
const isFullAdminRole = auth.isFullAdminRole;
const buildBranchAccessFilter = auth.buildBranchAccessFilter;
const buildAssignmentFilter = auth.buildAssignmentFilter;
const mergeFilters = auth.mergeFilters;
const isNoAccessFilter = auth.isNoAccessFilter;
const noAccessFilter = auth.noAccessFilter;

const unique = (values: any[]) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

const customerIdentifiersFilter = (customers: any[]) => {
  const ids = unique(
    customers.flatMap((customer) => [customer.id, customer.customerId])
  );
  const emails = unique(
    customers.flatMap((customer) => [customer.email])
  ).map((value) => value.toLowerCase());
  const accounts = unique(
    customers.flatMap((customer) => [
      customer.accountNumber,
      customer.accountNo,
    ])
  ).map((value) => value.toUpperCase());
  const names = unique(
    customers.flatMap((customer) => [customer.name, customer.customerName])
  );

  const conditions: any[] = [];

  if (ids.length) {
    conditions.push(
      { customerId: { $in: ids } },
      { customerID: { $in: ids } }
    );
  }

  if (emails.length) {
    conditions.push(
      { email: { $in: emails } },
      { customerEmail: { $in: emails } },
      { userEmail: { $in: emails } }
    );
  }

  if (accounts.length) {
    conditions.push(
      { accountNumber: { $in: accounts } },
      { accountNo: { $in: accounts } },
      { fromAccount: { $in: accounts } },
      { toAccount: { $in: accounts } }
    );
  }

  if (names.length) {
    conditions.push(
      { customer: { $in: names } },
      { customerName: { $in: names } },
      { fullName: { $in: names } },
      { name: { $in: names } }
    );
  }

  return conditions.length ? { $or: conditions } : noAccessFilter();
};

const orFilters = (...filters: any[]) => {
  const usable = filters.filter(
    (filter) =>
      filter &&
      Object.keys(filter).length > 0 &&
      !isNoAccessFilter(filter)
  );

  if (!usable.length) return noAccessFilter();
  if (usable.length === 1) return usable[0];
  return { $or: usable };
};

const getBranchCustomers = async (admin: any) => {
  if (isFullAdminRole(admin?.role)) return [];

  const filter = buildBranchAccessFilter(admin, {
    branchFields: [
      "branch",
      "branchName",
      "assignedBranch",
      "branchCode",
      "branchId",
    ],
    ifscFields: ["ifsc", "ifscCode", "IFSC"],
  });

  if (isNoAccessFilter(filter)) return [];

  return Customer.find(filter)
    .select(
      "id customerId name customerName email accountNumber accountNo branch branchName ifsc ifscCode"
    )
    .lean();
};

const buildScopedRecordFilter = async (req: any, moduleName: string) => {
  const admin = req.admin || req.user || {};
  const role = normalizeRole(admin.role);

  if (isFullAdminRole(role)) return {};

  const directBranchFilter = buildBranchAccessFilter(admin);
  const customers = await getBranchCustomers(admin);
  const linkedCustomerFilter = customerIdentifiersFilter(customers);
  let scope = orFilters(directBranchFilter, linkedCustomerFilter);

  if (moduleName === "loans") {
    if (role === "loan officer" || role === "relationship manager") {
      scope = mergeFilters(scope, buildAssignmentFilter(admin, "loan"));
    }
  }

  return scope;
};

module.exports = {
  buildScopedRecordFilter,
  customerIdentifiersFilter,
  getBranchCustomers,
  orFilters,
};
