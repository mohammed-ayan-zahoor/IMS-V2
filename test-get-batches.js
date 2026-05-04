import fetch from "node-fetch";

async function run() {
  const res = await fetch("http://localhost:3005/api/v1/batches?instituteId=all", {
    headers: { "Cookie": "next-auth.session-token=mock" } // Not real, just checking if we can see structure
  });
  const data = await res.json();
  console.log(data);
}
run();
