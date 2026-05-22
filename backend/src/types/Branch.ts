export type BranchStatus = "Active" | "Inactive";

export type Branch = {
  id: string;
  name: string;
  address: string;
  ifsc: string;
  manager: string;
  employees: number;
  customers: number;
  balance: string;
  loans: string;
  status: BranchStatus;
};