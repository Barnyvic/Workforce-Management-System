# Workforce Management System

A scalable, production-ready backend system for managing employees, departments, and leave requests. Built with Node.js, TypeScript, Express.js, MySQL, Redis, and RabbitMQ.

## Features

- **RESTful API** with comprehensive CRUD operations
- **Message Queue Processing** with RabbitMQ for asynchronous leave request processing
- **Caching Layer** with Redis for improved performance
- **Database Scaling** with proper indexing and pagination
- **Clean Architecture** following SOLID principles
- **Comprehensive Testing** with unit and integration tests
- **Docker Support** for easy deployment
- **Health Monitoring** with system health check endpoints
- **Rate Limiting** and security middleware
- **Error Handling** with structured error responses

## Architecture

The system follows a clean, layered architecture:

```
src/
├── config/          Configuration services
├── controllers/     HTTP request handlers
├── services/        Business logic layer
├── repositories/    Data access layer
├── entities/        TypeORM entities
├── migrations/      Database migrations
├── middleware/      Express middleware
├── routes/          API route definitions
├── types/           TypeScript type definitions
├── utils/           Utility functions
└── test/            Test suites
```

## Tech Stack

- **Runtime**: Node.js (>=16)
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MySQL 8.0 with TypeORM
- **Cache**: Redis
- **Message Queue**: RabbitMQ
- **Testing**: Jest with Supertest
- **Containerization**: Docker & Docker Compose
- **Package Manager**: Yarn

## Prerequisites

- Node.js >= 16
- Docker & Docker Compose
- MySQL 8.0
- Redis
- RabbitMQ

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd workforce-management-system
   ```

2. **Start all services**

   ```bash
   docker-compose up -d
   ```

3. **Verify the setup**
   ```bash
   curl http://localhost:3000/ping
   ```

### Manual Setup

1. **Install dependencies**

   ```bash
   yarn install
   ```

2. **Set up environment variables**

   ```bash
   cp env.example .env
   ```

3. **Start external services**

   Start MySQL, Redis, and RabbitMQ services and update .env with correct connection details

4. **Run database migrations**

   ```bash
   yarn run migrate
   ```

5. **\*Seed the database (optional)**

   ```bash
   yarn run seed
   ```

6. **Start the application**

   ```bash
   yarn run dev
   ```

   ```bash
   yarn run build
   yarn start
   ```

## API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Endpoints

#### Departments

- `POST /departments` - Create a department
- `GET /departments` - Get all departments
- `GET /departments/:id` - Get department by ID
- `GET /departments/:id/employees` - Get employees in department (paginated)
- `PUT /departments/:id` - Update department
- `DELETE /departments/:id` - Delete department

#### Employees

- `POST /employees` - Create an employee
- `GET /employees` - Get all employees
- `GET /employees/:id` - Get employee by ID
- `GET /employees/:id/leave-history` - Get employee with leave history
- `PUT /employees/:id` - Update employee
- `DELETE /employees/:id` - Delete employee

#### Leave Requests

- `POST /leave-requests` - Create a leave request
- `GET /leave-requests` - Get all leave requests
- `GET /leave-requests/:id` - Get leave request by ID
- `GET /leave-requests/status/:status` - Get leave requests by status
- `PUT /leave-requests/:id/status` - Update leave request status
- `DELETE /leave-requests/:id` - Delete leave request

#### Health Checks

- `GET /health` - System health check
- `GET /health/queue` - Queue health check
- `GET /health/cache` - Cache health check

### Request/Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Pagination

Paginated endpoints support query parameters:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)

## Configuration

### Environment Variables

| Variable       | Description             | Default                     |
| -------------- | ----------------------- | --------------------------- |
| `NODE_ENV`     | Environment             | `development`               |
| `PORT`         | Server port             | `3000`                      |
| `DB_HOST`      | Database host           | `localhost`                 |
| `DB_PORT`      | Database port           | `3306`                      |
| `DB_NAME`      | Database name           | `workforce_management`      |
| `DB_USER`      | Database user           | `root`                      |
| `DB_PASSWORD`  | Database password       | `password`                  |
| `REDIS_HOST`   | Redis host              | `localhost`                 |
| `REDIS_PORT`   | Redis port              | `6379`                      |
| `RABBITMQ_URL` | RabbitMQ connection URL | `amqp://localhost:5672`     |
| `JWT_SECRET`   | JWT secret key          | `your-super-secret-jwt-key` |

## Testing

### Run Tests

```bash
yarn test

yarn run test:watch

yarn run test:coverage
```

### Test Structure

- **Unit Tests**: Test individual services and repositories
- **Integration Tests**: Test API endpoints with database
- **Test Database**: Uses separate test database

## Database Schema

### Tables

#### Departments

```sql
CREATE TABLE departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) UNIQUE NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);
```

#### Users

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'MANAGER', 'EMPLOYEE') DEFAULT 'EMPLOYEE',
  departmentId INT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (departmentId) REFERENCES departments(id)
);
```

#### Leave Requests

```sql
CREATE TABLE leave_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'PENDING_APPROVAL') DEFAULT 'PENDING',
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### User Roles

- **ADMIN**: Full system access, can manage users and departments
- **MANAGER**: Can approve/reject leave requests, manage team members
- **EMPLOYEE**: Can create leave requests, view own data

### Indexes

- `idx_users_email` Unique index on user email
- `idx_users_department_id` Index on department foreign key
- `idx_users_role` Index on user role
- `idx_leave_requests_user_id` Index on user foreign key
- `idx_leave_requests_status` Index on leave request status
- `idx_leave_requests_dates` Composite index on start and end dates

## Message Queue Processing

### Leave Request Processing

1. **Producer**: Creates leave request and publishes message to RabbitMQ
2. **Consumer**: Processes messages with business rules
   - Auto-approve leaves ≤ 2 days
   - Mark longer leaves as PENDING_APPROVAL
3. **Retry Mechanism**: Exponential backoff for failed messages
4. **Dead Letter Queue**: Failed messages after max retries

### Queue Configuration

- **Main Queue**: `leave_requests`
- **Dead Letter Queue**: `leave_requests_dlq`
- **Retry Policy**: 3 retries with exponential backoff
- **Multiple Consumers**: Support for horizontal scaling
- **Prefetch Settings**: Optimized for different consumer types

### Queue Scaling

```bash
yarn run worker

yarn run workers

yarn run workers -- --count=4

yarn run workers:scale
```

### Queue Consumer Types

1. **Main Application Consumer**: Handles basic processing with prefetch of 1
2. **Dedicated Workers**: Optimized for high throughput with prefetch of 5
3. **Auto-restart**: Workers automatically restart on failure

## Scalability Features

### Database Scaling

- **Pagination**: All list endpoints support pagination
- **Indexing**: Optimized indexes for common queries
- **Connection Pooling**: Sequelize connection pool configuration

### Caching

- **Redis Integration**: Caching layer for frequently accessed data
- **Cache Health Monitoring**: Health check endpoint for cache status

### API Scaling

- **Rate Limiting**: Configurable rate limiting middleware
- **Request Validation**: Joi validation for all inputs
- **Error Handling**: Structured error responses

## Security Features

- **Helmet**: Security headers middleware
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Comprehensive request validation
- **Error Sanitization**: Production-safe error messages

## Monitoring & Health Checks

### Health Endpoints

- `/health` - Overall system health
- `/health/queue` - RabbitMQ connection status
- `/health/cache` - Redis connection status

### Logging

- **Winston**: Structured logging
- **Request Logging**: HTTP request/response logging
- **Error Logging**: Comprehensive error tracking

## Docker Support

### Services

- **App**: Node.js application
- **MySQL**: Database server
- **Redis**: Cache server
- **RabbitMQ**: Message queue server

### Docker Commands

```bash
docker-compose up -d

docker-compose logs -f

docker-compose down

docker-compose up --build -d
```

## Development

### Code Quality

- **ESLint**: Code linting with TypeScript rules
- **Prettier**: Code formatting
- **TypeScript**: Strict type checking

### Scripts

```bash
yarn run build
yarn run dev
yarn run migrate
yarn run seed
yarn run lint
yarn run lint:fix
yarn run format
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Troubleshooting

Common issues and solutions:

- **Database Connection**: Ensure MySQL service is running and credentials in .env are correct
- **Redis Issues**: Verify Redis service is accessible and properly configured
- **RabbitMQ Problems**: Check if RabbitMQ service is running and connection URL is valid
- **Port Conflicts**: Change PORT in .env if 3000 is already in use

## Support

For support and questions:

- Create an issue in the repository
- Check the API documentation
- Review the test cases for usage examples
- Check Docker logs for container-related issues

## Performance Optimization

- Use pagination for large datasets
- Implement caching strategies for frequently accessed data
- Monitor queue processing times
- Scale workers based on application load

**Built for scalable workforce management with production-ready architecture**
