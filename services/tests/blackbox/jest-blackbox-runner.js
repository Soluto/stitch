const DefaultJestRunner = require('jest-runner');

class SerialJestRunner extends DefaultJestRunner {
  constructor(config, context) {
    super(config, context);
    this.isSerial = true;
  }
}

module.exports = SerialJestRunner;
