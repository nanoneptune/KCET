import fetch from "node-fetch";

async function run() {
  const res = await fetch("http://localhost:3000/api/colleges");
  console.log(res.status);
  const text = await res.text();
  console.log(text.substring(0, 50));
}
run();
