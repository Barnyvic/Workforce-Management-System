
USE workforce_management;


CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(departmentId);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON employees(createdAt);

CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_created_at ON departments(createdAt);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employeeId);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(startDate, endDate);
CREATE INDEX IF NOT EXISTS idx_leave_requests_created_at ON leave_requests(createdAt);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_status ON leave_requests(employeeId, status);

INSERT INTO departments (name, createdAt, updatedAt) VALUES
('Engineering', NOW(), NOW()),
('Human Resources', NOW(), NOW()),
('Marketing', NOW(), NOW()),
('Sales', NOW(), NOW()),
('Finance', NOW(), NOW());

INSERT INTO employees (name, email, departmentId, createdAt, updatedAt) VALUES
('John Doe', 'john.doe@company.com', 1, NOW(), NOW()),
('Jane Smith', 'jane.smith@company.com', 1, NOW(), NOW()),
('Bob Johnson', 'bob.johnson@company.com', 2, NOW(), NOW()),
('Alice Brown', 'alice.brown@company.com', 3, NOW(), NOW()),
('Charlie Wilson', 'charlie.wilson@company.com', 4, NOW(), NOW());
