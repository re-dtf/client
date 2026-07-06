const url = "https://api.dtf.ru/v2.31/comments?contentId=1&sorting=date";
console.time("fetch1");
fetch(url, { headers: { 'Accept': 'application/json' } })
  .then(res => res.json())
  .then(json => {
    console.timeEnd("fetch1");
    console.log("Items count (no count param):", json.result?.items?.length);
  });

const url2 = "https://api.dtf.ru/v2.31/comments?contentId=1&sorting=date&count=5";
console.time("fetch2");
fetch(url2, { headers: { 'Accept': 'application/json' } })
  .then(res => res.json())
  .then(json => {
    console.timeEnd("fetch2");
    console.log("Items count (with count=5):", json.result?.items?.length);
  });
