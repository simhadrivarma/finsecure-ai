import type { Request, Response } from "express";

const employees = require("../data/employees");

const generateEmployeeId = () => {
  const maxIdNumber = employees.reduce((max: number, employee: any) => {
    const numberPart = Number(employee.id.replace("EMP", ""));
    return numberPart > max ? numberPart : max;
  }, 0);

  return `EMP${String(maxIdNumber + 1).padStart(3, "0")}`;
};

const getAllEmployees = (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    count: employees.length,
    data: employees,
  });
};

const getEmployeeById = (req: Request, res: Response) => {
  const { id } = req.params;

  const employee = employees.find((item: any) => item.id === id);

  if (!employee) {
    res.status(404).json({
      success: false,
      message: "Employee not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: employee,
  });
};

const createEmployee = (req: Request, res: Response) => {
  const {
    name,
    role,
    email,
    phone,
    joiningDate,
    branch,
    ifsc,
    customers,
    status,
  } = req.body;

  if (!name || !role || !email || !phone || !branch || !ifsc) {
    res.status(400).json({
      success: false,
      message: "Name, role, email, phone, branch and IFSC are required",
    });
    return;
  }

  const newEmployee = {
    id: generateEmployeeId(),
    name,
    role,
    email,
    phone,
    joiningDate: joiningDate || "",
    branch,
    ifsc,
    customers: Number(customers) || 0,
    status: status || "Active",
  };

  employees.push(newEmployee);

  res.status(201).json({
    success: true,
    message: "Employee created successfully",
    data: newEmployee,
  });
};

const updateEmployee = (req: Request, res: Response) => {
  const { id } = req.params;

  const employeeIndex = employees.findIndex((item: any) => item.id === id);

  if (employeeIndex === -1) {
    res.status(404).json({
      success: false,
      message: "Employee not found",
    });
    return;
  }

  const existingEmployee = employees[employeeIndex];

  const updatedEmployee = {
    ...existingEmployee,
    ...req.body,
    id: existingEmployee.id,
    customers:
      req.body.customers !== undefined
        ? Number(req.body.customers)
        : existingEmployee.customers,
    status: req.body.status || existingEmployee.status,
  };

  employees[employeeIndex] = updatedEmployee;

  res.status(200).json({
    success: true,
    message: "Employee updated successfully",
    data: updatedEmployee,
  });
};

const deleteEmployee = (req: Request, res: Response) => {
  const { id } = req.params;

  const employeeIndex = employees.findIndex((item: any) => item.id === id);

  if (employeeIndex === -1) {
    res.status(404).json({
      success: false,
      message: "Employee not found",
    });
    return;
  }

  const deletedEmployee = employees.splice(employeeIndex, 1)[0];

  res.status(200).json({
    success: true,
    message: "Employee deleted successfully",
    data: deletedEmployee,
  });
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};