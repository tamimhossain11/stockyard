import { useApi } from "../useApi.js";
import { productName, quantity, shortDate } from "../format.js";
import { ErrorNotice, Loading } from "../components/Notice.jsx";

const percent = (x) => `${(x * 100).toFixed(1)}%`;

export default function ForecastPage() {
  const forecast = useApi("/forecast");
  const backtest = useApi("/forecast/backtest");
  const f = forecast.data;

  return (
    <section>
      <h1>Demand forecast</h1>

      <ErrorNotice message={forecast.error} onRetry={forecast.reload} />
      {forecast.loading && <Loading text="Calculating forecast…" />}

      {f && (
        <>
          <p className="muted">
            Next week's forecast is the average of delivered sales over the last {f.averageWeeks} full weeks.
            A reorder is suggested when stock won't cover {f.coverWeeks} weeks of that forecast.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  {f.weekStarts.map((d) => (
                    <th key={d} className="num">
                      Week of {shortDate(d)}
                    </th>
                  ))}
                  <th className="num">Forecast next week</th>
                  <th className="num">In stock</th>
                  <th>Suggestion</th>
                </tr>
              </thead>
              <tbody>
                {f.rows.map((r) => (
                  <tr key={r.productId} className={r.reorder > 0 ? "highlight" : undefined}>
                    <td>{productName(r)}</td>
                    {r.weekly.map((w, i) => (
                      <td key={i} className="num">
                        {quantity(w, r.unit)}
                      </td>
                    ))}
                    <td className="num">
                      <strong>{quantity(r.forecast, r.unit)}</strong>
                    </td>
                    <td className="num">{quantity(r.stock, r.unit)}</td>
                    <td>
                      {r.reorder > 0 ? (
                        <span className="badge badge-reorder">Reorder {quantity(r.reorder, r.unit)}</span>
                      ) : (
                        <span className="badge badge-ok">Enough stock</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2>How accurate is it?</h2>
      <ErrorNotice message={backtest.error} onRetry={backtest.reload} />
      {backtest.loading && <Loading text="Running backtest…" />}
      {backtest.data && <Backtest data={backtest.data} />}
    </section>
  );
}

function Backtest({ data }) {
  const { summary } = data;

  if (summary.products === 0) {
    return <p className="muted">Not enough delivered sales yet to test the forecast.</p>;
  }

  return (
    <>
      <p>
        Hiding the last {data.hiddenWeeks} of {data.historyWeeks} weeks and forecasting them from the weeks
        before, the {data.hiddenWeeks}-week average was off by <strong>{percent(summary.modelError)}</strong>{" "}
        of actual sales on average, against <strong>{percent(summary.naiveError)}</strong> for the simple
        guess "next week = last week". It did better on {summary.modelWins} of {summary.products} products.
      </p>
      <details>
        <summary>Error by product</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th className="num">4-week average error</th>
                <th className="num">"Same as last week" error</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.productId}>
                  <td>{productName(r)}</td>
                  <td className={r.modelError < r.naiveError ? "num better" : "num"}>
                    {percent(r.modelError)}
                  </td>
                  <td className={r.naiveError < r.modelError ? "num better" : "num"}>
                    {percent(r.naiveError)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
