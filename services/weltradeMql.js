const { getMQL5Code } = require('./mql5Generator');
function getWeltradeMQL5Code() {
  return getMQL5Code() + "\n// Weltrade SyntX Optimized - Includes FXvol, PainX/GainX handling\n";
}
module.exports = { getWeltradeMQL5Code };
