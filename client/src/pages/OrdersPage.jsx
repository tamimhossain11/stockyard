import { Fragment, useState } from "react";
import { api } from "../api.js";
import { useAction, useApi } from "../useApi.js";
import { STATUS_LABELS, dateTime, money, productName, quantity } from "../format.js";
import { ErrorNotice, Loading, SuccessNotice } from "../components/Notice.jsx";

const FILTERS = ["", "PENDING", "CONFIRMED", "DELIVERED", "CANCELLED"];

// Button text for each move the server allows (order.nextStatuses).
const MOVE_LABELS = {
  CONFIRMED: "Confirm",
  DELIVERED: "Mark delivered",
  CANCELLED: "Cancel",
};

export default function OrdersPage() {
  const [status, setStatus] = useState("");
  const [openId, setOpenId] = useState(null);
  const [detailsVersion, setDetailsVersion] = useState(0);
  const orders = useApi(status ? `/orders?status=${status}` : "/orders");
  const action = useAction();

  async function move(order, to) {
    if (to === "CANCELLED") {
      const note = order.status === "CONFIRMED" ? " Its stock will be put back." : "";
      if (!window.confirm(`Cancel order #${order.id} for ${order.customerName}?${note}`)) return;
    }

    const updated = await action.run(
      () => api(`/orders/${order.id}/status`, { method: "PATCH", body: { status: to } }),
      { id: order.id, success: `Order #${order.id} is now ${STATUS_LABELS[to].toLowerCase()}.` },
    );
    if (updated) {
      orders.reload();
      setDetailsVersion((v) => v + 1);
    }
  }

  return (
    <section>
      <h1>Orders</h1>

      <div className="filters" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f || "all"}
            type="button"
            className={f === status ? "chip active" : "chip"}
            onClick={() => setStatus(f)}
          >
            {f ? STATUS_LABELS[f] : "All"}
          </button>
        ))}
      </div>

      <SuccessNotice message={action.success} />
      <ErrorNotice message={action.error} />
      <ErrorNotice message={orders.error} onRetry={orders.reload} />
      {orders.loading && <Loading />}

      {orders.data && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Customer</th>
                <th className="num">Items</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    No orders here.
                  </td>
                </tr>
              )}
              {orders.data.map((order) => {
                const busy = action.busy === order.id;
                const open = openId === order.id;

                return (
                  <Fragment key={order.id}>
                    <tr>
                      <td>{order.id}</td>
                      <td>{dateTime(order.createdAt)}</td>
                      <td>
                        {order.customerName}
                        <div className="muted small">{order.customerPhone}</div>
                      </td>
                      <td className="num">{order._count.items}</td>
                      <td className="num">{money(order.total)}</td>
                      <td>
                        <span className={`badge badge-${order.status.toLowerCase()}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="secondary"
                          aria-expanded={open}
                          onClick={() => setOpenId(open ? null : order.id)}
                        >
                          {open ? "Hide" : "View"}
                        </button>
                        {order.nextStatuses.map((to) => (
                          <button
                            key={to}
                            type="button"
                            className={to === "CANCELLED" ? "secondary danger" : undefined}
                            disabled={busy}
                            onClick={() => move(order, to)}
                          >
                            {busy ? "Saving…" : MOVE_LABELS[to]}
                          </button>
                        ))}
                      </td>
                    </tr>
                    {open && (
                      <tr className="details">
                        <td colSpan={7}>
                          <OrderDetails key={detailsVersion} id={order.id} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function OrderDetails({ id }) {
  const order = useApi(`/orders/${id}`);

  if (order.error) return <ErrorNotice message={order.error} onRetry={order.reload} />;
  if (order.loading || !order.data) return <Loading text="Loading items…" />;

  return (
    <div>
      <table className="inner">
        <thead>
          <tr>
            <th>Product</th>
            <th className="num">Quantity</th>
            <th className="num">Unit price</th>
            <th className="num">Line total</th>
          </tr>
        </thead>
        <tbody>
          {order.data.items.map((item) => (
            <tr key={item.id}>
              <td>{productName(item.product)}</td>
              <td className="num">{quantity(item.quantity, item.product.unit)}</td>
              <td className="num">{money(item.unitPrice)}</td>
              <td className="num">{money(Number(item.unitPrice) * Number(item.quantity))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">
        Created by {order.data.createdBy.name}. Prices are those at the time of the order.
      </p>
    </div>
  );
}
