import fetch from "node-fetch";

async function run() {
  try {
    const res = await fetch("http://localhost:3005/api/colleges");
    console.log(res.status);
    const text = await res.text();
    console.log(text.substring(0, 100));
  } catch (err) {
    console.log(err);
  }
}
run();
