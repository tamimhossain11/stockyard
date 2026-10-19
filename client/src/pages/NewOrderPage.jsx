import { useRef, useState } from "react";
import { api } from "../api.js";
import { useAction, useApi } from "../useApi.js";
import { money, productName } from "../format.js";
import { ErrorNotice, Loading, SuccessNotice } from "../components/Notice.jsx";

const emptyLine = (key) => ({ key, productId: "", quantity: "" });

export default function NewOrderPage() {
  const products = useApi("/products");
  const submit = useAction();
  const nextKey = useRef(2);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [lines, setLines] = useState([emptyLine(1)]);

  const byId = new Map((products.data ?? []).map((p) => [String(p.id), p]));
  const chosen = new Set(lines.map((l) => l.productId));

  // Only an estimate: the server recalculates the total from its own prices.
  const estimate = lines.reduce((sum, l) => {
    const p = byId.get(l.productId);
    return p && l.quantity ? sum + Number(p.price) * Number(l.quantity) : sum;
  }, 0);

  const updateLine = (key, field, value) =>
    setLines(lines.map((l) => (l.key === key ? { ...l, [field]: value } : l)));

  function addLine() {
    setLines([...lines, emptyLine(nextKey.current++)]);
  }

  function removeLine(key) {
    setLines(lines.filter((l) => l.key !== key));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const order = await submit.run(
      () =>
        api("/orders", {
          method: "POST",
          body: {
            customerName,
            customerPhone,
            items: lines.map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity) })),
          },
        }),
      {
        success: (o) =>
          `Order #${o.id} for ${o.customerName} created: ${money(o.total)}. It stays pending until you confirm it on the Orders page.`,
      },
    );

    if (order) {
      setCustomerName("");
      setCustomerPhone("");
      setLines([emptyLine(nextKey.current++)]);
    }
  }

  return (
    <section>
      <h1>New order</h1>

      <SuccessNotice message={submit.success} />
      <ErrorNotice message={submit.error} />
      <ErrorNotice message={products.error} onRetry={products.reload} />
      {products.loading && <Loading text="Loading products…" />}

      {products.data && (
        <form className="card" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Customer name
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </label>
            <label>
              Customer phone
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="01XXX-XXXXXX"
                required
              />
            </label>
          </div>

          <h2>Items</h2>
          <div className="table-wrap plain">
            <table className="lines">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">Quantity</th>
                  <th className="num">Price</th>
                  <th className="num">Line total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const p = byId.get(line.productId);
                  return (
                    <tr key={line.key}>
                      <td>
                        <select
                          aria-label="Product"
                          value={line.productId}
                          onChange={(e) => updateLine(line.key, "productId", e.target.value)}
                          required
                        >
                          <option value="">Choose a product…</option>
                          {products.data.map((option) => (
                            <option
                              key={option.id}
                              value={option.id}
                              disabled={chosen.has(String(option.id)) && String(option.id) !== line.productId}
                            >
                              {productName(option)} ({option.unit})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="num">
                        <input
                          aria-label="Quantity"
                          type="number"
                          step="any"
                          min="0.001"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.key, "quantity", e.target.value)}
                          required
                        />{" "}
                        {p?.unit}
                      </td>
                      <td className="num">{p ? money(p.price) : "—"}</td>
                      <td className="num">
                        {p && line.quantity ? money(Number(p.price) * Number(line.quantity)) : "—"}
                      </td>
                      <td>
                        {lines.length > 1 && (
                          <button type="button" className="secondary" onClick={() => removeLine(line.key)}>
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="order-foot">
            <button
              type="button"
              className="secondary"
              onClick={addLine}
              disabled={lines.length >= products.data.length}
            >
              Add item
            </button>
            <span>
              Estimated total <strong>{money(estimate)}</strong>
            </span>
            <button type="submit" disabled={submit.busy}>
              {submit.busy ? "Creating…" : "Create order"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
