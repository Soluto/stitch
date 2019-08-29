import fastify from 'fastify';
import orders from '../data/orders.json';

const app = fastify({});
const port = Number(process.env.PORT) || 3000;

app.get("/health", (_, resp) => { resp.status(200).send("true"); });

app.get("/customerOrders/:customerId", (req, resp) => {
    const { customerId } = req.params;
    const customerOrders = orders.filter(o => o.customerId === customerId);
    if (customerOrders.length > 0) {
        resp.status(200).send(customerOrders);
    }
    else {
        resp.status(404).send("Customer not found");
    }
});

app.listen(port, "0.0.0.0", () => console.log(`Server is listening to port: ${port}`));
