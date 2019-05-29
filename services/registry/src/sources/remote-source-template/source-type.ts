export default interface Source {
  getSchemas(): Promise<{ [name: string]: string }>;
  registerSchema(name: string, schema: string): Promise<void>;
}
