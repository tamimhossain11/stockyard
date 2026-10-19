import app from "./app.js";

// Render sets PORT; 4000 is the local fallback.
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
