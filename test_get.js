import fetch from "node-fetch";
async function run() {
  const res = await fetch("http://localhost:3000/api/colleges");
  const data = await res.json();
  const clg = data.colleges.find(c => c.name === "RV College of Engineering (RVCE) UPDATED");
  console.log(clg.name, clg.place);
}
run();
