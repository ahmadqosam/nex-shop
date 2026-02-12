# 📊 Load Testing Results: Dev Server vs. LocalStack

This document summarizes the results of the k6 load testing suite, comparing the performance and reliability of the direct **Dev Server** (NestJS applications) against the **LocalStack** (simulated Lambda/Gateway) environment.

## 🏁 Test Scenario: Flash Sale Stress

- **Goal**: Simulate a high-concurrency "thundering herd" event.
- **Load**: 200 Virtual Users (VUs) executing a full checkout journey.
- **Stock**: 50 units available for a limited-time flash sale item.
- **Objective**: Verify that exactly 50 units are sold and no over-ordering occurs.

## 📈 Comparison Matrix

| Metric                  | Dev Server (Direct)     | LocalStack (Gateway/Lambda)             |
| :---------------------- | :---------------------- | :-------------------------------------- |
| **Throughput**          | ~20 RPS (Local Machine) | ~2 RPS (Gateway Overhead)               |
| **p95 Latency**         | ~800ms - 1.2s           | > 30s (Frequent Timeouts)               |
| **Success Rate**        | 100%                    | < 10% (Under high load)                 |
| **Inventory Integrity** | ✅ **50/50 Sold**       | ✅ **0/50 Sold (No Over-ordering)**     |
| **Resource Usage**      | Moderate CPU/RAM        | Extreme (Docker resource exhaustion)    |
| **Status**              | ✅ **PASSED**           | ❌ **UNRESPONSIVE** (under 200 VU load) |

## 🔍 Key Findings

### 1. Direct Dev Server (Robustness Verified)

The direct NestJS services running as local processes showed excellent performance.

- Integrated locking mechanisms worked perfectly.
- Database connection pooling stayed stable.
- Stock count was exactly 50/50 at the end of the 200 VU run.

### 2. LocalStack Limitations (The "Overhead" Problem)

While LocalStack is excellent for functional testing, it is **not suitable for local high-volume stress testing** for the following reasons:

- **Lambda Simulation**: LocalStack spins up individual Docker containers or processes for Lambda executions. Spawning 200 concurrent Lambdas exceeds common local Docker resource limits.
- **Gateway Latency**: The API Gateway emulation adds significant serialization/deserialization overhead.
- **Stability**: Under the 200 VU load, the LocalStack main container became **Unhealthy**, leading to cascading failures.

## 💡 Recommendations

- **Development**: Use **LocalStack** for validating service integration, SNS/SQS messaging flows, and API Gateway mapping (1-10 VUs).
- **Benchmarking/Stress**: Use the **Direct Dev Server** (`pnpm dev`) to test application logic, concurrency, and database integrity.
- **Cloud Testing**: For true performance benchmarking, tests should be run in a staging environment with real AWS resources.

---

### How to Reproduce

**Direct Dev Server:**

```bash
# Start services
pnpm dev
# Run k6
pnpm test:load
```

**LocalStack:**

```bash
# Start infrastructure
pnpm infra:up:localstack
# Run k6 with localstack environment
TEST_ENV=localstack pnpm test:load
```
