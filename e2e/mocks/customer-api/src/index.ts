import * as fastify from 'fastify';
import * as customers from '../data/customers.json';

const app = fastify({});
const port = Number(process.env.PORT) || 3000;

app.get("/health", (_, resp) => { resp.status(200).send("true"); });

app.get("/customer/:id", (req, resp) => {
  const { id } = req.params;
  if (customers.hasOwnProperty(id)) {
    const customer = { id, ...customers[id] };
    resp.status(200).send(customer);
  }
  else {
    resp.status(404).send("Customer not found");
  }
});

app.listen(port, () => console.log(`Server is listening to port: ${port}`));