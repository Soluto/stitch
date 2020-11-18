const wholeRgPolicy = {
  metadata: {
    namespace: 'plugins',
    name: 'whole-rg-policy',
  },
  type: 'opa',
  code: `
    default allow = true
  `,
};

const isEqual = policyA => policyB =>
  policyA.metadata.namespace === policyB.metadata.namespace && policyA.metadata.name === policyB.metadata.namespace;

module.exports = {
  transformResourceGroup: rg => {
    const newRg = { ...rg };

    if (!newRg.policies) {
      newRg.policies = [];
    }

    if (!newRg.policies.some(isEqual(wholeRgPolicy))) {
      newRg.policies.push(wholeRgPolicy);
    }

    return newRg;
  },
};
