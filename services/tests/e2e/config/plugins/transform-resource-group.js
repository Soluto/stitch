const rgUpdatesPolicy = {
  metadata: {
    namespace: 'plugins',
    name: 'rg-update-policy',
  },
  type: 'opa',
  code: `
    default allow = true
  `,
};

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
  transformResourcesUpdates: rg => {
    const newRg = { ...rg };

    if (!newRg.policies) {
      newRg.policies = [];
    }
    if (!newRg.policies.some(isEqual(rgUpdatesPolicy))) {
      newRg.policies.push(rgUpdatesPolicy);
    }
    return newRg;
  },
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
