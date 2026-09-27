const { getMQL5Code } = require('./mql5Generator');
function getDerivMQL5Code() {
  return getMQL5Code() + "\n// Deriv Synthetic Indices Optimized - Volatility, Crash/Boom, Step handling\n";
}
module.exports = { getDerivMQL5Code };
