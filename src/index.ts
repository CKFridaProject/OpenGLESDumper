
// src/index.ts

// read the a file `dumps.json`
const dumpsJsonUrl = '/dumps.json';
const appElement = document.getElementById('app');
if (appElement) {


    fetch(dumpsJsonUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            return response.json();
        })
        .then((json : string[])=> {
            console.log(json);
            const ul = document.createElement('ul');
            json.forEach(item => {
                const li = document.createElement('li');
                //li.textContent = item;
                const a = document.createElement('a');
                a.href = `/dumps/${item}`;
                a.textContent = item;
                li.appendChild(a);
                ul.appendChild(li);
            });
            appElement.appendChild(ul);

        })
        .catch(function () {
            console.log("An error occurred while fetching the JSON.");
        });



}


