

import { parse } from "querystring";

const appDiv = document.getElementById('app');
if (appDiv) {

    const query = parse(location.search.substr(1));

    if (query?.u) {
        const url = query.u as string;

        const h2 = document.createElement('h2');
        h2.textContent = `URL: ${url}`;
        appDiv.appendChild(h2);

        fetch(url)
            .then(res => res.json())
            .then((data) => {
                const pre = document.createElement('pre');
                pre.textContent = JSON.stringify(data, null, 2);
                appDiv.appendChild(pre);
            });

    }
    else{
        appDiv.innerHTML = '<h2>no url</h2>';
    }
}


