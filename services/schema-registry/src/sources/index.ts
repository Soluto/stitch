import fetch from "node-fetch";

export default interface Source {
  getSchemas(): Promise<{ [name: string]: string }>;
  registerSchema(name: string, schema: string): Promise<void>;
}

export function remoteSource(remoteSourceHost: String): Source {
  return {
    async getSchemas() {
      const res = await fetch(`${remoteSourceHost}`);
      return await res.json();
    },
    async registerSchema(name: string, schema: string) {
      await fetch(`${remoteSourceHost}/${name}`, {
        method: "POST",
        body: schema
      });
    }
  };
}
