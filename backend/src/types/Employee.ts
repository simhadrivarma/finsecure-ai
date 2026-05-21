export type EmployeeStatus = "Active" | "Inactive";

export interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  joiningDate: string;
  branch: string;
  ifsc: string;
  customers: number;
  status: EmployeeStatus;
}