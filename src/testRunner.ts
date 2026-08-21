import { runExhaustiveTestSuite } from './services/reconciliationEngine.test';

const results = runExhaustiveTestSuite();
console.log('====================================');
console.log(`TOTAL TESTS: ${results.total}`);
console.log(`PASSED: ${results.passed}`);
console.log(`FAILED: ${results.failed}`);
console.log('====================================');
results.log.forEach(l => console.log(l));

if (results.failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
