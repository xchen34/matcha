const MAX_FAKE_REPORT_REASON_LENGTH = 200;

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  
  return parsed;
}

module.exports = {
  MAX_FAKE_REPORT_REASON_LENGTH,
  parsePositiveInt,
};
