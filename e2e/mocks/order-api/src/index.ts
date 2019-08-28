import * as fastify from 'fastify';
import * as ordersByCustomer from '../data/orders.json';

const app = fastify({});
const port = Number(process.env.PORT) || 3000;

app.get("/health", (_, resp) => { resp.status(200).send("true"); });

app.get("/customerOrders/:customerId", (req, resp) => {
    const { customerId } = req.params;
    if (ordersByCustomer.hasOwnProperty(customerId)) {
        const orders = ordersByCustomer[customerId];
        resp.status(200).send(orders);
    }
    else {
        resp.status(404).send("Customer not found");
    }
});

app.listen(port, () => console.log(`Server is listening to port: ${port}`));
