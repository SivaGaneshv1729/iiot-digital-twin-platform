-- SmartFactory AI Initial Schema

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE machines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    temperature DECIMAL(5,2),
    running_hours INTEGER DEFAULT 0,
    last_maintenance TIMESTAMP
);

CREATE TABLE production_orders (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER REFERENCES machines(id),
    status VARCHAR(20) NOT NULL,
    target_quantity INTEGER NOT NULL,
    completed_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample admin user
INSERT INTO users (username, password_hash, role) VALUES ('admin', 'hashedpassword', 'Admin');

-- Insert sample machines
INSERT INTO machines (name, status, temperature, running_hours) VALUES 
('M-101', 'Running', 65.5, 1200),
('M-102', 'Idle', 30.0, 800),
('M-103', 'Maintenance', 45.2, 5000);
