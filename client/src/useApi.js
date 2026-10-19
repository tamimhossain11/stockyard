import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";

// Loads GET `path` and gives back { data, error, loading, reload }.
// It's loading whenever the latest result doesn't belong to the current
// path + reload count, so changing a filter shows the loading state too.
export function useApi(path) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });
  const key = `${path}#${version}`;

  useEffect(() => {
    let ignore = false;

    api(path).then(
      (data) => !ignore && setResult({ key, data, error: null }),
      (err) => !ignore && setResult((r) => ({ key, data: r.data, error: err.message })),
    );

    return () => {
      ignore = true;
    };
  }, [path, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { data: result.data, error: result.error, loading: result.key !== key, reload };
}

// For buttons and forms: tracks busy / error / success for one action at a time.
export function useAction() {
  const [state, setState] = useState({ busy: null, error: null, success: null });

  const run = useCallback(async (fn, { id = true, success } = {}) => {
    setState({ busy: id, error: null, success: null });
    try {
      const result = await fn();
      setState({
        busy: null,
        error: null,
        success: typeof success === "function" ? success(result) : success,
      });
      return result;
    } catch (err) {
      setState({ busy: null, error: err.message, success: null });
      return undefined;
    }
  }, []);

  const clear = useCallback(() => setState({ busy: null, error: null, success: null }), []);

  return { ...state, run, clear };
}
