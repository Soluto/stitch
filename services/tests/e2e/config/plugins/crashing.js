module.exports = {
  transformResourceGroup: rg => {
    const shouldThrow = rg.schemas.find(({ metadata }) => metadata.name === 'crash-plugin');
    if (shouldThrow) {
      throw new Error('Something bad happened');
    }
    return rg;
  },
};
