import { useState } from "react";
import { api } from "../api.js";
import { useAction, useApi } from "../useApi.js";
import { money, productName, quantity } from "../format.js";
import { ErrorNotice, Loading, SuccessNotice } from "../components/Notice.jsx";

const UNITS = ["bag", "ton", "cft", "piece"];

export default function ProductsPage({ session }) {
  const products = useApi("/products");
  const action = useAction();
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const isAdmin = session.role === "ADMIN";

  async function saveEdit(event, product) {
    event.preventDefault();
    const { field, value } = editing;
    const label = field === "price" ? "Price" : "Stock";

    const updated = await action.run(
      () => api(`/products/${product.id}/${field}`, { method: "PATCH", body: { [field]: Number(value) } }),
      { id: product.id, success: `${label} updated for ${productName(product)}.` },
    );
    if (updated) {
      setEditing(null);
      products.reload();
    }
  }

  async function create(body) {
    const product = await action.run(() => api("/products", { method: "POST", body }), {
      id: "new",
      success: (p) => `${productName(p)} added.`,
    });
    if (product) {
      setShowForm(false);
      products.reload();
    }
  }

  async function archive(product) {
    if (
      !window.confirm(
        `Archive ${productName(product)}? It will no longer appear in the product list or new orders.`,
      )
    )
      return;

    const archived = await action.run(() => api(`/products/${product.id}/archive`, { method: "PATCH" }), {
      id: product.id,
      success: `${productName(product)} archived.`,
    });
    if (archived) products.reload();
  }

  return (
    <section>
      <div className="page-head">
        <h1>Products</h1>
        <button type="button" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "Add product"}
        </button>
      </div>

      {showForm && <AddProductForm onSubmit={create} busy={action.busy === "new"} />}

      <SuccessNotice message={action.success} />
      <ErrorNotice message={action.error} />
      <ErrorNotice message={products.error} onRetry={products.reload} />
      {products.loading && <Loading />}

      {products.data && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Unit</th>
                <th className="num">Price</th>
                <th className="num">Stock</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No products yet.
                  </td>
                </tr>
              )}
              {products.data.map((p) => {
                const isEditing = editing?.id === p.id;
                const busy = action.busy === p.id;

                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.title}</strong> {p.variant}
                    </td>
                    <td>{p.unit}</td>
                    <td className="num">{money(p.price)}</td>
                    <td className="num">{quantity(p.stock, p.unit)}</td>
                    <td className="actions">
                      {isEditing ? (
                        <form className="inline" onSubmit={(e) => saveEdit(e, p)}>
                          <label className="sr-only" htmlFor={`edit-${p.id}`}>
                            New {editing.field}
                          </label>
                          <input
                            id={`edit-${p.id}`}
                            type="number"
                            step="any"
                            min={editing.field === "price" ? "0.01" : "0"}
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            required
                            autoFocus
                          />
                          <button type="submit" disabled={busy}>
                            {busy ? "Saving…" : `Save ${editing.field}`}
                          </button>
                          <button type="button" className="secondary" onClick={() => setEditing(null)}>
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="secondary"
                            disabled={busy}
                            onClick={() => setEditing({ id: p.id, field: "stock", value: Number(p.stock) })}
                          >
                            Set stock
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              className="secondary"
                              disabled={busy}
                              onClick={() => setEditing({ id: p.id, field: "price", value: Number(p.price) })}
                            >
                              Change price
                            </button>
                          )}
                          <button
                            type="button"
                            className="secondary danger"
                            disabled={busy}
                            onClick={() => archive(p)}
                          >
                            {busy ? "Archiving…" : "Archive"}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AddProductForm({ onSubmit, busy }) {
  const [form, setForm] = useState({ title: "", variant: "", unit: "bag", price: "", stock: "" });
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ ...form, price: Number(form.price), stock: Number(form.stock || 0) });
  }

  return (
    <form className="card form-grid" onSubmit={handleSubmit}>
      <label>
        Product
        <input value={form.title} onChange={set("title")} placeholder="e.g. BSRM Rod" required />
      </label>
      <label>
        Variant
        <input value={form.variant} onChange={set("variant")} placeholder="e.g. 12mm" required />
      </label>
      <label>
        Unit
        <select value={form.unit} onChange={set("unit")}>
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </label>
      <label>
        Price (৳ per unit)
        <input type="number" step="any" min="0.01" value={form.price} onChange={set("price")} required />
      </label>
      <label>
        Opening stock
        <input type="number" step="any" min="0" value={form.stock} onChange={set("stock")} placeholder="0" />
      </label>
      <div className="form-end">
        <button type="submit" disabled={busy}>
          {busy ? "Adding…" : "Add product"}
        </button>
      </div>
    </form>
  );
}
