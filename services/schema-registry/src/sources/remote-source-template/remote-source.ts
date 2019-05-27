import Source from "./source-type";

const remoteSource: Source = {
  async getSchemas() {
    throw "Not implemented";
  },

  async registerSchema(name: string, gqlSchema: string) {
    throw "Not implemented";
  }
};

export default remoteSource;
