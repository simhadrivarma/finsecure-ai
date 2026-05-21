import type { Branch } from "../types/Branch";

const branches: Branch[] = [
  {
    id: "BR001",
    name: "Hyderabad Main Branch",
    address: "Banjara Hills, Hyderabad",
    ifsc: "FINS0001001",
    manager: "Ramesh Kumar",
    employees: 24,
    customers: 1840,
    balance: "₹18.75 Cr",
    loans: "₹6.42 Cr",
    status: "Active",
  },
  {
    id: "BR002",
    name: "Vizag Branch",
    address: "Dwaraka Nagar, Visakhapatnam",
    ifsc: "FINS0001002",
    manager: "Priya Sharma",
    employees: 18,
    customers: 1260,
    balance: "₹12.25 Cr",
    loans: "₹4.18 Cr",
    status: "Active",
  },
  {
    id: "BR003",
    name: "Vijayawada Branch",
    address: "MG Road, Vijayawada",
    ifsc: "FINS0001003",
    manager: "Arjun Rao",
    employees: 16,
    customers: 980,
    balance: "₹9.80 Cr",
    loans: "₹3.64 Cr",
    status: "Active",
  },
];

module.exports = branches;